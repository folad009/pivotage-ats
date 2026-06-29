"use server";

import { revalidatePath } from "next/cache";

import { ValidationError } from "@/lib/errors";
import { requireCandidateViewAccess, requirePermission } from "@/lib/rbac";
import {
  generateStorageKey,
  sanitizeFileName,
  validateUploadRequest,
} from "@/lib/upload";
import {
  confirmResumeUploadSchema,
  createCandidateSchema,
  requestResumeUploadSchema,
  resumeDownloadSchema,
  updateCandidateSchema,
} from "@/lib/validations/candidate";
import { db } from "@/server/db";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import {
  createCandidate,
  createCandidateAttachment,
  getAttachmentForDownload,
  updateCandidate,
} from "@/server/services/candidate.service";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  isStorageConfigured,
} from "@/server/services/storage.service";

export async function createCandidateAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("candidate:manage");
    const data = createCandidateSchema.parse(input);
    const candidate = await createCandidate(db, data);
    revalidatePath("/candidates");
    return ok({ id: candidate.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCandidateAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("candidate:manage");
    const data = updateCandidateSchema.parse(input);
    const candidate = await updateCandidate(db, data);
    revalidatePath("/candidates");
    revalidatePath(`/candidates/${candidate.id}`);
    return ok({ id: candidate.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestResumeUploadAction(
  input: unknown,
): Promise<
  ActionResult<{ uploadUrl: string; storageKey: string; expiresIn: number }>
> {
  try {
    await requirePermission("candidate:manage");
    if (!isStorageConfigured()) {
      throw new ValidationError(
        "File storage is not configured. Contact an administrator.",
      );
    }

    const data = requestResumeUploadSchema.parse(input);
    const validated = validateUploadRequest({
      mimeType: data.mimeType,
      size: data.size,
    });

    const storageKey = generateStorageKey();
    const uploadUrl = await createPresignedUploadUrl(
      storageKey,
      validated.mimeType,
      validated.size,
    );

    return ok({ uploadUrl, storageKey, expiresIn: 300 });
  } catch (error) {
    return toActionError(error);
  }
}

export async function confirmResumeUploadAction(
  input: unknown,
): Promise<ActionResult<{ attachmentId: string }>> {
  try {
    await requirePermission("candidate:manage");
    const data = confirmResumeUploadSchema.parse(input);
    const validated = validateUploadRequest({
      mimeType: data.mimeType,
      size: data.size,
    });

    const attachment = await createCandidateAttachment(db, {
      candidateId: data.candidateId,
      storageKey: data.storageKey,
      fileName: sanitizeFileName(data.fileName),
      mimeType: validated.mimeType,
      size: validated.size,
    });

    revalidatePath("/candidates");
    revalidatePath(`/candidates/${data.candidateId}`);
    return ok({ attachmentId: attachment.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function getResumeDownloadUrlAction(
  input: unknown,
): Promise<ActionResult<{ downloadUrl: string; fileName: string }>> {
  try {
    const actor = await requireCandidateViewAccess();
    if (!isStorageConfigured()) {
      throw new ValidationError(
        "File storage is not configured. Contact an administrator.",
      );
    }

    const data = resumeDownloadSchema.parse(input);
    const attachment = await getAttachmentForDownload(
      db,
      actor,
      data.attachmentId,
    );

    const downloadUrl = await createPresignedDownloadUrl(
      attachment.storageKey,
      attachment.fileName,
    );

    return ok({ downloadUrl, fileName: attachment.fileName });
  } catch (error) {
    return toActionError(error);
  }
}
