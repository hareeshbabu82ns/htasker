"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import type { BoardTask } from "@/types";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export type TaskActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

const TaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional()
    .nullable(),
  assigneeId: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof TaskSchema>;

async function verifyBoardOwnership(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.board.findFirst({
    where: { id: boardId, userId },
    select: { id: true },
  });
  return !!board;
}

export async function createTask(
  boardId: string,
  columnId: string,
  data: CreateTaskInput
): Promise<TaskActionResponse<BoardTask>> {
  try {
    const userId = await requireUserId();
    const validated = TaskSchema.parse(data);

    if (!(await verifyBoardOwnership(boardId, userId))) {
      return { success: false, error: "Board not found" };
    }

    // Verify column belongs to this board
    const column = await prisma.boardColumn.findFirst({
      where: { id: columnId, boardId },
      select: { id: true },
    });
    if (!column) {
      return { success: false, error: "Column not found" };
    }

    const lastTask = await prisma.boardTask.findFirst({
      where: { columnId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const task = await prisma.boardTask.create({
      data: {
        title: validated.title,
        description: validated.description ?? null,
        assigneeId: validated.assigneeId ?? null,
        order: (lastTask?.order ?? -1) + 1,
        columnId,
        boardId,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    revalidatePath(`/boards/${boardId}`);
    return { success: true, data: task as unknown as BoardTask };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(
  taskId: string,
  data: CreateTaskInput
): Promise<TaskActionResponse<BoardTask>> {
  try {
    const userId = await requireUserId();
    const validated = TaskSchema.parse(data);

    const existing = await prisma.boardTask.findFirst({
      where: { id: taskId },
      include: { column: { include: { board: { select: { userId: true } } } } },
    });
    if (!existing || existing.column.board.userId !== userId) {
      return { success: false, error: "Task not found" };
    }

    const task = await prisma.boardTask.update({
      where: { id: taskId },
      data: {
        title: validated.title,
        description: validated.description ?? null,
        assigneeId: validated.assigneeId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    revalidatePath(`/boards/${existing.boardId}`);
    return { success: true, data: task as unknown as BoardTask };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTask(taskId: string): Promise<TaskActionResponse<null>> {
  try {
    const userId = await requireUserId();

    const task = await prisma.boardTask.findFirst({
      where: { id: taskId },
      include: { column: { include: { board: { select: { userId: true, id: true } } } } },
    });
    if (!task || task.column.board.userId !== userId) {
      return { success: false, error: "Task not found" };
    }

    await prisma.boardTask.delete({ where: { id: taskId } });

    revalidatePath(`/boards/${task.boardId}`);
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Failed to delete task" };
  }
}

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  newOrder: number
): Promise<TaskActionResponse<null>> {
  try {
    const userId = await requireUserId();

    const task = await prisma.boardTask.findFirst({
      where: { id: taskId },
      include: { column: { include: { board: { select: { userId: true, id: true } } } } },
    });
    if (!task || task.column.board.userId !== userId) {
      return { success: false, error: "Task not found" };
    }

    const sourceColumnId = task.columnId;
    const boardId = task.boardId;

    // Verify target column belongs to the same board
    const targetColumn = await prisma.boardColumn.findFirst({
      where: { id: targetColumnId, boardId },
      select: { id: true },
    });
    if (!targetColumn) {
      return { success: false, error: "Target column not found" };
    }

    if (sourceColumnId === targetColumnId) {
      // Reorder within same column — atomic transaction
      await prisma.$transaction(async (tx) => {
        const tasks = await tx.boardTask.findMany({
          where: { columnId: sourceColumnId },
          orderBy: { order: "asc" },
          select: { id: true, order: true },
        });

        const filtered = tasks.filter((t) => t.id !== taskId);
        filtered.splice(newOrder, 0, { id: taskId, order: newOrder });

        for (let idx = 0; idx < filtered.length; idx++) {
          await tx.boardTask.update({ where: { id: filtered[idx].id }, data: { order: idx } });
        }
      });
    } else {
      // Move to different column — atomic transaction
      await prisma.$transaction(async (tx) => {
        // Reorder source column
        const sourceTasks = await tx.boardTask.findMany({
          where: { columnId: sourceColumnId, id: { not: taskId } },
          orderBy: { order: "asc" },
          select: { id: true },
        });
        for (let idx = 0; idx < sourceTasks.length; idx++) {
          await tx.boardTask.update({ where: { id: sourceTasks[idx].id }, data: { order: idx } });
        }

        // Insert into target column
        const targetTasks = await tx.boardTask.findMany({
          where: { columnId: targetColumnId },
          orderBy: { order: "asc" },
          select: { id: true },
        });
        targetTasks.splice(newOrder, 0, { id: taskId });
        for (let idx = 0; idx < targetTasks.length; idx++) {
          await tx.boardTask.update({
            where: { id: targetTasks[idx].id },
            data: {
              order: idx,
              ...(targetTasks[idx].id === taskId ? { columnId: targetColumnId } : {}),
            },
          });
        }
      });
    }

    revalidatePath(`/boards/${boardId}`);
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Failed to move task" };
  }
}
