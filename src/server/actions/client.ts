"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/rbac";
import {
  createClientSchema,
  updateClientSchema,
} from "@/lib/validations/client";
import { db } from "@/server/db";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import { createClient, updateClient } from "@/server/services/client.service";

export async function createClientAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("client:manage");
    const data = createClientSchema.parse(input);
    const client = await createClient(db, data);
    revalidatePath("/clients");
    return ok({ id: client.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateClientAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("client:manage");
    const data = updateClientSchema.parse(input);
    const client = await updateClient(db, data);
    revalidatePath("/clients");
    revalidatePath(`/clients/${client.id}`);
    return ok({ id: client.id });
  } catch (error) {
    return toActionError(error);
  }
}
