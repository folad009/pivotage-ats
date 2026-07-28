// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ForbiddenError } from "@/lib/errors";
import { can } from "@/lib/rbac";
import { scheduleInterview, getInterviewScorecardScope } from "@/server/services/interview.service";
import {
  assertPanelMember,
  upsertScorecard,
} from "@/server/services/scorecard.service";
import { getTestDb } from "../helpers/test-db";

const db = getTestDb();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("interview scheduling integration", () => {
  let applicationId: string;
  let recruiterId: string;
  let managerId: string;
  let interviewId: string;

  beforeAll(async () => {
    const application = await db.application.findFirst({
      where: { status: "ACTIVE" },
      include: {
        job: { select: { ownerId: true } },
      },
    });
    if (!application) {
      throw new Error("Seed data required: no active application found.");
    }

    applicationId = application.id;
    recruiterId = application.ownerId;

    const manager = await db.user.findFirst({
      where: { role: "HIRING_MANAGER" },
    });
    if (!manager) {
      throw new Error("Seed data required: no hiring manager found.");
    }
    managerId = manager.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates an interview and sends mock invites", async () => {
    const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const result = await scheduleInterview(
      db,
      { id: recruiterId, role: "RECRUITER" },
      {
        applicationId,
        type: "PHONE",
        scheduledAt,
        durationMins: 45,
        meetingUrl: "https://meet.privotage.test/new",
        panelUserIds: [managerId, recruiterId],
      },
    );

    interviewId = result.id;

    expect(result.invitesSent).toBeGreaterThan(0);
    expect(result.inviteMocked).toBe(true);

    const interview = await db.interview.findUnique({
      where: { id: result.id },
      include: { panel: true },
    });
    expect(interview?.status).toBe("SCHEDULED");
    expect(interview?.panel).toHaveLength(2);
  });

  it("allows a hiring manager on the panel to submit a scorecard", async () => {
    if (!interviewId) {
      const existing = await db.interview.findFirst({
        where: { applicationId },
        include: { panel: true },
      });
      interviewId = existing!.id;
      const onPanel = existing!.panel.some((member) => member.id === managerId);
      if (!onPanel) {
        await db.interview.update({
          where: { id: interviewId },
          data: { panel: { connect: { id: managerId } } },
        });
      }
    }

    const scorecard = await upsertScorecard(
      db,
      { id: managerId, role: "HIRING_MANAGER" },
      {
        interviewId,
        overall: 4,
        recommendation: "YES",
        criteria: { communication: 4, technical: 3, culture: 4 },
        comments: "Good fit for the team.",
      },
      { requirePanelMembership: true },
    );

    expect(scorecard.id).toBeTruthy();

    const saved = await db.scorecard.findUnique({
      where: {
        interviewId_authorId: {
          interviewId,
          authorId: managerId,
        },
      },
    });
    expect(saved?.overall).toBe(4);
  });

  it("blocks scorecard submission for hiring managers not on the panel", async () => {
    const scope = await getInterviewScorecardScope(db, interviewId);

    expect(
      can({ id: managerId, role: "HIRING_MANAGER" }, "scorecard:submit", scope),
    ).toBe(true);

    expect(
      can(
        { id: "unassigned-hm", role: "HIRING_MANAGER" },
        "scorecard:submit",
        scope,
      ),
    ).toBe(false);

    expect(() =>
      assertPanelMember({ id: "unassigned-hm", role: "HIRING_MANAGER" }, [
        ...scope.interviewerIds,
      ]),
    ).toThrow(ForbiddenError);
  });
});
