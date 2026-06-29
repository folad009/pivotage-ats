// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ConflictError } from "@/lib/errors";
import { createApplication } from "@/server/services/application.service";
import {
  disconnectTestDb,
  getTestDb,
  hasTestDatabase,
} from "../helpers/test-db";

describe.skipIf(!hasTestDatabase)("application uniqueness integration", () => {
  const db = getTestDb();
  let recruiterId: string;

  beforeAll(async () => {
    const recruiter = await db.user.findFirst({
      where: { role: "RECRUITER", isActive: true },
      select: { id: true },
    });
    if (!recruiter) {
      throw new Error("Seed data required: no recruiter user found.");
    }
    recruiterId = recruiter.id;
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("rejects duplicate candidate+job applications", async () => {
    const existing = await db.application.findFirst({
      select: { id: true, candidateId: true, jobId: true },
    });
    if (!existing) {
      throw new Error("Seed data required: no application found.");
    }

    await expect(
      createApplication(db, { id: recruiterId, role: "RECRUITER" }, {
        candidateId: existing.candidateId,
        jobId: existing.jobId,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
