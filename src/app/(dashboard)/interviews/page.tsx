import { redirect } from "next/navigation";

import { InterviewsView } from "@/components/interviews/interviews-view";
import { mayBrowseCandidatePII } from "@/lib/rbac";
import { auth } from "@/server/auth";

export default async function InterviewsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!mayBrowseCandidatePII(session.user)) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
        <p className="text-muted-foreground text-sm">
          Upcoming and recent interviews across your assigned jobs.
        </p>
      </div>
      <InterviewsView />
    </div>
  );
}
