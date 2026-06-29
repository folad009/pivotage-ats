import {
  InterviewStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { INTERVIEW_TYPE_LABELS } from "@/lib/labels";
import { summarizeScorecards } from "@/lib/interview-summary";
import type { AccessUser } from "@/lib/rbac";
import type {
  CancelInterviewInput,
  InterviewListInput,
  RescheduleInterviewInput,
  ScheduleInterviewInput,
} from "@/lib/validations/interview";
import {
  assertApplicationMutable,
  getJobAssignedUserIds,
} from "@/server/services/application.service";
import { jobScopeWhere } from "@/server/services/job.service";

export { summarizeScorecards } from "@/lib/interview-summary";
export type { ScorecardSummary } from "@/lib/interview-summary";

type Db = PrismaClient | Prisma.TransactionClient;

export const INTERVIEW_PAGE_SIZE = 30;

async function getApplicationForInterview(
  db: Db,
  actor: AccessUser,
  applicationId: string,
) {
  const scope = jobScopeWhere(actor);
  const application = await db.application.findFirst({
    where: scope
      ? { AND: [{ id: applicationId }, { job: scope }] }
      : { id: applicationId },
    include: {
      candidate: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      job: {
        select: { id: true, title: true, ownerId: true },
      },
    },
  });

  if (!application) {
    throw new NotFoundError("Application");
  }

  assertApplicationMutable(application.status);
  return application;
}

async function getInterviewWithScope(
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
    include: {
      application: {
        select: {
          id: true,
          status: true,
          jobId: true,
          candidate: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          job: { select: { title: true } },
        },
      },
      panel: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!interview) {
    throw new NotFoundError("Interview");
  }

  return interview;
}

async function validatePanelUsers(db: Db, panelUserIds: string[]) {
  const users = await db.user.findMany({
    where: { id: { in: panelUserIds }, isActive: true },
    select: { id: true, name: true, email: true },
  });

  if (users.length !== panelUserIds.length) {
    throw new ValidationError("One or more panel members are invalid or inactive.");
  }

  return users;
}

async function sendInterviewInvites(input: {
  candidate: { firstName: string; lastName: string; email: string };
  jobTitle: string;
  interviewType: ScheduleInterviewInput["type"];
  scheduledAt: Date;
  durationMins: number;
  location?: string | null;
  meetingUrl?: string | null;
  panel: Array<{ name: string | null; email: string }>;
}): Promise<{ sent: number; mocked: boolean }> {
  const { buildInterviewInviteEmail, sendEmail } = await import(
    "@/server/services/email.service"
  );

  const candidateName = `${input.candidate.firstName} ${input.candidate.lastName}`;
  const typeLabel = INTERVIEW_TYPE_LABELS[input.interviewType];
  let sent = 0;
  let mocked = true;

  const candidateTemplate = buildInterviewInviteEmail({
    recipientName: candidateName,
    candidateName,
    jobTitle: input.jobTitle,
    interviewType: typeLabel,
    scheduledAt: input.scheduledAt,
    durationMins: input.durationMins,
    location: input.location,
    meetingUrl: input.meetingUrl,
    isCandidate: true,
  });

  const candidateResult = await sendEmail({
    ...candidateTemplate,
    to: input.candidate.email,
  });
  sent++;
  mocked = mocked && candidateResult.mocked;

  for (const member of input.panel) {
    const panelTemplate = buildInterviewInviteEmail({
      recipientName: member.name,
      candidateName,
      jobTitle: input.jobTitle,
      interviewType: typeLabel,
      scheduledAt: input.scheduledAt,
      durationMins: input.durationMins,
      location: input.location,
      meetingUrl: input.meetingUrl,
      isCandidate: false,
    });
    const result = await sendEmail({ ...panelTemplate, to: member.email });
    sent++;
    mocked = mocked && result.mocked;
  }

  return { sent, mocked };
}

export async function scheduleInterview(
  db: Db,
  actor: AccessUser,
  input: ScheduleInterviewInput,
) {
  const application = await getApplicationForInterview(
    db,
    actor,
    input.applicationId,
  );
  const panel = await validatePanelUsers(db, input.panelUserIds);

  const interview = await db.interview.create({
    data: {
      applicationId: application.id,
      type: input.type,
      status: InterviewStatus.SCHEDULED,
      scheduledAt: input.scheduledAt,
      durationMins: input.durationMins,
      location: input.location,
      meetingUrl: input.meetingUrl,
      panel: { connect: panel.map((user) => ({ id: user.id })) },
    },
    select: { id: true },
  });

  const { createSystemNote } = await import("@/server/services/note.service");
  await createSystemNote(db, {
    applicationId: application.id,
    authorId: actor.id,
    body: `${INTERVIEW_TYPE_LABELS[input.type]} interview scheduled for ${input.scheduledAt.toLocaleString()} (${input.durationMins} min).`,
  });

  const invite = await sendInterviewInvites({
    candidate: application.candidate,
    jobTitle: application.job.title,
    interviewType: input.type,
    scheduledAt: input.scheduledAt,
    durationMins: input.durationMins,
    location: input.location,
    meetingUrl: input.meetingUrl,
    panel,
  });

  return {
    id: interview.id,
    applicationId: application.id,
    jobId: application.job.id,
    invitesSent: invite.sent,
    inviteMocked: invite.mocked,
  };
}

export async function rescheduleInterview(
  db: Db,
  actor: AccessUser,
  input: RescheduleInterviewInput,
) {
  const interview = await getInterviewWithScope(db, actor, input.id);

  if (interview.status === InterviewStatus.CANCELLED) {
    throw new ValidationError("Cancelled interviews cannot be rescheduled.");
  }

  assertApplicationMutable(interview.application.status);

  await db.interview.update({
    where: { id: interview.id },
    data: {
      scheduledAt: input.scheduledAt,
      ...(input.durationMins !== undefined
        ? { durationMins: input.durationMins }
        : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
    },
  });

  const { createSystemNote } = await import("@/server/services/note.service");
  await createSystemNote(db, {
    applicationId: interview.application.id,
    authorId: actor.id,
    body: `${INTERVIEW_TYPE_LABELS[interview.type]} interview rescheduled to ${input.scheduledAt.toLocaleString()}.`,
  });

  const invite = await sendInterviewInvites({
    candidate: {
      firstName: interview.application.candidate.firstName,
      lastName: interview.application.candidate.lastName,
      email: interview.application.candidate.email,
    },
    jobTitle: interview.application.job.title,
    interviewType: interview.type,
    scheduledAt: input.scheduledAt,
    durationMins: input.durationMins ?? interview.durationMins,
    location: input.location ?? interview.location,
    meetingUrl: input.meetingUrl ?? interview.meetingUrl,
    panel: interview.panel,
  });

  return {
    id: interview.id,
    applicationId: interview.application.id,
    jobId: interview.application.jobId,
    invitesSent: invite.sent,
    inviteMocked: invite.mocked,
  };
}

export async function cancelInterview(
  db: Db,
  actor: AccessUser,
  input: CancelInterviewInput,
) {
  const interview = await getInterviewWithScope(db, actor, input.id);

  if (interview.status === InterviewStatus.CANCELLED) {
    return {
      id: interview.id,
      applicationId: interview.application.id,
      jobId: interview.application.jobId,
    };
  }

  await db.interview.update({
    where: { id: interview.id },
    data: { status: InterviewStatus.CANCELLED },
  });

  const { createSystemNote } = await import("@/server/services/note.service");
  await createSystemNote(db, {
    applicationId: interview.application.id,
    authorId: actor.id,
    body: `${INTERVIEW_TYPE_LABELS[interview.type]} interview cancelled.`,
  });

  return {
    id: interview.id,
    applicationId: interview.application.id,
    jobId: interview.application.jobId,
  };
}

export async function listInterviews(
  db: Db,
  actor: AccessUser,
  input: InterviewListInput,
) {
  const limit = input.limit ?? INTERVIEW_PAGE_SIZE;
  const filters: Prisma.InterviewWhereInput[] = [];

  if (input.status) filters.push({ status: input.status });
  if (input.from || input.to) {
    filters.push({
      scheduledAt: {
        ...(input.from ? { gte: input.from } : {}),
        ...(input.to ? { lte: input.to } : {}),
      },
    });
  }

  const scope = jobScopeWhere(actor);
  if (scope) {
    filters.push({ application: { job: scope } });
  }

  const where = filters.length > 0 ? { AND: filters } : {};

  const rows = await db.interview.findMany({
    where,
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    include: {
      application: {
        select: {
          id: true,
          candidate: {
            select: { firstName: true, lastName: true },
          },
          job: {
            select: {
              id: true,
              title: true,
              client: { select: { name: true } },
            },
          },
        },
      },
      panel: { select: { id: true, name: true } },
      scorecards: {
        select: {
          id: true,
          recommendation: true,
          overall: true,
        },
      },
    },
  });

  let nextCursor: string | undefined;
  if (rows.length > limit) {
    nextCursor = rows.pop()!.id;
  }

  return { items: rows, nextCursor };
}

export async function getInterview(
  db: Db,
  actor: AccessUser,
  interviewId: string,
) {
  return getInterviewWithScope(db, actor, interviewId);
}

/** Active users available for interview panels. */
export async function listPanelUserOptions(db: Db) {
  return db.user.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: { id: true, name: true, email: true, role: true },
  });
}

