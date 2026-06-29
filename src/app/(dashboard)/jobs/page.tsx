import { redirect } from "next/navigation";

import { JobsView } from "@/components/jobs/jobs-view";
import { can } from "@/lib/rbac";
import { auth } from "@/server/auth";

export default async function JobsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground text-sm">
          Open requisitions across all clients.
        </p>
      </header>
      <JobsView
        canManage={can(user, "job:manage")}
        canManageClients={can(user, "client:manage")}
        currentUserId={user.id}
      />
    </div>
  );
}
