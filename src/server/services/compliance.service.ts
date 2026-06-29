import {
  ApplicationStatus,
  ComplianceEventType,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { randomUUID } from "node:crypto";

import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  deriveStatusOnRestore,
} from "@/lib/compliance-rules";
import type { AccessUser } from "@/lib/rbac";
import type { UpdateRetentionSettingsInput } from "@/lib/validations/compliance";
import { jobScopeWhere } from "@/server/services/job.service";
import {
  deleteStorageObjects,
  isStorageConfigured,
} from "@/server/services/storage.service";

type Db = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_RETENTION_DAYS = 365;

const ERASED_FIRST_NAME = "[Erased]";
const ERASED_LAST_NAME = "[Candidate]";

async function getApplicationForCompliance(
  db: Db,
  actor: AccessUser,
  applicationId: string,
) {
  const scope = jobScopeWhere(actor);
  const application = await db.application.findFirst({
    where: scope
      ? { AND: [{ id: applicationId }, { job: scope }] }
      : { id: applicationId },
    include: {
      currentStage: { select: { type: true, name: true } },
      job: { select: { id: true, title: true } },
    },
  });
  if (!application) {
    throw new NotFoundError("Application");
  }
  return application;
}

export async function getAgencySettings(db: Db) {
  return db.agencySettings.upsert({
    where: { id: "default" },
    create: { id: "default", retentionDays: DEFAULT_RETENTION_DAYS },
    update: {},
  });
}

export async function updateRetentionSettings(
  db: PrismaClient,
  actor: AccessUser,
  input: UpdateRetentionSettingsInput,
) {
  return db.agencySettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      retentionDays: input.retentionDays,
      updatedById: actor.id,
    },
    update: {
      retentionDays: input.retentionDays,
      updatedById: actor.id,
    },
  });
}

async function writeComplianceAudit(
  db: Db,
  input: {
    eventType: ComplianceEventType;
    subjectType: string;
    subjectId: string;
    performedById: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return db.complianceAuditLog.create({
    data: {
      eventType: input.eventType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      performedById: input.performedById,
      metadata: input.metadata ?? undefined,
    },
  });
}

async function collectCandidateAttachmentKeys(db: Db, candidateId: string) {
  const attachments = await db.attachment.findMany({
    where: {
      OR: [{ candidateId }, { application: { candidateId } }],
    },
    select: { id: true, storageKey: true },
  });
  return attachments;
}

/** Anonymizes candidate PII and removes attachments; audit records stay intact. */
export async function anonymizeCandidatePII(
  db: PrismaClient,
  candidateId: string,
  performedById: string,
  eventType: ComplianceEventType,
  metadata?: Record<string, Prisma.InputJsonValue>,
) {
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true, anonymizedAt: true },
  });
  if (!candidate) {
    throw new NotFoundError("Candidate");
  }
  if (candidate.anonymizedAt) {
    return { candidateId, alreadyAnonymized: true, attachmentsRemoved: 0 };
  }

  const attachments = await collectCandidateAttachmentKeys(db, candidateId);
  const storageKeys = attachments.map((item) => item.storageKey);

  if (storageKeys.length > 0 && isStorageConfigured()) {
    await deleteStorageObjects(storageKeys);
  }

  await db.$transaction(async (tx) => {
    if (attachments.length > 0) {
      await tx.attachment.deleteMany({
        where: { id: { in: attachments.map((item) => item.id) } },
      });
    }

    await tx.candidate.update({
      where: { id: candidateId },
      data: {
        firstName: ERASED_FIRST_NAME,
        lastName: ERASED_LAST_NAME,
        email: `erased-${randomUUID()}@anonymized.local`,
        phone: null,
        location: null,
        linkedinUrl: null,
        source: null,
        anonymizedAt: new Date(),
        tags: { set: [] },
      },
    });

    await writeComplianceAudit(tx, {
      eventType,
      subjectType: "candidate",
      subjectId: candidateId,
      performedById,
      metadata: {
        attachmentsRemoved: attachments.length,
        ...metadata,
      },
    });
  });

  return {
    candidateId,
    alreadyAnonymized: false,
    attachmentsRemoved: attachments.length,
  };
}

