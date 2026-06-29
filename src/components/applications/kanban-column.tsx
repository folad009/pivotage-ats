"use client";

import { useDroppable } from "@dnd-kit/core";

import { KanbanCard } from "@/components/applications/kanban-card";
import { Badge } from "@/components/ui/badge";
import { STAGE_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/types";

type BoardColumn = RouterOutputs["applications"]["board"]["columns"][number];

interface KanbanColumnProps {
  column: BoardColumn;
  applications: BoardColumn["applications"];
  canMove: boolean;
}

export function KanbanColumn({
  column,
  applications,
  canMove,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stage.id });

  return (
    <div
      className="bg-muted/30 flex w-72 shrink-0 flex-col rounded-lg border"
      aria-label={`${column.stage.name} column`}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold">{column.stage.name}</h3>
          <p className="text-muted-foreground text-xs">
            {STAGE_TYPE_LABELS[column.stage.type]}
          </p>
        </div>
        <Badge variant="secondary">{applications.length}</Badge>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent/40",
        )}
      >
        {applications.map((application) => (
          <KanbanCard
            key={application.id}
            application={application}
            canMove={canMove}
          />
        ))}
      </div>
    </div>
  );
}
