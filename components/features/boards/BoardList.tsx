"use client";

import {
  useBoardsQuery,
  useCreateBoardMutation,
  useDeleteBoardMutation,
} from "@/hooks/useBoardQuery";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, KanbanSquare } from "lucide-react";
import Link from "next/link";
import { CreateBoardDialog } from "./CreateBoardDialog";
import { useState } from "react";
import { toast } from "sonner";
import type { Board } from "@/types";

export function BoardList() {
  const { data: boards, isLoading } = useBoardsQuery();
  const [showCreate, setShowCreate] = useState(false);
  const deleteMutation = useDeleteBoardMutation();

  const handleDelete = (board: Board) => {
    if (!confirm(`Delete board "${board.name}"? All tasks will be lost.`)) return;
    deleteMutation.mutate(board.id, {
      onSuccess: () => toast.success("Board deleted"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Boards</h1>
          <p className="text-muted-foreground text-sm">Manage your projects with Kanban boards</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Board
        </Button>
      </div>

      {boards && boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <KanbanSquare className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground mb-4 text-lg">No boards yet</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first board
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards?.map((board) => {
            const taskCount = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
            return (
              <Card key={board.id} className="group relative transition-shadow hover:shadow-md">
                <Link
                  href={`/boards/${board.id}`}
                  className="absolute inset-0 z-0"
                  aria-label={`Open board ${board.name}`}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-lg">{board.name}</CardTitle>
                      {board.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {board.description}
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(board);
                      }}
                      aria-label={`Delete board ${board.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                    <span>{board.columns.length} columns</span>
                    <span>{taskCount} tasks</span>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}

      <CreateBoardDialog open={showCreate} onOpenChange={setShowCreate} />
    </>
  );
}
