import { Role, type Prisma, type PrismaClient, type StageType } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac";
import type {
  CreateJobInput,
  JobListInput,
  PipelineStageInput,
  UpdateJobInput,
} from "@/lib/validations/job";

type Db = PrismaClient | Prisma.TransactionClient;

export const JOB_PAGE_SIZE = 20;

/** Default pipeline applied to every new job (AGENTS.md §6). */
export const DEFAULT_PIPELINE_STAGES: ReadonlyArray<{
  name: string;
  type: StageType;
}> = [
  { name: "Sourced", type: "SOURCED" },
  { name: "Screening", type: "SCREENING" },
  { name: "Phone Interview", type: "INTERVIEW" },
  { name: "Onsite", type: "INTERVIEW" },
  { name: "Offer", type: "OFFER" },
  { name: "Hired", type: "HIRED" },
  { name: "Rejected", type: "REJECTED" },
];

/**
 * Row-level scope for a viewer (AGENTS.md §7). Admins and recruiters see all
 * jobs; hiring managers only see jobs they own or sit on an interview panel for.
 */
export function jobScopeWhere(actor: AccessUser): Prisma.JobWhereInput | null {
  if (actor.role === Role.HIRING_MANAGER) {
    return {
      OR: [
        { ownerId: actor.id },
        {
          applications: {
            some: {
              interviews: {
                some: { panel: { some: { id: actor.id } } },
              },
            },
          },
        },
      ],
    };
  }
  return null;
}

/** Pure builder for the job list `where` clause — unit tested without a DB. */
export function buildJobListWhere(
  actor: AccessUser,
  input: Pick<JobListInput, "status" | "clientId" | "ownerId" | "search">,
): Prisma.JobWhereInput {
  const filters: Prisma.JobWhereInput[] = [];

  if (input.status) filters.push({ status: input.status });
  if (input.clientId) filters.push({ clientId: input.clientId });
  if (input.ownerId) filters.push({ ownerId: input.ownerId });
  if (input.search) {
    filters.push({
      OR: [
        { title: { contains: input.search, mode: "insensitive" } },
        { department: { contains: input.search, mode: "insensitive" } },
        { client: { name: { contains: input.search, mode: "insensitive" } } },
      ],
    });
  }

  const scope = jobScopeWhere(actor);
  if (scope) filters.push(scope);

  return filters.length > 0 ? { AND: filters } : {};
}

export async function listJobs(db: Db, actor: AccessUser, input: JobListInput) {
  const limit = input.limit ?? JOB_PAGE_SIZE;
  const where = buildJobListWhere(actor, input);

  const rows = await db.job.findMany({
    where,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { applications: true } },
    },
  });

  let nextCursor: string | undefined;
  if (rows.length > limit) {
    nextCursor = rows.pop()!.id;
  }

  return { items: rows, nextCursor };
}

export async function getJob(db: Db, actor: AccessUser, id: string) {
  const scope = jobScopeWhere(actor);
  const job = await db.job.findFirst({
    where: scope ? { AND: [{ id }, scope] } : { id },
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      stages: { orderBy: { order: "asc" } },
      _count: { select: { applications: true } },
    },
  });
  if (!job) {
    throw new NotFoundError("Job");
  }
  return job;
}

export async function createJob(db: Db, input: CreateJobInput & { ownerId: string }) {
  return db.job.create({
    data: {
      title: input.title,
      clientId: input.clientId,
      ownerId: input.ownerId,
      department: input.department ?? null,
      location: input.location ?? null,
      employmentType: input.employmentType,
      status: input.status,
      openings: input.openings,
      description: input.description ?? null,
      stages: {
        create: DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
          name: stage.name,
          type: stage.type,
          order: index,
        })),
      },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}

export async function updateJob(db: Db, input: UpdateJobInput) {
  const { id, ownerId, ...rest } = input;
  await ensureJobExists(db, id);

  return db.job.update({
    where: { id },
    data: {
      ...(rest.title !== undefined ? { title: rest.title } : {}),
      ...(rest.clientId !== undefined ? { clientId: rest.clientId } : {}),
      ...(ownerId !== undefined ? { ownerId } : {}),
      ...(rest.department !== undefined
        ? { department: rest.department ?? null }
        : {}),
      ...(rest.location !== undefined
        ? { location: rest.location ?? null }
        : {}),
      ...(rest.employmentType !== undefined
        ? { employmentType: rest.employmentType }
        : {}),
      ...(rest.status !== undefined ? { status: rest.status } : {}),
      ...(rest.openings !== undefined ? { openings: rest.openings } : {}),
      ...(rest.description !== undefined
        ? { description: rest.description ?? null }
        : {}),
    },
  });
}

