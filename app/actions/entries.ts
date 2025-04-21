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

    // Use a transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create entry in database
      const entry = await tx.trackerEntry.create({
        data: validatedData,
      });

      // Calculate duration for timer entries if both start and end times are provided
      if (
        validatedData.startTime &&
        validatedData.endTime &&
        !validatedData.value
      ) {
        const durationInSeconds = Math.round(
          (validatedData.endTime.getTime() -
            validatedData.startTime.getTime()) /
            1000
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
              (validatedData.endTime.getTime() -
                validatedData.startTime.getTime()) /
                1000
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
          if (
            validatedData.value !== null &&
            validatedData.value !== undefined
          ) {
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

    // Use a transaction to ensure atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the original entry to compare changes
      const originalEntry = await tx.trackerEntry.findUnique({
        where: { id },
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
          const durationInSeconds = Math.round(
            (endTime.getTime() - startTime.getTime()) / 1000
          );

          // Update the entry with the calculated duration
          await tx.trackerEntry.update({
            where: { id: entry.id },
            data: { value: durationInSeconds },
          });
        }
      }

      // Get the tracker to determine its type for statistics
      const tracker = await tx.tracker.findUnique({
        where: { id: trackerId },
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
    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the entry for reference
      const entry = await tx.trackerEntry.findUnique({
        where: { id },
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
    // Use a transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
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
    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Get the current entry
      const currentEntry = await tx.trackerEntry.findUnique({
        where: { id: entryId },
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
      const duration = Math.round(
        (endTime.getTime() - currentEntry.startTime.getTime()) / 1000
      );

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

/**
 * Add a counter entry
 */
export async function addCounterEntry(
  trackerId: string,
  value: number = 1,
  note: string = ""
): Promise<EntryActionResponse<{ id: string }>> {
  try {
    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create a new counter entry
      const entry = await tx.trackerEntry.create({
        data: {
          trackerId,
          value,
          note,
          date: new Date(),
        },
      });

      // Get the tracker for statistics update
      const tracker = await tx.tracker.findUnique({
        where: { id: trackerId },
        select: { statistics: true },
      });

      // Update tracker's statistics and timestamp
      await tx.tracker.update({
        where: { id: trackerId },
        data: {
          updatedAt: new Date(),
          statistics: {
            totalEntries: (tracker?.statistics?.totalEntries || 0) + 1,
            totalValue: (tracker?.statistics?.totalValue || 0) + value,
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
    return { success: false, error: "Failed to add counter entry" };
  }
}

/**
 * Get entry counts for today, this week, and this month for a tracker
 */
export async function getTrackerStats(
  trackerId: string
): Promise<EntryActionResponse<{ today: number; week: number; month: number }>> {
  try {
    // Determine tracker type
    const tracker = await prisma.tracker.findUnique({
      where: { id: trackerId },
      select: { type: true },
    });
    if (!tracker) {
      throw new Error("Tracker not found");
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - todayStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let today = 0;
    let week = 0;
    let month = 0;

    switch (tracker.type) {
      case "TIMER": {
        // Sum durations for completed timer entries
        const [t, w, m] = await Promise.all([
          prisma.trackerEntry.aggregate({
            where: { trackerId, startTime: { not: null }, endTime: { not: null }, date: { gte: todayStart } },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: { trackerId, startTime: { not: null }, endTime: { not: null }, date: { gte: weekStart } },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: { trackerId, startTime: { not: null }, endTime: { not: null }, date: { gte: monthStart } },
            _sum: { value: true },
          }),
        ]);
        today = t._sum.value ?? 0;
        week = w._sum.value ?? 0;
        month = m._sum.value ?? 0;
        break;
      }
      case "COUNTER":
      case "AMOUNT": {
        // Sum values for counter/amount entries
        const [t, w, m] = await Promise.all([
          prisma.trackerEntry.aggregate({
            where: { trackerId, value: { not: null }, date: { gte: todayStart } },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: { trackerId, value: { not: null }, date: { gte: weekStart } },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: { trackerId, value: { not: null }, date: { gte: monthStart } },
            _sum: { value: true },
          }),
        ]);
        today = t._sum.value ?? 0;
        week = w._sum.value ?? 0;
        month = m._sum.value ?? 0;
        break;
      }
      default: {
        // Occurrence and custom: count entries
        const [tc, wc, mc] = await Promise.all([
          prisma.trackerEntry.count({ where: { trackerId, date: { gte: todayStart } } }),
          prisma.trackerEntry.count({ where: { trackerId, date: { gte: weekStart } } }),
          prisma.trackerEntry.count({ where: { trackerId, date: { gte: monthStart } } }),
        ]);
        today = tc;
        week = wc;
        month = mc;
      }
    }

    return {
      success: true,
      data: { today, week, month },
    };
  } catch (error) {
    console.error("Error fetching tracker stats:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
