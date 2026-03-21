"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useEntriesQuery,
  useAddEntryMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import { getOccurrenceStreak } from "@/app/actions/entries";
import { Flame } from "lucide-react";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface OccurrenceTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function OccurrenceTracker({ tracker, onUpdate }: OccurrenceTrackerProps) {
  const queryClient = useQueryClient();

  const periodStatsQuery = usePeriodStats(tracker.id);
  const { key: periodKey, label: periodLabel } = resolvePeriod(
    tracker.goalEnabled ?? false,
    tracker.goalPeriod
  );

  const { data: streakData } = useQuery({
    queryKey: ["occurrenceStreak", tracker.id],
    queryFn: async () => {
      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await getOccurrenceStreak(tracker.id, timezoneOffset);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);
  const [note, setNote] = useState("");

  const today = new Date();
  const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [selectedDate, setSelectedDate] = useState(formattedToday);

  const entriesQuery = useEntriesQuery(tracker.id, currentPage, currentLimit);
  const addEntryMutation = useAddEntryMutation(tracker.id);

  const entries = (entriesQuery.data?.entries ?? []) as TrackerEntry[];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;

  // Days since last occurrence (derived from latest entry)
  const daysSinceLastOccurrence = (() => {
    if (entries.length === 0) return 0;
    const lastDate = new Date(entries[0].date);
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  })();

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: trackerKeys.detail(tracker.id) });
    void queryClient.invalidateQueries({ queryKey: ["entries", tracker.id] });
    void queryClient.invalidateQueries({ queryKey: ["occurrenceStreak", tracker.id] });
    void queryClient.invalidateQueries({ queryKey: trackerKeys.stats(tracker.id, "period") });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const handleLogOccurrence = () => {
    addEntryMutation.mutate(
      {
        trackerId: tracker.id,
        date: new Date(`${selectedDate}T00:00:00`),
        note: note.trim() || null,
        tags: [],
      },
      {
        onSuccess: () => {
          setNote("");
          setSelectedDate(formattedToday);
          // Streak also needs refreshing
          void queryClient.invalidateQueries({
            queryKey: ["occurrenceStreak", tracker.id],
          });
          if (onUpdate) onUpdate();
        },
      }
    );
  };

  return (
    <div className="bg-background border-border rounded-lg border p-6 shadow-sm">
      {/* Status display */}
      <div className="mb-6 text-center">
        <div className="mb-1 text-2xl font-semibold" style={{ color: tracker.color || "inherit" }}>
          {periodStatsQuery.data !== undefined
            ? `${periodStatsQuery.data[periodKey] ?? 0} ${(periodStatsQuery.data[periodKey] ?? 0) === 1 ? "occurrence" : "occurrences"}`
            : daysSinceLastOccurrence === 0
              ? "Logged today"
              : `${daysSinceLastOccurrence} days since last occurrence`}
        </div>
        <div className="text-foreground/70 text-sm">{periodLabel}</div>
      </div>

      {/* Streak stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <Flame className="mx-auto mb-1 h-6 w-6 text-orange-500" />
          <div className="text-2xl font-bold">{streakData?.current ?? 0}</div>
          <div className="text-foreground/70 text-sm">Current Streak</div>
          <div className="text-foreground/50 text-xs">days</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <span className="mb-1 block text-2xl">🏆</span>
          <div className="text-2xl font-bold">{streakData?.longest ?? 0}</div>
          <div className="text-foreground/70 text-sm">Longest Streak</div>
          <div className="text-foreground/50 text-xs">days</div>
        </div>
      </div>

      {/* Occurrence form */}
      <div className="space-y-4">
        {/* Date selector */}
        <div className="space-y-2">
          <label htmlFor="occurrence-date" className="block text-sm font-medium">
            Date
          </label>
          <input
            type="date"
            id="occurrence-date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={formattedToday}
            className="focus:ring-primary/50 focus:border-primary bg-background w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm dark:border-gray-700"
          />
        </div>

        {/* Note field */}
        <div className="space-y-2">
          <label htmlFor="occurrence-note" className="block text-sm font-medium">
            Note (optional)
          </label>
          <textarea
            id="occurrence-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="focus:ring-primary/50 focus:border-primary bg-background w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm dark:border-gray-700"
            placeholder="Add a note about this occurrence..."
          />
        </div>

        {/* Submit button */}
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleLogOccurrence}
            disabled={addEntryMutation.isPending}
            className="h-11 px-8"
            style={{ backgroundColor: tracker.color || undefined }}
          >
            {addEntryMutation.isPending ? "Logging..." : "Log Occurrence"}
          </Button>
        </div>
      </div>

      {/* Calendar placeholder */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium">Occurrence Calendar</h3>
        <div className="rounded-md border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
          <p className="text-foreground/60 text-sm">Calendar visualization coming soon</p>
        </div>
      </div>

      {/* History section */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium">Recent Occurrences</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-t-2 border-b-2"></div>
          </div>
        ) : entries.length > 0 ? (
          <>
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border-border rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{formatDate(entry.date)}</div>
                    <EditEntryModal
                      entry={entry}
                      trackerType={TrackerType.OCCURRENCE}
                      onSuccess={handleEntryUpdated}
                    />
                  </div>
                  {entry.note && (
                    <div className="text-foreground/70 mt-1 text-sm italic">{entry.note}</div>
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
            <p className="text-foreground/60 text-sm">No recent occurrences to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
