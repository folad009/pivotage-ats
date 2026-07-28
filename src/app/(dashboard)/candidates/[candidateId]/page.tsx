import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CandidateAttachments } from "@/components/candidates/candidate-attachments";
import { GdprEraseDialog } from "@/components/compliance/gdpr-erase-dialog";
import { CandidateEditButton } from "@/components/candidates/candidate-edit-button";
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
import { getStaffUser } from "@/lib/staff-session";
import { IN_HOUSE_CLIENT_LABEL } from "@/lib/constants";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getCandidate } from "@/server/services/candidate.service";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!mayBrowseCandidatePII(getStaffUser(session))) {
    redirect("/dashboard");
  }

  const user = getStaffUser(session);
  const { candidateId } = await params;

  const candidate = await getCandidate(db, user, candidateId).catch(
    (error) => {
      if (error instanceof NotFoundError) notFound();
      throw error;
    },
  );

  const canManage = can(user, "candidate:manage");
  const canGdprErase = can(user, "candidate:gdprErase") && !candidate.anonymizedAt;
  const candidateName = `${candidate.firstName} ${candidate.lastName}`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/candidates">
          <ArrowLeft className="size-4" />
          Candidates
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {candidate.firstName} {candidate.lastName}
          </h1>
          <p className="text-muted-foreground text-sm">{candidate.email}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {candidate.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
        {canManage ? (
          <CandidateEditButton
            candidate={{
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              email: candidate.email,
              phone: candidate.phone,
              location: candidate.location,
              source: candidate.source,
              linkedinUrl: candidate.linkedinUrl,
              tagIds: candidate.tags.map((tag) => tag.id),
            }}
          />
        ) : null}
        {canGdprErase ? (
          <GdprEraseDialog
            candidateId={candidate.id}
            candidateName={candidateName}
          />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DetailRow label="Phone" value={candidate.phone ?? "—"} />
            <DetailRow label="Location" value={candidate.location ?? "—"} />
            <DetailRow label="Source" value={candidate.source ?? "—"} />
            <DetailRow
              label="LinkedIn"
              value={
                candidate.linkedinUrl ? (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View profile
                  </a>
                ) : (
                  "—"
                )
              }
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Resumes</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateAttachments
              candidateId={candidate.id}
              attachments={candidate.attachments}
              canManage={canManage}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Applications ({candidate.applications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidate.applications.length === 0 ? (
            <EmptyState
              title="No applications"
              description="This candidate hasn't been added to a job yet."
            />
          ) : (
            <ul className="divide-y">
              {candidate.applications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <Link
                      href={`/jobs/${application.job.id}`}
                      className="font-medium hover:underline"
                    >
                      {application.job.title}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {application.job.client?.name ?? IN_HOUSE_CLIENT_LABEL} ·{" "}
                      {STAGE_TYPE_LABELS[application.currentStage.type]} (
                      {application.currentStage.name})
                    </p>
                  </div>
                  <Badge variant="outline">
                    {APPLICATION_STATUS_LABELS[application.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
