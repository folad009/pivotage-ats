/** Resume MIME types accepted for upload (AGENTS.md §15). */
export const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedResumeMimeType = (typeof ALLOWED_RESUME_MIME_TYPES)[number];

/** Maximum resume size: 10 MiB. */
export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export interface UploadRequestInput {
  mimeType: string;
  size: number;
}

export interface ValidatedUploadRequest {
  mimeType: AllowedResumeMimeType;
  size: number;
}
