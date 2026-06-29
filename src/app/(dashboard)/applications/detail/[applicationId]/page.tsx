import type { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationArchiveControls } from "@/components/compliance/application-archive-controls";
import { ApplicationActivityFeed } from "@/components/applications/application-activity-feed";
import { ApplicationInterviewsSection } from "@/components/applications/application-interviews-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotFoundError } from "@/lib/errors";
import {
  APPLICATION_STATUS_LABELS,
  STAGE_TYPE_LABELS,
} from "@/lib/labels";
import { can, mayBrowseCandidatePII } from "@/lib/rbac";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  getApplication,
} from "@/server/services/application.service";
import { getApplicationArchiveScope } from "@/server/services/compliance.service";
import { getInterviewScheduleScope } from "@/server/services/interview.service";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!mayBrowseCandidatePII(session.user)) {
    redirect("/dashboard");
  }

  const { applicationId } = await params;

  const application = await getApplication(
    db,
    session.user,
    applicationId,
  ).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const scheduleScope = await getInterviewScheduleScope(db, applicationId);
  const archiveScope = await getApplicationArchiveScope(db, applicationId);
  const canSchedule =
    application.status !== "ARCHIVED" &&
    can(session.user, "interview:schedule", scheduleScope);
  const canArchive = can(session.user, "application:archive", archiveScope);
  const canRestore = can(session.user, "application:restore");
  const isArchived = application.status === "ARCHIVED";
  const candidateName = `${application.candidate.firstName} ${application.candidate.lastName}`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/applications/board/${application.job.id}`}>
          <ArrowLeft className="size-4" />
          Pipeline
        </Link>
      </Button>

      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {application.candidate.firstName} {application.candidate.lastName}
          </h1>
          <Badge variant="outline">
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          <Link
            href={`/jobs/${application.job.id}`}
            className="hover:underline"
          >
            {application.job.title}
          </Link>{" "}
          · {application.job.client.name} · Current:{" "}
          {application.currentStage.name} (
          {STAGE_TYPE_LABELS[application.currentStage.type]})
          {isArchived && application.archivedAt
            ? ` · Archived ${new Date(application.archivedAt).toLocaleDateString()}`
            : null}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <ApplicationArchiveControls
            applicationId={application.id}
            jobId={application.job.id}
            candidateName={candidateName}
            isArchived={isArchived}
            canArchive={canArchive}
            canRestore={canRestore}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Candidate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Email" value={application.candidate.email} />
            <DetailRow
              label="Phone"
              value={application.candidate.phone ?? "—"}
            />
            <DetailRow
              label="Location"
              value={application.candidate.location ?? "—"}
            />
            <DetailRow
              label="Source"
              value={application.candidate.source ?? "—"}
            />
            <DetailRow
              label="Owner"
              value={application.owner.name ?? application.owner.email}
            />
          </CardContent>
        </Card>

        <ApplicationActivityFeed
          applicationId={application.id}
          userId={session.user.id}
          userRole={session.user.role as Role}
          readOnly={isArchived}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ApplicationInterviewsSection
          applicationId={application.id}
          jobId={application.job.id}
          userId={session.user.id}
          userRole={session.user.role as Role}
          initialInterviews={application.interviews}
          canScheduleOnApplication={canSchedule}
          readOnly={isArchived}
        />

        <Card>
        <CardHeader>
          <CardTitle className="text-base">Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          {application.attachments.length === 0 ? (
            <EmptyState title="No attachments" />
          ) : (
            <ul className="divide-y">
              {application.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>{attachment.fileName}</span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(attachment.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
