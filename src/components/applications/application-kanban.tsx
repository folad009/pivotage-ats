"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CreateApplicationDialog } from "@/components/applications/create-application-dialog";
import { KanbanCard } from "@/components/applications/kanban-card";
import { KanbanColumn } from "@/components/applications/kanban-column";
import { RejectReasonDialog } from "@/components/applications/reject-reason-dialog";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { moveStageAction } from "@/server/actions/application";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/types";

type BoardData = RouterOutputs["applications"]["board"];
type BoardApplication = BoardData["columns"][number]["applications"][number];

interface ApplicationKanbanProps {
  jobId: string;
  canMove: boolean;
  canCreate: boolean;
}

export function ApplicationKanban({
  jobId,
  canMove,
  canCreate,
}: ApplicationKanbanProps) {
  const utils = api.useUtils();
  const boardQuery = api.applications.board.useQuery({ jobId });

  const [activeCard, setActiveCard] = useState<BoardApplication | null>(null);
  const [optimisticStageByApp, setOptimisticStageByApp] = useState<
    Record<string, string>
  >({});
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectState, setRejectState] = useState<{
    applicationId: string;
    toStageId: string;
    candidateName: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const board = boardQuery.data;
  const stageById = useMemo(() => {
    const map = new Map<string, BoardData["columns"][number]["stage"]>();
    for (const column of board?.columns ?? []) {
      map.set(column.stage.id, column.stage);
    }
    return map;
  }, [board]);

  const applicationById = useMemo(() => {
    const map = new Map<string, BoardApplication>();
    for (const column of board?.columns ?? []) {
      for (const application of column.applications) {
        map.set(application.id, application);
      }
    }
    return map;
  }, [board]);

  const columnsWithOptimistic = useMemo(() => {
    if (!board) return [];
    return board.columns.map((column) => ({
      ...column,
      applications: board.columns
        .flatMap((col) => col.applications)
        .filter(
          (app) =>
            (optimisticStageByApp[app.id] ?? app.currentStageId) ===
            column.stage.id,
        ),
    }));
  }, [board, optimisticStageByApp]);

  function resolveTargetStageId(overId: string): string | null {
    if (stageById.has(overId)) return overId;
    const overApp = applicationById.get(overId);
    if (overApp) {
      return optimisticStageByApp[overApp.id] ?? overApp.currentStageId;
    }
    return null;
  }

  function clearOptimistic(applicationId: string) {
    setOptimisticStageByApp((current) => {
      const next = { ...current };
      delete next[applicationId];
      return next;
    });
  }

  async function executeMove(
    applicationId: string,
    toStageId: string,
    application: BoardApplication,
  ) {
    const targetStage = stageById.get(toStageId);
    if (!targetStage) return;

    if (targetStage.type === "REJECTED") {
      setRejectState({
        applicationId,
        toStageId,
        candidateName: `${application.candidate.firstName} ${application.candidate.lastName}`,
      });
      clearOptimistic(applicationId);
      return;
    }

    setOptimisticStageByApp((current) => ({
      ...current,
      [applicationId]: toStageId,
    }));

    const result = await moveStageAction({ applicationId, toStageId });
    if (!result.ok) {
      clearOptimistic(applicationId);
      toast.error(result.error);
      return;
    }

    clearOptimistic(applicationId);
    void utils.applications.board.invalidate({ jobId });

    if (result.data.jobCloseSuggested) {
      toast.info(
        "All openings are filled. Consider closing this job requisition.",
      );
    }
  }

  function onDragStart(event: DragStartEvent) {
    const application = applicationById.get(String(event.active.id));
    setActiveCard(application ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    if (!canMove || !event.over) return;

    const applicationId = String(event.active.id);
    const application = applicationById.get(applicationId);
    if (!application) return;

    const fromStageId =
      optimisticStageByApp[applicationId] ?? application.currentStageId;
    const toStageId = resolveTargetStageId(String(event.over.id));
    if (!toStageId || toStageId === fromStageId) return;

    void executeMove(applicationId, toStageId, application);
  }

  if (boardQuery.isPending) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-96 w-72 shrink-0" />
        ))}
      </div>
    );
  }

  if (boardQuery.isError) {
    return (
      <ErrorState
        description={boardQuery.error.message}
        onRetry={() => void boardQuery.refetch()}
      />
    );
  }

  if (!board) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{board.job.title}</h2>
          <p className="text-muted-foreground text-sm">
            {board.job.client.name} · {board.job.openings} opening
            {board.job.openings === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/jobs/${jobId}`}>Job details</Link>
          </Button>
          {canCreate ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add application
            </Button>
          ) : null}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columnsWithOptimistic.map((column) => (
            <KanbanColumn
              key={column.stage.id}
              column={column}
              applications={column.applications}
              canMove={canMove}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <KanbanCard application={activeCard} canMove={canMove} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {canCreate ? (
        <CreateApplicationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          jobId={jobId}
          onSaved={() => void utils.applications.board.invalidate({ jobId })}
        />
      ) : null}

      {rejectState ? (
        <RejectReasonDialog
          open={Boolean(rejectState)}
          onOpenChange={(open) => {
            if (!open) setRejectState(null);
          }}
          applicationId={rejectState.applicationId}
          toStageId={rejectState.toStageId}
          candidateName={rejectState.candidateName}
          onComplete={(success) => {
            if (success) {
              void utils.applications.board.invalidate({ jobId });
            }
            setRejectState(null);
          }}
        />
      ) : null}
    </div>
  );
}
