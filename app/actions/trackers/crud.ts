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
import { requireUserId } from "@/lib/auth/server";

export type TrackerActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export type TrackerStatistics = {
  totalEntries: number;
  totalTime: number;
  totalValue: number;
  totalCustom: string;
};

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
