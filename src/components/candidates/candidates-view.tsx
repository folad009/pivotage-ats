"use client";

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  CandidateFormDialog,
  type CandidateFormValues,
} from "@/components/candidates/candidate-form-dialog";
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
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/types";

type CandidateRow = RouterOutputs["candidates"]["list"]["items"][number];

const ALL = "ALL";

interface CandidatesViewProps {
  canManage: boolean;
}

export function CandidatesView({ canManage }: CandidatesViewProps) {
  const [search, setSearch] = useState("");
  const [tagId, setTagId] = useState<string>(ALL);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateFormValues | undefined>();

  const debouncedSearch = useDebouncedValue(search);
  const utils = api.useUtils();

  const tagsQuery = api.candidates.listTags.useQuery();

  const query = api.candidates.list.useInfiniteQuery(
    {
      limit: 20,
      search: debouncedSearch || undefined,
      tagId: tagId === ALL ? undefined : tagId,
    },
    { getNextPageParam: (last) => last.nextCursor },
  );

  const rows = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const columns = useMemo<ColumnDef<CandidateRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: ({ column }) => (
          <SortHeader
            label="Name"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/candidates/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.firstName} {row.original.lastName}
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => row.original.source ?? "—",
      },
      {
        id: "tags",
        header: "Tags",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              row.original.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary">
                  {tag.name}
                </Badge>
              ))
            )}
          </div>
        ),
      },
      {
        id: "applications",
        accessorFn: (row) => row._count.applications,
        header: ({ column }) => (
          <SortHeader
            label="Applications"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original._count.applications}</span>
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

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or email…"
          aria-label="Search candidates"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Select value={tagId} onValueChange={setTagId}>
          <SelectTrigger className="w-40" aria-label="Filter by tag">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tags</SelectItem>
            {(tagsQuery.data ?? []).map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage ? (
          <Button className="ml-auto" onClick={openCreate}>
            <Plus className="size-4" />
            New candidate
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
          icon={Users}
          title="No candidates found"
          description={
            canManage
              ? "Add someone to the talent pool to get started."
              : "No candidates are linked to your assigned jobs yet."
          }
          action={
            canManage ? (
              <Button onClick={openCreate} variant="outline" size="sm">
                <Plus className="size-4" />
                New candidate
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
        <CandidateFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initial={editing}
          canManage={canManage}
          onSaved={() => void utils.candidates.list.invalidate()}
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
