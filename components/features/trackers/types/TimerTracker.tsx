"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useEntriesQuery,
  useTimerMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";
import EntryPagination from "../EntryPagination";
import EditEntryModal from "../EditEntryModal";

interface TimerTrackerProps {
  tracker: Tracker;
  onUpdate?: () => void;
}

export default function TimerTracker({ tracker, onUpdate }: TimerTrackerProps) {
  const queryClient = useQueryClient();

  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [elapsedAccumulatedTime, setElapsedAccumulatedTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);
  const [initialized, setInitialized] = useState(false);

  // Keep a ref to isRunning to safely read inside effects without re-subscribing
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const trackerQuery = useTrackerQuery(tracker.id);
  const entriesQuery = useEntriesQuery(tracker.id, currentPage, currentLimit);
  const timerMutation = useTimerMutation(tracker.id);
  const periodStatsQuery = usePeriodStats(tracker.id);
  const { key: periodKey, label: periodLabel } = resolvePeriod(
    tracker.goalEnabled ?? false,
    tracker.goalPeriod
  );

  // One-time initialization: detect in-progress entry and load accumulated time
  useEffect(() => {
    if (!entriesQuery.data || !trackerQuery.data || initialized) return;

    const { entries } = entriesQuery.data;

    const inProgressEntry = entries.find(
      (entry) =>
        !entry.endTime ||
        (entry.startTime &&
          entry.endTime &&
          new Date(entry.startTime).getTime() === new Date(entry.endTime).getTime())
    );

    if (inProgressEntry) {
      setIsRunning(true);
      setStartTime(new Date(inProgressEntry.startTime!));
      setCurrentEntryId(inProgressEntry.id);
    }

    // Use period stats if available, otherwise fall back to all-time
    const periodSeconds = periodStatsQuery.data?.[periodKey];
    const totalMs =
      periodSeconds !== undefined
        ? periodSeconds * 1000
        : (trackerQuery.data.statistics?.totalTime ?? 0) * 1000;
    setElapsedAccumulatedTime(totalMs);
    setElapsedTime(totalMs);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesQuery.data, trackerQuery.data, periodStatsQuery.data]);

  // After a stop + re-fetch, or when period stats arrive, update accumulated base.
  // While running: recalculate base so elapsed display uses the correct period total.
  useEffect(() => {
    if (!trackerQuery.data) return;
    const periodSeconds = periodStatsQuery.data?.[periodKey];
    const totalMs =
      periodSeconds !== undefined
        ? periodSeconds * 1000
        : (trackerQuery.data.statistics?.totalTime ?? 0) * 1000;

    setElapsedAccumulatedTime(totalMs);
    // Only reset display when NOT running (running timer calculates from base + elapsed)
    if (!isRunningRef.current) {
      setElapsedTime(totalMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackerQuery.dataUpdatedAt, periodStatsQuery.dataUpdatedAt]);

  // Tick every second when running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = now.getTime() - startTime.getTime();
        setElapsedTime(elapsedAccumulatedTime + elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime, elapsedAccumulatedTime]);

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateDuration = (s: Date, e: Date) => new Date(e).getTime() - new Date(s).getTime();

  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setIsRunning(true);

    timerMutation.mutate(
      { action: "start", now },
      {
        onSuccess: (data) => {
          if (data.action === "start") {
            setCurrentEntryId(data.entryId);
          }
        },
        onError: () => {
          // Roll back optimistic local state
          setIsRunning(false);
          setStartTime(null);
        },
      }
    );
  };

  const handleStop = () => {
    if (!startTime || !currentEntryId) return;

    const duration = new Date().getTime() - startTime.getTime();
    const capturedEntryId = currentEntryId;
    const capturedStartTime = startTime;

    // Optimistically update UI before the mutation
    setIsRunning(false);
    setStartTime(null);
    setCurrentEntryId(null);

    if (duration >= 1000) {
      timerMutation.mutate(
        { action: "stop", entryId: capturedEntryId, startTime: capturedStartTime },
        {
          onSuccess: () => {
            if (onUpdate) onUpdate();
          },
          onError: () => {
            // Restore local timer state so the user can retry
            setIsRunning(true);
            setStartTime(capturedStartTime);
            setCurrentEntryId(capturedEntryId);
          },
        }
      );
    }
  };

  const handleEntryUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: trackerKeys.detail(tracker.id) });
    void queryClient.invalidateQueries({ queryKey: ["entries", tracker.id] });
    void queryClient.invalidateQueries({ queryKey: trackerKeys.stats(tracker.id, "period") });
  };

  const getButtonColorClass = () =>
    tracker.color
      ? `bg-[${tracker.color}] hover:bg-[${tracker.color}]/90`
      : "bg-primary hover:bg-primary/90";

  // Completed entries only (filter out in-progress)
  const completedEntries = (entriesQuery.data?.entries ?? []).filter(
    (entry) =>
      entry.startTime &&
      entry.endTime &&
      new Date(entry.startTime).getTime() !== new Date(entry.endTime).getTime()
  ) as TrackerEntry[];

  const totalEntries = entriesQuery.data?.total ?? 0;
  const isLoadingEntries = entriesQuery.isLoading;

  return (
    <div className="bg-background border-border rounded-lg border p-6 shadow-sm">
      {/* Timer display */}
      <div className="mb-6 text-center">
        <div className="mb-2 text-5xl font-semibold" style={{ color: tracker.color || "inherit" }}>
          {formatTime(elapsedTime)}
        </div>
        <div className="text-foreground/70 text-sm">
          {isRunning ? "Timer running" : periodLabel}
        </div>
      </div>

      {/* Timer controls */}
      <div className="flex justify-center space-x-3">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            disabled={timerMutation.isPending}
            className={`h-11 px-8 ${getButtonColorClass()}`}
          >
            Start Timer
          </Button>
        ) : (
          <Button
            onClick={handleStop}
            disabled={timerMutation.isPending}
            variant="outline"
            className="h-11 border-2 px-8"
          >
            Stop Timer
          </Button>
        )}
      </div>

      {/* History section */}
      <div className="mt-8">
        <h3 className="mb-3 text-sm font-medium">Recent Sessions</h3>
        {isLoadingEntries ? (
          <div className="flex justify-center p-4">
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-t-2 border-b-2"></div>
          </div>
        ) : completedEntries.length > 0 ? (
          <>
            <div className="space-y-3">
              {completedEntries.map((entry) =>
                entry.startTime && entry.endTime ? (
                  <div key={entry.id} className="border-border rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{formatDate(entry.date)}</div>
                      <div className="flex items-center gap-1">
                        <span className="text-foreground/70">
                          {formatTime(calculateDuration(entry.startTime, entry.endTime))}
                        </span>
                        <EditEntryModal
                          entry={entry}
                          trackerType={TrackerType.TIMER}
                          onSuccess={handleEntryUpdated}
                        />
                      </div>
                    </div>
                    <div className="text-foreground/60 mt-1 flex justify-between text-xs">
                      <div>
                        {new Date(entry.startTime).toLocaleTimeString()} -{" "}
                        {new Date(entry.endTime).toLocaleTimeString()}
                      </div>
                      {entry.note && <div className="italic">{entry.note}</div>}
                    </div>
                  </div>
                ) : null
              )}
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
            <p className="text-foreground/60 text-sm">No recent sessions to display</p>
          </div>
        )}
      </div>
    </div>
  );
}
