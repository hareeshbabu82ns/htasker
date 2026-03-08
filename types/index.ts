export const TRACKER_TYPE_VALUES = ["TIMER", "COUNTER", "AMOUNT", "OCCURRENCE", "CUSTOM"] as const;

export type TrackerType = (typeof TRACKER_TYPE_VALUES)[number];

export const TrackerType = {
  TIMER: TRACKER_TYPE_VALUES[0],
  COUNTER: TRACKER_TYPE_VALUES[1],
  AMOUNT: TRACKER_TYPE_VALUES[2],
  OCCURRENCE: TRACKER_TYPE_VALUES[3],
  CUSTOM: TRACKER_TYPE_VALUES[4],
} as const;

export const TRACKER_STATUS_VALUES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export type TrackerStatus = (typeof TRACKER_STATUS_VALUES)[number];

export const TrackerStatus = {
  ACTIVE: TRACKER_STATUS_VALUES[0],
  INACTIVE: TRACKER_STATUS_VALUES[1],
  ARCHIVED: TRACKER_STATUS_VALUES[2],
} as const;

// User Interface
export interface User {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tracker Interface
export interface Tracker {
  id: string;
  name: string;
  description?: string | null;
  type: TrackerType;
  status: TrackerStatus;
  tags: string[];
  color?: string | null;
  icon?: string | null;
  isPinned?: boolean;
  goalEnabled?: boolean;
  goalValue?: number | null;
  goalPeriod?: string | null;
  goalUnit?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  statistics?: TrackerStatistics | null; // Optional statistics
}

// TrackerStatistics Interface
export interface TrackerStatistics {
  totalEntries: number;
  totalTime?: number | null; // For TIMER type
  totalValue?: number | null; // For COUNTER and AMOUNT type
  totalCustom?: string | null; // For CUSTOM and OCCURRENCE type
}

// TrackerEntry Interface
export interface TrackerEntry {
  id: string;
  trackerId: string;
  startTime?: Date | null;
  endTime?: Date | null;
  value?: number | null;
  date: Date;
  note?: string | null;
  tags: string[];
  createdAt: Date;
}

// Discriminated union for tracker state management
export type TrackerState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: Tracker };

// Type guard for TrackerType
export function isTrackerType(value: unknown): value is TrackerType {
  return TRACKER_TYPE_VALUES.includes(value as TrackerType);
}

// Type guard for TrackerStatus
export function isTrackerStatus(value: unknown): value is TrackerStatus {
  return TRACKER_STATUS_VALUES.includes(value as TrackerStatus);
}

// Form-related types
export type TrackerFormValues = {
  name: string;
  description?: string;
  type: TrackerType;
  status?: TrackerStatus; // Add optional status field
  tags: string[];
  color?: string;
  icon?: string;
};

export type TrackerEntryFormValues = {
  startTime?: Date;
  endTime?: Date;
  value?: number;
  note?: string;
  tags: string[];
};

// API Response types
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export type ApiError =
  | { code: "UNAUTHORIZED"; message: string }
  | {
      code: "VALIDATION_ERROR";
      message: string;
      fields: Record<string, string>;
    }
  | { code: "SERVER_ERROR"; message: string };