/** RBAC scope for scheduling on an application (same job assignment as stage moves). */
export async function getInterviewScheduleScope(
  db: Db,
  applicationId: string,
): Promise<{ assignedUserIds: string[] }> {
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: { jobId: true },
  });
  if (!application) {
    throw new NotFoundError("Application");
  }
  const assignedUserIds = await getJobAssignedUserIds(db, application.jobId);
  return { assignedUserIds };
}

/** Panel member ids for scorecard authorization. */
export async function getInterviewScorecardScope(
  db: Db,
  interviewId: string,
): Promise<{ interviewerIds: string[] }> {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    select: { panel: { select: { id: true } } },
  });
  if (!interview) {
    throw new NotFoundError("Interview");
  }
  return { interviewerIds: interview.panel.map((member) => member.id) };
}

export async function getApplicationScorecardSummary(
  db: Db,
  actor: AccessUser,
  applicationId: string,
) {
  const scope = jobScopeWhere(actor);
  const application = await db.application.findFirst({
    where: scope
      ? { AND: [{ id: applicationId }, { job: scope }] }
      : { id: applicationId },
    select: {
      interviews: {
        select: {
          scorecards: {
            select: { recommendation: true, overall: true },
          },
        },
      },
    },
  });

  if (!application) {
    throw new NotFoundError("Application");
  }

  const allScorecards = application.interviews.flatMap((i) => i.scorecards);
  return summarizeScorecards(allScorecards);
}
