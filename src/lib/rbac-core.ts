import type { Role } from "@/lib/prisma-browser";

/**
 * Pure RBAC matrix — safe to import from Client Components (no server deps).
 * Server boundaries must still enforce these rules; UI checks are UX only.
 */

export type Action =
  | "user:manage"
  | "client:manage"
  | "job:manage"
  | "pipeline:configure"
  | "candidate:manage"
  | "application:create"
  | "application:move"
  | "interview:schedule"
  | "scorecard:submit"
  | "candidate:viewPII"
  | "note:add"
  | "report:view"
  | "application:archive"
  | "application:restore"
  | "candidate:gdprErase";

export interface AccessUser {
  id: string;
  role: Role;
}

export interface ResourceScope {
  assignedUserIds?: string[];
  interviewerIds?: string[];
}

type Rule = "allow" | "deny" | "scoped";

const MATRIX: Record<Role, Record<Action, Rule>> = {
  ADMIN: {
    "user:manage": "allow",
    "client:manage": "allow",
    "job:manage": "allow",
    "pipeline:configure": "allow",
    "candidate:manage": "allow",
    "application:create": "allow",
    "application:move": "allow",
    "interview:schedule": "allow",
    "scorecard:submit": "allow",
    "candidate:viewPII": "allow",
    "note:add": "allow",
    "report:view": "allow",
    "application:archive": "allow",
    "application:restore": "allow",
    "candidate:gdprErase": "allow",
  },
  RECRUITER: {
    "user:manage": "deny",
    "client:manage": "allow",
    "job:manage": "allow",
    "pipeline:configure": "allow",
    "candidate:manage": "allow",
    "application:create": "allow",
    "application:move": "allow",
    "interview:schedule": "allow",
    "scorecard:submit": "allow",
    "candidate:viewPII": "allow",
    "note:add": "allow",
    "report:view": "allow",
    "application:archive": "allow",
    "application:restore": "deny",
    "candidate:gdprErase": "deny",
  },
  HIRING_MANAGER: {
    "user:manage": "deny",
    "client:manage": "deny",
    "job:manage": "deny",
    "pipeline:configure": "deny",
    "candidate:manage": "deny",
    "application:create": "deny",
    "application:move": "scoped",
    "interview:schedule": "scoped",
    "scorecard:submit": "scoped",
    "candidate:viewPII": "scoped",
    "note:add": "allow",
    "report:view": "scoped",
    "application:archive": "deny",
    "application:restore": "deny",
    "candidate:gdprErase": "deny",
  },
};

function isInScope(
  user: AccessUser,
  action: Action,
  resource?: ResourceScope,
): boolean {
  if (!resource) return false;
  if (action === "scorecard:submit") {
    return resource.interviewerIds?.includes(user.id) ?? false;
  }
  return resource.assignedUserIds?.includes(user.id) ?? false;
}

export function can(
  user: AccessUser,
  action: Action,
  resource?: ResourceScope,
): boolean {
  const rule = MATRIX[user.role][action];
  if (rule === "allow") return true;
  if (rule === "deny") return false;
  return isInScope(user, action, resource);
}

export function mayBrowseCandidatePII(user: AccessUser): boolean {
  const rule = MATRIX[user.role]["candidate:viewPII"];
  return rule === "allow" || rule === "scoped";
}

export function mayMoveApplication(user: AccessUser): boolean {
  const rule = MATRIX[user.role]["application:move"];
  return rule === "allow" || rule === "scoped";
}

export function mayScheduleInterview(user: AccessUser): boolean {
  const rule = MATRIX[user.role]["interview:schedule"];
  return rule === "allow" || rule === "scoped";
}

export function maySubmitScorecard(user: AccessUser): boolean {
  const rule = MATRIX[user.role]["scorecard:submit"];
  return rule === "allow" || rule === "scoped";
}

export function mayViewReports(user: AccessUser): boolean {
  const rule = MATRIX[user.role]["report:view"];
  return rule === "allow" || rule === "scoped";
}
