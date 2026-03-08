"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrackerStats, getTrackerTrend } from "@/app/actions/entries";
import { TrackerType } from "@/types";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatDuration } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type Period = "today" | "week" | "month" | "custom";

interface TrackerStatsChartProps {
  trackerId: string;
  trackerType: TrackerType;
}

/** Format a Date as "YYYY-MM-DD" using LOCAL calendar day (not UTC). */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDefaultCustomDates(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    start: toLocalDateStr(start),
    end: toLocalDateStr(end),
  };
}

export default function TrackerStatsChart({ trackerId, trackerType }: TrackerStatsChartProps) {
  const [period, setPeriod] = React.useState<Period>("month");
  const defaults = React.useMemo(() => getDefaultCustomDates(), []);
  const [customStart, setCustomStart] = React.useState<string>(defaults.start);
  const [customEnd, setCustomEnd] = React.useState<string>(defaults.end);

  // Determine labels based on tracker type
  const seriesLabel = React.useMemo(() => {
    switch (trackerType) {
      case TrackerType.TIMER:    return "Duration (s)";
      case TrackerType.COUNTER:  return "Count";
      case TrackerType.AMOUNT:   return "Amount";
      case TrackerType.OCCURRENCE: return "Occurrences";
      case TrackerType.CUSTOM:   return "Entries";
      default:                   return "Value";
    }
  }, [trackerType]);

  // Tooltip formatter based on tracker type
  const tooltipFormatter = React.useCallback((value: number) => {
    switch (trackerType) {
      case TrackerType.TIMER:  return formatDuration(value);
      case TrackerType.AMOUNT: return `$${value}`;
      default:                 return value.toString();
    }
  }, [trackerType]);

  // Query for preset periods
  const presetQuery = useQuery({
    queryKey: ["trackerStats", trackerId, period],
    enabled: period !== "custom",
    queryFn: async () => {
      const res = await getTrackerStats(trackerId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  // Query for custom range — sum daily values into one total
  const customQuery = useQuery({
    queryKey: ["trackerTrend", trackerId, "custom", customStart, customEnd],
    enabled: period === "custom" && !!customStart && !!customEnd && customStart <= customEnd,
    queryFn: async () => {
      // Parse as local-time midnight/end-of-day so the server sees the correct calendar day
      const res = await getTrackerTrend(
        trackerId,
        new Date(customStart + "T00:00:00"),
        new Date(customEnd   + "T23:59:59")
      );
      if (!res.success) throw new Error(res.error);
      const total = res.data.reduce((sum, d) => sum + d.value, 0);
      return total;
    },
  });

  const isLoading = period === "custom" ? customQuery.isLoading : presetQuery.isLoading;
  const isError   = period === "custom" ? customQuery.isError  : presetQuery.isError;

  // Build chart data
  const stats = React.useMemo(() => {
    if (period === "custom") {
      const total = customQuery.data ?? 0;
      const label = customStart && customEnd
        ? `${customStart} – ${customEnd}`
        : "Custom";
      return [{ period: label, count: total }];
    }
    const d = presetQuery.data;
    if (!d) return [];
    if (period === "today") return [{ period: "Today", count: d.today }];
    if (period === "week")  return [{ period: "This Week", count: d.week }];
    return [
      { period: "Today",      count: d.today },
      { period: "This Week",  count: d.week },
      { period: "This Month", count: d.month },
    ];
  }, [period, presetQuery.data, customQuery.data, customStart, customEnd]);

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>

        {period === "custom" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              max={toLocalDateStr(new Date())}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="w-full h-64" />
      ) : isError ? (
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Failed to load stats.
        </div>
      ) : (
        <ChartContainer
          id={`tracker-stats-${trackerId}`}
          config={{ count: { label: seriesLabel, color: "#10B981" } }}
          className="w-full h-64"
        >
          <BarChart data={stats} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis allowDecimals={false} label={{ value: seriesLabel, angle: -90, position: "insideLeft", offset: 0 }} />
            <ChartTooltip formatter={tooltipFormatter} />
            <Bar dataKey="count" fill="var(--color-count)" />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
