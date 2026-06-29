import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationKanban } from "@/components/applications/application-kanban";
import { Button } from "@/components/ui/button";
import { NotFoundError } from "@/lib/errors";
import { can, mayBrowseCandidatePII, mayMoveApplication } from "@/lib/rbac";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getBoardData } from "@/server/services/application.service";

export default async function ApplicationBoardPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!mayBrowseCandidatePII(session.user)) {
    redirect("/dashboard");
  }

  const user = session.user;
  const { jobId } = await params;

  try {
    await getBoardData(db, user, jobId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const canMove = mayMoveApplication(user);
  const canCreate = can(user, "application:create");

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/applications">
          <ArrowLeft className="size-4" />
          Applications
        </Link>
      </Button>
      <ApplicationKanban
        jobId={jobId}
        canMove={canMove}
        canCreate={canCreate}
      />
    </div>
  );
}
