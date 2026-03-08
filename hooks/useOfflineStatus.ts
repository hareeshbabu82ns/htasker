"use client";

import { useState, useEffect } from "react";

export interface OfflineStatus {
  isOnline: boolean;
}

/**
 * Tracks browser connectivity via navigator.onLine and the
 * window `online` / `offline` events.
 */
export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // navigator.onLine is undefined during SSR — default to true
    if (typeof window === "undefined") return true;
    return window.navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync in case the state changed between render and effect
    setIsOnline(window.navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
