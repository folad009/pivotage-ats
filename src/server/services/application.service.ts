import {
  ApplicationStatus,
  type Prisma,
  type PrismaClient,
  type StageType,
} from "@/lib/prisma";

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac";
import type {
  ApplicationListInput,
  CreateApplicationInput,
  MoveStageInput,
} from "@/lib/validations/application";
import { jobScopeWhere } from "@/server/services/job.service";

type Db = PrismaClient | Prisma.TransactionClient;

export const APPLICATION_PAGE_SIZE = 20;

/** Statuses shown on the active kanban board (AGENTS.md §6). */
export const BOARD_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.ACTIVE,
  ApplicationStatus.HIRED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
];

export interface MoveSideEffects {
  status: ApplicationStatus;
  reason?: string;
}

/**
 * Pure transition rules for stage moves — unit tested without a DB.
 * Moving to REJECTED requires a reason; HIRED sets status=HIRED.
 */
export function computeMoveSideEffects(
  toStageType: StageType,
  reason?: string | null,
): MoveSideEffects {
  if (toStageType === "REJECTED") {
    const trimmed = reason?.trim();
    if (!trimmed) {
      throw new ValidationError(
        "A reason is required when rejecting a candidate.",
      );
    }
    return { status: ApplicationStatus.REJECTED, reason: trimmed };
  }
  if (toStageType === "HIRED") {
    return { status: ApplicationStatus.HIRED };
  }
  return { status: ApplicationStatus.ACTIVE };
}

/** Validates that an application in a terminal archived state cannot be moved. */
export function assertApplicationMutable(status: ApplicationStatus): void {
  if (status === ApplicationStatus.ARCHIVED) {
    throw new ForbiddenError("Archived applications are read-only.");
  }
}

export function formatStageMoveNote(input: {
  fromStageName: string | null;
  toStageName: string;
  reason?: string | null;
}): string {
  const from = input.fromStageName ?? "New";
  let body = `Moved from ${from} to ${input.toStageName}.`;
  if (input.reason) {
    body += ` Reason: ${input.reason}`;
  }
  return body;
}

async function ensureJobAccessible(db: Db, actor: AccessUser, jobId: string) {
  const scope = jobScopeWhere(actor);
  const job = await db.job.findFirst({
    where: scope ? { AND: [{ id: jobId }, scope] } : { id: jobId },
    select: { id: true },
  });
  if (!job) {
    throw new NotFoundError("Job");
  }
}

/** User ids assigned to a job (owner + interview panel) for RBAC scope checks. */
export async function getJobAssignedUserIds(
  db: Db,
  jobId: string,
): Promise<string[]> {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: {
      ownerId: true,
      applications: {
        select: {
          interviews: {
            select: { panel: { select: { id: true } } },
          },
        },
      },
    },
  });
  if (!job) {
    throw new NotFoundError("Job");
  }

  const ids = new Set<string>([job.ownerId]);
  for (const application of job.applications) {
    for (const interview of application.interviews) {
      for (const member of interview.panel) {
        ids.add(member.id);
      }
    }
  }
  return [...ids];
}

async function getApplicationContext(db: Db, applicationId: string) {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      currentStage: { select: { id: true, name: true, type: true } },
      job: { select: { id: true, title: true, openings: true, ownerId: true } },
    },
  });
  if (!application) {
    throw new NotFoundError("Application");
  }
  return application;
}

export async function createApplication(
  db: PrismaClient,
  actor: AccessUser,
  input: CreateApplicationInput,
) {
  await ensureJobAccessible(db, actor, input.jobId);

  const existing = await db.application.findUnique({
    where: {
      candidateId_jobId: {
        candidateId: input.candidateId,
        jobId: input.jobId,
      },
    },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      "This candidate already has an application for this job.",
      existing.id,
    );
  }

  const firstStage = await db.pipelineStage.findFirst({
    where: { jobId: input.jobId },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  if (!firstStage) {
    throw new ValidationError("This job has no pipeline stages configured.");
  }

  return db.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        candidateId: input.candidateId,
        jobId: input.jobId,
        currentStageId: firstStage.id,
        ownerId: input.ownerId ?? actor.id,
        status: ApplicationStatus.ACTIVE,
        rating: input.rating ?? null,
      },
    });

    await tx.stageHistory.create({
      data: {
        applicationId: application.id,
        fromStageId: null,
        toStageId: firstStage.id,
        movedById: actor.id,
      },
    });

    await tx.note.create({
      data: {
        applicationId: application.id,
        authorId: actor.id,
        body: `Application created in ${firstStage.name}.`,
        type: "SYSTEM",
      },
    });

    return application;
  });
}

