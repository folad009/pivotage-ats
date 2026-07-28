import { InterviewStatus, InterviewType } from "@/lib/prisma-browser";
import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(500, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const scheduleInterviewSchema = z.object({
  applicationId: z.string().min(1),
  type: z.nativeEnum(InterviewType),
  scheduledAt: z.coerce.date(),
  durationMins: z
    .number()
    .int()
    .min(15, "Minimum 15 minutes")
    .max(480, "Maximum 8 hours")
    .default(60),
  location: optionalText,
  meetingUrl: optionalUrl,
  panelUserIds: z
    .array(z.string().min(1))
    .min(1, "Select at least one panel member")
    .transform((ids) => [...new Set(ids)]),
});

export const rescheduleInterviewSchema = z.object({
  id: z.string().min(1),
  scheduledAt: z.coerce.date(),
  durationMins: z
    .number()
    .int()
    .min(15, "Minimum 15 minutes")
    .max(480, "Maximum 8 hours")
    .optional(),
  location: optionalText,
  meetingUrl: optionalUrl,
});

export const cancelInterviewSchema = z.object({
  id: z.string().min(1),
});

export const interviewListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(InterviewStatus).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;
export type RescheduleInterviewInput = z.infer<typeof rescheduleInterviewSchema>;
export type CancelInterviewInput = z.infer<typeof cancelInterviewSchema>;
export type InterviewListInput = z.infer<typeof interviewListInputSchema>;
