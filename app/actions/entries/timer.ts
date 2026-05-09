"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/server";
import type { EntryActionResponse } from "./create";

/**
 * Start a timer entry
 */
export async function startTimerEntry(
  trackerId: string,
  note: string = ""
): Promise<EntryActionResponse<{ id: string }>> {
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
  try {
    const userId = await requireUserId();

    // Use a transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Verify tracker ownership
      const tracker = await tx.tracker.findFirst({
        where: { id: trackerId, userId },
        select: { id: true },
      });
      if (!tracker) {
        throw new Error("Tracker not found");
      }

      // Create a new entry with start time
      const entry = await tx.trackerEntry.create({
        data: {
          trackerId,
          startTime: new Date(),
          note,
          date: new Date(),
        },
      });

      // Update tracker status to ACTIVE
      await tx.tracker.update({
        where: { id: trackerId },
        data: {
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      });

      return entry;
    });

    revalidatePath(`/trackers/${trackerId}`);
    revalidatePath("/dashboard");

    return { success: true, data: { id: result.id } };
  } catch (error) {
    console.error("Error starting timer entry:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
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
  if (!entryId || entryId.trim() === "") {
    return { success: false, error: "Entry ID is required" };
  }
  try {
    const userId = await requireUserId();

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the current entry and verify tracker ownership
      const currentEntry = await tx.trackerEntry.findFirst({
        where: {
          id: entryId,
          tracker: { userId },
        },
        select: { id: true, trackerId: true, startTime: true, note: true },
      });

      if (!currentEntry || !currentEntry.startTime) {
        throw new Error("Timer entry not found or invalid");
      }

      const endTime = new Date();
      const updatedNote = additionalNote
        ? `${currentEntry.note || ""} ${additionalNote}`.trim()
        : currentEntry.note;

      // Calculate duration in seconds
      const duration = Math.round((endTime.getTime() - currentEntry.startTime.getTime()) / 1000);

      // Update the entry with end time and duration (stored in value field)
      const entry = await tx.trackerEntry.update({
        where: { id: entryId },
        data: {
          endTime,
          note: updatedNote,
          value: duration, // Store duration in value field for statistics
        },
      });

      // Get the tracker information for statistics update
      const tracker = await tx.tracker.findUnique({
        where: { id: currentEntry.trackerId },
        select: { statistics: true },
      });

      // Update tracker status back to INACTIVE and update statistics
      await tx.tracker.update({
        where: { id: currentEntry.trackerId },
        data: {
          status: "INACTIVE",
          updatedAt: new Date(),
          statistics: {
            totalEntries: (tracker?.statistics?.totalEntries || 0) + 1,
            totalTime: (tracker?.statistics?.totalTime || 0) + duration,
          },
        },
      });

      return { entry, duration };
    });

    revalidatePath(`/trackers/${result.entry.trackerId}`);
    revalidatePath("/dashboard");

    return {
      success: true,
      data: {
        id: result.entry.id,
        duration: result.duration,
      },
    };
  } catch (error) {
    console.error("Error stopping timer entry:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: "Failed to stop timer" };
  }
}
