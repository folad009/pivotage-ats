import {
  InterviewStatus,
  InterviewType,
  NoteType,
  type Prisma,
  type PrismaClient,
} from "@/lib/prisma";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  ACTIVITY_PAGE_SIZE,
  type ActivityFeedInput,
  type CreateNoteInput,
  type MentionUsersInput,
} from "@/lib/validations/note";
import type { AccessUser } from "@/lib/rbac";
import { assertApplicationMutable } from "@/server/services/application.service";
import { jobScopeWhere } from "@/server/services/job.service";

type Db = PrismaClient | Prisma.TransactionClient;

const MENTION_PATTERN =
  /@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z0-9][\w.-]*(?:\s+[A-Za-z][\w.-]*)?)/g;

/** Extracts @mention tokens from note body text (pure — unit tested). */
export function parseMentionTokens(body: string): string[] {
  const tokens = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const token = match[1]?.trim();
    if (token) tokens.add(token);
  }
  return [...tokens];
}

/** Rejects client attempts to create SYSTEM notes. */
export function assertClientNoteType(type: unknown): void {
  if (type === NoteType.SYSTEM || type === "SYSTEM") {
    throw new ForbiddenError("System notes cannot be created from the client.");
  }
  if (type !== undefined && type !== null) {
    throw new ForbiddenError("Note type cannot be specified by clients.");
  }
}

async function ensureApplicationAccessible(
  db: Db,
  actor: AccessUser,
  applicationId: string,
) {
  const scope = jobScopeWhere(actor);
  const application = await db.application.findFirst({
    where: scope
      ? { AND: [{ id: applicationId }, { job: scope }] }
      : { id: applicationId },
    select: {
      id: true,
      status: true,
      candidate: { select: { firstName: true, lastName: true } },
      job: { select: { title: true } },
    },
  });

  if (!application) {
    throw new NotFoundError("Application");
  }

  return application;
}

/** Maps @tokens to active user ids by email or display name (case-insensitive). */
export async function resolveMentionUserIds(
  db: Db,
  tokens: string[],
): Promise<string[]> {
  if (tokens.length === 0) return [];

  const users = await db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
  });

  const ids = new Set<string>();
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    const match = users.find((user) => {
      if (user.email.toLowerCase() === normalized) return true;
      if (user.email.toLowerCase().startsWith(`${normalized}@`)) return true;
      if (user.name?.toLowerCase() === normalized) return true;
      return false;
    });
    if (match) ids.add(match.id);
  }

  return [...ids];
}

export async function searchMentionUsers(
  db: Db,
  input: MentionUsersInput,
) {
  const limit = input.limit ?? 10;
  const search = input.search?.trim();

  return db.user.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take: limit,
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true },
  });
}

/** Internal helper for other services (stage moves, scheduling, etc.). */
export async function createSystemNote(
  db: Db,
  input: {
    applicationId: string;
    authorId: string;
    body: string;
  },
) {
  return db.note.create({
    data: {
      applicationId: input.applicationId,
      authorId: input.authorId,
      body: input.body,
      type: NoteType.SYSTEM,
      mentions: [],
    },
    select: { id: true },
  });
}

