import {
  Briefcase,
  CalendarClock,
  FileText,
  UserCheck,
} from "lucide-react";

import { MeBadge } from "@/components/dashboard/me-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/server";

const METRICS = [
  { label: "Open jobs", value: "—", icon: Briefcase },
  { label: "Active candidates", value: "—", icon: UserCheck },
  { label: "Interviews this week", value: "—", icon: CalendarClock },
  { label: "Open applications", value: "—", icon: FileText },
] as const;

export default async function DashboardPage() {
  // RSC initial fetch via the server-side tRPC caller.
  const me = await api.me();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {me.name ?? me.email}
        </h1>
        <MeBadge />
      </header>

      <section
        aria-label="Pipeline overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {metric.label}
                </CardTitle>
                <Icon className="text-muted-foreground size-4" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {metric.value}
                </p>
                <p className="text-muted-foreground text-xs">
                  Awaiting reporting module
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
