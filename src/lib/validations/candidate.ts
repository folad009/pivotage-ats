import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(160, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createCandidateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "Too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform((value) => value.trim().toLowerCase()),
  phone: optionalText,
  location: optionalText,
  source: optionalText,
  linkedinUrl: optionalUrl,
  tagIds: z.array(z.string().min(1)).optional(),
});

export const updateCandidateSchema = createCandidateSchema.partial().extend({
  id: z.string().min(1),
});

export const candidateListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().trim().optional(),
  tagId: z.string().min(1).optional(),
});

export const requestResumeUploadSchema = z.object({
  candidateId: z.string().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export const confirmResumeUploadSchema = z.object({
  candidateId: z.string().min(1),
  storageKey: z.string().min(1),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
});

export const resumeDownloadSchema = z.object({
  attachmentId: z.string().min(1),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type CandidateListInput = z.infer<typeof candidateListInputSchema>;
