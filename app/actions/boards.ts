"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import type { Board } from "@/types";

import { requireUserId } from "@/lib/auth/server";

export type BoardActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

const BoardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .nullable(),
});

export type CreateBoardInput = z.infer<typeof BoardSchema>;

const DEFAULT_COLUMNS = [
  { name: "To Do", order: 0 },
  { name: "In Progress", order: 1 },
  { name: "Done", order: 2 },
];

export async function createBoard(
  data: CreateBoardInput
): Promise<BoardActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const validated = BoardSchema.parse(data);

    const board = await prisma.board.create({
      data: {
        ...validated,
        userId,
        columns: {
          create: DEFAULT_COLUMNS,
        },
      },
    });

    revalidatePath("/boards");
    return { success: true, data: { id: board.id } };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to create board" };
  }
}

export async function getBoards(): Promise<BoardActionResponse<Board[]>> {
  try {
    const userId = await requireUserId();

    const boards = await prisma.board.findMany({
      where: { userId },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                assignee: { select: { id: true, name: true, email: true, image: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return { success: true, data: boards as Board[] };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    return { success: false, error: "Failed to fetch boards" };
  }
}

export async function getBoard(boardId: string): Promise<BoardActionResponse<Board>> {
  if (!boardId || boardId.trim() === "") {
    return { success: false, error: "Board ID is required" };
  }
  try {
    const userId = await requireUserId();

    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
      include: {
        columns: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                assignee: { select: { id: true, name: true, email: true, image: true } },
              },
            },
          },
        },
      },
    });

    if (!board) {
      return { success: false, error: "Board not found" };
    }

    return { success: true, data: board as Board };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    return { success: false, error: "Failed to fetch board" };
  }
}

export async function updateBoard(
  boardId: string,
  data: CreateBoardInput
): Promise<BoardActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();
    const validated = BoardSchema.parse(data);

    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
      select: { id: true },
    });
    if (!board) {
      return { success: false, error: "Board not found" };
    }

    await prisma.board.update({
      where: { id: boardId },
      data: validated,
    });

    revalidatePath("/boards");
    revalidatePath(`/boards/${boardId}`);
    return { success: true, data: { id: boardId } };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to update board" };
  }
}

export async function deleteBoard(boardId: string): Promise<BoardActionResponse<null>> {
  if (!boardId || boardId.trim() === "") {
    return { success: false, error: "Board ID is required" };
  }
  try {
    const userId = await requireUserId();

    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
      select: { id: true },
    });
    if (!board) {
      return { success: false, error: "Board not found" };
    }

    await prisma.board.delete({ where: { id: boardId } });

    revalidatePath("/boards");
    return { success: true, data: null };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    return { success: false, error: "Failed to delete board" };
  }
}

// Column management

const ColumnSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters"),
});

export async function addColumn(
  boardId: string,
  data: z.infer<typeof ColumnSchema>
): Promise<BoardActionResponse<{ id: string }>> {
  if (!boardId || boardId.trim() === "") {
    return { success: false, error: "Board ID is required" };
  }
  try {
    const userId = await requireUserId();
    const validated = ColumnSchema.parse(data);

    const board = await prisma.board.findFirst({
      where: { id: boardId, userId },
      include: { columns: { select: { order: true }, orderBy: { order: "desc" }, take: 1 } },
    });
    if (!board) {
      return { success: false, error: "Board not found" };
    }

    const nextOrder = (board.columns[0]?.order ?? -1) + 1;

    const column = await prisma.boardColumn.create({
      data: { name: validated.name, order: nextOrder, boardId },
    });

    revalidatePath(`/boards/${boardId}`);
    return { success: true, data: { id: column.id } };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to add column" };
  }
}

export async function updateColumn(
  columnId: string,
  data: z.infer<typeof ColumnSchema>
): Promise<BoardActionResponse<null>> {
  if (!columnId || columnId.trim() === "") {
    return { success: false, error: "Column ID is required" };
  }
  try {
    const userId = await requireUserId();
    const validated = ColumnSchema.parse(data);

    const column = await prisma.boardColumn.findFirst({
      where: { id: columnId },
      include: { board: { select: { userId: true, id: true } } },
    });
    if (!column || column.board.userId !== userId) {
      return { success: false, error: "Column not found" };
    }

    await prisma.boardColumn.update({
      where: { id: columnId },
      data: { name: validated.name },
    });

    revalidatePath(`/boards/${column.boardId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to update column" };
  }
}

export async function deleteColumn(columnId: string): Promise<BoardActionResponse<null>> {
  if (!columnId || columnId.trim() === "") {
    return { success: false, error: "Column ID is required" };
  }
  try {
    const userId = await requireUserId();

    const column = await prisma.boardColumn.findFirst({
      where: { id: columnId },
      include: { board: { select: { userId: true, id: true } } },
    });
    if (!column || column.board.userId !== userId) {
      return { success: false, error: "Column not found" };
    }

    await prisma.boardColumn.delete({ where: { id: columnId } });

    revalidatePath(`/boards/${column.boardId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error("[boards] Operation failed:", error);
    return { success: false, error: "Failed to delete column" };
  }
}
