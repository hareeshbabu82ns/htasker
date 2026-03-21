"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
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
import { useUpdateTaskMutation, useDeleteTaskMutation } from "@/hooks/useBoardQuery";
import { UserAssignment } from "./UserAssignment";
import { TaskDescription } from "./TaskDescription";
import { toast } from "sonner";
import { Trash2, X, Calendar as CalendarIcon, Flag, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BoardTask } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor").then((mod) => mod.default), {
  ssr: false,
});

type EditingField =
  | "title"
  | "description"
  | "assignee"
  | "startDate"
  | "dueDate"
  | "priority"
  | null;

interface Draft {
  title: string;
  description: string;
  assigneeId: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
}

interface TaskDetailContentProps {
  boardId: string;
  task: BoardTask;
  onClose?: () => void;
  isSheet?: boolean;
}

export function TaskDetailContent({
  boardId,
  task,
  onClose,
  isSheet = false,
}: TaskDetailContentProps) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [draft, setDraft] = useState<Draft>({
    title: task.title,
    description: task.description ?? "",
    assigneeId: task.assigneeId ?? null,
    startDate: task.startDate ? new Date(task.startDate) : null,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    priority: (task.priority as Draft["priority"]) ?? "MEDIUM",
  });
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  const updateMutation = useUpdateTaskMutation(boardId);
  const deleteMutation = useDeleteTaskMutation(boardId);

  useEffect(() => {
    setDraft({
      title: task.title,
      description: task.description ?? "",
      assigneeId: task.assigneeId ?? null,
      startDate: task.startDate ? new Date(task.startDate) : null,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      priority: (task.priority as Draft["priority"]) ?? "MEDIUM",
    });
    setEditingField(null);
    setTitleError(null);
  }, [task]);

  useEffect(() => {
    if (editingField === "title") {
      setTimeout(() => titleInputRef.current?.focus(), 0);
    }
  }, [editingField]);

  const saveField = useCallback(
    async (field: EditingField, overrideDraft?: Partial<Draft>) => {
      if (!task || !field) return;

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
      const startDate =
        field === "startDate"
          ? overrideDraft?.startDate !== undefined
            ? overrideDraft.startDate
            : draft.startDate
          : task.startDate
            ? new Date(task.startDate)
            : null;
      const dueDate =
        field === "dueDate"
          ? overrideDraft?.dueDate !== undefined
            ? overrideDraft.dueDate
            : draft.dueDate
          : task.dueDate
            ? new Date(task.dueDate)
            : null;
      const priority = (
        field === "priority"
          ? overrideDraft?.priority !== undefined
            ? overrideDraft.priority
            : draft.priority
          : (task.priority ?? "MEDIUM")
      ) as "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;

      if (field === "title" && !title) {
        setTitleError("Title is required");
        return;
      }

      try {
        await updateMutation.mutateAsync({
          taskId: task.id,
          data: {
            title,
            description: description || undefined,
            assigneeId,
            startDate,
            dueDate,
            priority,
          },
        });
        if (field !== "description") {
          setEditingField(null);
        }
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
      startDate: task.startDate ? new Date(task.startDate) : null,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      priority: (task.priority as Draft["priority"]) ?? "MEDIUM",
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
      if (onClose) {
        onClose();
      } else {
        router.push(`/boards/${boardId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const setPriority = (val: string) => {
    const p = val as "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    setDraft((d) => ({ ...d, priority: p }));
    saveField("priority", { priority: p });
  };

  return (
    <>
      <div
        className={cn(
          "flex w-full flex-col gap-0",
          isSheet ? "h-full" : "bg-background min-h-screen"
        )}
      >
        <div className="border-border/50 flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs opacity-80">
            {isSheet ? (
              <Link
                href={`/boards/${boardId}/tasks/${task.id}`}
                className="flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-600 transition-colors select-all hover:bg-indigo-500/20 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-indigo-400"
              >
                <span>TASK-{task.id.substring(18)}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : (
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-indigo-600 select-all dark:text-indigo-400">
                TASK-{task.id.substring(18)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex flex-1 flex-col gap-6",
            isSheet
              ? "overflow-x-hidden overflow-y-auto p-6"
              : "mx-auto w-full max-w-4xl p-8 md:p-12"
          )}
        >
          {/* Title */}
          <div className="w-full">
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
                  className={cn(
                    "bg-background/50 w-full rounded-xl border border-indigo-500/30 px-4 py-3 text-2xl font-bold shadow-inner backdrop-blur-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500",
                    titleError && "border-destructive focus:ring-destructive"
                  )}
                />
                {titleError && <p className="text-destructive mt-1 text-sm">{titleError}</p>}
              </div>
            ) : (
              <h1
                className={cn(
                  "hover:bg-muted/50 hover:border-border/50 -ml-2 cursor-pointer rounded-lg border border-transparent p-2 font-extrabold tracking-tight break-words transition-colors",
                  isSheet ? "text-3xl" : "text-4xl md:text-5xl"
                )}
                onClick={() => setEditingField("title")}
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Properties Grid */}
          <div className="bg-muted/30 border-border/50 mt-2 grid grid-cols-1 gap-4 rounded-xl border p-5 shadow-sm md:grid-cols-2">
            {/* Assignee */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground w-24 text-sm font-medium">Assignee</span>
              <div className="flex-1">
                {editingField === "assignee" ? (
                  <div className="bg-background flex items-center gap-2 rounded-md border p-1 shadow-sm">
                    <UserAssignment
                      value={draft.assigneeId}
                      onSelect={(id) => {
                        setDraft((d) => ({ ...d, assigneeId: id }));
                        saveField("assignee", { assigneeId: id });
                      }}
                      assignee={task.assignee}
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div
                    className="hover:bg-muted/80 -ml-1.5 flex cursor-pointer items-center gap-2 rounded-md p-1.5 transition-colors"
                    onClick={() => setEditingField("assignee")}
                  >
                    {task.assignee ? (
                      <>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-xs font-bold text-white shadow-sm">
                          {(task.assignee.name ?? task.assignee.email)[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">
                          {task.assignee.name || task.assignee.email}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground flex w-24 items-center gap-1.5 text-sm font-medium">
                <Flag className="h-3.5 w-3.5" /> Priority
              </span>
              <div className="flex-1">
                <Select value={draft.priority ?? "MEDIUM"} onValueChange={setPriority}>
                  <SelectTrigger className="hover:border-border hover:bg-muted/80 -ml-2 h-8 border-transparent bg-transparent px-2 shadow-none transition-colors focus:ring-1 focus:ring-indigo-500">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">
                      <span className="font-medium text-slate-500">Low</span>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <span className="font-medium text-sky-500">Medium</span>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <span className="font-medium text-orange-500">High</span>
                    </SelectItem>
                    <SelectItem value="URGENT">
                      <span className="font-bold text-rose-500">Urgent</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground flex w-24 items-center gap-1.5 text-sm font-medium">
                <CalendarIcon className="h-3.5 w-3.5" /> Due date
              </span>
              <div className="flex flex-1 items-center">
                <input
                  type="date"
                  className="hover:border-border hover:bg-muted/80 text-foreground -ml-1.5 cursor-pointer rounded-md border border-transparent bg-transparent p-1.5 text-sm font-medium transition-colors outline-none focus:ring-1 focus:ring-indigo-500"
                  value={
                    draft.dueDate
                      ? new Date(
                          draft.dueDate.getTime() - draft.dueDate.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const rawDate = e.target.value ? new Date(e.target.value) : null;
                    const newDate = rawDate
                      ? new Date(rawDate.getTime() + rawDate.getTimezoneOffset() * 60000)
                      : null;
                    setDraft((d) => ({ ...d, dueDate: newDate }));
                    saveField("dueDate", { dueDate: newDate });
                  }}
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground flex w-24 items-center gap-1.5 text-sm font-medium">
                <CalendarIcon className="h-3.5 w-3.5" /> Start date
              </span>
              <div className="flex flex-1 items-center">
                <input
                  type="date"
                  className="hover:border-border hover:bg-muted/80 text-foreground -ml-1.5 cursor-pointer rounded-md border border-transparent bg-transparent p-1.5 text-sm font-medium transition-colors outline-none focus:ring-1 focus:ring-indigo-500"
                  value={
                    draft.startDate
                      ? new Date(
                          draft.startDate.getTime() - draft.startDate.getTimezoneOffset() * 60000
                        )
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => {
                    const rawDate = e.target.value ? new Date(e.target.value) : null;
                    const newDate = rawDate
                      ? new Date(rawDate.getTime() + rawDate.getTimezoneOffset() * 60000)
                      : null;
                    setDraft((d) => ({ ...d, startDate: newDate }));
                    saveField("startDate", { startDate: newDate });
                  }}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border/50 mt-4" />

          {/* Description Editor */}
          <div className="flex min-h-[300px] flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Description</h3>
              {editingField === "description" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveField("description")}
                    className="bg-indigo-600 px-6 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700"
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingField("description")}
                  className="border-border/80 rounded-full text-xs font-semibold shadow-sm"
                >
                  Edit Description
                </Button>
              )}
            </div>

            {editingField === "description" ? (
              <div
                data-color-mode="auto"
                className="border-border/80 flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm"
              >
                <div className="relative h-full flex-1 bg-white dark:bg-slate-900">
                  <style>{`
                     .w-md-editor-content { min-height: 250px; }
                     .w-md-editor { border: none !important; border-radius: 0 !important; height: 100% !important; background: transparent !important; }
                  `}</style>
                  <MDEditor
                    value={draft.description}
                    onChange={(val) => setDraft((d) => ({ ...d, description: val || "" }))}
                    preview="edit"
                    height="100%"
                    visibleDragbar={false}
                  />
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "bg-muted/20 flex-1 cursor-text rounded-xl border border-transparent p-6 text-sm transition-all",
                  "hover:bg-muted/30 hover:border-border/60 hover:shadow-sm"
                )}
                onClick={() => setEditingField("description")}
              >
                {task.description ? (
                  <div data-color-mode="auto" className="wmde-markdown-var">
                    <TaskDescription content={task.description} boardId={boardId} />
                  </div>
                ) : (
                  <p className="text-muted-foreground border-border/50 flex h-32 items-center justify-center rounded-lg border-2 border-dashed italic opacity-70">
                    Add a more detailed description...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{task.title}" will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/20 border-0 shadow-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
