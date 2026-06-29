"use client";

import { subDays } from "date-fns";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STAGE_TYPE_LABELS } from "@/lib/labels";
import { can } from "@/lib/rbac-core";
import { api } from "@/trpc/react";

function toDateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateInput(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

export function ReportsDashboard() {
  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = subDays(to, 90);
    return { from: toDateInputValue(from), to: toDateInputValue(to) };
  }, []);

  const [fromInput, setFromInput] = useState(defaultRange.from);
  const [toInput, setToInput] = useState(defaultRange.to);
  const [clientId, setClientId] = useState<string>("all");
  const [jobId, setJobId] = useState<string>("all");
  const [includeArchived, setIncludeArchived] = useState(false);

  const filters = useMemo(
    () => ({
      from: parseDateInput(fromInput),
      to: parseDateInput(toInput),
      includeArchived,
      ...(clientId !== "all" ? { clientId } : {}),
      ...(jobId !== "all" ? { jobId } : {}),
    }),
    [clientId, fromInput, includeArchived, jobId, toInput],
  );

  const meQuery = api.me.useQuery();
  const canManageClients = meQuery.data
    ? can(meQuery.data, "client:manage")
    : false;

  const clientsQuery = api.clients.list.useQuery(
    { limit: 100 },
    { enabled: canManageClients },
  );
  const jobsQuery = api.jobs.list.useQuery({
    limit: 100,
    ...(clientId !== "all" ? { clientId } : {}),
  });
  const reportQuery = api.reports.overview.useQuery(filters);

  const funnelData =
    reportQuery.data?.funnel.stages.map((stage) => ({
      name: STAGE_TYPE_LABELS[stage.stageType] ?? stage.stageName,
      count: stage.count,
    })) ?? [];

  const trendData = reportQuery.data?.timeToHire.trend ?? [];
  const summary = reportQuery.data?.timeToHire.summary;
  const jobStatus = reportQuery.data?.jobStatus;
  const conversions = reportQuery.data?.conversions.conversions ?? [];
  const recruiters = reportQuery.data?.recruiterActivity.recruiters ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
            />
          </div>
          {canManageClients ? (
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {(clientsQuery.data?.items ?? []).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Job</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger>
                <SelectValue placeholder="All jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All jobs</SelectItem>
                {(jobsQuery.data?.items ?? []).map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="size-4 rounded border"
              />
              Include archived applications
            </label>
          </div>
        </CardContent>
      </Card>

      {reportQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : reportQuery.isError ? (
        <ErrorState
          title="Could not load reports"
          description={reportQuery.error.message}
          onRetry={() => void reportQuery.refetch()}
        />
      ) : (
        <>
          <section
            aria-label="Key metrics"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <MetricCard
              title="Applications in range"
              value={String(reportQuery.data.funnel.totalApplications)}
            />
            <MetricCard
              title="Avg time to hire"
              value={
                summary?.averageDays != null
                  ? `${summary.averageDays} days`
                  : "—"
              }
              hint={
                summary?.count
                  ? `${summary.count} hire${summary.count === 1 ? "" : "s"}`
                  : "No hires in range"
              }
            />
            <MetricCard
              title="Median time to hire"
              value={
                summary?.medianDays != null ? `${summary.medianDays} days` : "—"
              }
            />
            <MetricCard
              title="Open / filled jobs"
              value={`${jobStatus?.open ?? 0} / ${jobStatus?.filled ?? 0}`}
              hint={`${jobStatus?.total ?? 0} total requisitions`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pipeline funnel</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {funnelData.length === 0 ? (
                  <EmptyState title="No applications in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#2563eb" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Time-to-hire trend</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {trendData.length === 0 ? (
                  <EmptyState title="No hire data in this range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="averageDays"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage conversion rates</CardTitle>
            </CardHeader>
            <CardContent>
              {conversions.length === 0 ? (
                <EmptyState title="No conversion data" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {conversions.map((conversion) => (
                    <Badge key={conversion.fromStageType} variant="secondary">
                      {conversion.fromLabel} → {conversion.toLabel}:{" "}
                      {conversion.rate}%
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recruiter activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recruiters.length === 0 ? (
                <EmptyState title="No recruiter activity in this range" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recruiter</TableHead>
                      <TableHead className="text-right">Applications</TableHead>
                      <TableHead className="text-right">Stage moves</TableHead>
                      <TableHead className="text-right">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruiters.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell>{row.name ?? row.email}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.applicationsCreated}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.stageMoves}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.notesAdded}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
