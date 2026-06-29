import { Role, type Prisma, type PrismaClient } from "@prisma/client";

import { ConflictError, NotFoundError } from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac";
import type {
  CandidateListInput,
  CreateCandidateInput,
  UpdateCandidateInput,
} from "@/lib/validations/candidate";
import { jobScopeWhere } from "@/server/services/job.service";

type Db = PrismaClient | Prisma.TransactionClient;

export const CANDIDATE_PAGE_SIZE = 20;

/**
 * Row-level scope for candidate PII (AGENTS.md §7). Hiring managers may only
 * see candidates linked to jobs they are assigned to.
 */
export function candidateScopeWhere(
  actor: AccessUser,
): Prisma.CandidateWhereInput | null {
  if (actor.role === Role.HIRING_MANAGER) {
    const jobScope = jobScopeWhere(actor);
    if (!jobScope) return null;
    return {
      applications: {
        some: { job: jobScope },
      },
    };
  }
  return null;
}

/** Pure builder for the candidate list `where` clause — unit tested without a DB. */
export function buildCandidateListWhere(
  actor: AccessUser,
  input: Pick<CandidateListInput, "search" | "tagId">,
): Prisma.CandidateWhereInput {
  const filters: Prisma.CandidateWhereInput[] = [];

  if (input.search) {
    filters.push({
      OR: [
        { firstName: { contains: input.search, mode: "insensitive" } },
        { lastName: { contains: input.search, mode: "insensitive" } },
        { email: { contains: input.search, mode: "insensitive" } },
      ],
    });
  }

  if (input.tagId) {
    filters.push({ tags: { some: { id: input.tagId } } });
  }

  const scope = candidateScopeWhere(actor);
  if (scope) filters.push(scope);

  return filters.length > 0 ? { AND: filters } : {};
}

/**
 * Pure email dedupe check — returns the conflicting candidate id when the email
 * is already taken by another record.
 */
export function findEmailConflict(
  email: string,
  existingId: string | undefined,
  candidates: { id: string; email: string }[],
): string | undefined {
  const match = candidates.find(
    (candidate) =>
      candidate.email.toLowerCase() === email.toLowerCase() &&
      candidate.id !== existingId,
  );
  return match?.id;
}

async function assertUniqueEmail(
  db: Db,
  email: string,
  excludeId?: string,
): Promise<void> {
  const existing = await db.candidate.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError(
      "A candidate with this email already exists.",
      existing.id,
    );
  }
}

export async function listCandidates(
  db: Db,
  actor: AccessUser,
  input: CandidateListInput,
) {
  const limit = input.limit ?? CANDIDATE_PAGE_SIZE;
  const where = buildCandidateListWhere(actor, input);

  const rows = await db.candidate.findMany({
    where,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
    include: {
      tags: { select: { id: true, name: true, color: true } },
      _count: { select: { applications: true, attachments: true } },
    },
  });

  let nextCursor: string | undefined;
  if (rows.length > limit) {
    nextCursor = rows.pop()!.id;
  }

  return { items: rows, nextCursor };
}

export async function listTags(db: Db) {
  return db.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
}

export async function getCandidate(db: Db, actor: AccessUser, id: string) {
  const scope = candidateScopeWhere(actor);
  const candidate = await db.candidate.findFirst({
    where: scope ? { AND: [{ id }, scope] } : { id },
    include: {
      tags: { select: { id: true, name: true, color: true } },
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
      applications: {
        orderBy: { appliedAt: "desc" },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          job: {
            select: {
              id: true,
              title: true,
              client: { select: { id: true, name: true } },
            },
          },
          currentStage: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!candidate) {
    throw new NotFoundError("Candidate");
  }

  return candidate;
}

export async function createCandidate(db: Db, input: CreateCandidateInput) {
  await assertUniqueEmail(db, input.email);

  return db.candidate.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      location: input.location ?? null,
      source: input.source ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      ...(input.tagIds?.length
        ? { tags: { connect: input.tagIds.map((id) => ({ id })) } }
        : {}),
    },
  });
}

export async function updateCandidate(db: Db, input: UpdateCandidateInput) {
  const { id, tagIds, ...rest } = input;
  await ensureCandidateExists(db, id);

  if (rest.email !== undefined) {
    await assertUniqueEmail(db, rest.email, id);
  }

  return db.candidate.update({
    where: { id },
    data: {
      ...(rest.firstName !== undefined ? { firstName: rest.firstName } : {}),
      ...(rest.lastName !== undefined ? { lastName: rest.lastName } : {}),
      ...(rest.email !== undefined ? { email: rest.email } : {}),
      ...(rest.phone !== undefined ? { phone: rest.phone ?? null } : {}),
      ...(rest.location !== undefined ? { location: rest.location ?? null } : {}),
      ...(rest.source !== undefined ? { source: rest.source ?? null } : {}),
      ...(rest.linkedinUrl !== undefined
        ? { linkedinUrl: rest.linkedinUrl ?? null }
        : {}),
      ...(tagIds !== undefined
        ? { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } }
        : {}),
    },
  });
}

export async function createCandidateAttachment(
  db: Db,
  input: {
    candidateId: string;
    storageKey: string;
    fileName: string;
    mimeType: string;
    size: number;
  },
) {
  await ensureCandidateExists(db, input.candidateId);

  return db.attachment.create({
    data: {
      candidateId: input.candidateId,
      storageKey: input.storageKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.size,
    },
  });
}

export async function getAttachmentForDownload(
  db: Db,
  actor: AccessUser,
  attachmentId: string,
) {
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      candidateId: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      size: true,
    },
  });

  if (!attachment?.candidateId) {
    throw new NotFoundError("Attachment");
  }

  const scope = candidateScopeWhere(actor);
  if (scope) {
    const visible = await db.candidate.findFirst({
      where: { AND: [{ id: attachment.candidateId }, scope] },
      select: { id: true },
    });
    if (!visible) {
      throw new NotFoundError("Attachment");
    }
  }

  return attachment;
}

async function ensureCandidateExists(db: Db, id: string) {
  const existing = await db.candidate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("Candidate");
  }
}
