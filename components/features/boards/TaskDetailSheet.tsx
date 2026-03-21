"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { TaskDetailContent } from "./TaskDetailContent";
import type { BoardTask } from "@/types";

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  task: BoardTask | null;
}

export function TaskDetailSheet({ open, onOpenChange, boardId, task }: TaskDetailSheetProps) {
  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTitle className="sr-only">Task details</SheetTitle>
      <SheetContent
        side="right"
        className="bg-sidebar/95 border-border flex w-full flex-col gap-0 border-l p-0 shadow-2xl backdrop-blur-xl sm:max-w-3xl"
      >
        <TaskDetailContent
          task={task}
          boardId={boardId}
          onClose={() => onOpenChange(false)}
          isSheet={true}
        />
      </SheetContent>
    </Sheet>
  );
}
