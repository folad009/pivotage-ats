"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError } from "@/lib/errors";
import { can, getCurrentUser } from "@/lib/rbac";
import {
  cancelInterviewSchema,
  rescheduleInterviewSchema,
  scheduleInterviewSchema,
} from "@/lib/validations/interview";
import { upsertScorecardSchema } from "@/lib/validations/scorecard";
import { db } from "@/server/db";
import {
  type ActionResult,
  ok,
  toActionError,
} from "@/server/actions/action-result";
import {
  cancelInterview,
  getInterviewScheduleScope,
  getInterviewScorecardScope,
  rescheduleInterview,
  scheduleInterview,
} from "@/server/services/interview.service";
import { upsertScorecard } from "@/server/services/scorecard.service";

async function authorizeInterviewSchedule(applicationId: string) {
  const actor = await getCurrentUser();
  const scope = await getInterviewScheduleScope(db, applicationId);
  if (!can(actor, "interview:schedule", scope)) {
    throw new ForbiddenError();
  }
  return actor;
}

async function authorizeInterviewManage(interviewId: string) {
  const interview = await db.interview.findUnique({
    where: { id: interviewId },
    select: { applicationId: true },
  });
  if (!interview) {
    throw new ForbiddenError();
  }
  return authorizeInterviewSchedule(interview.applicationId);
}

async function authorizeScorecardSubmit(interviewId: string) {
  const actor = await getCurrentUser();
  const scope = await getInterviewScorecardScope(db, interviewId);
  if (!can(actor, "scorecard:submit", scope)) {
    throw new ForbiddenError();
  }
  return actor;
}

export async function scheduleInterviewAction(
  input: unknown,
): Promise<
  ActionResult<{
    id: string;
    applicationId: string;
    jobId: string;
    invitesSent: number;
    inviteMocked: boolean;
  }>
> {
  try {
    const data = scheduleInterviewSchema.parse(input);
    const actor = await authorizeInterviewSchedule(data.applicationId);
    const result = await scheduleInterview(db, actor, data);
    revalidatePath("/interviews");
    revalidatePath(`/applications/detail/${data.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function rescheduleInterviewAction(
  input: unknown,
): Promise<
  ActionResult<{
    id: string;
    applicationId: string;
    jobId: string;
    invitesSent: number;
    inviteMocked: boolean;
  }>
> {
  try {
    const data = rescheduleInterviewSchema.parse(input);
    const actor = await authorizeInterviewManage(data.id);
    const result = await rescheduleInterview(db, actor, data);
    revalidatePath("/interviews");
    revalidatePath(`/applications/detail/${result.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelInterviewAction(
  input: unknown,
): Promise<
  ActionResult<{ id: string; applicationId: string; jobId: string }>
> {
  try {
    const data = cancelInterviewSchema.parse(input);
    const actor = await authorizeInterviewManage(data.id);
    const result = await cancelInterview(db, actor, data);
    revalidatePath("/interviews");
    revalidatePath(`/applications/detail/${result.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

export async function upsertScorecardAction(
  input: unknown,
): Promise<ActionResult<{ id: string; interviewId: string; applicationId: string }>> {
  try {
    const data = upsertScorecardSchema.parse(input);
    const actor = await authorizeScorecardSubmit(data.interviewId);
    const requirePanel =
      actor.role === "HIRING_MANAGER";
    const result = await upsertScorecard(db, actor, data, {
      requirePanelMembership: requirePanel,
    });
    revalidatePath("/interviews");
    revalidatePath(`/applications/detail/${result.applicationId}`);
    return ok(result);
  } catch (error) {
    return toActionError(error);
  }
}

/** Lists panel user options — anyone who may schedule interviews. */
export async function listPanelUsersAction(): Promise<
  ActionResult<
    Array<{ id: string; name: string | null; email: string; role: string }>
  >
> {
  try {
    const actor = await getCurrentUser();
    const { mayScheduleInterview } = await import("@/lib/rbac");
    if (!mayScheduleInterview(actor)) {
      throw new ForbiddenError();
    }
    const { listPanelUserOptions } = await import(
      "@/server/services/interview.service"
    );
    const users = await listPanelUserOptions(db);
    return ok(users);
  } catch (error) {
    return toActionError(error);
  }
}
