import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import { can, type AccessUser, type Action, type ResourceScope } from "@/lib/rbac";

type Expectation = "allow" | "deny" | "scoped";

/**
 * Mirror of the AGENTS.md §7 permission matrix. Each cell is asserted against
 * `can()` so the matrix stays the single source of truth.
 */
const EXPECTED: Record<Role, Record<Action, Expectation>> = {
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

const USERS: Record<Role, AccessUser> = {
  ADMIN: { id: "user-admin", role: "ADMIN" },
  RECRUITER: { id: "user-recruiter", role: "RECRUITER" },
  HIRING_MANAGER: { id: "user-hm", role: "HIRING_MANAGER" },
};

const roles = Object.keys(EXPECTED) as Role[];

describe("can() — full RBAC matrix (AGENTS.md §7)", () => {
  for (const role of roles) {
    const user = USERS[role];
    const actions = Object.keys(EXPECTED[role]) as Action[];

    for (const action of actions) {
      const expectation = EXPECTED[role][action];

      const inScope: ResourceScope = {
        assignedUserIds: [user.id],
        interviewerIds: [user.id],
      };
      const outOfScope: ResourceScope = {
        assignedUserIds: ["someone-else"],
        interviewerIds: ["someone-else"],
      };

      if (expectation === "allow") {
        it(`${role} is allowed to ${action}`, () => {
          expect(can(user, action)).toBe(true);
        });
      } else if (expectation === "deny") {
        it(`${role} is denied ${action} (even with a matching resource)`, () => {
          expect(can(user, action)).toBe(false);
          expect(can(user, action, inScope)).toBe(false);
        });
      } else {
        it(`${role} is scoped on ${action}`, () => {
          expect(can(user, action)).toBe(false);
          expect(can(user, action, outOfScope)).toBe(false);
          expect(can(user, action, inScope)).toBe(true);
        });
      }
    }
  }
});

describe("scoped capabilities resolve the right field", () => {
  const hm = USERS.HIRING_MANAGER;

  it("scorecard:submit checks interviewerIds, not assignment", () => {
    expect(
      can(hm, "scorecard:submit", { interviewerIds: [hm.id] }),
    ).toBe(true);
    expect(
      can(hm, "scorecard:submit", { assignedUserIds: [hm.id] }),
    ).toBe(false);
  });

  it("application:move checks assignedUserIds", () => {
    expect(can(hm, "application:move", { assignedUserIds: [hm.id] })).toBe(true);
    expect(can(hm, "application:move", { interviewerIds: [hm.id] })).toBe(false);
  });
});
