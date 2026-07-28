"use client";

import type { Role } from "@/lib/prisma-browser";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";
import { ScorecardForm } from "@/components/interviews/scorecard-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  RECOMMENDATION_LABELS,
} from "@/lib/labels";
import { can, mayScheduleInterview, maySubmitScorecard } from "@/lib/rbac-core";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/types";

type ApplicationDetail = RouterOutputs["applications"]["get"];

interface ApplicationInterviewsSectionProps {
  applicationId: string;
  jobId: string;
  userId: string;
  userRole: Role;
  initialInterviews: ApplicationDetail["interviews"];
  canScheduleOnApplication: boolean;
  readOnly?: boolean;
}

export function ApplicationInterviewsSection({
  applicationId,
  jobId,
  userId,
  userRole,
  initialInterviews,
  canScheduleOnApplication,
  readOnly = false,
}: ApplicationInterviewsSectionProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const utils = api.useUtils();

  const applicationQuery = api.applications.get.useQuery(
    { id: applicationId },
    { initialData: undefined },
  );
  const summaryQuery = api.interviews.scorecardSummary.useQuery({
    applicationId,
  });

  const interviews = applicationQuery.data?.interviews ?? initialInterviews;
  const summary = summaryQuery.data;

  const user = { id: userId, role: userRole };
  const showSchedule =
    !readOnly && mayScheduleInterview(user) && canScheduleOnApplication;

  function canSubmitForInterview(panelIds: string[]) {
    if (!maySubmitScorecard(user)) return false;
    return can(user, "scorecard:submit", { interviewerIds: panelIds });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Interviews</CardTitle>
          {showSchedule ? (
            <Button size="sm" onClick={() => setScheduleOpen(true)}>
              <CalendarPlus className="size-4" />
              Schedule
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryQuery.isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : summary ? (
            <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
              <span className="font-medium">Scorecard summary</span>
              <Badge variant="secondary">{summary.total} submitted</Badge>
              <Badge variant="outline">
                Avg {summary.averageOverall}/5
              </Badge>
              {summary.dominantRecommendation ? (
                <Badge>
                  {RECOMMENDATION_LABELS[summary.dominantRecommendation]}
                </Badge>
              ) : null}
            </div>
          ) : null}

          {interviews.length === 0 ? (
            <EmptyState title="No interviews scheduled" />
          ) : (
            <ul className="divide-y">
              {interviews.map((interview) => {
                const panelIds = interview.panel.map((member) => member.id);
                const myScorecard = interview.scorecards.find(
                  (scorecard) => scorecard.author.id === userId,
                );
                const canSubmit = canSubmitForInterview(panelIds);

                return (
                  <li key={interview.id} className="space-y-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {INTERVIEW_TYPE_LABELS[interview.type]}
                      </span>
                      <Badge variant="outline">
                        {INTERVIEW_STATUS_LABELS[interview.status]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {new Date(interview.scheduledAt).toLocaleString()} ·{" "}
                      {interview.durationMins} min
                    </p>
                    {interview.location ? (
                      <p className="text-muted-foreground text-sm">
                        Location: {interview.location}
                      </p>
                    ) : null}
                    {interview.meetingUrl ? (
                      <p className="text-sm">
                        <a
                          href={interview.meetingUrl}
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Join meeting
                        </a>
                      </p>
                    ) : null}
                    {interview.panel.length > 0 ? (
                      <p className="text-muted-foreground text-xs">
                        Panel:{" "}
                        {interview.panel
                          .map((member) => member.name ?? "User")
                          .join(", ")}
                      </p>
                    ) : null}

                    {interview.scorecards
                      .filter((scorecard) => scorecard.author.id !== userId)
                      .map((scorecard) => (
                        <div
                          key={scorecard.id}
                          className="bg-muted/40 rounded-md border p-2 text-sm"
                        >
                          <p className="font-medium">
                            {scorecard.author.name ?? "Interviewer"} —{" "}
                            {RECOMMENDATION_LABELS[scorecard.recommendation]} (
                            {scorecard.overall}/5)
                          </p>
                          {scorecard.comments ? (
                            <p className="text-muted-foreground mt-1">
                              {scorecard.comments}
                            </p>
                          ) : null}
                        </div>
                      ))}

                    <ScorecardForm
                      interviewId={interview.id}
                      canSubmit={canSubmit}
                      initial={
                        myScorecard
                          ? {
                              overall: myScorecard.overall,
                              recommendation: myScorecard.recommendation,
                              criteria:
                                (myScorecard.criteria as Record<
                                  string,
                                  number
                                > | null) ?? undefined,
                              comments: myScorecard.comments,
                            }
                          : null
                      }
                      onSaved={() => {
                        void utils.applications.get.invalidate({
                          id: applicationId,
                        });
                        void utils.interviews.scorecardSummary.invalidate({
                          applicationId,
                        });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          <Button variant="link" className="h-auto p-0" asChild>
            <Link href={`/interviews?jobId=${jobId}`}>View all interviews</Link>
          </Button>
        </CardContent>
      </Card>

      <ScheduleInterviewDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        applicationId={applicationId}
        onSaved={() => {
          void utils.applications.get.invalidate({ id: applicationId });
          void utils.interviews.list.invalidate();
        }}
      />
    </>
  );
}
