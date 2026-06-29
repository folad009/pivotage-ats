"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { api } from "@/trpc/react";

/**
 * Demonstrates the `me` tRPC query running from a client component (the same
 * procedure is also called server-side in the page via the RSC caller).
 */
export function MeBadge() {
  const me = api.me.useQuery(undefined, { retry: false });

  if (me.isPending) {
    return <Skeleton className="h-5 w-40" />;
  }

  if (me.isError) {
    return (
      <ErrorState
        className="p-4"
        title="Couldn't verify session"
        description={me.error.message}
        onRetry={() => void me.refetch()}
      />
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      Verified live via tRPC as{" "}
      <span className="text-foreground font-medium">{me.data.email}</span>.
    </p>
  );
}
