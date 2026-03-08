"use client";

import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { getTrackers, TrackerWithEntriesCount } from "@/app/actions/trackers";
import { getTrackerStats } from "@/app/actions/entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart2, AlertCircle, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FALLBACK_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];
const MAX_TRACKERS = 4;
// Request well above typical usage so all trackers appear in the selector.
const TRACKER_FETCH_LIMIT = 200;

type StatsKey = "today" | "week" | "month";

const PERIODS: { label: string; key: StatsKey }[] = [
  { label: "Today", key: "today" },
  { label: "This Week", key: "week" },
  { label: "This Month", key: "month" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTrackerColor(
  tracker: TrackerWithEntriesCount | undefined,
  idx: number
): string {
  if (tracker?.color) return tracker.color;
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length] ?? "#6366f1";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatsData {
  id: string;
  today: number;
  week: number;
  month: number;
}

// Empty interface — component is self-contained with no required props
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TrackerComparisonProps {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrackerComparison(_props: TrackerComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Fetch all trackers (high limit so the full list is available) ───────
  const {
    data: trackers,
    isLoading: trackersLoading,
    isError: trackersError,
  } = useQuery<TrackerWithEntriesCount[], Error>({
    queryKey: ["trackers", { limit: TRACKER_FETCH_LIMIT }],
    queryFn: async () => {
      const r = await getTrackers({ limit: TRACKER_FETCH_LIMIT });
      if (!r.success) throw new Error(r.error);
      return r.data.trackers;
    },
  });

  // ── Fetch stats for each selected tracker ──────────────────────────────
  // Index by position in selectedIds so order is stable even if one fails.
  const statsQueries = useQueries({
    queries: selectedIds.map((id) => ({
      queryKey: ["trackerStats", id] as const,
      queryFn: async (): Promise<StatsData> => {
        const r = await getTrackerStats(id);
        if (!r.success) throw new Error(r.error);
        return { id, ...r.data };
      },
      enabled: selectedIds.length > 0,
    })),
  });

  // ── Derived state ───────────────────────────────────────────────────────

  // Build a stable id → stats map so chart indices never shift when a query
  // is pending or errored — fixes potential bar/label misalignment.
  const statsById: Record<string, StatsData> = {};
  statsQueries.forEach((q, i) => {
    const id = selectedIds[i];
    if (id && q.data) statsById[id] = q.data;
  });

  const isStatsLoading = statsQueries.some((q) => q.isLoading);
  const statsErrors = statsQueries
    .map((q, i) => ({ id: selectedIds[i], error: q.error }))
    .filter((e): e is { id: string; error: Error } => e.error !== null);

  const canSelectMore = selectedIds.length < MAX_TRACKERS;

  // Only render bars for IDs that actually have data (skip pending/errored).
  const renderableIds = selectedIds.filter((id) => statsById[id] !== undefined);

  // Chart data: each row is a period; columns keyed by tracker ID (stable).
  const chartData: Record<string, string | number>[] = PERIODS.map(
    ({ label, key }) => {
      const entry: Record<string, string | number> = { period: label };
      renderableIds.forEach((id) => {
        entry[id] = statsById[id]?.[key] ?? 0;
      });
      return entry;
    }
  );

  // Chart config: keyed by tracker ID so CSS vars match data keys exactly.
  const chartConfig: ChartConfig = {};
  selectedIds.forEach((id, idx) => {
    const tracker = trackers?.find((t) => t.id === id);
    chartConfig[id] = {
      label: tracker?.name ?? `Tracker ${idx + 1}`,
      color: getTrackerColor(tracker, idx),
    };
  });

  const showChart = renderableIds.length >= 2 && !isStatsLoading;

  // ── Handlers ────────────────────────────────────────────────────────────
  const toggleTracker = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= MAX_TRACKERS) return prev;
      return [...prev, id];
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Tracker Selection ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Trackers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose 2–4 trackers to compare ({selectedIds.length}/{MAX_TRACKERS}{" "}
            selected)
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {trackersLoading ? (
            <p className="text-sm text-muted-foreground">Loading trackers…</p>
          ) : trackersError ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Failed to load trackers. Please refresh the page.
            </div>
          ) : !trackers?.length ? (
            <p className="text-sm text-muted-foreground">
              No trackers found. Create a tracker first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {trackers.map((tracker) => {
                const isSelected = selectedIds.includes(tracker.id);
                const selectedIdx = selectedIds.indexOf(tracker.id);
                const activeColor = isSelected
                  ? getTrackerColor(tracker, selectedIdx)
                  : undefined;

                return (
                  <button
                    key={tracker.id}
                    type="button"
                    onClick={() => toggleTracker(tracker.id)}
                    disabled={!isSelected && !canSelectMore}
                    className={[
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border",
                      isSelected
                        ? "text-white border-transparent"
                        : "bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground",
                      !isSelected && !canSelectMore
                        ? "opacity-40 cursor-not-allowed"
                        : "cursor-pointer",
                    ].join(" ")}
                    style={
                      isSelected && activeColor
                        ? { backgroundColor: activeColor, borderColor: activeColor }
                        : undefined
                    }
                  >
                    {isSelected && <X className="w-3 h-3 shrink-0" />}
                    {tracker.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected badges + clear */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t">
              <span className="text-xs text-muted-foreground">Selected:</span>
              {selectedIds.map((id, idx) => {
                const tracker = trackers?.find((t) => t.id === id);
                const color = getTrackerColor(tracker, idx);
                return (
                  <Badge
                    key={id}
                    variant="outline"
                    style={{ borderColor: color, color }}
                  >
                    {tracker?.name ?? id}
                  </Badge>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground ml-auto"
                onClick={() => setSelectedIds([])}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Comparison Chart ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="w-5 h-5" />
            Activity Comparison
          </CardTitle>
        </CardHeader>

        <CardContent>
          {/* Per-tracker stats error banner */}
          {statsErrors.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
              <span>
                Could not load stats for:{" "}
                {statsErrors
                  .map(
                    ({ id }) =>
                      trackers?.find((t) => t.id === id)?.name ?? id
                  )
                  .join(", ")}
                . They are excluded from the chart.
              </span>
            </div>
          )}

          {selectedIds.length < 2 ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-muted-foreground text-sm text-center max-w-xs">
                Select 2 to 4 trackers to compare their activity
              </p>
            </div>
          ) : isStatsLoading ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-muted-foreground">Loading stats…</p>
            </div>
          ) : showChart ? (
            <ChartContainer
              id="tracker-comparison"
              config={chartConfig}
              className="w-full h-72"
            >
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {renderableIds.map((id, idx) => {
                  const tracker = trackers?.find((t) => t.id === id);
                  const color = getTrackerColor(tracker, selectedIds.indexOf(id));
                  return (
                    <Bar
                      key={id}
                      dataKey={id}
                      name={tracker?.name ?? `Tracker ${idx + 1}`}
                      fill={color}
                    />
                  );
                })}
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <p className="text-muted-foreground text-sm text-center max-w-xs">
                Not enough data to compare. Try selecting different trackers.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
