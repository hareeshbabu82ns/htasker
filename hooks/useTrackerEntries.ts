"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEntriesQuery } from "@/hooks/useTrackerQuery";
import { trackerKeys } from "@/hooks/queries/trackerQueries";

interface UseTrackerEntriesReturn {
  entries: import("@/types").TrackerEntry[];
  totalEntries: number;
  isLoadingEntries: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentLimit: number;
  setCurrentLimit: (limit: number) => void;
  handleEntryUpdated: () => void;
}

/**
 * Shared hook for paginated entry queries + invalidation.
 * Replaces duplicated useState/useEntriesQuery/handleEntryUpdated patterns
 * across all tracker type components.
 */
export function useTrackerEntries(trackerId: string): UseTrackerEntriesReturn {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [currentLimit, setCurrentLimit] = useState(10);

  const entriesQuery = useEntriesQuery(trackerId, currentPage, currentLimit);

  const handleEntryUpdated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: trackerKeys.detail(trackerId) });
    void queryClient.invalidateQueries({ queryKey: ["entries", trackerId] });
    void queryClient.invalidateQueries({ queryKey: trackerKeys.stats(trackerId, "period") });
  }, [queryClient, trackerId]);

  return {
    entries: entriesQuery.data?.entries ?? [],
    totalEntries: entriesQuery.data?.total ?? 0,
    isLoadingEntries: entriesQuery.isLoading,
    currentPage,
    setCurrentPage,
    currentLimit,
    setCurrentLimit,
    handleEntryUpdated,
  };
}
