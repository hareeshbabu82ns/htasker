import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardKeys } from "@/hooks/queries/boardQueries";
import {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  addColumn,
  updateColumn,
  deleteColumn,
} from "@/app/actions/boards";
import { createTask, updateTask, deleteTask, moveTask } from "@/app/actions/board-tasks";
import { searchUsers } from "@/app/actions/users";
import type { CreateBoardInput } from "@/app/actions/boards";
import type { CreateTaskInput } from "@/app/actions/board-tasks";
import type { Board, BoardColumn, BoardTask } from "@/types";

// Board list
export function useBoardsQuery() {
  return useQuery({
    queryKey: boardKeys.lists(),
    queryFn: async () => {
      const res = await getBoards();
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 30_000,
  });
}

// Single board
export function useBoardQuery(boardId: string) {
  return useQuery({
    queryKey: boardKeys.detail(boardId),
    queryFn: async () => {
      const res = await getBoard(boardId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    staleTime: 15_000,
  });
}

// Create board
export function useCreateBoardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBoardInput) => {
      const res = await createBoard(data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.lists() });
    },
  });
}

// Update board
export function useUpdateBoardMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBoardInput) => {
      const res = await updateBoard(boardId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.lists() });
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Delete board
export function useDeleteBoardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      const res = await deleteBoard(boardId);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.lists() });
    },
  });
}

// Add column
export function useAddColumnMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await addColumn(boardId, { name });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Update column
export function useUpdateColumnMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, name }: { columnId: string; name: string }) => {
      const res = await updateColumn(columnId, { name });
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Delete column
export function useDeleteColumnMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (columnId: string) => {
      const res = await deleteColumn(columnId);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Create task
export function useCreateTaskMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, data }: { columnId: string; data: CreateTaskInput }) => {
      const res = await createTask(boardId, columnId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Update task
export function useUpdateTaskMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: CreateTaskInput }) => {
      const res = await updateTask(taskId, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Delete task
export function useDeleteTaskMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await deleteTask(taskId);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// Move task (optimistic)
export function useMoveTaskMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      targetColumnId,
      newOrder,
    }: {
      taskId: string;
      targetColumnId: string;
      newOrder: number;
    }) => {
      const res = await moveTask(taskId, targetColumnId, newOrder);
      if (!res.success) throw new Error(res.error);
    },
    onMutate: async ({ taskId, targetColumnId, newOrder }) => {
      await qc.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const prev = qc.getQueryData<Board>(boardKeys.detail(boardId));
      if (prev) {
        const columns = prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) => ({ ...t })),
        }));

        // Find and remove task from source
        let movedTask: BoardTask | undefined;
        for (const col of columns) {
          const idx = col.tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) {
            movedTask = col.tasks.splice(idx, 1)[0];
            break;
          }
        }

        // Insert into target
        if (movedTask) {
          const targetCol = columns.find((c) => c.id === targetColumnId);
          if (targetCol) {
            movedTask = { ...movedTask, columnId: targetColumnId, order: newOrder };
            targetCol.tasks.splice(newOrder, 0, movedTask);
            targetCol.tasks.forEach((t, i) => (t.order = i));
          }
        }

        // Reindex source columns
        for (const col of columns) {
          col.tasks.forEach((t, i) => (t.order = i));
        }

        qc.setQueryData(boardKeys.detail(boardId), { ...prev, columns });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(boardKeys.detail(boardId), ctx.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

// User search
export function useUserSearch(query: string) {
  return useQuery({
    queryKey: boardKeys.users(query),
    queryFn: async () => {
      const res = await searchUsers(query);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}
