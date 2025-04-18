"use client";

import {
  createTracker,
  getTrackers,
  updateTrackerStatus,
  deleteTracker,
} from "@/app/actions/trackers";
import { createEntry, getEntries } from "@/app/actions/entries";
import { useState } from "react";
import { Tracker, TrackerEntry, TrackerStatus, TrackerType } from "@/types";

export function useTracker() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new tracker
  const addTracker = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createTracker(formData);

      if (!response.success) {
        setError(response.message || "Failed to create tracker");
        return { success: false, errors: response.errors };
      }

      return { success: true, data: response.data };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch trackers with filtering options
  const fetchTrackers = async ({
    status,
    type,
    search,
    sort,
    limit,
    page,
  }: {
    status?: TrackerStatus;
    type?: TrackerType;
    search?: string;
    sort?: string;
    limit?: number;
    page?: number;
  } = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getTrackers({
        status,
        type,
        search,
        sort,
        limit,
        page,
      });

      if (!response.success) {
        setError(response.message || "Failed to fetch trackers");
        return { success: false };
      }

      return {
        success: true,
        data: response.data.trackers,
        pagination: response.data.pagination,
      };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Change tracker status
  const changeStatus = async (trackerId: string, status: TrackerStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await updateTrackerStatus(trackerId, status);

      if (!response.success) {
        setError(response.message || "Failed to update tracker status");
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a tracker
  const removeTracker = async (trackerId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await deleteTracker(trackerId);

      if (!response.success) {
        setError(response.message || "Failed to delete tracker");
        return { success: false };
      }

      return { success: true };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new entry to a tracker
  const addEntry = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createEntry(formData);

      if (!response.success) {
        setError(response.message || "Failed to create entry");
        return { success: false, errors: response.errors };
      }

      return { success: true, data: response.data };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch entries for a specific tracker
  const fetchEntries = async ({
    trackerId,
    startDate,
    endDate,
    limit,
    page,
  }: {
    trackerId: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getEntries({
        trackerId,
        startDate,
        endDate,
        limit,
        page,
      });

      if (!response.success) {
        setError(response.message || "Failed to fetch entries");
        return { success: false };
      }

      return {
        success: true,
        data: response.data.entries,
        pagination: response.data.pagination,
      };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    addTracker,
    fetchTrackers,
    changeStatus,
    removeTracker,
    addEntry,
    fetchEntries,
  };
}
