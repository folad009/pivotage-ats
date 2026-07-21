import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { ForbiddenError, ValidationError } from "@/lib/errors";
import {
  assertUserModificationAllowed,
  buildUserListWhere,
  createUser,
  listUsers,
} from "@/server/services/user.service";

describe("buildUserListWhere", () => {
  it("returns an empty filter with no inputs", () => {
    expect(buildUserListWhere({})).toEqual({});
  });

  it("filters by role and active status", () => {
    expect(
      buildUserListWhere({ role: "RECRUITER", isActive: true }),
    ).toEqual({
      role: "RECRUITER",
      isActive: true,
    });
  });

  it("builds a case-insensitive search across name and email", () => {
    const where = buildUserListWhere({ search: "jane" });
    expect(where.OR).toHaveLength(2);
    expect(where.OR).toContainEqual({
      name: { contains: "jane", mode: "insensitive" },
    });
    expect(where.OR).toContainEqual({
      email: { contains: "jane", mode: "insensitive" },
    });
  });
});

describe("assertUserModificationAllowed", () => {
  const adminTarget = { id: "u1", role: "ADMIN" as const, isActive: true };

  it("prevents self-deactivation", () => {
    expect(() =>
      assertUserModificationAllowed("u1", adminTarget, { isActive: false }, 1),
    ).toThrow(ForbiddenError);
  });

  it("prevents self role change", () => {
    expect(() =>
      assertUserModificationAllowed(
        "u1",
        adminTarget,
        { role: "RECRUITER" },
        1,
      ),
    ).toThrow(ForbiddenError);
  });

  it("prevents removing the last active admin", () => {
    expect(() =>
      assertUserModificationAllowed(
        "actor",
        adminTarget,
        { role: "RECRUITER" },
        0,
      ),
    ).toThrow(ValidationError);
  });

  it("allows demoting an admin when another active admin exists", () => {
    expect(() =>
      assertUserModificationAllowed(
        "actor",
        adminTarget,
        { role: "RECRUITER" },
        1,
      ),
    ).not.toThrow();
  });
});

describe("createUser", () => {
  it("hashes the password and creates the user", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue({ id: "u1" });
    const db = { user: { findUnique, create } } as unknown as PrismaClient;

    await createUser(db, {
      email: "new@example.com",
      name: "New User",
      role: "RECRUITER",
      password: "Password123!",
      isActive: true,
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "new@example.com" },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledOnce();
    const createArgs = create.mock.calls[0]![0];
    expect(createArgs.data.email).toBe("new@example.com");
    expect(createArgs.data.passwordHash).toBeTruthy();
    expect(createArgs.data.passwordHash).not.toBe("Password123!");
  });
});

describe("listUsers pagination", () => {
  it("pops the extra row and returns a nextCursor when a page is full", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ id: `u${i}` }));
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { user: { findMany } } as unknown as PrismaClient;

    const result = await listUsers(db, { limit: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("u20");
  });
});
