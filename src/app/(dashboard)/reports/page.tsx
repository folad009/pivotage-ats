import { redirect } from "next/navigation";

import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { mayViewReports } from "@/lib/rbac";
import { getStaffUser } from "@/lib/staff-session";
import { auth } from "@/server/auth";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!mayViewReports(getStaffUser(session))) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Hiring funnel, time-to-hire, conversion, and recruiter activity.
        </p>
      </div>
      <ReportsDashboard />
    </div>
  );
}
