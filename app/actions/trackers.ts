"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { TrackerStatus, TrackerType } from "@/types";
import { revalidatePath } from "next/cache";
import { Tracker } from "../generated/prisma";

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
  status: z.nativeEnum(TrackerStatus).optional(),
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
    // Use a valid MongoDB ObjectID format for the userId (24 hex characters)
    const userId = "000000000000000000000001"; // Valid ObjectID format placeholder

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
    revalidatePath("/trackers");
    revalidatePath(`/trackers/${id}`);

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
    revalidatePath("/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error deleting tracker:", error);
    return { success: false, error: "Failed to delete tracker" };
  }
}

export type TrackerWithEntriesCount = Tracker & {
  entriesCount: number;
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
}): Promise<TrackerActionResponse<TrackerPagingResponse>> {
  try {
    // Build the where clause based on the provided filters
    const where: any = {};

    // Add status filter if provided
    if (filters?.status) {
      where.status = filters.status;
    }

    // Add type filter if provided
    if (filters?.type) {
      where.type = filters.type;
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
      include: {
        _count: {
          select: { entries: true },
        },
      },
      skip,
      take: limit,
    });

    return {
      success: true,
      data: {
        trackers: trackers.map((tracker) => ({
          ...tracker,
          entriesCount: tracker._count?.entries || 0,
        })),
        total,
        totalPages,
        page,
      },
    };
  } catch (error) {
    console.error("Error getting trackers:", error);
    return { success: false, error: "Failed to retrieve trackers" };
  }
}
