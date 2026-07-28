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
import { APPLICATION_STATUS_LABELS } from "@/lib/labels";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import { UnauthorizedError } from "@/lib/errors";
import { getCurrentCandidate } from "@/lib/rbac-session";
import { db } from "@/server/db";
import { listCandidateApplications } from "@/server/services/application.service";

export default async function MyApplicationsPage() {
  let candidate;
  try {
    candidate = await getCurrentCandidate();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login?callbackUrl=/my-applications");
    }
    throw error;
  }

  const applications = await listCandidateApplications(db, candidate.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>
        <p className="text-muted-foreground text-sm">
          Signed in as {candidate.name} ({candidate.email})
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="mb-4 text-sm">You have not applied to any roles yet.</p>
            <Button asChild>
              <Link href="/careers">Browse open roles</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((application) => (
            <Card key={application.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-lg">{application.job.title}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {application.job.client?.name ?? IN_HOUSE_CLIENT_LABEL}
                  </p>
                </div>
                <Badge>{APPLICATION_STATUS_LABELS[application.status]}</Badge>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                Stage: {application.currentStage.name} · Applied{" "}
                {new Date(application.appliedAt).toLocaleDateString()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
