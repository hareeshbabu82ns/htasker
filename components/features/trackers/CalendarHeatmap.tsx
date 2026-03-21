"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalendarData } from "@/app/actions/entries";
import { Tracker, TrackerType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarDay {
  date: string; // "YYYY-MM-DD" — empty string for padding cells
  count: number;
  isCurrentYear: boolean;
  isPadding: boolean;
}

interface TooltipState {
  day: CalendarDay;
  x: number;
  y: number;
}

interface CalendarHeatmapProps {
  tracker: Tracker;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Only 3 abbreviated day labels shown (Mon=1, Wed=3, Fri=5)
const ROW_LABELS: Record<number, string> = {
  1: "Mon",
  3: "Wed",
  5: "Fri",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-slate-100 dark:bg-slate-800";
  if (count === 1) return "bg-indigo-200 dark:bg-indigo-900";
  if (count <= 3) return "bg-indigo-400 dark:bg-indigo-700";
  if (count <= 6) return "bg-indigo-600 dark:bg-indigo-500";
  return "bg-indigo-800 dark:bg-indigo-300";
}

function buildEntryLabel(count: number, trackerType: TrackerType): string {
  if (trackerType === TrackerType.OCCURRENCE) {
    return count === 1 ? "1 occurrence" : `${count} occurrences`;
  }
  return count === 1 ? "1 entry" : `${count} entries`;
}

/**
 * Builds the grid as an array of columns (weeks), each with 7 rows (Sun–Sat).
 * Padding cells fill the days before Jan 1 of the year to align to Sunday.
 *
 * Returns:
 *  - weeks: CalendarDay[][] – index [col][row], row 0 = Sunday
 *  - monthCols: { month: number; col: number }[] – first column of each month
 */
function buildGrid(year: number): {
  weeks: CalendarDay[][];
  monthCols: { month: number; col: number }[];
} {
  const jan1 = new Date(year, 0, 1);
  const startDow = jan1.getDay(); // 0 = Sunday

  // Flat array: padding cells then all days of the year
  const flat: CalendarDay[] = [];

  for (let i = 0; i < startDow; i++) {
    flat.push({ date: "", count: 0, isCurrentYear: false, isPadding: true });
  }

  const cursor = new Date(year, 0, 1);
  while (cursor.getFullYear() === year) {
    flat.push({
      date: toDateStr(cursor),
      count: 0,
      isCurrentYear: true,
      isPadding: false,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Chunk into columns of 7 (each column = one week, top = Sunday)
  const weeks: CalendarDay[][] = [];
  let i = 0;
  while (i < flat.length) {
    const week: CalendarDay[] = [];
    for (let row = 0; row < 7; row++) {
      week.push(
        i < flat.length ? flat[i] : { date: "", count: 0, isCurrentYear: false, isPadding: true }
      );
      i++;
    }
    weeks.push(week);
  }

  // Find the first column where each month first appears.
  // We must scan EVERY cell in a column (not just the first) because a month
  // can start on any day of the week (i.e., mid-column).
  const monthCols: { month: number; col: number }[] = [];
  const seenMonths = new Set<number>();
  for (let col = 0; col < weeks.length; col++) {
    for (let row = 0; row < 7; row++) {
      const day = weeks[col][row];
      if (!day.isPadding && day.date.length === 10) {
        const month = parseInt(day.date.substring(5, 7), 10) - 1;
        if (!seenMonths.has(month)) {
          seenMonths.add(month);
          monthCols.push({ month, col });
        }
      }
    }
  }

  return { weeks, monthCols };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarHeatmap({ tracker }: CalendarHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const { data, isLoading, isError } = useQuery<{ date: string; count: number }[], Error>({
    queryKey: ["calendarData", tracker.id, year],
    queryFn: async () => {
      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await getCalendarData(tracker.id, year, timezoneOffset);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  // Build O(1) lookup map from API data
  const countMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (data) {
      for (const entry of data) {
        map.set(entry.date, entry.count);
      }
    }
    return map;
  }, [data]);

  // Build the 52-week grid with counts merged in
  const { weeks, monthCols } = useMemo(() => {
    const grid = buildGrid(year);
    // Merge counts into cells
    for (const week of grid.weeks) {
      for (const day of week) {
        if (!day.isPadding && day.date) {
          day.count = countMap.get(day.date) ?? 0;
        }
      }
    }
    return grid;
  }, [year, countMap]);

  const handleMouseEnter = useCallback((day: CalendarDay, e: React.MouseEvent<HTMLDivElement>) => {
    if (day.isPadding || !day.date) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ day, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const canGoPrev = year > 2020;
  const canGoNext = year < currentYear;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="text-muted-foreground h-4 w-4" />
            Activity
          </CardTitle>
          {/* Year navigation */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => setYear((y) => y - 1)}
              disabled={!canGoPrev}
              aria-label="Previous year"
              className="hover:bg-accent rounded p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center font-medium tabular-nums">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              disabled={!canGoNext}
              aria-label="Next year"
              className="hover:bg-accent rounded p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-28 w-full" />
        ) : isError ? (
          <div className="text-muted-foreground flex h-28 items-center justify-center text-sm">
            Failed to load activity data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-flex min-w-max flex-col gap-1">
              {/* Month labels row */}
              <div className="flex gap-[2px] pl-8">
                {weeks.map((_, col) => {
                  const monthInfo = monthCols.find((m) => m.col === col);
                  return (
                    <div key={col} className="text-muted-foreground w-3 text-[10px] leading-none">
                      {monthInfo ? MONTH_LABELS[monthInfo.month] : ""}
                    </div>
                  );
                })}
              </div>

              {/* Grid: day rows (Sun=0 to Sat=6) */}
              <div className="flex gap-[2px]">
                {/* Day-of-week labels (left side) */}
                <div className="mr-1 flex w-7 flex-col gap-[2px]">
                  {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                    <div
                      key={row}
                      className="text-muted-foreground flex h-3 items-center justify-end text-[10px] leading-none"
                    >
                      {ROW_LABELS[row] ?? ""}
                    </div>
                  ))}
                </div>

                {/* Week columns */}
                {weeks.map((week, col) => (
                  <div key={col} className="flex flex-col gap-[2px]">
                    {week.map((day, row) => (
                      <div
                        key={row}
                        className={[
                          "h-3 w-3 cursor-default rounded-sm transition-opacity",
                          day.isPadding
                            ? "pointer-events-none opacity-0"
                            : getIntensityClass(day.count),
                        ].join(" ")}
                        onMouseEnter={day.isPadding ? undefined : (e) => handleMouseEnter(day, e)}
                        onMouseLeave={day.isPadding ? undefined : handleMouseLeave}
                        aria-label={
                          day.isPadding
                            ? undefined
                            : `${day.date}: ${buildEntryLabel(day.count, tracker.type)}`
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1 pt-1 pl-8">
                <span className="text-muted-foreground mr-1 text-[10px]">Less</span>
                {(
                  [
                    "bg-slate-100 dark:bg-slate-800",
                    "bg-indigo-200 dark:bg-indigo-900",
                    "bg-indigo-400 dark:bg-indigo-700",
                    "bg-indigo-600 dark:bg-indigo-500",
                    "bg-indigo-800 dark:bg-indigo-300",
                  ] as const
                ).map((cls, i) => (
                  <div key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
                ))}
                <span className="text-muted-foreground ml-1 text-[10px]">More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Floating tooltip — rendered via a portal-like fixed div */}
      {tooltip && !tooltip.day.isPadding && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}
        >
          <div className="bg-popover text-popover-foreground rounded-md border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md">
            <div className="font-medium">{formatTooltipDate(tooltip.day.date)}</div>
            <div className="text-muted-foreground">
              {buildEntryLabel(tooltip.day.count, tracker.type)}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
