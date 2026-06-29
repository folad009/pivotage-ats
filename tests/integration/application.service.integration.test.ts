// @vitest-environment node
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { moveStage } from "@/server/services/application.service";

const db = new PrismaClient();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("moveStage integration", () => {
  let applicationId: string;
  let targetStageId: string;
  let actorId: string;

  beforeAll(async () => {
    const application = await db.application.findFirst({
      where: { status: "ACTIVE" },
      include: {
        currentStage: true,
        job: { include: { stages: { orderBy: { order: "asc" } } } },
      },
    });
    if (!application) {
      throw new Error("Seed data required: no active application found.");
    }

    applicationId = application.id;
    actorId = application.ownerId;
    const target = application.job.stages.find(
      (stage) => stage.id !== application.currentStageId,
    );
    if (!target) {
      throw new Error("Seed data required: no alternate pipeline stage found.");
    }
    targetStageId = target.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("writes StageHistory and a SYSTEM note atomically on move", async () => {
    const beforeHistory = await db.stageHistory.count({
      where: { applicationId },
    });
    const beforeNotes = await db.note.count({
      where: { applicationId, type: "SYSTEM" },
    });

    await moveStage(db, { id: actorId, role: "RECRUITER" }, {
      applicationId,
      toStageId: targetStageId,
    });

    const afterHistory = await db.stageHistory.count({
      where: { applicationId },
    });
    const afterNotes = await db.note.count({
      where: { applicationId, type: "SYSTEM" },
    });

    expect(afterHistory).toBeGreaterThanOrEqual(beforeHistory);
    expect(afterNotes).toBeGreaterThanOrEqual(beforeNotes + 1);

    const latestNote = await db.note.findFirst({
      where: { applicationId, type: "SYSTEM" },
      orderBy: { createdAt: "desc" },
    });
    expect(latestNote?.body).toContain("Moved from");
  });
});
