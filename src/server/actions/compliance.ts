"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError } from "@/lib/errors";
import { can, getCurrentUser, requirePermission, requireRole } from "@/lib/rbac";
import {
  archiveApplicationSchema,
  gdprEraseCandidateSchema,
  restoreApplicationSchema,
  updateRetentionSettingsSchema,
} from "@/lib/validations/compliance";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import { db } from "@/server/db";
import {
  archiveApplication,
  gdprEraseCandidate,
  getApplicationArchiveScope,
  restoreApplication,
  runRetentionPurge,
  updateRetentionSettings,
} from "@/server/services/compliance.service";

async function authorizeArchive(applicationId: string) {
  const actor = await getCurrentUser();
  const scope = await getApplicationArchiveScope(db, applicationId);
  if (!can(actor, "application:archive", scope)) {
    throw new ForbiddenError();
  }
  return actor;
}

export async function archiveApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string; jobId: string }>> {
  try {
    const data = archiveApplicationSchema.parse(input);
    const actor = await authorizeArchive(data.applicationId);
    const result = await archiveApplication(db, actor, data.applicationId);
    revalidatePath("/applications");
    revalidatePath(`/applications/board/${result.jobId}`);
    revalidatePath(`/applications/detail/${data.applicationId}`);
    revalidatePath(`/jobs/${result.jobId}`);
    return ok({ applicationId: result.applicationId, jobId: result.jobId });
  } catch (error) {
    return toActionError(error);
  }
}

export async function restoreApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string; jobId: string }>> {
  try {
    const data = restoreApplicationSchema.parse(input);
    const actor = await requirePermission("application:restore");
    const result = await restoreApplication(db, actor, data.applicationId);
    revalidatePath("/applications");
    revalidatePath(`/applications/board/${result.jobId}`);
    revalidatePath(`/applications/detail/${data.applicationId}`);
    revalidatePath(`/jobs/${result.jobId}`);
    return ok({ applicationId: result.applicationId, jobId: result.jobId });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateRetentionSettingsAction(
  input: unknown,
): Promise<ActionResult<{ retentionDays: number }>> {
  try {
    const actor = await requireRole("ADMIN");
    const data = updateRetentionSettingsSchema.parse(input);
    const settings = await updateRetentionSettings(db, actor, data);
    revalidatePath("/settings");
    return ok({ retentionDays: settings.retentionDays });
  } catch (error) {
    return toActionError(error);
  }
}

export async function runRetentionPurgeAction(): Promise<
  ActionResult<{ processed: number; skippedActive: number }>
> {
  try {
    const actor = await requireRole("ADMIN");
    const result = await runRetentionPurge(db, actor.id, new Date());
    revalidatePath("/settings");
    revalidatePath("/candidates");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function gdprEraseCandidateAction(
  input: unknown,
): Promise<
  ActionResult<{
    candidateId: string;
    alreadyAnonymized: boolean;
    attachmentsRemoved: number;
  }>
> {
  try {
    const actor = await requirePermission("candidate:gdprErase");
    const data = gdprEraseCandidateSchema.parse(input);
    const result = await gdprEraseCandidate(db, actor, data.candidateId);
    revalidatePath("/candidates");
    revalidatePath(`/candidates/${data.candidateId}`);
    revalidatePath("/applications");
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
