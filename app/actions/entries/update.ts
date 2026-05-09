"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/server";
import type { CreateEntryInput } from "./create";

const EntrySchema = z.object({
  trackerId: z.string().min(1, "Tracker ID is required"),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  value: z.number().optional().nullable(),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  date: z.date().default(() => new Date()),
});

export type EntryActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Update a tracker entry
 */
export async function updateEntry(
  id: string,
  data: Partial<CreateEntryInput>
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Validate update data
    const validatedData = EntrySchema.partial().parse(data);

    // Use a transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the original entry and verify tracker ownership
      const originalEntry = await tx.trackerEntry.findFirst({
        where: {
          id,
          tracker: { userId },
        },
        select: {
          trackerId: true,
          startTime: true,
          endTime: true,
          value: true,
        },
      });

      if (!originalEntry) {
        throw new Error("Entry not found");
      }

      // If trackerId is being changed, verify the new tracker also belongs to user
      if (validatedData.trackerId && validatedData.trackerId !== originalEntry.trackerId) {
        const newTracker = await tx.tracker.findFirst({
          where: { id: validatedData.trackerId, userId },
          select: { id: true },
        });
        if (!newTracker) {
          throw new Error("Tracker not found");
        }
      }

      // Update entry in database
      const entry = await tx.trackerEntry.update({
        where: { id },
        data: validatedData,
      });

      // Handle calculated duration for timer entries
      const trackerId = validatedData.trackerId || originalEntry.trackerId;
      if (
        (validatedData.startTime || originalEntry.startTime) &&
        (validatedData.endTime || originalEntry.endTime) &&
        !validatedData.value
      ) {
        const startTime = validatedData.startTime || originalEntry.startTime;
        const endTime = validatedData.endTime || originalEntry.endTime;

        if (startTime && endTime) {
          const durationInSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

          // Update the entry with the calculated duration
          await tx.trackerEntry.update({
            where: { id: entry.id },
            data: { value: durationInSeconds },
          });
        }
      }

      // Get the tracker to determine its type for statistics (scoped to owner)
      const tracker = await tx.tracker.findFirst({
        where: { id: trackerId, userId },
        select: { type: true },
      });

      if (tracker) {
        // Recalculate all statistics for the tracker
        // This is a simpler approach than calculating the exact change
        // and works for all tracker types and edge cases

        switch (tracker.type) {
          case "TIMER":
            const timerStats = await tx.trackerEntry.aggregate({
              where: {
                trackerId,
                startTime: { not: null },
                endTime: { not: null },
              },
              _count: { id: true },
              _sum: { value: true }, // Using value field for duration
            });

            await tx.tracker.update({
              where: { id: trackerId },
              data: {
                statistics: {
                  totalEntries: timerStats._count.id,
                  totalTime: timerStats._sum.value || 0,
                },
                updatedAt: new Date(),
              },
            });
            break;

          case "COUNTER":
          case "AMOUNT":
            const valueStats = await tx.trackerEntry.aggregate({
              where: { trackerId, value: { not: null } },
              _count: { id: true },
              _sum: { value: true },
            });

            await tx.tracker.update({
              where: { id: trackerId },
              data: {
                statistics: {
                  totalEntries: valueStats._count.id,
                  totalValue: valueStats._sum.value || 0,
                },
                updatedAt: new Date(),
              },
            });
            break;

          case "OCCURRENCE":
          case "CUSTOM":
            const customCount = await tx.trackerEntry.count({
              where: { trackerId },
            });

            const currentTracker = await tx.tracker.findUnique({
              where: { id: trackerId },
              select: { statistics: true },
            });

            await tx.tracker.update({
              where: { id: trackerId },
              data: {
                statistics: {
                  totalEntries: customCount,
                  totalCustom: currentTracker?.statistics?.totalCustom || "",
                },
                updatedAt: new Date(),
              },
            });
            break;
        }
      }

      return entry;
    });

    // If trackerId is available, refresh that tracker's page
    if (data.trackerId) {
      revalidatePath(`/trackers/${data.trackerId}`);
    }

    revalidatePath("/dashboard");

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("Error updating entry:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    return { success: false, error: "Failed to update entry" };
  }
}
