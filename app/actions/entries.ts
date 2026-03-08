"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
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

    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues
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
      if (
        validatedData.trackerId &&
        validatedData.trackerId !== originalEntry.trackerId
      ) {
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
        error: `Validation failed: ${error.issues
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

/**
 * Get all entries for a tracker
 */
export async function getEntriesByTracker(
  trackerId: string,
  limit: number = 50,
  page: number = 1
): Promise<EntryActionResponse<{ entries: unknown[]; total: number }>> {
  try {
    const userId = await requireUserId();

    // Verify tracker belongs to the current user
    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true },
    });
    if (!tracker) {
      return { success: false, error: "Tracker not found" };
    }

    // Count total entries for pagination
    const total = await prisma.trackerEntry.count({ where: { trackerId } });
    // Fetch paginated entries
    const entries = await prisma.trackerEntry.findMany({
      where: { trackerId },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { success: true, data: { entries, total } };
  } catch (error) {
    console.error("Error getting entries:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
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

/**
 * Get entry counts for today, this week, and this month for a tracker
 */
export async function getTrackerStats(
  trackerId: string
): Promise<
  EntryActionResponse<{ today: number; week: number; month: number }>
> {
  try {
    const userId = await requireUserId();

    // Determine tracker type (scoped to owner)
    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { type: true },
    });
    if (!tracker) {
      throw new Error("Tracker not found");
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
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
            where: {
              trackerId,
              startTime: { not: null },
              endTime: { not: null },
              date: { gte: todayStart },
            },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: {
              trackerId,
              startTime: { not: null },
              endTime: { not: null },
              date: { gte: weekStart },
            },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: {
              trackerId,
              startTime: { not: null },
              endTime: { not: null },
              date: { gte: monthStart },
            },
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
            where: {
              trackerId,
              value: { not: null },
              date: { gte: todayStart },
            },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: {
              trackerId,
              value: { not: null },
              date: { gte: weekStart },
            },
            _sum: { value: true },
          }),
          prisma.trackerEntry.aggregate({
            where: {
              trackerId,
              value: { not: null },
              date: { gte: monthStart },
            },
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
          prisma.trackerEntry.count({
            where: { trackerId, date: { gte: todayStart } },
          }),
          prisma.trackerEntry.count({
            where: { trackerId, date: { gte: weekStart } },
          }),
          prisma.trackerEntry.count({
            where: { trackerId, date: { gte: monthStart } },
          }),
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ---------------------------------------------------------------------------
// Phase 6 Analytics
// ---------------------------------------------------------------------------

/** Format a Date to a local-calendar YYYY-MM-DD string */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Return daily breakdown of values for trend charts.
 * TIMER/COUNTER/AMOUNT → sum values; OCCURRENCE/CUSTOM → count entries.
 * Every calendar day in [startDate, endDate] is present; missing days are 0.
 */
export async function getTrackerTrend(
  trackerId: string,
  startDate: Date,
  endDate: Date
): Promise<EntryActionResponse<{ date: string; value: number }[]>> {
  try {
    const userId = await requireUserId();

    // Allow startDate === endDate (single-day trend); reject only if strictly after
    if (startDate > endDate) {
      return { success: false, error: "startDate must not be after endDate" };
    }
    // Normalize to calendar-day boundaries so query and output are consistent
    const queryStart = new Date(startDate);
    queryStart.setHours(0, 0, 0, 0);
    const queryEnd = new Date(endDate);
    queryEnd.setHours(23, 59, 59, 999);

    const rangeDays =
      (queryEnd.getTime() - queryStart.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > 365) {
      return { success: false, error: "Date range cannot exceed 365 days" };
    }

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { type: true },
    });
    if (!tracker) {
      throw new Error("Tracker not found");
    }

    const entries = await prisma.trackerEntry.findMany({
      where: {
        trackerId,
        date: { gte: queryStart, lte: queryEnd },
      },
      select: { date: true, value: true },
      orderBy: { date: "asc" },
    });

    // Aggregate entries by calendar day
    const grouped = new Map<string, number>();
    for (const entry of entries) {
      const key = toLocalDateStr(entry.date);
      const prev = grouped.get(key) ?? 0;
      switch (tracker.type) {
        case "TIMER":
        case "COUNTER":
        case "AMOUNT":
          grouped.set(key, prev + (entry.value ?? 0));
          break;
        default:
          // OCCURRENCE, CUSTOM: count entries
          grouped.set(key, prev + 1);
      }
    }

    // Build result with one entry per calendar day in range (fill gaps with 0)
    const result: { date: string; value: number }[] = [];
    const cursor = new Date(queryStart);
    const rangeEnd = new Date(queryEnd);
    rangeEnd.setHours(0, 0, 0, 0);

    while (cursor <= rangeEnd) {
      const key = toLocalDateStr(cursor);
      result.push({ date: key, value: grouped.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching tracker trend:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to fetch tracker trend" };
  }
}

/**
 * Return daily entry counts for a calendar heatmap (full year).
 * Only days that have ≥ 1 entry are included; the client fills zeros.
 */
export async function getCalendarData(
  trackerId: string,
  year: number
): Promise<EntryActionResponse<{ date: string; count: number }[]>> {
  try {
    const userId = await requireUserId();

    if (!Number.isInteger(year) || year < 2020 || year > 2099) {
      return { success: false, error: "Year must be between 2020 and 2099" };
    }

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true },
    });
    if (!tracker) {
      throw new Error("Tracker not found");
    }

    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const entries = await prisma.trackerEntry.findMany({
      where: {
        trackerId,
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const counts = new Map<string, number>();
    for (const entry of entries) {
      const key = toLocalDateStr(entry.date);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const result: { date: string; count: number }[] = Array.from(
      counts.entries()
    ).map(([date, count]) => ({ date, count }));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to fetch calendar data" };
  }
}

/**
 * Return current and longest streak of consecutive calendar days for a tracker.
 * A streak is a run of consecutive days each having ≥ 1 entry.
 * The current streak counts if the most recent entry is today or yesterday.
 */
export async function getOccurrenceStreak(
  trackerId: string
): Promise<
  EntryActionResponse<{
    current: number;
    longest: number;
    lastDate: string | null;
  }>
> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true },
    });
    if (!tracker) {
      throw new Error("Tracker not found");
    }

    const entries = await prisma.trackerEntry.findMany({
      where: { trackerId },
      select: { date: true },
      orderBy: { date: "asc" },
    });

    if (entries.length === 0) {
      return {
        success: true,
        data: { current: 0, longest: 0, lastDate: null },
      };
    }

    // Collect unique calendar days, sorted ascending
    const daySet = new Set<string>();
    for (const entry of entries) {
      daySet.add(toLocalDateStr(entry.date));
    }
    const days = Array.from(daySet).sort();

    const lastDate = days[days.length - 1];

    // Compute longest streak
    let longest = 1;
    let runLen = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1] + "T00:00:00");
      const curr = new Date(days[i] + "T00:00:00");
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        runLen++;
        if (runLen > longest) longest = runLen;
      } else {
        runLen = 1;
      }
    }

    // Compute current streak (streak is live if last entry is today or yesterday)
    const todayStr = toLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    let current = 0;
    if (lastDate === todayStr || lastDate === yesterdayStr) {
      current = 1;
      for (let i = days.length - 1; i > 0; i--) {
        const prev = new Date(days[i - 1] + "T00:00:00");
        const curr = new Date(days[i] + "T00:00:00");
        const diffDays = Math.round(
          (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          current++;
        } else {
          break;
        }
      }
    }

    return { success: true, data: { current, longest, lastDate } };
  } catch (error) {
    console.error("Error fetching occurrence streak:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to fetch occurrence streak" };
  }
}

/**
 * Export all entries for a tracker as a CSV string.
 * Header: date,value,startTime,endTime,note,tags
 * Fields containing commas or quotes are wrapped in double-quotes (RFC 4180).
 */
export async function exportTrackerCSV(
  trackerId: string
): Promise<EntryActionResponse<{ csv: string; filename: string }>> {
  try {
    const userId = await requireUserId();

    const tracker = await prisma.tracker.findFirst({
      where: { id: trackerId, userId },
      select: { id: true, name: true },
    });
    if (!tracker) {
      throw new Error("Tracker not found");
    }

    const entries = await prisma.trackerEntry.findMany({
      where: { trackerId },
      select: {
        date: true,
        value: true,
        startTime: true,
        endTime: true,
        note: true,
        tags: true,
      },
      orderBy: { date: "desc" },
    });

    /** Escape a field value per RFC 4180, and neutralize spreadsheet formula injection */
    const escapeField = (val: string | null | undefined): string => {
      if (val == null) return "";
      // Prefix formula-trigger characters to prevent spreadsheet formula injection
      const sanitized = /^[=+\-@]/.test(val) ? `'${val}` : val;
      if (
        sanitized.includes(",") ||
        sanitized.includes('"') ||
        sanitized.includes("\n")
      ) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    };

    const isoOrEmpty = (d: Date | null): string =>
      d != null ? d.toISOString() : "";

    const rows: string[] = ["date,value,startTime,endTime,note,tags"];
    for (const entry of entries) {
      rows.push(
        [
          isoOrEmpty(entry.date),
          entry.value != null ? String(entry.value) : "",
          isoOrEmpty(entry.startTime),
          isoOrEmpty(entry.endTime),
          escapeField(entry.note),
          escapeField(entry.tags.join("; ")),
        ].join(",")
      );
    }

    const csv = rows.join("\n");

    // Sanitize tracker name: keep alphanumeric, hyphens, underscores, spaces
    const safeName = tracker.name
      .replace(/[^a-zA-Z0-9\-_ ]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const filename = `${safeName || "tracker"}-entries.csv`;

    return { success: true, data: { csv, filename } };
  } catch (error) {
    console.error("Error exporting tracker CSV:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to export tracker CSV" };
  }
}
