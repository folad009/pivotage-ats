"use client";

import {
  ArrowRightLeft,
  CalendarClock,
  MessageSquare,
  Settings2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { NoteComposer } from "@/components/applications/note-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/labels";
import { can } from "@/lib/rbac-core";
import { addNoteAction } from "@/server/actions/note";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/types";

type ActivityItem = RouterOutputs["notes"]["activityFeed"]["items"][number];
type ActivityFeedPage = RouterOutputs["notes"]["activityFeed"];

interface ApplicationActivityFeedProps {
  applicationId: string;
  userId: string;
  userRole: import("@prisma/client").Role;
  readOnly?: boolean;
}

export function ApplicationActivityFeed({
  applicationId,
  userId,
  userRole,
  readOnly = false,
}: ApplicationActivityFeedProps) {
  const utils = api.useUtils();
  const [extraPages, setExtraPages] = useState<ActivityFeedPage[]>([]);
  const [optimisticNotes, setOptimisticNotes] = useState<ActivityItem[]>([]);

  const feedQuery = api.notes.activityFeed.useQuery({
    applicationId,
    limit: 20,
  });

  const canAddNote =
    !readOnly && can({ id: userId, role: userRole }, "note:add");

  const items = useMemo(() => {
    const loaded = [
      ...(feedQuery.data?.items ?? []),
      ...extraPages.flatMap((page) => page.items),
    ];
    const merged = [...optimisticNotes, ...loaded];
    const seen = new Set<string>();
    return merged.filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [feedQuery.data?.items, extraPages, optimisticNotes]);

  const nextCursor =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1]?.nextCursor
      : feedQuery.data?.nextCursor;

  async function loadMore() {
    if (!nextCursor) return;
    const page = await utils.notes.activityFeed.fetch({
      applicationId,
      cursor: nextCursor,
      limit: 20,
    });
    setExtraPages((current) => [...current, page]);
  }

  async function handleAddNote(body: string): Promise<boolean> {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticItem: ActivityItem = {
      kind: "note",
      id: optimisticId,
      occurredAt: new Date(),
      type: "NOTE",
      body,
      author: { id: userId, name: "You" },
      mentions: [],
      mentionedUsers: [],
    };

    setOptimisticNotes((current) => [optimisticItem, ...current]);

    const result = await addNoteAction({ applicationId, body });
    if (!result.ok) {
      setOptimisticNotes((current) =>
        current.filter((item) => item.id !== optimisticId),
      );
      toast.error(result.error);
      return false;
    }

    setOptimisticNotes((current) =>
      current.filter((item) => item.id !== optimisticId),
    );
    setExtraPages([]);
    await utils.notes.activityFeed.invalidate({ applicationId });
    toast.success("Note added");
    return true;
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {canAddNote ? (
          <NoteComposer onSubmit={handleAddNote} />
        ) : null}

        {feedQuery.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : feedQuery.isError ? (
          <ErrorState
            title="Could not load activity"
            description={feedQuery.error.message}
            onRetry={() => void feedQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <ol className="relative space-y-4 border-l pl-4">
            {items.map((item) => (
              <ActivityFeedEntry key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </ol>
        )}

        {nextCursor ? (
          <Button variant="outline" size="sm" onClick={() => void loadMore()}>
            Load older activity
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActivityFeedEntry({ item }: { item: ActivityItem }) {
  if (item.kind === "stage_move") {
    return (
      <li className="relative">
        <FeedMarker icon={ArrowRightLeft} variant="system" />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {item.fromStageName ?? "New"} → {item.toStageName}
            </p>
            <Badge variant="secondary" className="text-xs">
              Stage move
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {item.movedBy.name ?? "User"} ·{" "}
            {new Date(item.occurredAt).toLocaleString()}
          </p>
          {item.reason ? (
            <p className="text-muted-foreground text-sm">{item.reason}</p>
          ) : null}
        </div>
      </li>
    );
  }

  if (item.kind === "interview") {
    return (
      <li className="relative">
        <FeedMarker icon={CalendarClock} variant="system" />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {INTERVIEW_TYPE_LABELS[item.interviewType]} interview scheduled
            </p>
            <Badge variant="outline" className="text-xs">
              {INTERVIEW_STATUS_LABELS[item.status]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date(item.scheduledAt).toLocaleString()} · {item.durationMins}{" "}
            min
          </p>
          {item.panel.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              Panel: {item.panel.map((member) => member.name ?? "User").join(", ")}
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Logged {new Date(item.occurredAt).toLocaleString()}
          </p>
        </div>
      </li>
    );
  }

  const isSystem = item.type === "SYSTEM";

  return (
    <li className="relative">
      <FeedMarker
        icon={isSystem ? Settings2 : MessageSquare}
        variant={isSystem ? "system" : "user"}
      />
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {!isSystem ? (
            <span className="text-sm font-medium">
              {item.author.name ?? "User"}
            </span>
          ) : null}
          <Badge variant={isSystem ? "secondary" : "outline"} className="text-xs">
            {isSystem ? "System" : "Note"}
          </Badge>
        </div>
        <p className="text-sm whitespace-pre-wrap">{item.body}</p>
        {item.mentionedUsers.length > 0 ? (
          <p className="text-muted-foreground text-xs">
            Mentioned:{" "}
            {item.mentionedUsers
              .map((user) => user.name ?? user.email)
              .join(", ")}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {new Date(item.occurredAt).toLocaleString()}
        </p>
      </div>
    </li>
  );
}

function FeedMarker({
  icon: Icon,
  variant,
}: {
  icon: typeof MessageSquare;
  variant: "system" | "user";
}) {
  return (
    <span
      className={
        variant === "system"
          ? "bg-muted text-muted-foreground absolute top-1.5 -left-[21px] flex size-5 items-center justify-center rounded-full border"
          : "bg-primary text-primary-foreground absolute top-1.5 -left-[21px] flex size-5 items-center justify-center rounded-full"
      }
    >
      <Icon className="size-3" aria-hidden />
    </span>
  );
}
