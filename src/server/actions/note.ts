"use server";

import { revalidatePath } from "next/cache";

import { createNoteSchema } from "@/lib/validations/note";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/server/db";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import {
  assertClientNoteType,
  createNote,
  notifyMentionedUsers,
} from "@/server/services/note.service";

export async function addNoteAction(
  input: unknown,
): Promise<
  ActionResult<{
    id: string;
    applicationId: string;
    body: string;
    mentions: string[];
    createdAt: string;
    author: { id: string; name: string | null; email: string };
  }>
> {
  try {
    if (input && typeof input === "object" && "type" in input) {
      assertClientNoteType((input as { type?: unknown }).type);
    }

    const actor = await requirePermission("note:add");
    const data = createNoteSchema.parse(input);
    const application = await db.application.findUnique({
      where: { id: data.applicationId },
      select: {
        id: true,
        candidate: { select: { firstName: true, lastName: true } },
        job: { select: { title: true } },
      },
    });

    const { note, mentionedUserIds } = await createNote(db, actor, data);

    if (mentionedUserIds.length > 0 && application) {
      const mentionedUsers = await db.user.findMany({
        where: { id: { in: mentionedUserIds } },
        select: { email: true, name: true },
      });
      await notifyMentionedUsers({
        mentionedUsers,
        authorName: actor.name,
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        jobTitle: application.job.title,
        noteBody: note.body,
        applicationId: application.id,
      });
    }

    revalidatePath(`/applications/detail/${data.applicationId}`);

    return ok({
      id: note.id,
      applicationId: note.applicationId,
      body: note.body,
      mentions: note.mentions,
      createdAt: note.createdAt.toISOString(),
      author: note.author,
    });
  } catch (error) {
    return toActionError(error);
  }
}
