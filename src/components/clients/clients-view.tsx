"use client";

import { ClientStatus } from "@prisma/client";
import { Building2, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  ClientFormDialog,
  type ClientFormValues,
} from "@/components/clients/client-form-dialog";
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
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_VARIANTS } from "@/lib/labels";
import { api } from "@/trpc/react";

const ALL = "ALL";

export function ClientsView() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClientFormValues | undefined>();

  const debouncedSearch = useDebouncedValue(search);
  const utils = api.useUtils();

  const query = api.clients.list.useInfiniteQuery(
    {
      limit: 20,
      search: debouncedSearch || undefined,
      status: status === ALL ? undefined : (status as ClientStatus),
    },
    { getNextPageParam: (last) => last.nextCursor },
  );

  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(client: ClientFormValues) {
    setEditing(client);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search clients…"
          aria-label="Search clients"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {Object.values(ClientStatus).map((value) => (
              <SelectItem key={value} value={value}>
                {CLIENT_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={openCreate}>
          <Plus className="size-4" />
          New client
        </Button>
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
          icon={Building2}
          title="No clients yet"
          description="Add the first company you're recruiting for."
          action={
            <Button onClick={openCreate} variant="outline" size="sm">
              <Plus className="size-4" />
              New client
            </Button>
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jobs</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/clients/${client.id}`}
                      className="hover:underline"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.industry ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={CLIENT_STATUS_VARIANTS[client.status]}>
                      {CLIENT_STATUS_LABELS[client.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {client._count.jobs}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${client.name}`}
                      onClick={() =>
                        openEdit({
                          id: client.id,
                          name: client.name,
                          contactEmail: client.contactEmail,
                          industry: client.industry,
                          status: client.status,
                        })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
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

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={() => void utils.clients.list.invalidate()}
      />
    </div>
  );
}
