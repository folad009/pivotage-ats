import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClientEditButton } from "@/components/clients/client-edit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANTS,
  JOB_STATUS_LABELS,
  JOB_STATUS_VARIANTS,
} from "@/lib/labels";
import { NotFoundError } from "@/lib/errors";
import { can } from "@/lib/rbac";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getClient } from "@/server/services/client.service";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!can(session.user, "client:manage")) {
    redirect("/dashboard");
  }

  const { clientId } = await params;

  const client = await getClient(db, clientId).catch((error) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            <ArrowLeft className="size-4" />
            Clients
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {client.name}
            </h1>
            <Badge variant={CLIENT_STATUS_VARIANTS[client.status]}>
              {CLIENT_STATUS_LABELS[client.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {client.industry ?? "No industry set"} ·{" "}
            {client.contactEmail ?? "No contact email"}
          </p>
        </div>
        <ClientEditButton
          client={{
            id: client.id,
            name: client.name,
            contactEmail: client.contactEmail,
            industry: client.industry,
            status: client.status,
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Jobs ({client._count.jobs})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.jobs.length === 0 ? (
            <EmptyState
              title="No jobs for this client"
              description="Create a job requisition to start sourcing."
            />
          ) : (
            <ul className="divide-y">
              {client.jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between py-3"
                >
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium hover:underline"
                  >
                    {job.title}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {job.openings} opening{job.openings === 1 ? "" : "s"}
                    </span>
                    <Badge variant={JOB_STATUS_VARIANTS[job.status]}>
                      {JOB_STATUS_LABELS[job.status]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
