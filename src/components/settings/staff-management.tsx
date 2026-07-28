"use client";

import { Role } from "@/lib/prisma-browser";
import { Pencil, Plus, Users } from "lucide-react";
import { useState } from "react";

import {
  StaffFormDialog,
  type StaffFormValues,
} from "@/components/settings/staff-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ROLE_LABELS, ROLE_VARIANTS } from "@/lib/labels";
import { api } from "@/trpc/react";

const ALL = "ALL";

export function StaffManagement() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>(ALL);
  const [activeFilter, setActiveFilter] = useState<string>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffFormValues | undefined>();

  const debouncedSearch = useDebouncedValue(search);
  const utils = api.useUtils();

  const query = api.users.list.useInfiniteQuery(
    {
      limit: 20,
      search: debouncedSearch || undefined,
      role: role === ALL ? undefined : (role as Role),
      isActive:
        activeFilter === ALL ? undefined : activeFilter === "ACTIVE",
    },
    { getNextPageParam: (last) => last.nextCursor },
  );

  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(user: StaffFormValues) {
    setEditing(user);
    setDialogOpen(true);
  }

  function handleSaved() {
    void utils.users.list.invalidate();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Staff & roles
          </CardTitle>
          <CardDescription>
            Create staff accounts and assign roles (Administrator, Recruiter, or
            Hiring manager).
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Add staff member
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name or email…"
            aria-label="Search staff"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-44" aria-label="Filter by role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All roles</SelectItem>
              {Object.values(Role).map((value) => (
                <SelectItem key={value} value={value}>
                  {ROLE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-36" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {query.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load staff"
            description="Try refreshing the page."
            onRetry={() => void query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff members yet"
            description="Add your first team member to grant them access to the ATS."
            action={
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                Add staff member
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name ?? "—"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${user.name ?? user.email}`}
                        onClick={() =>
                          openEdit({
                            id: user.id,
                            name: user.name ?? "",
                            email: user.email,
                            role: user.role,
                            isActive: user.isActive,
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

            {query.hasNextPage ? (
              <Button
                variant="outline"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            ) : null}
          </>
        )}
      </CardContent>

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={handleSaved}
      />
    </Card>
  );
}
