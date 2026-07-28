import type { Session } from "next-auth";

import { UnauthorizedError } from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac-core";

export type StaffUser = AccessUser & {
  email: string;
  name: string | null;
};

export function getStaffUser(session: Session | null): StaffUser {
  if (
    !session?.user ||
    session.user.accountType !== "staff" ||
    !session.user.role
  ) {
    throw new UnauthorizedError();
  }

  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}
