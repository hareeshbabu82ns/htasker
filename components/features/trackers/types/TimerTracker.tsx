"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tracker, TrackerEntry, TrackerType } from "@/types";
import {
  useTrackerQuery,
  useTimerMutation,
  usePeriodStats,
  resolvePeriod,
} from "@/hooks/useTrackerQuery";
import { useTrackerEntries } from "@/hooks/useTrackerEntries";
import TrackerEntryList from "../TrackerEntryList";
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
  const [initialized, setInitialized] = useState(false);

  // Keep a ref to isRunning to safely read inside effects without re-subscribing
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  const trackerQuery = useTrackerQuery(tracker.id);
  const timerMutation = useTimerMutation(tracker.id);
  const periodStatsQuery = usePeriodStats(tracker.id);
  const { key: periodKey, label: periodLabel } = resolvePeriod(
    tracker.goalEnabled ?? false,
    tracker.goalPeriod
  );

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

  // One-time initialization: detect in-progress entry and load accumulated time
  useEffect(() => {
    if (!entries || entries.length === 0 || !trackerQuery.data || initialized) return;

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
  }, [entries, trackerQuery.data, periodStatsQuery.data]);

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

  const completedEntries = (entries ?? []).filter(
    (entry) =>
      entry.startTime &&
      entry.endTime &&
      new Date(entry.startTime).getTime() !== new Date(entry.endTime).getTime()
  ) as TrackerEntry[];

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

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

    const capturedEntryId = currentEntryId;
    const capturedStartTime = startTime;

    // Optimistically update UI before the mutation
    setIsRunning(false);
    setStartTime(null);
    setCurrentEntryId(null);

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
  };

  const getButtonColorClass = () =>
    tracker.color
      ? `bg-[${tracker.color}] hover:bg-[${tracker.color}]/90`
      : "bg-primary hover:bg-primary/90";

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
      <TrackerEntryList
        entries={completedEntries}
        isLoading={isLoadingEntries}
        totalEntries={totalEntries}
        currentPage={currentPage}
        currentLimit={currentLimit}
        onPageChange={setCurrentPage}
        onLimitChange={setCurrentLimit}
        renderItem={(entry) =>
          entry.startTime && entry.endTime ? (
            <div key={entry.id} className="border-border rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(entry.date))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-foreground/70">
                    {formatTime(
                      new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()
                    )}
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
        }
        emptyMessage="No recent sessions to display"
        sectionTitle="Recent Sessions"
      />
    </div>
  );
}
