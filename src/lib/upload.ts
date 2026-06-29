import { randomBytes } from "node:crypto";

import { ValidationError } from "@/lib/errors";
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_BYTES,
  type AllowedResumeMimeType,
  type UploadRequestInput,
  type ValidatedUploadRequest,
} from "@/lib/upload-constants";

export {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_BYTES,
  type AllowedResumeMimeType,
  type UploadRequestInput,
  type ValidatedUploadRequest,
} from "@/lib/upload-constants";

/**
 * Validates upload metadata server-side. Never trust client-provided mime/size
 * without re-checking at the boundary (AGENTS.md §15).
 */
export function validateUploadRequest(
  input: UploadRequestInput,
): ValidatedUploadRequest {
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new ValidationError("File is empty or invalid.");
  }
  if (input.size > MAX_RESUME_BYTES) {
    throw new ValidationError(
      `File exceeds the ${Math.round(MAX_RESUME_BYTES / (1024 * 1024))} MB limit.`,
    );
  }
  if (
    !ALLOWED_RESUME_MIME_TYPES.includes(
      input.mimeType as AllowedResumeMimeType,
    )
  ) {
    throw new ValidationError("Only PDF and Word documents are allowed.");
  }
  return {
    mimeType: input.mimeType as AllowedResumeMimeType,
    size: input.size,
  };
}

/** Generates an unguessable object key — never derived from client filenames. */
export function generateStorageKey(): string {
  const token = randomBytes(16).toString("hex");
  return `attachments/${token}`;
}

/** Strips path segments and control chars from a display filename. */
export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "resume";
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").slice(0, 200);
  return cleaned.length > 0 ? cleaned : "resume";
}
