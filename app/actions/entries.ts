"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

// Define a response type for better type safety
export type EntryActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

// Validation schema for creating/updating a tracker entry
const EntrySchema = z.object({
  trackerId: z.string().min(1, "Tracker ID is required"),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  value: z.number().optional().nullable(),
  note: z
    .string()
    .max(500, "Note cannot exceed 500 characters")
    .optional()
    .nullable(),
  tags: z.array(z.string()).optional().default([]),
  date: z.date().default(() => new Date()),
});

export type CreateEntryInput = z.infer<typeof EntrySchema>;

/**
 * Create a new tracker entry
 */
export async function createEntry(
  data: CreateEntryInput
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    // Validate input data
    const validatedData = EntrySchema.parse(data);

    // Create entry in database
    const entry = await prisma.trackerEntry.create({
      data: validatedData,
    });

    // Update the tracker's last used timestamp
    await prisma.tracker.update({
      where: { id: data.trackerId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/dashboard");
    revalidatePath(`/trackers/${data.trackerId}`);

    return { success: true, data: { id: entry.id } };
  } catch (error) {
    console.error("Error creating entry:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors
          .map((e) => e.message)
          .join(", ")}`,
      };
    }

    return { success: false, error: "Failed to create entry" };
  }
}

/**
 * Get a tracker entry by ID
 */
export async function getEntry(
  id: string
): Promise<EntryActionResponse<unknown>> {
  try {
    const entry = await prisma.trackerEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return { success: false, error: "Entry not found" };
    }

    return { success: true, data: entry };
  } catch (error) {
    console.error("Error getting entry:", error);
    return { success: false, error: "Failed to retrieve entry" };
  }
}

/**
 * Update a tracker entry
 */
export async function updateEntry(
  id: string,
  data: Partial<CreateEntryInput>
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    // Validate update data
    const validatedData = EntrySchema.partial().parse(data);

    // Update entry in database
    const entry = await prisma.trackerEntry.update({
      where: { id },
      data: validatedData,
    });

    // If trackerId is available, refresh that tracker's page
    if (data.trackerId) {
      revalidatePath(`/trackers/${data.trackerId}`);
    }

    revalidatePath("/dashboard");

    return { success: true, data: { id: entry.id } };
  } catch (error) {
    console.error("Error updating entry:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.errors
          .map((e) => e.message)
          .join(", ")}`,
      };
    }

    return { success: false, error: "Failed to update entry" };
  }
}

/**
 * Delete a tracker entry
 */
export async function deleteEntry(
  id: string
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    // First get the tracker ID for revalidation
    const entry = await prisma.trackerEntry.findUnique({
      where: { id },
      select: { trackerId: true },
    });

    if (!entry) {
      return { success: false, error: "Entry not found" };
    }

    // Delete entry from database
    await prisma.trackerEntry.delete({
      where: { id },
    });

    revalidatePath(`/trackers/${entry.trackerId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error deleting entry:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

/**
 * Get all entries for a tracker
 */
export async function getEntriesByTracker(
  trackerId: string,
  limit: number = 50
): Promise<EntryActionResponse<unknown[]>> {
  try {
    const entries = await prisma.trackerEntry.findMany({
      where: { trackerId },
      orderBy: { date: "desc" },
      take: limit,
    });

    return { success: true, data: entries };
  } catch (error) {
    console.error("Error getting entries:", error);
    return { success: false, error: "Failed to retrieve entries" };
  }
}

/**
 * Start a timer entry
 */
export async function startTimerEntry(
  trackerId: string,
  note: string = ""
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    // Create a new entry with start time
    const entry = await prisma.trackerEntry.create({
      data: {
        trackerId,
        startTime: new Date(),
        note,
        date: new Date(),
      },
    });

    // Update tracker status to ACTIVE
    await prisma.tracker.update({
      where: { id: trackerId },
      data: {
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/trackers/${trackerId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id: entry.id } };
  } catch (error) {
    console.error("Error starting timer entry:", error);
    return { success: false, error: "Failed to start timer" };
  }
}

/**
 * Stop a timer entry
 */
export async function stopTimerEntry(
  entryId: string,
  additionalNote: string = ""
): Promise<EntryActionResponse<{ id: string; duration: number }>> {
  try {
    // Get the current entry
    const currentEntry = await prisma.trackerEntry.findUnique({
      where: { id: entryId },
      select: { trackerId: true, startTime: true, note: true },
    });

    if (!currentEntry || !currentEntry.startTime) {
      return { success: false, error: "Timer entry not found or invalid" };
    }

    const endTime = new Date();
    const updatedNote = additionalNote
      ? `${currentEntry.note || ""} ${additionalNote}`.trim()
      : currentEntry.note;

    // Update the entry with end time
    const entry = await prisma.trackerEntry.update({
      where: { id: entryId },
      data: {
        endTime,
        note: updatedNote,
      },
    });

    // Update tracker status back to INACTIVE
    await prisma.tracker.update({
      where: { id: currentEntry.trackerId },
      data: {
        status: "INACTIVE",
        updatedAt: new Date(),
      },
    });

    // Calculate duration in seconds
    const duration = Math.round(
      (endTime.getTime() - currentEntry.startTime.getTime()) / 1000
    );

    revalidatePath(`/trackers/${currentEntry.trackerId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        id: entry.id,
        duration,
      },
    };
  } catch (error) {
    console.error("Error stopping timer entry:", error);
    return { success: false, error: "Failed to stop timer" };
  }
}

/**
 * Add a counter entry
 */
export async function addCounterEntry(
  trackerId: string,
  value: number = 1,
  note: string = ""
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    // Create a new counter entry
    const entry = await prisma.trackerEntry.create({
      data: {
        trackerId,
        value,
        note,
        date: new Date(),
      },
    });

    // Update tracker's last used timestamp
    await prisma.tracker.update({
      where: { id: trackerId },
      data: { updatedAt: new Date() },
    });

    revalidatePath(`/trackers/${trackerId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id: entry.id } };
  } catch (error) {
    console.error("Error adding counter entry:", error);
    return { success: false, error: "Failed to add counter entry" };
  }
}
