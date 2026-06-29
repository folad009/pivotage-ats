import { Recommendation } from "@prisma/client";
import { z } from "zod";

export const scorecardCriteriaSchema = z.record(
  z.string().trim().min(1).max(80),
  z.number().int().min(1).max(5),
);

export const upsertScorecardSchema = z.object({
  interviewId: z.string().min(1),
  overall: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  recommendation: z.nativeEnum(Recommendation),
  criteria: scorecardCriteriaSchema.optional(),
  comments: z
    .string()
    .trim()
    .max(5000, "Comments are too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UpsertScorecardInput = z.infer<typeof upsertScorecardSchema>;
