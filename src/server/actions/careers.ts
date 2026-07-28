"use server";

import { getCurrentCandidate } from "@/lib/rbac-session";
import { applyToJobSchema } from "@/lib/validations/candidate-register";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import { db } from "@/server/db";
import { applyToJobAsCandidate } from "@/server/services/application.service";

export async function applyToJobAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const candidate = await getCurrentCandidate();
    const data = applyToJobSchema.parse(input);
    const application = await applyToJobAsCandidate(
      db,
      candidate.id,
      data.jobId,
    );
    return ok({ id: application.id });
  } catch (error) {
    return toActionError(error);
  }
}
