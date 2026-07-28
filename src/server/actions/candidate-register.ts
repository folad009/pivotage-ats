"use server";

import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import { registerCandidateSchema } from "@/lib/validations/candidate-register";
import { db } from "@/server/db";
import { registerCandidate } from "@/server/services/candidate.service";

export async function registerCandidateAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const data = registerCandidateSchema.parse(input);
    const candidate = await registerCandidate(db, data);
    return ok({ id: candidate.id });
  } catch (error) {
    return toActionError(error);
  }
}
