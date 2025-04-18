"use client";

import {
  createTracker,
  getTrackers,
  updateTracker,
  deleteTracker,
  CreateTrackerInput,
} from "@/app/actions/trackers";
import { 
  createEntry, 
  getEntriesByTracker,
  CreateEntryInput 
} from "@/app/actions/entries";
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
      // Convert FormData to the expected CreateTrackerInput structure
      const trackerData: CreateTrackerInput = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        type: formData.get("type") as TrackerType,
        tags: formData.getAll("tags").map((tag) => tag as string),
        color: (formData.get("color") as string) || undefined,
        icon: (formData.get("icon") as string) || undefined,
      };

      const response = await createTracker(trackerData);

      if (!response.success) {
        setError(response.error || "Failed to create tracker");
        return { success: false, errors: { message: response.error } };
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
      const response = await getTrackers();

      if (!response.success) {
        setError(response.error || "Failed to fetch trackers");
        return { success: false };
      }

      // Adapt to the actual response structure
      const trackers = response.data as any[];

      return {
        success: true,
        data: {
          trackers,
          pagination: {
            total: trackers.length,
            page: page || 1,
            limit: limit || 10,
          },
        },
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
      const response = await updateTracker(trackerId, { status });

      if (!response.success) {
        setError(response.error || "Failed to update tracker status");
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
        setError(response.error || "Failed to delete tracker");
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
      // Convert FormData to the expected CreateEntryInput structure
      const entryData: CreateEntryInput = {
        trackerId: formData.get("trackerId") as string,
        date: new Date(),
        startTime: formData.get("startTime") 
          ? new Date(formData.get("startTime") as string) 
          : undefined,
        endTime: formData.get("endTime") 
          ? new Date(formData.get("endTime") as string) 
          : undefined,
        value: formData.get("value") 
          ? parseFloat(formData.get("value") as string) 
          : undefined,
        note: (formData.get("note") as string) || undefined,
        tags: formData.getAll("tags").map((tag) => tag as string),
      };

      const response = await createEntry(entryData);

      if (!response.success) {
        setError(response.error || "Failed to create entry");
        return { success: false, errors: { message: response.error } };
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
      const response = await getEntriesByTracker(trackerId, limit || 50);

      if (!response.success) {
        setError(response.error || "Failed to fetch entries");
        return { success: false };
      }

      return {
        success: true,
        data: response.data,
        pagination: {
          total: response.data.length,
          page: page || 1,
          limit: limit || 50,
        },
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
