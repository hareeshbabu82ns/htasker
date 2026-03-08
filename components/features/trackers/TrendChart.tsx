"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrackerTrend } from "@/app/actions/entries";
import { TrackerType } from "@/types";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatDuration } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type WindowDays = 7 | 30 | 90;

interface TrendChartProps {
  trackerId: string;
  trackerType: TrackerType;
}

interface TrendPoint {
  date: string;   // "YYYY-MM-DD"
  value: number;
}

/** Format a "YYYY-MM-DD" string as "Jan 5" / "Feb 12" */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getYAxisLabel(trackerType: TrackerType): string {
  switch (trackerType) {
    case TrackerType.TIMER:      return "Duration";
    case TrackerType.COUNTER:    return "Count";
    case TrackerType.AMOUNT:     return "Amount";
    case TrackerType.OCCURRENCE: return "Occurrences";
    case TrackerType.CUSTOM:     return "Entries";
    default:                     return "Value";
  }
}

function formatValue(value: number, trackerType: TrackerType): string {
  switch (trackerType) {
    case TrackerType.TIMER:  return formatDuration(value);
    case TrackerType.AMOUNT: return `$${value.toLocaleString()}`;
    default:                 return value.toString();
  }
}

// Tick interval so we show at most ~7 labels on the X axis
function tickInterval(totalPoints: number): number {
  if (totalPoints <= 7) return 0;
  return Math.ceil(totalPoints / 7) - 1;
}

export default function TrendChart({ trackerId, trackerType }: TrendChartProps) {
  const [windowDays, setWindowDays] = React.useState<WindowDays>(30);

  const { startDate, endDate } = React.useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(end.getDate() - (windowDays - 1));
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }, [windowDays]);

  const { data, isLoading, isError } = useQuery<TrendPoint[], Error>({
    queryKey: ["trackerTrend", trackerId, windowDays],
    queryFn: async () => {
      const res = await getTrackerTrend(trackerId, startDate, endDate);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const yLabel = getYAxisLabel(trackerType);
  const gradientId = `trend-gradient-${trackerId}`;

  const customTooltipFormatter = React.useCallback(
    (value: number) => formatValue(value, trackerType),
    [trackerType]
  );

  const windowOptions: WindowDays[] = [7, 30, 90];

  return (
    <div className="space-y-3">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {windowOptions.map((days) => (
          <button
            key={days}
            onClick={() => setWindowDays(days)}
            className={[
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              windowDays === days
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {days} days
          </button>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <Skeleton className="w-full h-64" />
      ) : isError ? (
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          Failed to load trend data.
        </div>
      ) : !data || data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
          No data for this period.
        </div>
      ) : (
        <ChartContainer
          id={`tracker-trend-${trackerId}`}
          config={{ value: { label: yLabel, color: "#6366F1" } }}
          className="w-full h-64"
        >
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              interval={tickInterval(data.length)}
            />
            <YAxis
              allowDecimals={false}
              label={{ value: yLabel, angle: -90, position: "insideLeft", offset: 0 }}
            />
            <ChartTooltip
              formatter={customTooltipFormatter}
              labelFormatter={(label: string) => formatDateLabel(label)}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
