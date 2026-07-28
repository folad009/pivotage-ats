import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/labels";
import { db } from "@/server/db";
import { listPublicJobs } from "@/server/services/job.service";

export default async function CareersPage() {
  const { items: jobs } = await listPublicJobs(db, { limit: 50 });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Open roles</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Explore current opportunities at Privotage Consulting and our client
          partners. Register or sign in to submit your application.
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Briefcase className="text-muted-foreground size-10" />
            <p className="font-medium">No open roles right now</p>
            <p className="text-muted-foreground text-sm">
              Check back soon or register to be ready when new roles are posted.
            </p>
            <Button asChild>
              <Link href="/register">Create candidate account</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">
                      <Link href={`/careers/${job.id}`} className="hover:underline">
                        {job.title}
                      </Link>
                    </CardTitle>
                    {job.jobRole ? (
                      <CardDescription>{job.jobRole}</CardDescription>
                    ) : null}
                  </div>
                  <Badge variant="secondary">{WORK_MODE_LABELS[job.workMode]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  <span>{job.client?.name ?? IN_HOUSE_CLIENT_LABEL}</span>
                  <span>{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</span>
                  {job.location ? <span>{job.location}</span> : null}
                </div>
                <Button size="sm" asChild>
                  <Link href={`/careers/${job.id}`}>View role</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
