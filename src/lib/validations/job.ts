import { EmploymentType, JobStatus, StageType } from "@prisma/client";
import { z } from "zod";

export const JOB_STATUSES = Object.values(JobStatus);
export const EMPLOYMENT_TYPES = Object.values(EmploymentType);
export const STAGE_TYPES = Object.values(StageType);

const optionalText = z
  .string()
  .trim()
  .max(160, "Too long")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createJobSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Too long"),
  clientId: z.string().min(1, "Client is required"),
  ownerId: z.string().min(1).optional(),
  department: optionalText,
  location: optionalText,
  employmentType: z
    .nativeEnum(EmploymentType)
    .default(EmploymentType.FULL_TIME),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
  openings: z.coerce.number().int().min(1, "At least one opening").max(999),
  description: z
    .string()
    .trim()
    .max(5000, "Too long")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const updateJobSchema = createJobSchema.partial().extend({
  id: z.string().min(1),
});

export const setJobStatusSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(JobStatus),
});

export const jobListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(JobStatus).optional(),
  clientId: z.string().min(1).optional(),
  ownerId: z.string().min(1).optional(),
  search: z.string().trim().optional(),
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
export type PipelineStageInput = z.infer<typeof pipelineStageInputSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
