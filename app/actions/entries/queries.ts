"use server";

import prisma from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/server";
import type { TrackerEntry } from "@/types";
import type { EntryActionResponse } from "./create";

// Helper for local-calendar date strings
function toLocalDateStr(d: Date, timezoneOffset: number = 0): string {
  const adjusted = new Date(d.getTime() - timezoneOffset * 60000);
  const y = adjusted.getUTCFullYear();
  const m = String(adjusted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(adjusted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get all entries for a tracker
 */
export async function getEntriesByTracker(
  trackerId: string,
  limit: number = 50,
  page: number = 1
): Promise<EntryActionResponse<{ entries: TrackerEntry[]; total: number }>> {
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
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
 * Get entry counts for today, this week, and this month for a tracker
 */
export async function getTrackerStats(
  trackerId: string,
  timezoneOffset: number = 0
): Promise<EntryActionResponse<{ today: number; week: number; month: number }>> {
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
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
    // User's current local time represented in UTC
    const localNow = new Date(now.getTime() - timezoneOffset * 60000);

    // User's local today start (midnight)
    const localTodayStart = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate())
    );
    const todayStart = new Date(localTodayStart.getTime() + timezoneOffset * 60000);

    // User's local week start
    const localWeekStart = new Date(localTodayStart.getTime());
    localWeekStart.setUTCDate(localTodayStart.getUTCDate() - localNow.getUTCDay());
    const weekStart = new Date(localWeekStart.getTime() + timezoneOffset * 60000);

    // User's local month start
    const localMonthStart = new Date(
      Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), 1)
    );
    const monthStart = new Date(localMonthStart.getTime() + timezoneOffset * 60000);

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

/**
 * Return daily breakdown of values for trend charts.
 * TIMER/COUNTER/AMOUNT → sum values; OCCURRENCE/CUSTOM → count entries.
 * Every calendar day in [startDate, endDate] is present; missing days are 0.
 */
export async function getTrackerTrend(
  trackerId: string,
  startDateStr: string,
  endDateStr: string,
  timezoneOffset: number = 0
): Promise<EntryActionResponse<{ date: string; value: number }[]>> {
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
  if (!startDateStr || !endDateStr) {
    return { success: false, error: "Start and end dates are required" };
  }
  try {
    const userId = await requireUserId();

    if (startDateStr > endDateStr) {
      return { success: false, error: "startDate must not be after endDate" };
    }

    // Parse the input dates interpreting them as user's local dates
    const startParts = startDateStr.split("-").map(Number);
    const endParts = endDateStr.split("-").map(Number);

    // Create UTC midnight representing the local dates, then apply offset to get real UTC time
    const localStartMidnight = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    const queryStart = new Date(localStartMidnight.getTime() + timezoneOffset * 60000);

    const localEndMidnight = new Date(
      Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999)
    );
    const queryEnd = new Date(localEndMidnight.getTime() + timezoneOffset * 60000);

    const rangeDays = (queryEnd.getTime() - queryStart.getTime()) / (1000 * 60 * 60 * 24);
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
      const key = toLocalDateStr(entry.date, timezoneOffset);
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
      const key = toLocalDateStr(cursor, timezoneOffset);
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
  year: number,
  timezoneOffset: number = 0
): Promise<EntryActionResponse<{ date: string; count: number }[]>> {
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
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

    const localYearStartMidnight = new Date(Date.UTC(year, 0, 1));
    const yearStart = new Date(localYearStartMidnight.getTime() + timezoneOffset * 60000);

    const localYearEndMidnight = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    const yearEnd = new Date(localYearEndMidnight.getTime() + timezoneOffset * 60000);

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
      const key = toLocalDateStr(entry.date, timezoneOffset);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const result: { date: string; count: number }[] = Array.from(counts.entries()).map(
      ([date, count]) => ({ date, count })
    );

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
  trackerId: string,
  timezoneOffset: number = 0
): Promise<
  EntryActionResponse<{
    current: number;
    longest: number;
    lastDate: string | null;
  }>
> {
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
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
      daySet.add(toLocalDateStr(entry.date, timezoneOffset));
    }
    const days = Array.from(daySet).sort();

    const lastDate = days[days.length - 1];

    // Compute longest streak
    let longest = 1;
    let runLen = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1] + "T00:00:00");
      const curr = new Date(days[i] + "T00:00:00");
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runLen++;
        if (runLen > longest) longest = runLen;
      } else {
        runLen = 1;
      }
    }

    // Compute current streak (streak is live if last entry is today or yesterday)
    const now = new Date();
    const todayStr = toLocalDateStr(now, timezoneOffset);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = toLocalDateStr(yesterday, timezoneOffset);

    let current = 0;
    if (lastDate === todayStr || lastDate === yesterdayStr) {
      current = 1;
      for (let i = days.length - 1; i > 0; i--) {
        const prev = new Date(days[i - 1] + "T00:00:00");
        const curr = new Date(days[i] + "T00:00:00");
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
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
  if (!trackerId || trackerId.trim() === "") {
    return { success: false, error: "Tracker ID is required" };
  }
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
      if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    };

    const isoOrEmpty = (d: Date | null): string => (d != null ? d.toISOString() : "");

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
