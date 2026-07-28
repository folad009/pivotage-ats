import { EmploymentType, JobStatus, StageType, WorkMode } from "@/lib/prisma-browser";
import { z } from "zod";

import { IN_HOUSE_CLIENT_VALUE } from "@/lib/constants";

export const JOB_STATUSES = Object.values(JobStatus);
export const EMPLOYMENT_TYPES = Object.values(EmploymentType);
export const WORK_MODES = Object.values(WorkMode);
export const STAGE_TYPES = Object.values(StageType);

const optionalText = z
  .string()
  .trim()
  .max(160, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalLongText = z
  .string()
  .trim()
  .max(5000, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

const clientIdInput = z
  .union([z.literal(IN_HOUSE_CLIENT_VALUE), z.string().min(1)])
  .optional()
  .or(z.literal("").transform(() => IN_HOUSE_CLIENT_VALUE));

const jobFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Too long"),
  clientId: clientIdInput,
  ownerId: z.string().min(1).optional(),
  department: optionalText,
  location: optionalText,
  employmentType: z
    .nativeEnum(EmploymentType)
    .default(EmploymentType.FULL_TIME),
  workMode: z.nativeEnum(WorkMode).default(WorkMode.REMOTE),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
  openings: z.coerce.number().int().min(1, "At least one opening").max(999),
  jobRole: optionalText,
  description: optionalLongText,
  requirements: optionalLongText,
});

export const jobFormSchema = jobFieldsSchema;

export const createJobSchema = jobFieldsSchema.transform((data) => ({
  ...data,
  clientId:
    !data.clientId || data.clientId === IN_HOUSE_CLIENT_VALUE
      ? null
      : data.clientId,
}));

export const updateJobSchema = jobFieldsSchema
  .partial()
  .extend({ id: z.string().min(1) })
  .transform((data) => ({
    ...data,
    clientId:
      data.clientId === undefined
        ? undefined
        : !data.clientId || data.clientId === IN_HOUSE_CLIENT_VALUE
          ? null
          : data.clientId,
  }));

export const setJobStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(JobStatus),
});

export const jobListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  clientId: z
    .union([z.literal(IN_HOUSE_CLIENT_VALUE), z.string().min(1)])
    .optional(),
  ownerId: z.string().min(1).optional(),
  search: z.string().trim().optional(),
});

export const publicJobListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  search: z.string().trim().optional(),
  workMode: z.nativeEnum(WorkMode).optional(),
});

const pipelineStageInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Stage name is required").max(80, "Too long"),
  type: z.nativeEnum(StageType),
});

export const updatePipelineSchema = z.object({
  jobId: z.string().min(1),
  stages: z
    .array(pipelineStageInputSchema)
    .min(1, "A pipeline needs at least one stage")
    .max(20, "Too many stages"),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type SetJobStatusInput = z.infer<typeof setJobStatusSchema>;
export type JobListInput = z.infer<typeof jobListInputSchema>;
export type PublicJobListInput = z.infer<typeof publicJobListInputSchema>;
export type PipelineStageInput = z.infer<typeof pipelineStageInputSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
