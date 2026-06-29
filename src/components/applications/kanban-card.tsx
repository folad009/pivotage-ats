"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { APPLICATION_STATUS_LABELS } from "@/lib/labels";
import type { RouterOutputs } from "@/trpc/types";

type BoardApplication =
  RouterOutputs["applications"]["board"]["columns"][number]["applications"][number];

export function KanbanCard({
  application,
  canMove,
}: {
  application: BoardApplication;
  canMove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: application.id,
      disabled: !canMove,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-md border p-3 shadow-sm",
        canMove && "cursor-grab active:cursor-grabbing",
      )}
      {...(canMove ? { ...attributes, ...listeners } : {})}
    >
      <Link
        href={`/applications/detail/${application.id}`}
        className="hover:underline"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-medium">
          {application.candidate.firstName} {application.candidate.lastName}
        </p>
      </Link>
      <p className="text-muted-foreground truncate text-xs">
        {application.candidate.email}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {application.status !== "ACTIVE" ? (
          <Badge variant="outline" className="text-xs">
            {APPLICATION_STATUS_LABELS[application.status]}
          </Badge>
        ) : (
          <span />
        )}
        {application.rating ? (
          <span className="text-muted-foreground text-xs tabular-nums">
            ★ {application.rating}
          </span>
        ) : null}
      </div>
    </div>
  );
}
