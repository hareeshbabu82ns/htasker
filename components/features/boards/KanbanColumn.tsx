"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BoardColumn as BoardColumnType } from "@/types";

interface KanbanColumnProps {
  column: BoardColumnType;
  onAddTask: () => void;
  onViewTask: (taskId: string) => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
}

export function KanbanColumn({
  column,
  onAddTask,
  onViewTask,
  onEditColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  const taskIds = column.tasks.map((t) => t.id);

  return (
    <div className="bg-muted/50 flex min-w-[240px] flex-1 flex-col rounded-xl">
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.name}</h3>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
            {column.tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddTask}
            aria-label={`Add task to ${column.name}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`Column options for ${column.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditColumn}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeleteColumn} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto px-3 pb-3 ${
          isOver ? "bg-primary/5 rounded-lg" : ""
        }`}
        style={{ minHeight: 60 }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onViewTask(task.id)} />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && (
          <button
            onClick={onAddTask}
            className="text-muted-foreground hover:text-foreground hover:border-foreground/20 flex w-full items-center justify-center rounded-lg border border-dashed py-8 text-sm transition-colors"
          >
            <Plus className="mr-1 h-4 w-4" />
            Add a task
          </button>
        )}
      </div>
    </div>
  );
}
