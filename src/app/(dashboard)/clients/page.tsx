import { redirect } from "next/navigation";

import { ClientsView } from "@/components/clients/clients-view";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldAlert } from "lucide-react";
import { can } from "@/lib/rbac";
import { getStaffUser } from "@/lib/staff-session";
import { auth } from "@/server/auth";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!can(getStaffUser(session), "client:manage")) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No access"
        description="You don't have permission to view clients."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm">
          Companies Privotage recruits for.
        </p>
      </header>
      <ClientsView />
    </div>
  );
}
