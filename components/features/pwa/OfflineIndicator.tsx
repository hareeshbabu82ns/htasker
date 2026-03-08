"use client";

import React, { useEffect, useRef, useState } from "react";
import { WifiOff, CheckCircle, X, AlertTriangle } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useOfflineQueue } from "@/lib/offlineQueue";

type BannerState = "offline" | "syncing" | "hidden";

const RETRY_DELAY_MS = 5_000;

export default function OfflineIndicator() {
  const { isOnline } = useOfflineStatus();
  const { queue, processQueue, isProcessing } = useOfflineQueue();
  const [bannerState, setBannerState] = useState<BannerState>("hidden");
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsOnlineRef = useRef<boolean>(isOnline);

  // Counts
  const pendingCount = queue.filter((op) => !op.permanentlyFailed).length;
  const failedCount = queue.filter((op) => op.permanentlyFailed).length;

  /** Schedule a retry attempt while there are still retryable queued ops. */
  const scheduleRetry = React.useCallback(() => {
    if (retryTimerRef.current) return; // already scheduled
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      processQueue();
    }, RETRY_DELAY_MS);
  }, [processQueue]);

  useEffect(() => {
    const wasOnline = prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;

    if (!isOnline) {
      // Clear any pending timers when going offline
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setBannerState("offline");
    } else if (!wasOnline && isOnline) {
      // Came back online — show syncing state and kick off queue
      setBannerState("syncing");
      processQueue();
    }
  }, [isOnline, processQueue]);

  // After each processQueue() completes: if there are still retryable ops and
  // we're online, schedule another pass. Once queue is clear, auto-dismiss.
  useEffect(() => {
    if (!isOnline || isProcessing || bannerState !== "syncing") return;

    if (pendingCount > 0) {
      // Still have retryable items — schedule a retry
      scheduleRetry();
    } else {
      // Queue is empty (or only permanently-failed items remain) — auto-dismiss
      if (dismissTimerRef.current) return; // already scheduled
      dismissTimerRef.current = setTimeout(() => {
        setBannerState("hidden");
        dismissTimerRef.current = null;
      }, 3000);
    }
  }, [isOnline, isProcessing, pendingCount, bannerState, scheduleRetry]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  if (bannerState === "hidden") return null;

  if (bannerState === "syncing") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-16 left-0 right-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-2
          bg-green-50 border-green-200 text-green-800
          dark:bg-green-950 dark:border-green-800 dark:text-green-200"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>
            {isProcessing
              ? "Back online – syncing…"
              : failedCount > 0
                ? `Back online – ${failedCount} ${failedCount === 1 ? "change" : "changes"} could not be synced`
                : pendingCount > 0
                  ? `Back online – retrying ${pendingCount} ${pendingCount === 1 ? "change" : "changes"}…`
                  : "Back online – all changes synced"}
          </span>
        </div>
        <button
          onClick={() => setBannerState("hidden")}
          className="rounded p-0.5 hover:bg-green-100 dark:hover:bg-green-900 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  // offline state
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-16 left-0 right-0 z-40 flex items-center gap-3 border-b px-4 py-2
        bg-amber-50 border-amber-200 text-amber-800
        dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200"
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm font-medium">
        <span>You&apos;re offline</span>
        {pendingCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            {pendingCount} {pendingCount === 1 ? "change" : "changes"} queued
          </span>
        )}
        {failedCount > 0 && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {failedCount}{" "}
            {failedCount === 1 ? "change" : "changes"} permanently failed
          </span>
        )}
      </div>
    </div>
  );
}
