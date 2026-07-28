import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplyButton } from "@/components/careers/apply-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotFoundError } from "@/lib/errors";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/labels";
import { db } from "@/server/db";
import { getPublicJob } from "@/server/services/job.service";

export default async function CareerJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await getPublicJob(db, jobId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/careers">← All open roles</Link>
      </Button>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{WORK_MODE_LABELS[job.workMode]}</Badge>
          <Badge variant="outline">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
        {job.jobRole ? (
          <p className="text-muted-foreground text-lg">{job.jobRole}</p>
        ) : null}
        <p className="text-muted-foreground text-sm">
          {job.client?.name ?? IN_HOUSE_CLIENT_LABEL}
          {job.department ? ` · ${job.department}` : ""}
          {job.location ? ` · ${job.location}` : ""}
        </p>
      </div>

      <ApplyButton jobId={job.id} />

      <div className="grid gap-4">
        {job.description ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{job.description}</p>
            </CardContent>
          </Card>
        ) : null}
        {job.requirements ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{job.requirements}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
