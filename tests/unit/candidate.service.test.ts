import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ConflictError } from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac";
import {
  buildCandidateListWhere,
  candidateScopeWhere,
  createCandidate,
  findEmailConflict,
  listCandidates,
} from "@/server/services/candidate.service";

const admin: AccessUser = { id: "u-admin", role: "ADMIN" };
const recruiter: AccessUser = { id: "u-rec", role: "RECRUITER" };
const manager: AccessUser = { id: "u-hm", role: "HIRING_MANAGER" };

describe("candidateScopeWhere", () => {
  it("returns null for admins and recruiters", () => {
    expect(candidateScopeWhere(admin)).toBeNull();
    expect(candidateScopeWhere(recruiter)).toBeNull();
  });

  it("scopes hiring managers to candidates on assigned jobs", () => {
    const scope = candidateScopeWhere(manager);
    expect(scope?.applications?.some).toBeDefined();
  });
});

describe("buildCandidateListWhere", () => {
  it("returns empty filter for admin with no inputs", () => {
    expect(buildCandidateListWhere(admin, {})).toEqual({});
  });

  it("searches across name and email", () => {
    const where = buildCandidateListWhere(recruiter, { search: "olivia" });
    expect(where.AND).toBeDefined();
    const searchClause = (where.AND as object[])[0];
    expect(searchClause).toHaveProperty("OR");
  });

  it("filters by tag", () => {
    const where = buildCandidateListWhere(recruiter, { tagId: "tag1" });
    expect(where.AND).toContainEqual({
      tags: { some: { id: "tag1" } },
    });
  });

  it("includes HM scope in list filters", () => {
    const where = buildCandidateListWhere(manager, { search: "test" });
    const and = where.AND as object[];
    expect(and.length).toBeGreaterThanOrEqual(2);
  });
});

describe("findEmailConflict", () => {
  it("returns the conflicting id when email is taken", () => {
    expect(
      findEmailConflict(
        "taken@test",
        undefined,
        [{ id: "x", email: "taken@test" }],
      ),
    ).toBe("x");
  });
});

describe("createCandidate dedupe", () => {
  it("throws ConflictError with existingId on duplicate email", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "existing" });
    const db = {
      candidate: { findUnique, create: vi.fn() },
    } as unknown as PrismaClient;

    await expect(
      createCandidate(db, {
        firstName: "A",
        lastName: "B",
        email: "dup@test",
      }),
    ).rejects.toMatchObject({
      name: "ConflictError",
      existingId: "existing",
    } satisfies Partial<ConflictError>);
  });
});

describe("listCandidates pagination", () => {
  it("returns nextCursor when page is full", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}` }));
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { candidate: { findMany } } as unknown as PrismaClient;

    const result = await listCandidates(db, admin, { limit: 20 });
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("c20");
  });
});