export interface MoveStageResult {
  applicationId: string;
  jobId: string;
  jobCloseSuggested: boolean;
}

export async function moveStage(
  db: PrismaClient,
  actor: AccessUser,
  input: MoveStageInput,
): Promise<MoveStageResult> {
  const application = await getApplicationContext(db, input.applicationId);
  assertApplicationMutable(application.status);

  const toStage = await db.pipelineStage.findFirst({
    where: { id: input.toStageId, jobId: application.jobId },
    select: { id: true, name: true, type: true },
  });
  if (!toStage) {
    throw new ValidationError("Target stage does not belong to this job.");
  }

  if (application.currentStageId === toStage.id) {
    return {
      applicationId: application.id,
      jobId: application.jobId,
      jobCloseSuggested: false,
    };
  }

  const effects = computeMoveSideEffects(toStage.type, input.reason);

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: application.id },
      data: {
        currentStageId: toStage.id,
        status: effects.status,
      },
    });

    await tx.stageHistory.create({
      data: {
        applicationId: application.id,
        fromStageId: application.currentStageId,
        toStageId: toStage.id,
        movedById: actor.id,
        reason: effects.reason ?? null,
      },
    });

    await tx.note.create({
      data: {
        applicationId: application.id,
        authorId: actor.id,
        body: formatStageMoveNote({
          fromStageName: application.currentStage.name,
          toStageName: toStage.name,
          reason: effects.reason,
        }),
        type: "SYSTEM",
      },
    });
  });

  let jobCloseSuggested = false;
  if (toStage.type === "HIRED") {
    const hiredCount = await db.application.count({
      where: { jobId: application.jobId, status: ApplicationStatus.HIRED },
    });
    jobCloseSuggested = hiredCount >= application.job.openings;
  }

  return {
    applicationId: application.id,
    jobId: application.jobId,
    jobCloseSuggested,
  };
}

export async function withdrawApplication(
  db: PrismaClient,
  actor: AccessUser,
  applicationId: string,
  reason?: string,
) {
  const application = await getApplicationContext(db, applicationId);
  assertApplicationMutable(application.status);

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: application.id },
      data: { status: ApplicationStatus.WITHDRAWN },
    });

    await tx.note.create({
      data: {
        applicationId: application.id,
        authorId: actor.id,
        body: reason
          ? `Application withdrawn. Reason: ${reason}`
          : "Application withdrawn.",
        type: "SYSTEM",
      },
    });
  });

  return { applicationId: application.id };
}

