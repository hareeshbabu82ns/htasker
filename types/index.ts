// Tracker Type Enum
export enum TrackerType {
  TIMER = "TIMER", // Start/stop with duration tracking
  COUNTER = "COUNTER", // Increment/decrement tracking
  AMOUNT = "AMOUNT", // Numerical value tracking (e.g. money)
  OCCURRENCE = "OCCURRENCE", // Date-based event tracking
  CUSTOM = "CUSTOM", // User-defined tracking
}

// Tracker Status Enum
export enum TrackerStatus {
  ACTIVE = "ACTIVE", // Currently running (for timers)
  INACTIVE = "INACTIVE", // Not running but available
  ARCHIVED = "ARCHIVED", // No longer in use
}

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
  return Object.values(TrackerType).includes(value as TrackerType);
}

// Type guard for TrackerStatus
export function isTrackerStatus(value: unknown): value is TrackerStatus {
  return Object.values(TrackerStatus).includes(value as TrackerStatus);
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
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ApiError =
  | { code: "UNAUTHORIZED"; message: string }
  | {
      code: "VALIDATION_ERROR";
      message: string;
      fields: Record<string, string>;
    }
  | { code: "SERVER_ERROR"; message: string };
