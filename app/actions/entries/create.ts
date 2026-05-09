"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/server";
import { TrackerEntry } from "@/types";

export type EntryActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

const EntrySchema = z.object({
  trackerId: z.string().min(1, "Tracker ID is required"),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  value: z.number().optional().nullable(),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  date: z.date().default(() => new Date()),
});

export type CreateEntryInput = z.infer<typeof EntrySchema>;

/**
 * Get a tracker entry by ID
 */
export async function getEntry(id: string): Promise<EntryActionResponse<TrackerEntry>> {
  try {
    const userId = await requireUserId();

    const entry = await prisma.trackerEntry.findFirst({
      where: {
        id,
        tracker: { userId },
      },
    });

    if (!entry) {
      return { success: false, error: "Entry not found" };
    }

    return { success: true, data: entry };
  } catch (error) {
    console.error("Error getting entry:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to retrieve entry" };
  }
}

/**
 * Create a new tracker entry
 */
export async function createEntry(
  data: CreateEntryInput
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Validate input data
    const validatedData = EntrySchema.parse(data);

    // Use a transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Verify the tracker belongs to the current user
      const ownerCheck = await tx.tracker.findFirst({
        where: { id: data.trackerId, userId },
        select: { id: true },
      });
      if (!ownerCheck) {
        throw new Error("Tracker not found");
      }

      // Create entry in database
      const entry = await tx.trackerEntry.create({
        data: validatedData,
      });

      // Calculate duration for timer entries if both start and end times are provided
      if (validatedData.startTime && validatedData.endTime && !validatedData.value) {
        const durationInSeconds = Math.round(
          (validatedData.endTime.getTime() - validatedData.startTime.getTime()) / 1000
        );

        // Update the entry with the calculated duration stored in value field
        await tx.trackerEntry.update({
          where: { id: entry.id },
          data: { value: durationInSeconds },
        });
      }

      // Update the tracker's last used timestamp
      await tx.tracker.update({
        where: { id: data.trackerId },
        data: { updatedAt: new Date() },
      });

      // Get the tracker to determine its type
      const tracker = await tx.tracker.findUnique({
        where: { id: data.trackerId },
        select: { type: true, statistics: true },
      });

      if (!tracker) {
        throw new Error("Tracker not found");
      }

      // Update statistics based on tracker type
      switch (tracker.type) {
        case "TIMER":
          // Only update completed timer entries
          if (validatedData.startTime && validatedData.endTime) {
            const durationInSeconds = Math.round(
              (validatedData.endTime.getTime() - validatedData.startTime.getTime()) / 1000
            );

            const currentEntries = tracker.statistics?.totalEntries || 0;
            const currentTime = tracker.statistics?.totalTime || 0;

            await tx.tracker.update({
              where: { id: data.trackerId },
              data: {
                statistics: {
                  totalEntries: currentEntries + 1,
                  totalTime: currentTime + durationInSeconds,
                },
              },
            });
          }
          break;

        case "COUNTER":
        case "AMOUNT":
          if (validatedData.value !== null && validatedData.value !== undefined) {
            const currentEntries = tracker.statistics?.totalEntries || 0;
            const currentValue = tracker.statistics?.totalValue || 0;

            await tx.tracker.update({
              where: { id: data.trackerId },
              data: {
                statistics: {
                  totalEntries: currentEntries + 1,
                  totalValue: currentValue + validatedData.value,
                },
              },
            });
          }
          break;

        case "OCCURRENCE":
        case "CUSTOM":
          const currentEntries = tracker.statistics?.totalEntries || 0;

          await tx.tracker.update({
            where: { id: data.trackerId },
            data: {
              statistics: {
                totalEntries: currentEntries + 1,
                // Preserve any existing custom data
                totalCustom: tracker.statistics?.totalCustom,
              },
            },
          });
          break;
      }

      return entry;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/trackers/${data.trackerId}`);

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("Error creating entry:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return { success: false, error: "Failed to create entry" };
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
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
  try {
    const userId = await requireUserId();

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Verify tracker ownership
      const tracker = await tx.tracker.findFirst({
        where: { id: trackerId, userId },
        select: { statistics: true },
      });
      if (!tracker) {
        throw new Error("Tracker not found");
      }

      // Create a new counter entry
      const entry = await tx.trackerEntry.create({
        data: {
          trackerId,
          value,
          note,
          date: new Date(),
        },
      });

      // Update tracker's statistics and timestamp
      await tx.tracker.update({
        where: { id: trackerId },
        data: {
          updatedAt: new Date(),
          statistics: {
            totalEntries: (tracker.statistics?.totalEntries || 0) + 1,
            totalValue: (tracker.statistics?.totalValue || 0) + value,
          },
        },
      });

      return entry;
    });

    revalidatePath(`/trackers/${trackerId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("Error adding counter entry:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to add counter entry" };
  }
}