export async function getBoardData(
  db: Db,
  actor: AccessUser,
  jobId: string,
) {
  await ensureJobAccessible(db, actor, jobId);

  const [job, stages, applications] = await Promise.all([
    db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        openings: true,
        client: { select: { id: true, name: true } },
      },
    }),
    db.pipelineStage.findMany({
      where: { jobId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, type: true, order: true },
    }),
    db.application.findMany({
      where: {
        jobId,
        status: { in: BOARD_STATUSES },
      },
      orderBy: { appliedAt: "desc" },
      select: {
        id: true,
        status: true,
        rating: true,
        appliedAt: true,
        currentStageId: true,
        candidate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        owner: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!job) {
    throw new NotFoundError("Job");
  }

  const columns = stages.map((stage) => ({
    stage,
    applications: applications.filter(
      (app) => app.currentStageId === stage.id,
    ),
  }));

  return { job, columns };
}

export async function getApplication(
  db: Db,
  actor: AccessUser,
  applicationId: string,
) {
  const scope = jobScopeWhere(actor);
  const application = await db.application.findFirst({
    where: scope
      ? {
          AND: [{ id: applicationId }, { job: scope }],
        }
      : { id: applicationId },
    include: {
      candidate: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          location: true,
          source: true,
          linkedinUrl: true,
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          ownerId: true,
          client: { select: { id: true, name: true } },
          stages: { orderBy: { order: "asc" } },
        },
      },
      currentStage: { select: { id: true, name: true, type: true } },
      owner: { select: { id: true, name: true, email: true } },
      stageHistory: {
        orderBy: { movedAt: "asc" },
        include: {
          fromStage: { select: { id: true, name: true } },
          toStage: { select: { id: true, name: true, type: true } },
          movedBy: { select: { id: true, name: true } },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
      interviews: {
        orderBy: { scheduledAt: "asc" },
        include: {
          panel: { select: { id: true, name: true } },
          scorecards: {
            include: {
              author: { select: { id: true, name: true } },
            },
          },
        },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
    },
  });

  if (!application) {
    throw new NotFoundError("Application");
  }

  return application;
}

export async function listApplications(
  db: Db,
  actor: AccessUser,
  input: ApplicationListInput,
) {
  const limit = input.limit ?? APPLICATION_PAGE_SIZE;
  const filters: Prisma.ApplicationWhereInput[] = [];

  if (input.jobId) filters.push({ jobId: input.jobId });
  if (input.status) {
    filters.push({ status: input.status });
  } else {
    filters.push({ status: { not: ApplicationStatus.ARCHIVED } });
  }

  const scope = jobScopeWhere(actor);
  if (scope) filters.push({ job: scope });

  const where = filters.length > 0 ? { AND: filters } : {};

  const rows = await db.application.findMany({
    where,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ appliedAt: "desc" }, { id: "desc" }],
    include: {
      candidate: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      job: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true, name: true } },
        },
      },
      currentStage: { select: { id: true, name: true, type: true } },
    },
  });

  let nextCursor: string | undefined;
  if (rows.length > limit) {
    nextCursor = rows.pop()!.id;
  }

  return { items: rows, nextCursor };
}

/** Resolves RBAC resource scope for an application (for move permission checks). */
export async function getApplicationMoveScope(
  db: Db,
  applicationId: string,
): Promise<{ assignedUserIds: string[] }> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { jobId: true },
  });
  if (!application) {
    throw new NotFoundError("Application");
  }
  const assignedUserIds = await getJobAssignedUserIds(db, application.jobId);
  return { assignedUserIds };
}

/** Self-service apply from the public careers portal. */
export async function applyToJobAsCandidate(
  db: PrismaClient,
  candidateId: string,
  jobId: string,
) {
  const job = await db.job.findFirst({
    where: { id: jobId, status: "OPEN" },
    select: { id: true, ownerId: true, title: true },
  });
  if (!job) {
    throw new NotFoundError("Job");
  }

  const existing = await db.application.findUnique({
    where: {
      candidateId_jobId: { candidateId, jobId },
    },
    select: { id: true },
  });
  if (existing) {
    throw new ConflictError(
      "You have already applied for this role.",
      existing.id,
    );
  }

  const firstStage = await db.pipelineStage.findFirst({
    where: { jobId },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
  if (!firstStage) {
    throw new ValidationError("This job is not accepting applications yet.");
  }

  return db.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        candidateId,
        jobId,
        currentStageId: firstStage.id,
        ownerId: job.ownerId,
        status: ApplicationStatus.ACTIVE,
      },
    });

    await tx.stageHistory.create({
      data: {
        applicationId: application.id,
        fromStageId: null,
        toStageId: firstStage.id,
        movedById: job.ownerId,
      },
    });

    await tx.note.create({
      data: {
        applicationId: application.id,
        authorId: job.ownerId,
        body: `Candidate applied online for ${job.title} (${firstStage.name}).`,
        type: "SYSTEM",
      },
    });

    return application;
  });
}

export async function listCandidateApplications(db: Db, candidateId: string) {
  return db.application.findMany({
    where: { candidateId },
    orderBy: { appliedAt: "desc" },
    select: {
      id: true,
      status: true,
      appliedAt: true,
      job: {
        select: {
          id: true,
          title: true,
          status: true,
          workMode: true,
          client: { select: { name: true } },
        },
      },
      currentStage: { select: { name: true } },
    },
  });
}
