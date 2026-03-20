"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useEntriesQuery,
  useCounterMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface CounterTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function CounterTracker({ tracker, onUpdate }: CounterTrackerProps) {
  const queryClient = useQueryClient();

  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);
  const [changeAmount, setChangeAmount] = useState(1);

  const trackerQuery = useTrackerQuery(tracker.id);
  const entriesQuery = useEntriesQuery(tracker.id, currentPage, currentLimit);
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

  const entries = (entriesQuery.data?.entries ?? []) as TrackerEntry[];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;
  const isPending = counterMutation.isPending;

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: trackerKeys.detail(tracker.id) });
    void queryClient.invalidateQueries({ queryKey: ["entries", tracker.id] });
    void queryClient.invalidateQueries({ queryKey: trackerKeys.stats(tracker.id, "period") });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleIncrement = () => {
    counterMutation.mutate(
      { value: changeAmount },
      {
        onSuccess: () => {
          if (onUpdate) onUpdate();
        },
      }
    );
  };

  const handleDecrement = () => {
    counterMutation.mutate(
      { value: -changeAmount },
      {
        onSuccess: () => {
          if (onUpdate) onUpdate();
        },
      }
    );
  };

  const handleReset = () => {
    if (currentValue === 0) return;
    counterMutation.mutate(
      { value: -currentValue, note: "Counter reset" },
      {
        onSuccess: () => {
          if (onUpdate) onUpdate();
        },
      }
    );
  };

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
            onClick={handleDecrement}
            disabled={isPending}
            variant="outline"
            className="h-16 w-16 rounded-full text-xl"
          >
            -
          </Button>

          <Button
            onClick={handleIncrement}
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
            onClick={handleReset}
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
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium">Recent Changes</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-t-2 border-b-2"></div>
          </div>
        ) : entries.length > 0 ? (
          <>
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="border-border rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{formatDate(entry.date)}</div>
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
              ))}
            </div>
            <EntryPagination
              currentPage={currentPage}
              currentLimit={currentLimit}
              totalEntries={totalEntries}
              onPageChange={setCurrentPage}
              onLimitChange={(limit) => {
                setCurrentLimit(limit);
                setCurrentPage(1);
              }}
            />
          </>
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
            <p className="text-foreground/60 text-sm">No recent changes to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
