// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createNote,
  getActivityFeed,
} from "@/server/services/note.service";
import { getTestDb } from "../helpers/test-db";

const db = getTestDb();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("note service integration", () => {
  let applicationId: string;
  let recruiterId: string;

  beforeAll(async () => {
    const application = await db.application.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, ownerId: true },
    });
    if (!application) {
      throw new Error("Seed data required: no active application found.");
    }
    applicationId = application.id;
    recruiterId = application.ownerId;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates a NOTE with resolved @mentions", async () => {
    const recruiter = await db.user.findUnique({
      where: { id: recruiterId },
      select: { name: true, email: true },
    });
    if (!recruiter?.name) {
      throw new Error("Seed recruiter must have a name for mention tests.");
    }

    const { note, mentionedUserIds } = await createNote(
      db,
      { id: recruiterId, role: "RECRUITER" },
      {
        applicationId,
        body: `Looping in @${recruiter.name} for feedback.`,
      },
    );

    expect(note.type).toBe("NOTE");
    expect(mentionedUserIds).toContain(recruiterId);

    await db.note.delete({ where: { id: note.id } });
  });

  it("returns a merged chronological activity feed", async () => {
    const feed = await getActivityFeed(
      db,
      { id: recruiterId, role: "RECRUITER" },
      { applicationId, limit: 50 },
    );

    expect(feed.items.length).toBeGreaterThan(0);

    for (let i = 1; i < feed.items.length; i++) {
      const prev = feed.items[i - 1]!;
      const current = feed.items[i]!;
      expect(prev.occurredAt.getTime()).toBeGreaterThanOrEqual(
        current.occurredAt.getTime(),
      );
    }
  });
});
