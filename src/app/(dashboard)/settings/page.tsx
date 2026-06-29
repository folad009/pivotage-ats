import { redirect } from "next/navigation";

import { DataRetentionSettings } from "@/components/compliance/data-retention-settings";
import { requireRole } from "@/lib/rbac";
import { db } from "@/server/db";
import { getAgencySettings } from "@/server/services/compliance.service";

export default async function SettingsPage() {
  try {
    await requireRole("ADMIN");
  } catch {
    redirect("/dashboard");
  }

  const settings = await getAgencySettings(db);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Agency configuration, data retention, and compliance controls.
        </p>
      </div>

      <DataRetentionSettings initialRetentionDays={settings.retentionDays} />
    </div>
  );
}
