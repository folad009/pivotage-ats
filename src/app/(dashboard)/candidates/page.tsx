import { redirect } from "next/navigation";

import { CandidatesView } from "@/components/candidates/candidates-view";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";
import { can, mayBrowseCandidatePII } from "@/lib/rbac";
import { auth } from "@/server/auth";

export default async function CandidatesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!mayBrowseCandidatePII(session.user)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No access"
        description="You don't have permission to view candidates."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground text-sm">
          Talent pool and candidate profiles.
        </p>
      </header>
      <CandidatesView canManage={can(session.user, "candidate:manage")} />
    </div>
  );
}
