"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateTaskMutation, useDeleteTaskMutation } from "@/hooks/useBoardQuery";
import { UserAssignment } from "./UserAssignment";
import { TaskDescription } from "./TaskDescription";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { BoardTask } from "@/types";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof taskSchema>;

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  task: BoardTask | null;
}

export function TaskDetailSheet({ open, onOpenChange, boardId, task }: TaskDetailSheetProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const updateMutation = useUpdateTaskMutation(boardId);
  const deleteMutation = useDeleteTaskMutation(boardId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(taskSchema) });

  const descriptionValue = watch("description");

  // Sync form + mode when task changes or sheet opens
  useEffect(() => {
    if (open && task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        assigneeId: task.assigneeId ?? null,
      });
      setMode("view");
      setShowPreview(false);
    }
  }, [open, task?.id, reset]);

  const handleSave = async (data: FormValues) => {
    if (!task) return;
    try {
      await updateMutation.mutateAsync({ taskId: task.id, data });
      toast.success("Task updated");
      setMode("view");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    try {
      await deleteMutation.mutateAsync(task.id);
      toast.success("Task deleted");
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleClose = () => {
    if (mode === "edit") {
      setMode("view");
    } else {
      onOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {/* Header */}
          <SheetHeader className="flex-row items-center justify-between border-b px-4 py-3">
            <SheetTitle className="sr-only">Task details</SheetTitle>
            <div className="flex items-center gap-2">
              {mode === "edit" ? (
                <>
                  <Button size="sm" onClick={handleSubmit(handleSave)} disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMode("view")}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive h-8 w-8"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {mode === "view" ? (
              <ViewContent task={task} boardId={boardId} />
            ) : (
              <EditContent
                register={register}
                control={control}
                errors={errors}
                task={task}
                boardId={boardId}
                descriptionValue={descriptionValue}
                showPreview={showPreview}
                onTogglePreview={() => setShowPreview((p) => !p)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation — rendered outside Sheet to avoid z-index issues */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{task.title}&rdquo; will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── View mode ────────────────────────────────────────────────────────────────

interface ViewContentProps {
  task: BoardTask;
  boardId: string;
}

function ViewContent({ task, boardId }: ViewContentProps) {
  return (
    <div className="space-y-6 px-4 py-5">
      <h2 className="text-xl leading-tight font-semibold">{task.title}</h2>

      {task.assignee && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Assignee
            </p>
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium">
                {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                {task.assignee.name && <p className="text-sm font-medium">{task.assignee.name}</p>}
                <p className="text-muted-foreground text-xs">{task.assignee.email}</p>
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Description
        </p>
        {task.description ? (
          <TaskDescription content={task.description} boardId={boardId} />
        ) : (
          <p className="text-muted-foreground text-sm italic">No description</p>
        )}
      </div>

      <Separator />

      <div className="text-muted-foreground space-y-1 text-xs">
        <p>Created {new Date(task.createdAt).toLocaleDateString()}</p>
        <p>Updated {new Date(task.updatedAt).toLocaleDateString()}</p>
        <p className="font-mono opacity-60">#{task.id}</p>
      </div>
    </div>
  );
}

// ── Edit mode ────────────────────────────────────────────────────────────────

interface EditContentProps {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  control: ReturnType<typeof useForm<FormValues>>["control"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  task: BoardTask;
  boardId: string;
  descriptionValue: string | undefined;
  showPreview: boolean;
  onTogglePreview: () => void;
}

function EditContent({
  register,
  control,
  errors,
  task,
  boardId,
  descriptionValue,
  showPreview,
  onTogglePreview,
}: EditContentProps) {
  return (
    <div className="space-y-5 px-4 py-5">
      <div className="space-y-2">
        <Label htmlFor="sheet-task-title">Title</Label>
        <Input
          id="sheet-task-title"
          placeholder="Task title"
          {...register("title")}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="sheet-task-description">Description (Markdown)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePreview}
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
            id="sheet-task-description"
            placeholder="Describe the task… Use markdown and #taskId to reference tasks"
            rows={6}
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
              assignee={task.assignee}
            />
          )}
        />
      </div>
    </div>
  );
}
