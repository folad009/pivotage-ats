import { Role } from "@/lib/prisma-browser";
import { ApplicationStatus } from "@/lib/prisma-browser";
import { ArrowLeft, Archive, Kanban } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { JobEditButton } from "@/components/jobs/job-edit-button";
import { JobStatusControl } from "@/components/jobs/job-status-control";
import { PipelineEditor } from "@/components/jobs/pipeline-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotFoundError } from "@/lib/errors";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_STATUS_LABELS,
  JOB_STATUS_VARIANTS,
  WORK_MODE_LABELS,
} from "@/lib/labels";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import { can, mayBrowseCandidatePII } from "@/lib/rbac";
import { getStaffUser } from "@/lib/staff-session";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getJob } from "@/server/services/job.service";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const user = getStaffUser(session);
  const { jobId } = await params;

  const job = await getJob(db, user, jobId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const canManage = can(user, "job:manage");
  const canViewBoard = mayBrowseCandidatePII(user);
  const canConfigure =
    can(user, "pipeline:configure") &&
    (user.role === Role.ADMIN || job.owner.id === user.id);

  const archivedCount = await db.application.count({
    where: { jobId: job.id, status: ApplicationStatus.ARCHIVED },
  });

  const archivedApplications =
    archivedCount > 0 && canViewBoard
      ? await db.application.findMany({
          where: { jobId: job.id, status: ApplicationStatus.ARCHIVED },
          orderBy: { archivedAt: "desc" },
          take: 10,
          select: {
            id: true,
            archivedAt: true,
            candidate: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        })
      : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/jobs">
          <ArrowLeft className="size-4" />
          Jobs
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {job.title}
            </h1>
            <Badge variant={JOB_STATUS_VARIANTS[job.status]}>
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {job.client ? (
              <Link href={`/clients/${job.client.id}`} className="hover:underline">
                {job.client.name}
              </Link>
            ) : (
              IN_HOUSE_CLIENT_LABEL
            )}{" "}
            · {WORK_MODE_LABELS[job.workMode]} ·{" "}
            {EMPLOYMENT_TYPE_LABELS[job.employmentType]} ·{" "}
            {job.openings} opening{job.openings === 1 ? "" : "s"}
          </p>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            <JobStatusControl jobId={job.id} status={job.status} />
            <JobEditButton
              job={{
                id: job.id,
                title: job.title,
                clientId: job.clientId,
                department: job.department,
                location: job.location,
                employmentType: job.employmentType,
                workMode: job.workMode,
                status: job.status,
                openings: job.openings,
                jobRole: job.jobRole,
                description: job.description,
                requirements: job.requirements,
              }}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Department" value={job.department ?? "—"} />
            <DetailRow label="Job role" value={job.jobRole ?? "—"} />
            <DetailRow label="Location" value={job.location ?? "—"} />
            <DetailRow
              label="Work mode"
              value={WORK_MODE_LABELS[job.workMode]}
            />
            <DetailRow
              label="Owner"
              value={job.owner.name ?? job.owner.email}
            />
            <DetailRow
              label="Applications"
              value={String(job._count.applications)}
            />
            {canViewBoard ? (
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link href={`/applications/board/${job.id}`}>
                  <Kanban className="size-4" />
                  View pipeline board
                </Link>
              </Button>
            ) : null}
            {archivedCount > 0 ? (
              <DetailRow
                label="Archived"
                value={String(archivedCount)}
              />
            ) : null}
            {job.description ? (
              <div className="pt-2">
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Description
                </p>
                <p className="whitespace-pre-wrap">{job.description}</p>
              </div>
            ) : null}
            {job.requirements ? (
              <div className="pt-2">
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Requirements
                </p>
                <p className="whitespace-pre-wrap">{job.requirements}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineEditor
              jobId={job.id}
              stages={job.stages.map((stage) => ({
                id: stage.id,
                name: stage.name,
                type: stage.type,
              }))}
              editable={canConfigure}
            />
          </CardContent>
        </Card>
      </div>

      {archivedApplications.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Archive className="size-4" />
              Archived applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {archivedApplications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <Link
                    href={`/applications/detail/${application.id}`}
                    className="font-medium hover:underline"
                  >
                    {application.candidate.firstName}{" "}
                    {application.candidate.lastName}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {application.archivedAt
                      ? new Date(application.archivedAt).toLocaleDateString()
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
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
