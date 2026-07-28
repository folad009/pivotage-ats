import type { PrismaClient } from "@/lib/prisma";
import { describe, expect, it, vi } from "vitest";

import { ValidationError } from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac";
import {
  DEFAULT_PIPELINE_STAGES,
  buildJobListWhere,
  createJob,
  jobScopeWhere,
  planPipelineUpdate,
} from "@/server/services/job.service";

const admin: AccessUser = { id: "u-admin", role: "ADMIN" };
const recruiter: AccessUser = { id: "u-rec", role: "RECRUITER" };
const manager: AccessUser = { id: "u-hm", role: "HIRING_MANAGER" };

describe("DEFAULT_PIPELINE_STAGES", () => {
  it("contains the seven canonical stages in order", () => {
    expect(DEFAULT_PIPELINE_STAGES).toHaveLength(7);
    expect(DEFAULT_PIPELINE_STAGES[0]).toEqual({
      name: "Sourced",
      type: "SOURCED",
    });
    expect(DEFAULT_PIPELINE_STAGES.at(-1)).toEqual({
      name: "Rejected",
      type: "REJECTED",
    });
  });
});

describe("jobScopeWhere", () => {
  it("returns null for admins and recruiters (see everything)", () => {
    expect(jobScopeWhere(admin)).toBeNull();
    expect(jobScopeWhere(recruiter)).toBeNull();
  });

  it("scopes hiring managers to owned jobs or panel membership", () => {
    const scope = jobScopeWhere(manager);
    const or = scope?.OR;
    expect(or).toContainEqual({ ownerId: "u-hm" });
    expect(Array.isArray(or) ? or[1] : undefined).toMatchObject({
      applications: {
        some: { interviews: { some: { panel: { some: { id: "u-hm" } } } } },
      },
    });
  });
});

describe("buildJobListWhere", () => {
  it("returns an empty filter for an admin with no filters", () => {
    expect(buildJobListWhere(admin, {})).toEqual({});
  });

  it("ANDs filters together for recruiters without scope", () => {
    const where = buildJobListWhere(recruiter, {
      status: "OPEN",
      clientId: "client1",
    });
    expect(where.AND).toEqual([
      { status: "OPEN" },
      { clientId: "client1" },
    ]);
  });

  it("always includes the scope clause for hiring managers", () => {
    const where = buildJobListWhere(manager, { status: "OPEN" });
    const and = where.AND;
    expect(and).toHaveLength(2);
    expect(Array.isArray(and) ? and[1] : undefined).toHaveProperty("OR");
  });
});

describe("planPipelineUpdate", () => {
  it("creates ordered stages when none exist", () => {
    const plan = planPipelineUpdate(
      [],
      [
        { name: "Sourced", type: "SOURCED" },
        { name: "Screening", type: "SCREENING" },
      ],
    );
    expect(plan.creates).toEqual([
      { name: "Sourced", type: "SOURCED", order: 0 },
      { name: "Screening", type: "SCREENING", order: 1 },
    ]);
    expect(plan.updates).toHaveLength(0);
    expect(plan.deletes).toHaveLength(0);
  });

  it("reorders existing stages by their new index", () => {
    const existing = [
      { id: "a", usageCount: 0 },
      { id: "b", usageCount: 0 },
    ];
    const plan = planPipelineUpdate(existing, [
      { id: "b", name: "B", type: "SCREENING" },
      { id: "a", name: "A", type: "SOURCED" },
    ]);
    expect(plan.updates).toEqual([
      { id: "b", name: "B", type: "SCREENING", order: 0 },
      { id: "a", name: "A", type: "SOURCED", order: 1 },
    ]);
    expect(plan.creates).toHaveLength(0);
    expect(plan.deletes).toHaveLength(0);
  });

  it("deletes stages omitted from the desired list", () => {
    const existing = [
      { id: "a", usageCount: 0 },
      { id: "b", usageCount: 0 },
    ];
    const plan = planPipelineUpdate(existing, [
      { id: "a", name: "A", type: "SOURCED" },
    ]);
    expect(plan.deletes).toEqual(["b"]);
  });

  it("refuses to delete a stage that is still in use", () => {
    const existing = [{ id: "a", usageCount: 3 }];
    expect(() => planPipelineUpdate(existing, [])).toThrow(ValidationError);
  });

  it("rejects an unknown stage id", () => {
    expect(() =>
      planPipelineUpdate([], [{ id: "ghost", name: "X", type: "OFFER" }]),
    ).toThrow(ValidationError);
  });

  it("handles a mixed create + update + delete in one pass", () => {
    const existing = [
      { id: "keep", usageCount: 0 },
      { id: "drop", usageCount: 0 },
    ];
    const plan = planPipelineUpdate(existing, [
      { id: "keep", name: "Keep", type: "SOURCED" },
      { name: "Fresh", type: "OFFER" },
    ]);
    expect(plan.updates).toEqual([
      { id: "keep", name: "Keep", type: "SOURCED", order: 0 },
    ]);
    expect(plan.creates).toEqual([
      { name: "Fresh", type: "OFFER", order: 1 },
    ]);
    expect(plan.deletes).toEqual(["drop"]);
  });
});

describe("createJob", () => {
  it("seeds the seven default pipeline stages in order", async () => {
    const create = vi.fn().mockResolvedValue({ id: "j1" });
    const db = { job: { create } } as unknown as PrismaClient;

    await createJob(db, {
      title: "Engineer",
      clientId: "c1",
      ownerId: "u-rec",
      department: undefined,
      location: undefined,
      employmentType: "FULL_TIME",
      workMode: "REMOTE",
      status: "DRAFT",
      openings: 1,
      jobRole: undefined,
      description: undefined,
      requirements: undefined,
    });

    expect(create).toHaveBeenCalledTimes(1);
    const arg = create.mock.calls[0]![0] as {
      data: { stages: { create: { order: number }[] } };
    };
    const stages = arg.data.stages.create;
    expect(stages).toHaveLength(7);
    expect(stages.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
