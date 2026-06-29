import { z } from "zod";

export const archiveApplicationSchema = z.object({
  applicationId: z.string().min(1),
});

export const restoreApplicationSchema = z.object({
  applicationId: z.string().min(1),
});

export const gdprEraseCandidateSchema = z.object({
  candidateId: z.string().min(1),
  confirmation: z.literal("ERASE", {
    message: 'Type "ERASE" to confirm permanent erasure',
  }),
});

export const updateRetentionSettingsSchema = z.object({
  retentionDays: z.coerce
    .number()
    .int()
    .min(30, "Retention must be at least 30 days")
    .max(3650, "Retention cannot exceed 10 years"),
});

export type ArchiveApplicationInput = z.infer<typeof archiveApplicationSchema>;
export type RestoreApplicationInput = z.infer<typeof restoreApplicationSchema>;
export type GdprEraseCandidateInput = z.infer<typeof gdprEraseCandidateSchema>;
export type UpdateRetentionSettingsInput = z.infer<
  typeof updateRetentionSettingsSchema
>;
