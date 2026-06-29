import { ZodError } from "zod";

import { AppError, ConflictError } from "@/lib/errors";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; existingId?: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  error: string,
  existingId?: string,
): ActionResult<never> {
  return existingId ? { ok: false, error, existingId } : { ok: false, error };
}

/**
 * Maps thrown errors to a safe, user-facing action result. Never leaks stack
 * traces or internal details to the client (AGENTS.md §8, §15).
 */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    return fail(error.issues[0]?.message ?? "Invalid input");
  }
  if (error instanceof ConflictError) {
    return fail(error.message, error.existingId);
  }
  if (error instanceof AppError) {
    return fail(error.message);
  }
  console.error("Unexpected action error:", error);
  return fail("Something went wrong. Please try again.");
}
