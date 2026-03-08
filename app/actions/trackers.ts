"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import {
  TRACKER_STATUS_VALUES,
  TRACKER_TYPE_VALUES,
  Tracker,
  TrackerStatus,
  TrackerType,
} from "@/types";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

// Define a response type for better type safety
export type TrackerActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type TrackerStatistics = {
  totalEntries: number;
  totalTime: number;
  totalValue: number;
  totalCustom: string;
};

// Validation schema for creating/updating a tracker
const TrackerSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .max(200, "Description cannot exceed 200 characters")
    .optional()
    .nullable(),
  type: z.enum(TRACKER_TYPE_VALUES),
  status: z.enum(TRACKER_STATUS_VALUES).optional(),
  tags: z.array(z.string()).optional().default([]),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format")
    .optional()
    .nullable(),
  icon: z.string().optional().nullable(),
  statistics: z
    .object({
      totalEntries: z.number().optional().default(0),
      totalTime: z.number().optional(),
      totalValue: z.number().optional(),
      totalCustom: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export type CreateTrackerInput = z.infer<typeof TrackerSchema>;

/**
 * Create a new tracker
 */
export async function createTracker(
  data: CreateTrackerInput
): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Validate input data
    const validatedData = TrackerSchema.parse(data);

    // Create tracker in database
    const tracker = await prisma.tracker.create({
      data: {
        ...validatedData,
        status: TrackerStatus.INACTIVE,
        userId,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/trackers");

    return { success: true, data: { id: tracker.id } };
  } catch (error) {
    console.error("Error creating tracker:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return { success: false, error: "Failed to create tracker" };
  }
}

/**
 * Get a tracker by ID
 */
export async function getTracker(id: string): Promise<TrackerActionResponse<unknown>> {
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
 * Update a tracker
 */
export async function updateTracker(
  id: string,
  data: Partial<CreateTrackerInput>
): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Validate update data
    const validatedData = TrackerSchema.partial().parse(data);

    // Update tracker in database (scoped to owner)
    const tracker = await prisma.tracker.updateMany({
      where: { id, userId },
      data: validatedData,
    });

    if (tracker.count === 0) {
      return { success: false, error: "Tracker not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/trackers");
    revalidatePath(`/trackers/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error updating tracker:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return { success: false, error: "Failed to update tracker" };
  }
}

/**
 * Delete a tracker
 */
export async function deleteTracker(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Delete tracker from database (scoped to owner)
    const result = await prisma.tracker.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return { success: false, error: "Tracker not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error deleting tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to delete tracker" };
  }
}

/**
 * Duplicate a tracker (clone with fresh statistics)
 */
export async function duplicateTracker(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const original = await prisma.tracker.findFirst({
      where: { id, userId },
    });

    if (!original) {
      return { success: false, error: "Tracker not found" };
    }

    const duplicate = await prisma.tracker.create({
      data: {
        name: `Copy of ${original.name}`,
        description: original.description,
        type: original.type,
        status: "INACTIVE",
        tags: original.tags,
        color: original.color,
        icon: original.icon,
        userId: original.userId,
        statistics: {
          totalEntries: 0,
          totalTime: 0,
          totalValue: 0,
          totalCustom: "",
        },
      },
    });

    revalidatePath("/trackers");
    revalidatePath("/dashboard");

    return { success: true, data: { id: duplicate.id } };
  } catch (error) {
    console.error("Error duplicating tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to duplicate tracker" };
  }
}

/**
 * Archive multiple trackers by IDs
 */
export async function archiveTrackers(
  ids: string[]
): Promise<TrackerActionResponse<{ count: number }>> {
  try {
    const idsSchema = z.array(z.string().min(1)).min(1);
    const validatedIds = idsSchema.parse(ids);

    const userId = await requireUserId();

    const result = await prisma.tracker.updateMany({
      where: { id: { in: validatedIds }, userId },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/trackers");
    revalidatePath("/dashboard");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("Error archiving trackers:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid tracker IDs provided" };
    }
    return { success: false, error: "Failed to archive trackers" };
  }
}

/**
 * Delete multiple trackers by IDs
 */
export async function deleteTrackers(
  ids: string[]
): Promise<TrackerActionResponse<{ count: number }>> {
  try {
    const idsSchema = z.array(z.string().min(1)).min(1);
    const validatedIds = idsSchema.parse(ids);

    const userId = await requireUserId();

    const result = await prisma.tracker.deleteMany({
      where: { id: { in: validatedIds }, userId },
    });

    revalidatePath("/trackers");
    revalidatePath("/dashboard");

    return { success: true, data: { count: result.count } };
  } catch (error) {
    console.error("Error deleting trackers:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid tracker IDs provided" };
    }
    return { success: false, error: "Failed to delete trackers" };
  }
}

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
      //   _count: {
      //     select: { entries: true },
      //   },
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

/**
 * Pin a tracker (mark as favourite)
 */
export async function pinTracker(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const result = await prisma.tracker.updateMany({
      where: { id, userId },
      data: { isPinned: true },
    });

    if (result.count === 0) {
      return { success: false, error: "Tracker not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error pinning tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to pin tracker" };
  }
}

/**
 * Unpin a tracker (remove from favourites)
 */
export async function unpinTracker(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const result = await prisma.tracker.updateMany({
      where: { id, userId },
      data: { isPinned: false },
    });

    if (result.count === 0) {
      return { success: false, error: "Tracker not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error unpinning tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to unpin tracker" };
  }
}

const GoalSchema = z.object({
  enabled: z.boolean(),
  value: z.number().optional().nullable(),
  period: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  unit: z.string().max(20, "Unit cannot exceed 20 characters").optional().nullable(),
});

/**
 * Set or update goal settings on a tracker
 */
export async function setTrackerGoal(
  id: string,
  goal: {
    enabled: boolean;
    value?: number | null;
    period?: string | null;
    unit?: string | null;
  }
): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const idSchema = z.string().min(1);
    idSchema.parse(id);
    const validatedGoal = GoalSchema.parse(goal);

    const existing = await prisma.tracker.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Tracker not found" };
    }

    await prisma.tracker.update({
      where: { id },
      data: {
        goalEnabled: validatedGoal.enabled,
        goalValue: validatedGoal.value ?? null,
        goalPeriod: validatedGoal.period ?? null,
        goalUnit: validatedGoal.unit ?? null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/trackers/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error setting tracker goal:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return { success: false, error: "Failed to set tracker goal" };
  }
}

/**
 * Clear goal settings from a tracker
 */
export async function clearTrackerGoal(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const idSchema = z.string().min(1);
    idSchema.parse(id);

    const existing = await prisma.tracker.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Tracker not found" };
    }

    await prisma.tracker.update({
      where: { id },
      data: {
        goalEnabled: false,
        goalValue: null,
        goalPeriod: null,
        goalUnit: null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/trackers/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error clearing tracker goal:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid tracker ID" };
    }
    return { success: false, error: "Failed to clear tracker goal" };
  }
}
