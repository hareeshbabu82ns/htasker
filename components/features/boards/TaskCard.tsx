"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, User as UserIcon, Calendar, Flag } from "lucide-react";
import type { BoardTask } from "@/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: BoardTask;
  onClick: () => void;
}

const priorityColors: Record<string, string> = {
  LOW: "text-slate-500 bg-slate-500/10",
  MEDIUM: "text-sky-500 bg-sky-500/10",
  HIGH: "text-orange-500 bg-orange-500/10",
  URGENT: "text-rose-500 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-400/10 font-bold",
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    new Date(task.dueDate).toDateString() !== new Date().toDateString();

  return (
    <div
      ref={setNodeRef}
      style={style}
      aria-label={`Task: ${task.title}`}
      className={cn(
        "group bg-card flex flex-col gap-2 rounded-xl border p-3 shadow-sm transition-all hover:border-indigo-500/30 hover:shadow-md",
        isDragging ? "scale-105 border-indigo-500/50 opacity-50 shadow-xl" : "border-border/50",
        isOverdue ? "border-destructive/30 bg-destructive/5" : ""
      )}
    >
      <div className="flex w-full items-start gap-2">
        <button
          className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 cursor-grab touch-none opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          className="-ml-2 min-w-0 flex-1 text-left transition-all duration-200 group-hover:ml-0"
          onClick={onClick}
          aria-label={`Edit task: ${task.title}`}
        >
          <p className="text-foreground/90 text-sm leading-tight font-semibold">{task.title}</p>
        </button>
      </div>

      {/* Badges and Assignee */}
      <div className="mt-1 flex w-full items-center justify-between pr-1 pl-6">
        <div className="flex flex-wrap items-center gap-2">
          {task.priority && task.priority !== "MEDIUM" && (
            <div
              className={cn(
                "flex flex-row items-center justify-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                priorityColors[task.priority]
              )}
            >
              <Flag className="h-3 w-3" />
              {task.priority}
            </div>
          )}

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                isOverdue
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground bg-muted/50"
              )}
            >
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        {task.assignee ? (
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-sm"
            title={task.assignee.name ?? task.assignee.email}
          >
            {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
          </div>
        ) : (
          <div className="border-muted-foreground/30 bg-muted/10 flex h-6 w-6 items-center justify-center rounded-full border border-dashed opacity-60 transition-opacity hover:opacity-100">
            <UserIcon className="text-muted-foreground/50 h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}

// Drag overlay version (no sortable hooks)
export function TaskCardOverlay({ task }: { task: BoardTask }) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    new Date(task.dueDate).toDateString() !== new Date().toDateString();

  return (
    <div
      className={cn(
        "bg-card flex scale-105 cursor-grabbing flex-col gap-2 rounded-xl border border-indigo-500/50 p-3 shadow-2xl",
        isOverdue ? "bg-destructive/5 border-destructive/50" : ""
      )}
    >
      <div className="flex w-full items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <div className="min-w-0 flex-1">
          <p className="text-foreground/90 text-sm leading-tight font-semibold">{task.title}</p>
        </div>
      </div>

      <div className="mt-1 flex w-full items-center justify-between pr-1 pl-6">
        <div className="flex flex-wrap items-center gap-2">
          {task.priority && task.priority !== "MEDIUM" && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                priorityColors[task.priority]
              )}
            >
              <Flag className="h-3 w-3" />
              {task.priority}
            </div>
          )}

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
                isOverdue
                  ? "text-destructive bg-destructive/10"
                  : "text-muted-foreground bg-muted/50"
              )}
            >
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        {task.assignee ? (
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[10px] font-bold text-white shadow-sm"
            title={task.assignee.name ?? task.assignee.email}
          >
            {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
          </div>
        ) : (
          <div className="border-muted-foreground/30 bg-muted/10 flex h-6 w-6 items-center justify-center rounded-full border border-dashed opacity-60">
            <UserIcon className="text-muted-foreground/50 h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
