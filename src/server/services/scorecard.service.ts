import { Prisma, type PrismaClient } from "@prisma/client";

import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { AccessUser } from "@/lib/rbac";
import type { UpsertScorecardInput } from "@/lib/validations/scorecard";
import { jobScopeWhere } from "@/server/services/job.service";

type Db = PrismaClient | Prisma.TransactionClient;

async function getInterviewForScorecard(
  db: Db,
  actor: AccessUser,
  interviewId: string,
) {
  const scope = jobScopeWhere(actor);
  const interview = await db.interview.findFirst({
    where: scope
      ? {
          AND: [{ id: interviewId }, { application: { job: scope } }],
        }
      : { id: interviewId },
    select: {
      id: true,
      applicationId: true,
      panel: { select: { id: true } },
      scorecards: {
        where: { authorId: actor.id },
        select: { id: true },
      },
    },
  });

  if (!interview) {
    throw new NotFoundError("Interview");
  }

  return interview;
}

/** Ensures only panel members may submit (enforced at action layer for RBAC matrix). */
export function assertPanelMember(
  actor: AccessUser,
  panelIds: string[],
): void {
  if (!panelIds.includes(actor.id)) {
    throw new ForbiddenError(
      "Only assigned panel members can submit a scorecard for this interview.",
    );
  }
}

export async function upsertScorecard(
  db: Db,
  actor: AccessUser,
  input: UpsertScorecardInput,
  options?: { requirePanelMembership?: boolean },
) {
  const interview = await getInterviewForScorecard(db, actor, input.interviewId);

  if (options?.requirePanelMembership) {
    assertPanelMember(
      actor,
      interview.panel.map((member) => member.id),
    );
  }

  const criteria =
    input.criteria && Object.keys(input.criteria).length > 0
      ? (input.criteria as Prisma.InputJsonValue)
      : undefined;

  const scorecard = await db.scorecard.upsert({
    where: {
      interviewId_authorId: {
        interviewId: input.interviewId,
        authorId: actor.id,
      },
    },
    create: {
      interviewId: input.interviewId,
      authorId: actor.id,
      overall: input.overall,
      recommendation: input.recommendation,
      criteria,
      comments: input.comments,
    },
    update: {
      overall: input.overall,
      recommendation: input.recommendation,
      criteria,
      comments: input.comments,
    },
    select: { id: true, interviewId: true },
  });

  return {
    id: scorecard.id,
    interviewId: scorecard.interviewId,
    applicationId: interview.applicationId,
  };
}

export async function getScorecardForAuthor(
  db: Db,
  actor: AccessUser,
  interviewId: string,
) {
  const interview = await getInterviewForScorecard(db, actor, interviewId);
  const scorecard = await db.scorecard.findUnique({
    where: {
      interviewId_authorId: {
        interviewId,
        authorId: actor.id,
      },
    },
  });

  return {
    interviewId: interview.id,
    applicationId: interview.applicationId,
    panelIds: interview.panel.map((member) => member.id),
    scorecard,
  };
}
