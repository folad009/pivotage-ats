"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { ForbiddenError } from "@/lib/errors";
import { requirePermission } from "@/lib/rbac";
import {
  createJobSchema,
  setJobStatusSchema,
  updateJobSchema,
  updatePipelineSchema,
} from "@/lib/validations/job";
import { db } from "@/server/db";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import {
  createJob,
  jobOwnerId,
  setJobStatus,
  updateJob,
  updatePipelineStages,
} from "@/server/services/job.service";

export async function createJobAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requirePermission("job:manage");
    const data = createJobSchema.parse(input);
    const job = await createJob(db, {
      ...data,
      ownerId: data.ownerId ?? actor.id,
    });
    revalidatePath("/jobs");
    return ok({ id: job.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateJobAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("job:manage");
    const data = updateJobSchema.parse(input);
    const job = await updateJob(db, data);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${job.id}`);
    return ok({ id: job.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function setJobStatusAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("job:manage");
    const data = setJobStatusSchema.parse(input);
    const job = await setJobStatus(db, data.id, data.status);
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${job.id}`);
    return ok({ id: job.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePipelineAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requirePermission("pipeline:configure");
    const data = updatePipelineSchema.parse(input);

    // Recruiters may only configure pipelines on jobs they own (AGENTS.md §7).
    if (actor.role === Role.RECRUITER) {
      const ownerId = await jobOwnerId(db, data.jobId);
      if (ownerId !== actor.id) {
        throw new ForbiddenError();
      }
    }

    await updatePipelineStages(db, data.jobId, data.stages);
    revalidatePath(`/jobs/${data.jobId}`);
    return ok({ id: data.jobId });
  } catch (error) {
    return toActionError(error);
  }
}
