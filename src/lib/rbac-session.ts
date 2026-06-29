import type { Role } from "@prisma/client";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import {
  can,
  mayBrowseCandidatePII,
  type AccessUser,
  type Action,
  type ResourceScope,
} from "@/lib/rbac-core";

export async function getCurrentUser(): Promise<
  AccessUser & { email: string; name: string | null }
> {
  const { auth } = await import("@/server/auth");
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}

export async function requireRole(
  ...roles: Role[]
): Promise<AccessUser & { email: string; name: string | null }> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}

export async function requirePermission(
  action: Action,
  resource?: ResourceScope,
): Promise<AccessUser & { email: string; name: string | null }> {
  const user = await getCurrentUser();
  if (!can(user, action, resource)) {
    throw new ForbiddenError();
  }
  return user;
}

export async function requireCandidateViewAccess(): Promise<
  AccessUser & { email: string; name: string | null }
> {
  const user = await getCurrentUser();
  if (!mayBrowseCandidatePII(user)) {
    throw new ForbiddenError();
  }
  return user;
}
