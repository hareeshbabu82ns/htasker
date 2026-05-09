"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useCounterMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { useTrackerEntries } from "@/hooks/useTrackerEntries";
import TrackerEntryList from "../TrackerEntryList";
import EditEntryModal from "../EditEntryModal";

interface CounterTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function CounterTracker({ tracker, onUpdate }: CounterTrackerProps) {
  const queryClient = useQueryClient();

  const [changeAmount, setChangeAmount] = useState(1);

  const trackerQuery = useTrackerQuery(tracker.id);
  const counterMutation = useCounterMutation(tracker.id);
  const periodStatsQuery = usePeriodStats(tracker.id);
  const { key: periodKey, label: periodLabel } = resolvePeriod(
    tracker.goalEnabled ?? false,
    tracker.goalPeriod
  );

  const currentValue =
    periodStatsQuery.data !== undefined
      ? (periodStatsQuery.data[periodKey] ?? 0)
      : (trackerQuery.data?.statistics?.totalValue ?? tracker.statistics?.totalValue ?? 0);

  const {
    entries,
    totalEntries,
    isLoadingEntries,
    currentPage,
    setCurrentPage,
    currentLimit,
    setCurrentLimit,
    handleEntryUpdated,
  } = useTrackerEntries(tracker.id);
  const isPending = counterMutation.isPending;

  return (
    <div className="bg-background border-border rounded-lg border p-6 shadow-sm">
      {/* Counter display */}
      <div className="mb-6 text-center">
        <div className="mb-2 text-5xl font-semibold" style={{ color: tracker.color || "inherit" }}>
          {currentValue}
        </div>
        <div className="text-foreground/70 text-sm">{periodLabel}</div>
      </div>

      {/* Counter controls */}
      <div className="flex flex-col space-y-4">
        {/* Change count selector */}
        <div className="mb-2 flex items-center justify-center space-x-2">
          <span className="text-sm">Change count:</span>
          <div className="border-border flex overflow-hidden rounded-md border">
            {[1, 5, 10].map((count) => (
              <button
                key={count}
                onClick={() => setChangeAmount(count)}
                className={`min-h-[44px] px-3 py-1 text-sm ${
                  changeAmount === count
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex justify-center space-x-3">
          <Button
            onClick={() =>
              counterMutation.mutate(
                { value: -changeAmount },
                {
                  onSuccess: () => {
                    if (onUpdate) onUpdate();
                  },
                }
              )
            }
            disabled={isPending}
            variant="outline"
            className="h-16 w-16 rounded-full text-xl"
          >
            -
          </Button>

          <Button
            onClick={() =>
              counterMutation.mutate(
                { value: changeAmount },
                {
                  onSuccess: () => {
                    if (onUpdate) onUpdate();
                  },
                }
              )
            }
            disabled={isPending}
            className="h-16 w-16 rounded-full text-xl"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            +
          </Button>
        </div>

        {/* Reset button */}
        <div className="mt-4 flex justify-center">
          <Button
            onClick={() =>
              counterMutation.mutate(
                { value: -currentValue, note: "Counter reset" },
                {
                  onSuccess: () => {
                    if (onUpdate) onUpdate();
                  },
                }
              )
            }
            disabled={isPending || currentValue === 0}
            variant="ghost"
            size="sm"
            className="h-11 text-xs"
          >
            Reset to 0
          </Button>
        </div>
      </div>

      {/* History section */}
      <TrackerEntryList
        entries={entries}
        isLoading={isLoadingEntries}
        totalEntries={totalEntries}
        currentPage={currentPage}
        currentLimit={currentLimit}
        onPageChange={setCurrentPage}
        onLimitChange={setCurrentLimit}
        renderItem={(entry) => (
          <div key={entry.id} className="border-border rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(entry.date))}
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`${(entry.value || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {(entry.value || 0) > 0 ? "+" : ""}
                  {entry.value}
                </span>
                <EditEntryModal
                  entry={entry}
                  trackerType={TrackerType.COUNTER}
                  onSuccess={handleEntryUpdated}
                />
              </div>
            </div>
            {entry.note && (
              <div className="text-foreground/60 mt-1 text-xs italic">{entry.note}</div>
            )}
          </div>
        )}
        emptyMessage="No recent changes to display"
        sectionTitle="Recent Changes"
      />
    </div>
  );
}
