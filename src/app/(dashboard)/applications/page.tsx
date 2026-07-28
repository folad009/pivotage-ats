import { Briefcase } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { JOB_STATUS_LABELS, JOB_STATUS_VARIANTS } from "@/lib/labels";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import { mayBrowseCandidatePII } from "@/lib/rbac";
import { getStaffUser } from "@/lib/staff-session";
import { auth } from "@/server/auth";
import { api } from "@/trpc/server";

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!mayBrowseCandidatePII(getStaffUser(session))) {
    redirect("/dashboard");
  }

  const jobs = await api.jobs.list({ limit: 50, status: "OPEN" });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
        <p className="text-muted-foreground text-sm">
          Select a job to open its pipeline board.
        </p>
      </header>

      {jobs.items.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No open jobs"
          description="Create or open a job requisition to manage applications."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/jobs">View jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.items.map((job) => (
            <Card key={job.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <Badge variant={JOB_STATUS_VARIANTS[job.status]}>
                    {JOB_STATUS_LABELS[job.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  {job.client?.name ?? IN_HOUSE_CLIENT_LABEL} · {job._count.applications} application
                  {job._count.applications === 1 ? "" : "s"}
                </p>
                <Button asChild size="sm">
                  <Link href={`/applications/board/${job.id}`}>
                    Open pipeline
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
