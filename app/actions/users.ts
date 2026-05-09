"use server";

import prisma from "@/lib/db/prisma";
import { auth } from "@/auth";
import type { User } from "@/types";

type UserActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

type UserSummary = Pick<User, "id" | "name" | "email" | "image">;

export async function searchUsers(query: string): Promise<UserActionResponse<UserSummary[]>> {
  if (!query || query.trim() === "") {
    return { success: false, error: "Search query is required" };
  }
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, image: true },
      take: 10,
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("[users] Operation failed:", error);
    return { success: false, error: "Failed to search users" };
  }
}
