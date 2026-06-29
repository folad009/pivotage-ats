"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError } from "@/lib/errors";
import { can, getCurrentUser, requirePermission } from "@/lib/rbac";
import {
  createApplicationSchema,
  moveStageSchema,
  rejectApplicationSchema,
  withdrawApplicationSchema,
} from "@/lib/validations/application";
import { db } from "@/server/db";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import {
  createApplication,
  getApplicationMoveScope,
  moveStage,
  withdrawApplication,
} from "@/server/services/application.service";

async function authorizeApplicationMove(applicationId: string) {
  const actor = await getCurrentUser();
  const scope = await getApplicationMoveScope(db, applicationId);
  if (!can(actor, "application:move", scope)) {
    throw new ForbiddenError();
  }
  return actor;
}

export async function createApplicationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requirePermission("application:create");
    const data = createApplicationSchema.parse(input);
    const application = await createApplication(db, actor, data);
    revalidatePath("/applications");
    revalidatePath(`/applications/board/${data.jobId}`);
    return ok({ id: application.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function moveStageAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string; jobId: string; jobCloseSuggested: boolean }>> {
  try {
    const data = moveStageSchema.parse(input);
    const actor = await authorizeApplicationMove(data.applicationId);
    const result = await moveStage(db, actor, data);
    revalidatePath("/applications");
    revalidatePath(`/applications/board/${result.jobId}`);
    revalidatePath(`/applications/detail/${data.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string; jobId: string; jobCloseSuggested: boolean }>> {
  try {
    const data = rejectApplicationSchema.parse(input);
    const actor = await authorizeApplicationMove(data.applicationId);
    const result = await moveStage(db, actor, data);
    revalidatePath("/applications");
    revalidatePath(`/applications/board/${result.jobId}`);
    revalidatePath(`/applications/detail/${data.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function withdrawApplicationAction(
  input: unknown,
): Promise<ActionResult<{ applicationId: string }>> {
  try {
    const data = withdrawApplicationSchema.parse(input);
    const actor = await authorizeApplicationMove(data.applicationId);
    const result = await withdrawApplication(
      db,
      actor,
      data.applicationId,
      data.reason,
    );
    revalidatePath("/applications");
    revalidatePath(`/applications/detail/${data.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}
