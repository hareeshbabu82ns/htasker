"use client";

import { useBoardQuery } from "@/hooks/useBoardQuery";
import { TaskDetailContent } from "@/components/features/boards/TaskDetailContent";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const taskId = params.taskId as string;

  const { data: board, isLoading, error } = useBoardQuery(boardId);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col space-y-6 p-8">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-20">
        <p className="text-destructive text-lg font-medium">
          {error?.message ?? "Board not found"}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/boards")}>
          Go back
        </Button>
      </div>
    );
  }

  const task = board.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);

  if (!task) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-20">
        <p className="text-destructive text-lg font-medium">Task not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/boards/${boardId}`)}
        >
          Return to board
        </Button>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-1 flex-col overflow-y-auto">
      {/* Top Breadcrumb / Nav */}
      <div className="bg-background/80 border-border/50 sticky top-0 z-10 flex items-center gap-3 border-b px-8 py-4 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={() => router.push(`/boards/${boardId}`)}
          title="Back to Kanban Board"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground text-sm font-medium">
          {board.name} <span className="mx-2">/</span> Task Details
        </span>
      </div>

      <div className="bg-background flex-1 pb-12">
        <TaskDetailContent task={task} boardId={boardId} isSheet={false} />
      </div>
    </div>
  );
}
