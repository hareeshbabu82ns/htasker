"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackerKeys } from "./queries/trackerQueries";
import { getTracker, updateTracker, CreateTrackerInput } from "@/app/actions/trackers";
import {
  createEntry,
  getEntriesByTracker,
  updateEntry as updateEntryAction,
  deleteEntry as deleteEntryAction,
  getTrackerStats,
  CreateEntryInput,
} from "@/app/actions/entries";
import { Tracker, TrackerEntry, TrackerStatus } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated-union variable types for the specialised mutations
// ─────────────────────────────────────────────────────────────────────────────

export type CounterMutationVariables = {
  value: number;
  note?: string;
};

export type TimerMutationVariables =
  | { action: "start"; now: Date }
  | { action: "stop"; entryId: string; startTime: Date };

export type TimerMutationResult = { action: "start"; entryId: string } | { action: "stop" };

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a single tracker by ID.
 * staleTime: 30 s — statistics change only when entries are added.
 */
export function useTrackerQuery(id: string) {
  return useQuery<Tracker>({
    queryKey: trackerKeys.detail(id),
    queryFn: async () => {
      const response = await getTracker(id);
      if (!response.success) throw new Error(response.error);
      return response.data as Tracker;
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch paginated entries for a tracker.
 * staleTime: 15 s — entries change more frequently than tracker stats.
 */
export function useEntriesQuery(trackerId: string, page: number, limit: number) {
  return useQuery<{ entries: TrackerEntry[]; total: number }>({
    queryKey: trackerKeys.entriesPaged(trackerId, page, limit),
    queryFn: async () => {
      const response = await getEntriesByTracker(trackerId, limit, page);
      if (!response.success) throw new Error(response.error);
      return {
        entries: response.data.entries as TrackerEntry[],
        total: response.data.total,
      };
    },
    staleTime: 15_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Period stats
// ─────────────────────────────────────────────────────────────────────────────

type GoalPeriod = "daily" | "weekly" | "monthly";

interface PeriodStats {
  today: number;
  week: number;
  month: number;
}

/** Map a goalPeriod to the matching stats key and human label. */
export function resolvePeriod(
  goalEnabled?: boolean,
  goalPeriod?: string | null
): { key: keyof PeriodStats; label: string } {
  if (goalEnabled && goalPeriod) {
    switch (goalPeriod as GoalPeriod) {
      case "weekly":
        return { key: "week", label: "This week" };
      case "monthly":
        return { key: "month", label: "This month" };
      case "daily":
      default:
        return { key: "today", label: "Today" };
    }
  }
  return { key: "today", label: "Today" };
}

/**
 * Fetch period-based stats (today / week / month) for a tracker.
 * staleTime: 30 s — same cadence as tracker detail.
 */
export function usePeriodStats(trackerId: string) {
  return useQuery<PeriodStats>({
    queryKey: trackerKeys.stats(trackerId, "period"),
    queryFn: async () => {
      const timezoneOffset = new Date().getTimezoneOffset();
      const response = await getTrackerStats(trackerId, timezoneOffset);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    staleTime: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// General-purpose entry mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an entry for the given tracker, then invalidate its data.
 */
export function useAddEntryMutation(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, CreateEntryInput>({
    mutationFn: async (data) => {
      const response = await createEntry(data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["entries", trackerId],
      });
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.stats(trackerId, "period"),
      });
    },
  });
}

/**
 * Update an existing entry for the given tracker, then invalidate its data.
 */
export function useUpdateEntryMutation(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, { id: string; data: Partial<CreateEntryInput> }>({
    mutationFn: async ({ id, data }) => {
      const response = await updateEntryAction(id, data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["entries", trackerId],
      });
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.stats(trackerId, "period"),
      });
    },
  });
}

/**
 * Delete an entry for the given tracker, then invalidate its data.
 */
export function useDeleteEntryMutation(trackerId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    mutationFn: async (entryId) => {
      const response = await deleteEntryAction(entryId);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["entries", trackerId],
      });
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.stats(trackerId, "period"),
      });
    },
  });
}

/**
 * Update a tracker's fields / status, then invalidate all tracker caches.
 */
export function useUpdateTrackerMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, { id: string; data: Partial<CreateTrackerInput> }>({
    mutationFn: async ({ id, data }) => {
      const response = await updateTracker(id, data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trackerKeys.all });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Optimistic mutations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Counter increment / decrement with optimistic totalValue update.
 * The cache is immediately updated so the counter display feels instant.
 */
export function useCounterMutation(trackerId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string },
    Error,
    CounterMutationVariables,
    { previousTracker: Tracker | undefined }
  >({
    mutationFn: async (variables) => {
      const response = await createEntry({
        trackerId,
        value: variables.value,
        date: new Date(),
        note: variables.note ?? null,
        tags: [],
      });
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      const previousTracker = queryClient.getQueryData<Tracker>(trackerKeys.detail(trackerId));
      queryClient.setQueryData<Tracker>(trackerKeys.detail(trackerId), (old) => {
        if (!old) return old;
        return {
          ...old,
          statistics: {
            ...old.statistics,
            totalEntries: (old.statistics?.totalEntries ?? 0) + 1,
            totalValue: (old.statistics?.totalValue ?? 0) + variables.value,
          },
        };
      });
      return { previousTracker };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousTracker) {
        queryClient.setQueryData(trackerKeys.detail(trackerId), context.previousTracker);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["entries", trackerId],
      });
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.stats(trackerId, "period"),
      });
    },
  });
}

/**
 * Timer start / stop with optimistic tracker-status toggle.
 *
 * - start: creates an entry with startTime === endTime (in-progress marker)
 * - stop:  updates that entry with the real endTime
 *
 * The tracker's `status` is optimistically toggled so any component that
 * reads `useTrackerQuery` sees the change immediately.
 */
export function useTimerMutation(trackerId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    TimerMutationResult,
    Error,
    TimerMutationVariables,
    { previousTracker: Tracker | undefined }
  >({
    mutationFn: async (variables) => {
      if (variables.action === "start") {
        const response = await createEntry({
          trackerId,
          startTime: variables.now,
          endTime: variables.now,
          date: variables.now,
          tags: [],
        });
        if (!response.success) throw new Error(response.error);
        return { action: "start" as const, entryId: response.data.id };
      } else {
        const now = new Date();
        const response = await updateEntryAction(variables.entryId, {
          trackerId,
          startTime: variables.startTime,
          endTime: now,
          date: variables.startTime,
        });
        if (!response.success) throw new Error(response.error);
        return { action: "stop" as const };
      }
    },

    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      const previousTracker = queryClient.getQueryData<Tracker>(trackerKeys.detail(trackerId));
      queryClient.setQueryData<Tracker>(trackerKeys.detail(trackerId), (old) => {
        if (!old) return old;
        return {
          ...old,
          status: variables.action === "start" ? TrackerStatus.ACTIVE : TrackerStatus.INACTIVE,
        };
      });
      return { previousTracker };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousTracker) {
        queryClient.setQueryData(trackerKeys.detail(trackerId), context.previousTracker);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.detail(trackerId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["entries", trackerId],
      });
      void queryClient.invalidateQueries({
        queryKey: trackerKeys.stats(trackerId, "period"),
      });
    },
  });
}
