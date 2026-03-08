import { TrackerStatus, TrackerType } from "@/types";

export interface TrackerFilters {
  status?: TrackerStatus;
  type?: TrackerType;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export const trackerKeys = {
  all: ["trackers"] as const,
  lists: () => [...trackerKeys.all, "list"] as const,
  list: (filters: TrackerFilters) => [...trackerKeys.lists(), filters] as const,
  details: () => [...trackerKeys.all, "detail"] as const,
  detail: (id: string) => [...trackerKeys.details(), id] as const,
  entries: (trackerId: string) => ["entries", trackerId] as const,
  entriesPaged: (trackerId: string, page: number, limit: number) =>
    ["entries", trackerId, page, limit] as const,
  stats: (trackerId: string, period: string) =>
    ["stats", trackerId, period] as const,
} as const;
