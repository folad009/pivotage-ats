import { z } from "zod";

export const ACTIVITY_PAGE_SIZE = 20;

export const createNoteSchema = z
  .object({
    applicationId: z.string().min(1),
    body: z
      .string()
      .trim()
      .min(1, "Note cannot be empty")
      .max(5000, "Note is too long"),
  })
  .strict();

export const activityFeedInputSchema = z.object({
  applicationId: z.string().min(1),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const mentionUsersInputSchema = z.object({
  search: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type ActivityFeedInput = z.infer<typeof activityFeedInputSchema>;
export type MentionUsersInput = z.infer<typeof mentionUsersInputSchema>;
