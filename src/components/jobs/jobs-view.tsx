"use client";

import { JobStatus } from "@/lib/prisma-browser";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { JobFormDialog } from "@/components/jobs/job-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { JOB_STATUS_LABELS, JOB_STATUS_VARIANTS } from "@/lib/labels";
import { IN_HOUSE_CLIENT_LABEL, IN_HOUSE_CLIENT_VALUE } from "@/lib/constants";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/types";

type JobRow = RouterOutputs["jobs"]["list"]["items"][number];

const ALL = "ALL";

interface JobsViewProps {
  canManage: boolean;
  canManageClients: boolean;
  currentUserId: string;
}

export function JobsView({
  canManage,
  canManageClients,
  currentUserId,
}: JobsViewProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [clientId, setClientId] = useState<string>(ALL);
  const [mineOnly, setMineOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const utils = api.useUtils();

  const clientsQuery = api.clients.list.useQuery(
    { limit: 100 },
    { enabled: canManageClients },
  );

  const query = api.jobs.list.useInfiniteQuery(
    {
      limit: 20,
      search: debouncedSearch || undefined,
      status: status === ALL ? undefined : (status as JobStatus),
      clientId: clientId === ALL ? undefined : clientId,
      ownerId: mineOnly ? currentUserId : undefined,
    },
    { getNextPageParam: (last) => last.nextCursor },
  );

  const rows = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const columns = useMemo<ColumnDef<JobRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <SortHeader
            label="Title"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/jobs/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: "client",
        accessorFn: (row) => row.client?.name ?? IN_HOUSE_CLIENT_LABEL,
        header: "Client",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.client?.name ?? IN_HOUSE_CLIENT_LABEL}
          </span>
        ),
      },
      {
        id: "owner",
        accessorFn: (row) => row.owner.name ?? row.owner.email,
        header: "Owner",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.owner.name ?? row.original.owner.email}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={JOB_STATUS_VARIANTS[row.original.status]}>
            {JOB_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "openings",
        header: ({ column }) => (
          <SortHeader
            label="Openings"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.openings}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search jobs…"
          aria-label="Search jobs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.values(JobStatus).map((value) => (
              <SelectItem key={value} value={value}>
                {JOB_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManageClients ? (
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-44" aria-label="Filter by client">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All clients</SelectItem>
              <SelectItem value={IN_HOUSE_CLIENT_VALUE}>
                {IN_HOUSE_CLIENT_LABEL}
              </SelectItem>
              {(clientsQuery.data?.items ?? []).map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant={mineOnly ? "default" : "outline"}
          onClick={() => setMineOnly((value) => !value)}
          aria-pressed={mineOnly}
        >
          My jobs
        </Button>
        {canManage ? (
          <Button className="ml-auto" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            New job
          </Button>
        ) : null}
      </div>

      {query.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description={
            canManage
              ? "Create a requisition to start sourcing candidates."
              : "There are no jobs assigned to you yet."
          }
          action={
            canManage ? (
              <Button
                onClick={() => setDialogOpen(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="size-4" />
                New job
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      {canManage ? (
        <JobFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={() => void utils.jobs.list.invalidate()}
        />
      ) : null}
    </div>
  );
}

function SortHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:text-foreground inline-flex items-center gap-1"
    >
      {label}
      <ArrowUpDown className="size-3.5" aria-hidden />
    </button>
  );
}
