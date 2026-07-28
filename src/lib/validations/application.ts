import { ApplicationStatus } from "@/lib/prisma-browser";
import { z } from "zod";

export const createApplicationSchema = z.object({
  candidateId: z.string().min(1, "Candidate is required"),
  jobId: z.string().min(1, "Job is required"),
  ownerId: z.string().min(1).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const moveStageSchema = z.object({
  applicationId: z.string().min(1),
  toStageId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const rejectApplicationSchema = moveStageSchema.extend({
  reason: z
    .string()
    .trim()
    .min(1, "A reason is required when rejecting a candidate")
    .max(2000, "Reason is too long"),
});

export const withdrawApplicationSchema = z.object({
  applicationId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .max(2000, "Reason is too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const applicationBoardInputSchema = z.object({
  jobId: z.string().min(1),
});

export const applicationListInputSchema = z.object({
  jobId: z.string().min(1).optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type MoveStageInput = z.infer<typeof moveStageSchema>;
export type RejectApplicationInput = z.infer<typeof rejectApplicationSchema>;
export type WithdrawApplicationInput = z.infer<typeof withdrawApplicationSchema>;
export type ApplicationBoardInput = z.infer<typeof applicationBoardInputSchema>;
export type ApplicationListInput = z.infer<typeof applicationListInputSchema>;
