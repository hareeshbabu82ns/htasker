"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { TrackerStatus, TrackerType } from "@/types";
import { revalidatePath } from "next/cache";

// Define a response type for better type safety
export type TrackerActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// Validation schema for creating/updating a tracker
const TrackerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .max(200, "Description cannot exceed 200 characters")
    .optional()
    .nullable(),
  type: z.nativeEnum(TrackerType, {
    errorMap: () => ({ message: "Please select a valid tracker type" }),
  }),
  tags: z.array(z.string()).optional().default([]),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format")
    .optional()
    .nullable(),
  icon: z.string().optional().nullable(),
});

export type CreateTrackerInput = z.infer<typeof TrackerSchema>;

/**
 * Create a new tracker
 */
export async function createTracker(
  data: CreateTrackerInput
): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    // In a real app, we'd get the user ID from the authentication session
    const userId = "dummy-user-id"; // Placeholder

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
    revalidatePath("/dashboard/trackers");

    return { success: true, data: { id: tracker.id } };
  } catch (error) {
    console.error("Error creating tracker:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors
          .map((e) => e.message)
          .join(", ")}`,
      };
    }

    return { success: false, error: "Failed to create tracker" };
  }
}

/**
 * Get a tracker by ID
 */
export async function getTracker(
  id: string
): Promise<TrackerActionResponse<unknown>> {
  try {
    // In a real app, we'd verify user permissions here
    const tracker = await prisma.tracker.findUnique({
      where: { id },
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
    // In a real app, we'd verify user permissions here

    // Validate update data
    const validatedData = TrackerSchema.partial().parse(data);

    // Update tracker in database
    const tracker = await prisma.tracker.update({
      where: { id },
      data: validatedData,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/trackers");
    revalidatePath(`/dashboard/trackers/${id}`);

    return { success: true, data: { id: tracker.id } };
  } catch (error) {
    console.error("Error updating tracker:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors
          .map((e) => e.message)
          .join(", ")}`,
      };
    }

    return { success: false, error: "Failed to update tracker" };
  }
}

/**
 * Delete a tracker
 */
export async function deleteTracker(
  id: string
): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    // In a real app, we'd verify user permissions here

    // Delete tracker from database
    await prisma.tracker.delete({
      where: { id },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error deleting tracker:", error);
    return { success: false, error: "Failed to delete tracker" };
  }
}

/**
 * Get all trackers
 */
export async function getTrackers(): Promise<TrackerActionResponse<unknown[]>> {
  try {
    // In a real app, we'd filter by the current user ID
    const userId = "dummy-user-id"; // Placeholder

    const trackers = await prisma.tracker.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    return { success: true, data: trackers };
  } catch (error) {
    console.error("Error getting trackers:", error);
    return { success: false, error: "Failed to retrieve trackers" };
  }
}
