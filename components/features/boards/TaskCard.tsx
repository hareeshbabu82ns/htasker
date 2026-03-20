"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, User as UserIcon } from "lucide-react";
import type { BoardTask } from "@/types";

interface TaskCardProps {
  task: BoardTask;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card border-border flex items-start gap-2 rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-grab touch-none active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        className="min-w-0 flex-1 text-left"
        onClick={onClick}
        aria-label={`Edit task: ${task.title}`}
      >
        <p className="text-sm leading-tight font-medium">{task.title}</p>
        {task.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{task.description}</p>
        )}
        {task.assignee && (
          <div className="mt-2 flex items-center gap-1">
            <div className="bg-primary/10 text-primary flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium">
              {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
            </div>
            <span className="text-muted-foreground truncate text-xs">
              {task.assignee.name ?? task.assignee.email}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

// Drag overlay version (no sortable hooks)
export function TaskCardOverlay({ task }: { task: BoardTask }) {
  return (
    <div className="bg-card border-border flex items-start gap-2 rounded-lg border p-3 shadow-lg">
      <GripVertical className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight font-medium">{task.title}</p>
        {task.assignee && (
          <div className="mt-2 flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            <span className="text-muted-foreground text-xs">
              {task.assignee.name ?? task.assignee.email}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