export async function setJobStatus(
  db: Db,
  id: string,
  status: Prisma.JobUpdateInput["status"],
) {
  await ensureJobExists(db, id);
  return db.job.update({ where: { id }, data: { status } });
}

// ---------------------------------------------------------------------------
// Pipeline configuration
// ---------------------------------------------------------------------------

interface ExistingStage {
  id: string;
  /** Applications + history rows referencing this stage (blocks deletion). */
  usageCount: number;
}

export interface PipelinePlan {
  creates: { name: string; type: StageType; order: number }[];
  updates: { id: string; name: string; type: StageType; order: number }[];
  deletes: string[];
}

/**
 * Pure reconciliation of an existing pipeline against the desired ordered list.
 * Throws if a stage that is in use would be removed. Unit tested without a DB.
 */
export function planPipelineUpdate(
  existing: ExistingStage[],
  desired: PipelineStageInput[],
): PipelinePlan {
  const existingById = new Map(existing.map((stage) => [stage.id, stage]));
  const desiredIds = new Set(
    desired.map((stage) => stage.id).filter((id): id is string => Boolean(id)),
  );

  const plan: PipelinePlan = { creates: [], updates: [], deletes: [] };

  for (const stage of existing) {
    if (!desiredIds.has(stage.id)) {
      if (stage.usageCount > 0) {
        throw new ValidationError(
          "Cannot remove a stage that still has applications or history. Move them first.",
        );
      }
      plan.deletes.push(stage.id);
    }
  }

  desired.forEach((stage, order) => {
    if (stage.id) {
      if (!existingById.has(stage.id)) {
        throw new ValidationError("Unknown stage in pipeline update.");
      }
      plan.updates.push({ id: stage.id, name: stage.name, type: stage.type, order });
    } else {
      plan.creates.push({ name: stage.name, type: stage.type, order });
    }
  });

  return plan;
}

export async function updatePipelineStages(
  db: PrismaClient,
  jobId: string,
  desired: PipelineStageInput[],
) {
  await ensureJobExists(db, jobId);

  const existingRows = await db.pipelineStage.findMany({
    where: { jobId },
    select: {
      id: true,
      _count: {
        select: { currentApplications: true, movedFrom: true, movedTo: true },
      },
    },
  });

  const existing: ExistingStage[] = existingRows.map((row) => ({
    id: row.id,
    usageCount:
      row._count.currentApplications + row._count.movedFrom + row._count.movedTo,
  }));

  const plan = planPipelineUpdate(existing, desired);

  await db.$transaction(async (tx) => {
    // Park every surviving stage at a temporary, collision-free order so the
    // unique [jobId, order] constraint never trips mid-reorder.
    let temp = -1;
    for (const update of plan.updates) {
      await tx.pipelineStage.update({
        where: { id: update.id },
        data: { order: temp },
      });
      temp -= 1;
    }

    if (plan.deletes.length > 0) {
      await tx.pipelineStage.deleteMany({
        where: { id: { in: plan.deletes } },
      });
    }

    for (const update of plan.updates) {
      await tx.pipelineStage.update({
        where: { id: update.id },
        data: { name: update.name, type: update.type, order: update.order },
      });
    }

    for (const create of plan.creates) {
      await tx.pipelineStage.create({
        data: {
          jobId,
          name: create.name,
          type: create.type,
          order: create.order,
        },
      });
    }
  });

  return db.pipelineStage.findMany({
    where: { jobId },
    orderBy: { order: "asc" },
  });
}

export async function jobOwnerId(db: Db, id: string): Promise<string> {
  const job = await db.job.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!job) {
    throw new NotFoundError("Job");
  }
  return job.ownerId;
}

async function ensureJobExists(db: Db, id: string) {
  const existing = await db.job.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("Job");
  }
}
