"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useUpdateTaskMutation, useDeleteTaskMutation } from "@/hooks/useBoardQuery";
import { UserAssignment } from "./UserAssignment";
import { TaskDescription } from "./TaskDescription";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { BoardTask } from "@/types";

type EditingField = "title" | "description" | "assignee" | null;

interface Draft {
  title: string;
  description: string;
  assigneeId: string | null;
}

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  task: BoardTask | null;
}

export function TaskDetailSheet({ open, onOpenChange, boardId, task }: TaskDetailSheetProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [draft, setDraft] = useState<Draft>({ title: "", description: "", assigneeId: null });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  const updateMutation = useUpdateTaskMutation(boardId);
  const deleteMutation = useDeleteTaskMutation(boardId);

  // Sync draft when sheet opens or task changes
  useEffect(() => {
    if (open && task) {
      setDraft({
        title: task.title,
        description: task.description ?? "",
        assigneeId: task.assigneeId ?? null,
      });
      setEditingField(null);
      setTitleError(null);
    }
  }, [open, task?.id]);

  // Auto-focus the active field
  useEffect(() => {
    if (editingField === "title") {
      setTimeout(() => titleInputRef.current?.focus(), 0);
    } else if (editingField === "description") {
      setTimeout(() => descTextareaRef.current?.focus(), 0);
    }
  }, [editingField]);

  const saveField = useCallback(
    async (field: EditingField, overrideDraft?: Partial<Draft>) => {
      if (!task || !field) return;

      // Use draft only for the field being edited; fall back to task prop for all others
      // This prevents stale draft from overwriting concurrent server updates
      const title = field === "title" ? (overrideDraft?.title ?? draft.title).trim() : task.title;
      const description =
        field === "description"
          ? (overrideDraft?.description ?? draft.description)
          : (task.description ?? "");
      const assigneeId =
        field === "assignee"
          ? overrideDraft?.assigneeId !== undefined
            ? overrideDraft.assigneeId
            : draft.assigneeId
          : (task.assigneeId ?? null);

      // Only enforce title validation when saving the title field
      if (field === "title" && !title) {
        setTitleError("Title is required");
        return;
      }

      try {
        await updateMutation.mutateAsync({
          taskId: task.id,
          data: { title, description: description || undefined, assigneeId },
        });
        setEditingField(null);
        setTitleError(null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    },
    [task, draft, updateMutation]
  );

  const cancelEdit = useCallback(() => {
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description ?? "",
      assigneeId: task.assigneeId ?? null,
    });
    setEditingField(null);
    setTitleError(null);
  }, [task]);

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

  if (!task) return null;

  const isSaving = updateMutation.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {/* Header */}
          <SheetHeader className="shrink-0 flex-row items-center justify-between border-b px-4 py-3">
            <SheetTitle className="sr-only">Task details</SheetTitle>
            <p className="text-muted-foreground font-mono text-xs opacity-60 select-all">
              #{task.id}
            </p>
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
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Scrollable content — flex col so description fills remaining height */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
              {/* ── Title ───────────────────────────────── */}
              <InlineField
                label="Title"
                editing={editingField === "title"}
                onStartEdit={() => setEditingField("title")}
              >
                {editingField === "title" ? (
                  <div className="space-y-1">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={draft.title}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, title: e.target.value }));
                        if (e.target.value.trim()) setTitleError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveField("title");
                        if (e.key === "Escape") cancelEdit();
                      }}
                      onBlur={() => saveField("title")}
                      placeholder="Task title"
                      maxLength={200}
                      className={cn(
                        "bg-background w-full rounded-md border px-3 py-2 text-xl leading-tight font-semibold",
                        "focus:ring-ring focus:ring-2 focus:outline-none",
                        titleError && "border-destructive"
                      )}
                      aria-invalid={!!titleError}
                    />
                    {titleError && <p className="text-destructive text-xs">{titleError}</p>}
                    <p className="text-muted-foreground text-xs">Enter to save · Esc to cancel</p>
                  </div>
                ) : (
                  <h2 className="text-xl leading-tight font-semibold">{task.title}</h2>
                )}
              </InlineField>

              <Separator />

              {/* ── Assignee ─────────────────────────────── */}
              <InlineField
                label="Assignee"
                editing={editingField === "assignee"}
                onStartEdit={() => setEditingField("assignee")}
              >
                {editingField === "assignee" ? (
                  <div className="space-y-2">
                    <UserAssignment
                      value={draft.assigneeId}
                      onSelect={(id) => {
                        const next = { ...draft, assigneeId: id };
                        setDraft(next);
                        saveField("assignee", { assigneeId: id });
                      }}
                      assignee={task.assignee}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground h-auto px-0 py-0 text-xs"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : task.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                      {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {task.assignee.name && (
                        <p className="text-sm font-medium">{task.assignee.name}</p>
                      )}
                      <p className="text-muted-foreground text-xs">{task.assignee.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">Unassigned</p>
                )}
              </InlineField>

              <Separator />

              {/* ── Description — flex-1 to fill ────────── */}
              <div className="flex min-h-[120px] flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Description
                  </p>
                  {editingField === "description" && (
                    <span className="text-muted-foreground text-xs">
                      {isSaving ? "Saving…" : "Blur or Esc to finish"}
                    </span>
                  )}
                </div>

                {editingField === "description" ? (
                  <Textarea
                    ref={descTextareaRef}
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    onBlur={() => saveField("description")}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") cancelEdit();
                    }}
                    placeholder="Describe the task… Use markdown and #taskId to reference tasks"
                    className="h-full min-h-[120px] flex-1 resize-none font-mono text-sm"
                  />
                ) : (
                  <div
                    onDoubleClick={() => setEditingField("description")}
                    className={cn(
                      "min-h-[120px] flex-1 cursor-text rounded-md",
                      "hover:ring-border transition-shadow hover:ring-1"
                    )}
                    title="Double-click to edit"
                    role="button"
                    aria-label="Description — double-click to edit"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "F2") setEditingField("description");
                    }}
                  >
                    {task.description ? (
                      <TaskDescription content={task.description} boardId={boardId} />
                    ) : (
                      <p className="text-muted-foreground text-sm italic">
                        No description — double-click to add
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Metadata ─────────────────────────────── */}
              <Separator />
              <div className="text-muted-foreground space-y-1 pb-2 text-xs">
                <p>Created {new Date(task.createdAt).toLocaleDateString()}</p>
                <p>Updated {new Date(task.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation — outside Sheet to avoid z-index stacking */}
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

// ── InlineField wrapper ───────────────────────────────────────────────────────

interface InlineFieldProps {
  label: string;
  editing: boolean;
  onStartEdit: () => void;
  children: React.ReactNode;
}

function InlineField({ label, editing, onStartEdit, children }: InlineFieldProps) {
  return (
    <div className="group space-y-1">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
      <div
        onDoubleClick={!editing ? onStartEdit : undefined}
        className={cn(
          "rounded-md transition-shadow",
          !editing && "hover:ring-border cursor-pointer hover:ring-1"
        )}
        title={!editing ? "Double-click to edit" : undefined}
      >
        {children}
      </div>
    </div>
  );
}