export async function gdprEraseCandidate(
  db: PrismaClient,
  actor: AccessUser,
  candidateId: string,
) {
  const candidate = await db.candidate.findUnique({
    where: { id: candidateId },
    select: { id: true },
  });
  if (!candidate) {
    throw new NotFoundError("Candidate");
  }

  return anonymizeCandidatePII(
    db,
    candidateId,
    actor.id,
    ComplianceEventType.GDPR_ERASURE,
    { trigger: "admin_erasure" },
  );
}

export interface RetentionPurgeResult {
  processed: number;
  skippedActive: number;
}

/** Anonymizes candidates whose archived applications exceeded the retention window. */
export async function runRetentionPurge(
  db: PrismaClient,
  performedById: string,
  asOf: Date,
): Promise<RetentionPurgeResult> {
  const settings = await getAgencySettings(db);
  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - settings.retentionDays);

  const expiredApplications = await db.application.findMany({
    where: {
      status: ApplicationStatus.ARCHIVED,
      archivedAt: { lt: cutoff },
      candidate: { anonymizedAt: null },
    },
    select: { candidateId: true },
    distinct: ["candidateId"],
  });

  let processed = 0;
  let skippedActive = 0;

  for (const { candidateId } of expiredApplications) {
    const activeCount = await db.application.count({
      where: { candidateId, status: ApplicationStatus.ACTIVE },
    });
    if (activeCount > 0) {
      skippedActive += 1;
      continue;
    }

    await anonymizeCandidatePII(
      db,
      candidateId,
      performedById,
      ComplianceEventType.RETENTION_PURGE,
      { retentionDays: settings.retentionDays, cutoff: cutoff.toISOString() },
    );
    processed += 1;
  }

  return { processed, skippedActive };
}

export async function archiveApplication(
  db: PrismaClient,
  actor: AccessUser,
  applicationId: string,
) {
  const application = await getApplicationForCompliance(db, actor, applicationId);

  if (application.status === ApplicationStatus.ARCHIVED) {
    throw new ValidationError("This application is already archived.");
  }

  const archivedAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: application.id },
      data: {
        status: ApplicationStatus.ARCHIVED,
        archivedAt,
      },
    });

    await tx.note.create({
      data: {
        applicationId: application.id,
        authorId: actor.id,
        body: `Application archived for ${application.job.title}.`,
        type: "SYSTEM",
      },
    });
  });

  return {
    applicationId: application.id,
    jobId: application.job.id,
    archivedAt,
  };
}

export async function restoreApplication(
  db: PrismaClient,
  actor: AccessUser,
  applicationId: string,
) {
  const application = await getApplicationForCompliance(db, actor, applicationId);

  if (application.status !== ApplicationStatus.ARCHIVED) {
    throw new ValidationError("Only archived applications can be restored.");
  }

  const restoredStatus = deriveStatusOnRestore(application.currentStage.type);

  await db.$transaction(async (tx) => {
    await tx.application.update({
      where: { id: application.id },
      data: {
        status: restoredStatus,
        archivedAt: null,
      },
    });

    await tx.note.create({
      data: {
        applicationId: application.id,
        authorId: actor.id,
        body: `Application restored from archive (${restoredStatus}).`,
        type: "SYSTEM",
      },
    });
  });

  return {
    applicationId: application.id,
    jobId: application.job.id,
    status: restoredStatus,
  };
}

/** Returns archive permission scope for an application (job assignment). */
export async function getApplicationArchiveScope(
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

  const job = await db.job.findUnique({
    where: { id: application.jobId },
    select: {
      ownerId: true,
      applications: {
        select: {
          interviews: { select: { panel: { select: { id: true } } } },
        },
      },
    },
  });
  if (!job) {
    throw new NotFoundError("Job");
  }

  const ids = new Set<string>([job.ownerId]);
  for (const app of job.applications) {
    for (const interview of app.interviews) {
      for (const member of interview.panel) {
        ids.add(member.id);
      }
    }
  }
  return { assignedUserIds: [...ids] };
}
