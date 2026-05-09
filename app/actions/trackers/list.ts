"use server";

import prisma from "@/lib/db/prisma";
import { Tracker, TrackerStatus, TrackerType } from "@/types";
import { requireUserId } from "@/lib/auth/server";
import type { TrackerActionResponse } from "./crud";

export type TrackerWithEntriesCount = Tracker & {
  entriesCount: number;
  isPinned: boolean;
};
export type TrackerPagingResponse = {
  trackers: TrackerWithEntriesCount[];
  total: number;
  totalPages: number;
  page: number;
};

/**
 * Get a tracker by ID
 */
export async function getTracker(id: string): Promise<TrackerActionResponse<Tracker>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId },
      include: {
        entries: {
          orderBy: { date: "desc" },
          take: 5,
        },
      },
    });

    if (!tracker) {
      return { success: false, error: "Tracker not found" };
    }

    return { success: true, data: tracker };
  } catch (error) {
    console.error("Error getting tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to retrieve tracker" };
  }
}

/**
 * Get all trackers with optional filtering and pagination
 */
export async function getTrackers(filters?: {
  status?: TrackerStatus;
  type?: TrackerType;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
  pinned?: boolean;
}): Promise<TrackerActionResponse<TrackerPagingResponse>> {
  try {
    const userId = await requireUserId();

    // Build the where clause based on the provided filters
    const where: any = { userId };

    // Add status filter if provided
    if (filters?.status) {
      where.status = filters.status;
    }

    // Add type filter if provided
    if (filters?.type) {
      where.type = filters.type;
    }

    // Add pinned filter if provided
    if (filters?.pinned !== undefined) {
      where.isPinned = filters.pinned;
    }

    // Add search filter if provided
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { tags: { has: filters.search } }, // This works if tags is stored as an array
      ];
    }

    // Determine the sort order
    let orderBy: any = { updatedAt: "desc" }; // Default sort

    if (filters?.sort) {
      switch (filters.sort) {
        case "name":
          orderBy = { name: "asc" };
          break;
        case "created":
          orderBy = { createdAt: "desc" };
          break;
        case "recent":
          orderBy = { updatedAt: "desc" };
          break;
      }
    }

    // Setup pagination parameters
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 10;
    const skip = (page - 1) * limit;

    // Count total items for pagination info
    const total = await prisma.tracker.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Query the database with the filters and pagination
    const trackers = await prisma.tracker.findMany({
      where,
      orderBy,
      // include: {
      //    _count: {
      //     select: { entries: true },
      //    },
      // },
      skip,
      take: limit,
    });

    return {
      success: true,
      data: {
        trackers: trackers.map((tracker) => ({
          ...tracker,
          entriesCount: tracker.statistics?.totalEntries || 0,
        })),
        total,
        totalPages,
        page,
      },
    };
  } catch (error) {
    console.error("Error getting trackers:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to retrieve trackers" };
  }
}
