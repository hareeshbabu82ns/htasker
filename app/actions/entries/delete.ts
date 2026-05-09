"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/server";
import type { EntryActionResponse } from "./create";

/**
 * Delete a tracker entry
 */
export async function deleteEntry(id: string): Promise<EntryActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the entry and verify tracker ownership
      const entry = await tx.trackerEntry.findFirst({
        where: {
          id,
          tracker: { userId },
        },
        select: {
          id: true,
          trackerId: true,
          value: true,
          startTime: true,
          endTime: true,
        },
      });

      if (!entry) {
        throw new Error("Entry not found");
      }

      // Get the tracker to determine its type
      const tracker = await tx.tracker.findUnique({
        where: { id: entry.trackerId },
        select: { type: true, statistics: true },
      });

      if (!tracker) {
        throw new Error("Tracker not found");
      }

      // Delete the entry
      await tx.trackerEntry.delete({ where: { id } });

      // Update tracker statistics
      switch (tracker.type) {
        case "TIMER":
          // Only adjust completed timer entries with duration
          if (entry.startTime && entry.endTime && entry.value) {
            const currentEntries = tracker.statistics?.totalEntries || 0;
            const currentTime = tracker.statistics?.totalTime || 0;

            await tx.tracker.update({
              where: { id: entry.trackerId },
              data: {
                statistics: {
                  totalEntries: Math.max(0, currentEntries - 1),
                  totalTime: Math.max(0, currentTime - (entry.value || 0)),
                },
                updatedAt: new Date(),
              },
            });
          }
          break;

        case "COUNTER":
        case "AMOUNT":
          if (entry.value !== null && entry.value !== undefined) {
            const currentEntries = tracker.statistics?.totalEntries || 0;
            const currentValue = tracker.statistics?.totalValue || 0;

            await tx.tracker.update({
              where: { id: entry.trackerId },
              data: {
                statistics: {
                  totalEntries: Math.max(0, currentEntries - 1),
                  totalValue: Math.max(0, currentValue - entry.value),
                },
                updatedAt: new Date(),
              },
            });
          }
          break;

        case "OCCURRENCE":
        case "CUSTOM":
          const currentEntries = tracker.statistics?.totalEntries || 0;

          await tx.tracker.update({
            where: { id: entry.trackerId },
            data: {
              statistics: {
                totalEntries: Math.max(0, currentEntries - 1),
                // Preserve existing custom data
                totalCustom: tracker.statistics?.totalCustom,
              },
              updatedAt: new Date(),
            },
          });
          break;
      }

      return entry;
    });

    revalidatePath(`/trackers/${result.trackerId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error deleting entry:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to delete entry" };
  }
}
