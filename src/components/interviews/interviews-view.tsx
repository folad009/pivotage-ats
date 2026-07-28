"use client";

import { format, isSameDay } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  RECOMMENDATION_LABELS,
} from "@/lib/labels";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import { api } from "@/trpc/react";

export function InterviewsView() {
  const interviewsQuery = api.interviews.list.useQuery({ limit: 50 });

  if (interviewsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (interviewsQuery.isError) {
    return (
      <ErrorState
        title="Could not load interviews"
        description={interviewsQuery.error.message}
        onRetry={() => void interviewsQuery.refetch()}
      />
    );
  }

  const items = interviewsQuery.data?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="No interviews scheduled"
        description="Interviews you can access will appear here once scheduled on an application."
      />
    );
  }

  const grouped = items.reduce<
    Array<{ date: Date; interviews: typeof items }>
  >((acc, interview) => {
    const date = new Date(interview.scheduledAt);
    const bucket = acc.find((entry) => isSameDay(entry.date, date));
    if (bucket) {
      bucket.interviews.push(interview);
    } else {
      acc.push({ date, interviews: [interview] });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <section key={group.date.toISOString()} className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
            {format(group.date, "EEEE, MMMM d, yyyy")}
          </h2>
          <div className="grid gap-3">
            {group.interviews.map((interview) => {
              const candidate = interview.application.candidate;
              const job = interview.application.job;
              const scorecardCount = interview.scorecards.length;

              return (
                <Card key={interview.id}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {INTERVIEW_TYPE_LABELS[interview.type]} —{" "}
                          {candidate.firstName} {candidate.lastName}
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 text-sm">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="hover:underline"
                          >
                            {job.title}
                          </Link>{" "}
                          · {job.client?.name ?? IN_HOUSE_CLIENT_LABEL}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {INTERVIEW_STATUS_LABELS[interview.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      {format(new Date(interview.scheduledAt), "h:mm a")} ·{" "}
                      {interview.durationMins} min
                    </p>
                    {interview.panel.length > 0 ? (
                      <p className="text-muted-foreground">
                        Panel:{" "}
                        {interview.panel
                          .map((member) => member.name ?? "User")
                          .join(", ")}
                      </p>
                    ) : null}
                    {scorecardCount > 0 ? (
                      <p className="text-muted-foreground">
                        {scorecardCount} scorecard
                        {scorecardCount === 1 ? "" : "s"} · latest:{" "}
                        {RECOMMENDATION_LABELS[
                          interview.scorecards[interview.scorecards.length - 1]!
                            .recommendation
                        ]}
                      </p>
                    ) : null}
                    <Link
                      href={`/applications/detail/${interview.application.id}`}
                      className="text-primary inline-block hover:underline"
                    >
                      View application
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
