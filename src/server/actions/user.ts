"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/rbac";
import {
  createUserSchema,
  updateUserSchema,
} from "@/lib/validations/user";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import { db } from "@/server/db";
import { createUser, updateUser } from "@/server/services/user.service";

export async function createUserAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("user:manage");
    const data = createUserSchema.parse(input);
    const user = await createUser(db, data);
    revalidatePath("/settings");
    return ok({ id: user.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const actor = await requirePermission("user:manage");
    const data = updateUserSchema.parse(input);
    const user = await updateUser(db, actor.id, data);
    revalidatePath("/settings");
    return ok({ id: user.id });
  } catch (error) {
    return toActionError(error);
  }
}
