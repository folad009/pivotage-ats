import type { PrismaClient } from "@/lib/prisma";
import { describe, expect, it, vi } from "vitest";

import {
  buildClientListWhere,
  createClient,
  listClients,
} from "@/server/services/client.service";

describe("buildClientListWhere", () => {
  it("returns an empty filter with no inputs", () => {
    expect(buildClientListWhere({})).toEqual({});
  });

  it("filters by status", () => {
    expect(buildClientListWhere({ status: "ACTIVE" })).toEqual({
      status: "ACTIVE",
    });
  });

  it("builds a case-insensitive search across name, email and industry", () => {
    const where = buildClientListWhere({ search: "acme" });
    expect(where.OR).toHaveLength(3);
    expect(where.OR).toContainEqual({
      name: { contains: "acme", mode: "insensitive" },
    });
    expect(where.OR).toContainEqual({
      contactEmail: { contains: "acme", mode: "insensitive" },
    });
  });
});

describe("createClient", () => {
  it("normalizes optional fields to null", async () => {
    const create = vi.fn().mockResolvedValue({ id: "c1" });
    const db = { client: { create } } as unknown as PrismaClient;

    await createClient(db, {
      name: "Acme",
      contactEmail: undefined,
      industry: undefined,
      status: "ACTIVE",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        name: "Acme",
        contactEmail: null,
        industry: null,
        status: "ACTIVE",
      },
    });
  });
});

describe("listClients pagination", () => {
  it("pops the extra row and returns a nextCursor when a page is full", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ id: `c${i}` }));
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { client: { findMany } } as unknown as PrismaClient;

    const result = await listClients(db, { limit: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBe("c20");
  });

  it("returns no cursor when the page is not full", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({ id: `c${i}` }));
    const findMany = vi.fn().mockResolvedValue(rows);
    const db = { client: { findMany } } as unknown as PrismaClient;

    const result = await listClients(db, { limit: 20 });

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeUndefined();
  });
});