export async function createNote(
  db: Db,
  actor: AccessUser,
  input: CreateNoteInput,
) {
  const application = await ensureApplicationAccessible(
    db,
    actor,
    input.applicationId,
  );
  assertApplicationMutable(application.status);

  const mentionTokens = parseMentionTokens(input.body);
  const mentions = await resolveMentionUserIds(db, mentionTokens);

  const note = await db.note.create({
    data: {
      applicationId: input.applicationId,
      authorId: actor.id,
      body: input.body,
      type: NoteType.NOTE,
      mentions,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return { note, mentionedUserIds: mentions };
}

export type ActivityKind = "stage_move" | "note" | "interview";

export interface ActivityFeedCursor {
  occurredAt: string;
  id: string;
  kind: ActivityKind;
}

export type ActivityFeedItem =
  | {
      kind: "stage_move";
      id: string;
      occurredAt: Date;
      fromStageName: string | null;
      toStageName: string;
      movedBy: { id: string; name: string | null };
      reason: string | null;
    }
  | {
      kind: "note";
      id: string;
      occurredAt: Date;
      type: NoteType;
      body: string;
      author: { id: string; name: string | null };
      mentions: string[];
      mentionedUsers: Array<{ id: string; name: string | null; email: string }>;
    }
  | {
      kind: "interview";
      id: string;
      occurredAt: Date;
      interviewType: InterviewType;
      status: InterviewStatus;
      scheduledAt: Date;
      durationMins: number;
      panel: Array<{ id: string; name: string | null }>;
    };

function encodeCursor(cursor: ActivityFeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(raw: string): ActivityFeedCursor | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as ActivityFeedCursor;
    if (!parsed.id || !parsed.occurredAt || !parsed.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isBeforeCursor(
  item: { occurredAt: Date; id: string; kind: ActivityKind },
  cursor: ActivityFeedCursor,
): boolean {
  const cursorTime = new Date(cursor.occurredAt).getTime();
  const itemTime = item.occurredAt.getTime();
  if (itemTime < cursorTime) return true;
  if (itemTime > cursorTime) return false;
  if (item.id < cursor.id) return true;
  if (item.id > cursor.id) return false;
  const kindOrder: Record<ActivityKind, number> = {
    stage_move: 0,
    note: 1,
    interview: 2,
  };
  return kindOrder[item.kind] < kindOrder[cursor.kind];
}

/** Merges stage history, notes, and interviews into one chronological feed. */
export async function getActivityFeed(
  db: Db,
  actor: AccessUser,
  input: ActivityFeedInput,
) {
  await ensureApplicationAccessible(db, actor, input.applicationId);

  const limit = input.limit ?? ACTIVITY_PAGE_SIZE;
  const cursor = input.cursor ? decodeCursor(input.cursor) : null;

  const applicationId = input.applicationId;

  const [stageHistory, notes, interviews, mentionUsers] = await Promise.all([
    db.stageHistory.findMany({
      where: { applicationId },
      include: {
        fromStage: { select: { name: true } },
        toStage: { select: { name: true } },
        movedBy: { select: { id: true, name: true } },
      },
    }),
    db.note.findMany({
      where: {
        applicationId,
        OR: [
          { type: NoteType.NOTE },
          {
            type: NoteType.SYSTEM,
            NOT: { body: { startsWith: "Moved from" } },
          },
        ],
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    }),
    db.interview.findMany({
      where: { applicationId },
      include: {
        panel: { select: { id: true, name: true } },
      },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const mentionUserById = new Map(mentionUsers.map((user) => [user.id, user]));

  const items: ActivityFeedItem[] = [
    ...stageHistory.map(
      (entry): ActivityFeedItem => ({
        kind: "stage_move",
        id: entry.id,
        occurredAt: entry.movedAt,
        fromStageName: entry.fromStage?.name ?? null,
        toStageName: entry.toStage.name,
        movedBy: entry.movedBy,
        reason: entry.reason,
      }),
    ),
    ...notes.map(
      (note): ActivityFeedItem => ({
        kind: "note",
        id: note.id,
        occurredAt: note.createdAt,
        type: note.type,
        body: note.body,
        author: note.author,
        mentions: note.mentions,
        mentionedUsers: note.mentions
          .map((id) => mentionUserById.get(id))
          .filter((user): user is NonNullable<typeof user> => Boolean(user)),
      }),
    ),
    ...interviews.map(
      (interview): ActivityFeedItem => ({
        kind: "interview",
        id: interview.id,
        occurredAt: interview.createdAt,
        interviewType: interview.type,
        status: interview.status,
        scheduledAt: interview.scheduledAt,
        durationMins: interview.durationMins,
        panel: interview.panel,
      }),
    ),
  ];

  items.sort((a, b) => {
    const diff = b.occurredAt.getTime() - a.occurredAt.getTime();
    if (diff !== 0) return diff;
    if (a.id !== b.id) return a.id < b.id ? 1 : -1;
    const kindOrder: Record<ActivityKind, number> = {
      stage_move: 0,
      note: 1,
      interview: 2,
    };
    return kindOrder[b.kind] - kindOrder[a.kind];
  });

  const filtered = cursor
    ? items.filter((item) => isBeforeCursor(item, cursor))
    : items;

  const page = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({
          occurredAt: last.occurredAt.toISOString(),
          id: last.id,
          kind: last.kind,
        })
      : undefined;

  return { items: page, nextCursor };
}

export async function notifyMentionedUsers(input: {
  mentionedUsers: Array<{ email: string; name: string | null }>;
  authorName: string | null;
  candidateName: string;
  jobTitle: string;
  noteBody: string;
  applicationId: string;
}) {
  if (input.mentionedUsers.length === 0) return;

  const { sendEmail } = await import("@/server/services/email.service");
  const author = input.authorName ?? "A teammate";
  const preview =
    input.noteBody.length > 200
      ? `${input.noteBody.slice(0, 200)}…`
      : input.noteBody;

  await Promise.all(
    input.mentionedUsers.map((user) =>
      sendEmail({
        to: user.email,
        subject: `${author} mentioned you on ${input.candidateName}`,
        html: `
          <p>Hi ${user.name ?? "there"},</p>
          <p><strong>${author}</strong> mentioned you in a note on
          <strong>${input.candidateName}</strong> (${input.jobTitle}).</p>
          <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">
            ${preview.replace(/\n/g, "<br/>")}
          </blockquote>
          <p>View the application in Privotage Consulting ATS.</p>
        `.trim(),
      }),
    ),
  );
}
