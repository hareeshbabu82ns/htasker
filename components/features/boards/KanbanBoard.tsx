"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardOverlay } from "./TaskCard";
import { TaskDialog } from "./TaskDialog";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { AddColumnDialog } from "./AddColumnDialog";
import { CreateBoardDialog } from "./CreateBoardDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Settings2, ArrowLeft } from "lucide-react";
import { useMoveTaskMutation, useDeleteColumnMutation } from "@/hooks/useBoardQuery";
import { toast } from "sonner";
import Link from "next/link";
import type { Board, BoardTask } from "@/types";

interface KanbanBoardProps {
  board: Board;
}

export function KanbanBoard({ board }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  // Sheet for viewing/editing existing tasks
  const [taskSheet, setTaskSheet] = useState<{ open: boolean; task: BoardTask | null }>({
    open: false,
    task: null,
  });

  // Dialog only for creating new tasks
  const [newTaskDialog, setNewTaskDialog] = useState<{ open: boolean; columnId: string }>({
    open: false,
    columnId: "",
  });

  const [showAddColumn, setShowAddColumn] = useState(false);
  const [editColumn, setEditColumn] = useState<{ id: string; name: string } | null>(null);
  const [showEditBoard, setShowEditBoard] = useState(false);
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const moveMutation = useMoveTaskMutation(board.id);
  const deleteColumnMutation = useDeleteColumnMutation(board.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findTask = useCallback(
    (taskId: string): BoardTask | undefined => {
      for (const col of board.columns) {
        const task = col.tasks.find((t) => t.id === taskId);
        if (task) return task;
      }
      return undefined;
    },
    [board.columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTask(event.active.id as string);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = findTask(taskId);
    if (!task) return;

    let targetColumnId: string;
    let newOrder: number;

    const overData = over.data.current;
    if (overData?.type === "column") {
      targetColumnId = over.id as string;
      newOrder = 0;
    } else if (overData?.type === "task") {
      const overTask = overData.task as BoardTask;
      targetColumnId = overTask.columnId;
      const targetCol = board.columns.find((c) => c.id === targetColumnId);
      if (!targetCol) return;
      newOrder = targetCol.tasks.findIndex((t) => t.id === overTask.id);
      if (newOrder === -1) newOrder = targetCol.tasks.length;
    } else {
      targetColumnId = over.id as string;
      const targetCol = board.columns.find((c) => c.id === targetColumnId);
      newOrder = targetCol ? targetCol.tasks.length : 0;
    }

    if (task.columnId === targetColumnId) {
      const col = board.columns.find((c) => c.id === targetColumnId);
      const currentOrder = col?.tasks.findIndex((t) => t.id === taskId) ?? -1;
      if (currentOrder === newOrder) return;
    }

    moveMutation.mutate(
      { taskId, targetColumnId, newOrder },
      { onError: (err) => toast.error(err.message) }
    );
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const handleDeleteColumn = () => {
    if (!deleteColumnTarget) return;
    deleteColumnMutation.mutate(deleteColumnTarget.id, {
      onSuccess: () => setDeleteColumnTarget(null),
      onError: (err) => {
        toast.error(err.message);
        setDeleteColumnTarget(null);
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Board header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/boards">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to boards">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold md:text-2xl">{board.name}</h1>
            {board.description && (
              <p className="text-muted-foreground hidden truncate text-sm md:block">
                {board.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddColumn(true)}>
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Column</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEditBoard(true)}
            aria-label="Board settings"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Kanban columns — fluid, horizontal scroll when needed */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="flex h-full min-h-[200px] gap-4">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddTask={() => setNewTaskDialog({ open: true, columnId: column.id })}
                onViewTask={(taskId) => {
                  const task = column.tasks.find((t) => t.id === taskId);
                  if (task) setTaskSheet({ open: true, task });
                }}
                onEditColumn={() => setEditColumn({ id: column.id, name: column.name })}
                onDeleteColumn={() => setDeleteColumnTarget({ id: column.id, name: column.name })}
              />
            ))}
          </div>

          <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
        </DndContext>
      </div>

      {/* Task detail sheet (view/edit existing tasks) */}
      <TaskDetailSheet
        open={taskSheet.open}
        onOpenChange={(open) => {
          if (!open) setTaskSheet({ open: false, task: null });
        }}
        boardId={board.id}
        task={taskSheet.task}
      />

      {/* Dialog for creating new tasks */}
      <TaskDialog
        open={newTaskDialog.open}
        onOpenChange={(open) => {
          if (!open) setNewTaskDialog({ open: false, columnId: "" });
        }}
        boardId={board.id}
        columnId={newTaskDialog.columnId}
      />

      {/* Add / rename column dialogs */}
      <AddColumnDialog open={showAddColumn} onOpenChange={setShowAddColumn} boardId={board.id} />
      {editColumn && (
        <AddColumnDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditColumn(null);
          }}
          boardId={board.id}
          column={editColumn}
        />
      )}

      {/* Board settings */}
      <CreateBoardDialog open={showEditBoard} onOpenChange={setShowEditBoard} board={board} />

      {/* Column delete confirmation */}
      <AlertDialog
        open={!!deleteColumnTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteColumnTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete column?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteColumnTarget?.name}&rdquo; and all its tasks will be permanently
              deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteColumn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
