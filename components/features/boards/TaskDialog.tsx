"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "@/hooks/useBoardQuery";
import { UserAssignment } from "./UserAssignment";
import { TaskDescription } from "./TaskDescription";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { BoardTask } from "@/types";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  columnId: string;
  task?: BoardTask;
}

export function TaskDialog({ open, onOpenChange, boardId, columnId, task }: TaskDialogProps) {
  const isEdit = !!task;
  const [showPreview, setShowPreview] = useState(false);
  const createMutation = useCreateTaskMutation(boardId);
  const updateMutation = useUpdateTaskMutation(boardId);
  const deleteMutation = useDeleteTaskMutation(boardId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      assigneeId: task?.assigneeId ?? null,
    },
  });

  const descriptionValue = watch("description");

  // Reset form when task or open state changes
  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        assigneeId: task?.assigneeId ?? null,
      });
      setShowPreview(false);
    }
  }, [open, task?.id, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEdit && task) {
        await updateMutation.mutateAsync({ taskId: task.id, data });
        toast.success("Task updated");
      } else {
        await createMutation.mutateAsync({ columnId, data });
        toast.success("Task created");
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("Delete this task?")) return;
    try {
      await deleteMutation.mutateAsync(task.id);
      toast.success("Task deleted");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
            {isEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
                aria-label="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Task title"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-description">Description (Markdown)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-auto px-2 py-1 text-xs"
              >
                {showPreview ? "Edit" : "Preview"}
              </Button>
            </div>
            {showPreview ? (
              <div className="min-h-[120px] rounded-md border p-3">
                {descriptionValue ? (
                  <TaskDescription content={descriptionValue} boardId={boardId} />
                ) : (
                  <p className="text-muted-foreground text-sm italic">No description</p>
                )}
              </div>
            ) : (
              <Textarea
                id="task-description"
                placeholder="Describe the task... Use markdown and #taskId to reference tasks"
                rows={5}
                {...register("description")}
                aria-invalid={!!errors.description}
              />
            )}
            {errors.description && (
              <p className="text-destructive text-sm">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Controller
              control={control}
              name="assigneeId"
              render={({ field }) => (
                <UserAssignment
                  value={field.value}
                  onSelect={field.onChange}
                  assignee={task?.assignee}
                />
              )}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
