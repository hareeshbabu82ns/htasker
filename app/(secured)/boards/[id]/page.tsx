"use client";

import { useBoardQuery } from "@/hooks/useBoardQuery";
import { KanbanBoard } from "@/components/features/boards/KanbanBoard";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const { data: board, isLoading, error } = useBoardQuery(boardId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96 w-80 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive text-lg">{error?.message ?? "Board not found"}</p>
      </div>
    );
  }

  return <KanbanBoard board={board} />;
}
