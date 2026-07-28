"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StageType } from "@/lib/prisma-browser";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGE_TYPE_LABELS } from "@/lib/labels";
import { updatePipelineAction } from "@/server/actions/job";

interface EditableStage {
  key: string;
  id?: string;
  name: string;
  type: StageType;
}

interface PipelineEditorProps {
  jobId: string;
  stages: { id: string; name: string; type: StageType }[];
  editable: boolean;
}

export function PipelineEditor({
  jobId,
  stages,
  editable,
}: PipelineEditorProps) {
  const router = useRouter();
  const [items, setItems] = useState<EditableStage[]>(() =>
    stages.map((stage) => ({ key: stage.id, ...stage })),
  );
  const [newCount, setNewCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.key === active.id);
      const newIndex = current.findIndex((item) => item.key === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function updateItem(key: string, patch: Partial<EditableStage>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((item) => item.key !== key));
  }

  function addItem() {
    const key = `new-${newCount}`;
    setNewCount((count) => count + 1);
    setItems((current) => [
      ...current,
      { key, name: "New stage", type: StageType.SCREENING },
    ]);
  }

  function onSave() {
    startTransition(async () => {
      const result = await updatePipelineAction({
        jobId,
        stages: items.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
        })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pipeline saved");
      router.refresh();
    });
  }

  if (!editable) {
    return (
      <ol className="space-y-2">
        {items.map((stage, index) => (
          <li
            key={stage.key}
            className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground w-5 tabular-nums">
              {index + 1}
            </span>
            <span className="font-medium">{stage.name}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {STAGE_TYPE_LABELS[stage.type]}
            </span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="space-y-3">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.key)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {items.map((stage) => (
              <SortableStageRow
                key={stage.key}
                stage={stage}
                onChange={(patch) => updateItem(stage.key, patch)}
                onRemove={() => removeItem(stage.key)}
                disabled={isPending}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={isPending}
        >
          <Plus className="size-4" />
          Add stage
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save pipeline"}
        </Button>
      </div>
    </div>
  );
}

function SortableStageRow({
  stage,
  onChange,
  onRemove,
  disabled,
}: {
  stage: EditableStage;
  onChange: (patch: Partial<EditableStage>) => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-2 rounded-md border px-2 py-2"
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none p-1"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        value={stage.name}
        onChange={(event) => onChange({ name: event.target.value })}
        aria-label="Stage name"
        className="flex-1"
        disabled={disabled}
      />
      <Select
        value={stage.type}
        onValueChange={(value) => onChange({ type: value as StageType })}
        disabled={disabled}
      >
        <SelectTrigger className="w-36" aria-label="Stage type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(StageType).map((type) => (
            <SelectItem key={type} value={type}>
              {STAGE_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label="Remove stage"
        disabled={disabled}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
