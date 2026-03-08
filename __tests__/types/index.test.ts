import { describe, it, expect } from "vitest";
import { TrackerType, TrackerStatus, isTrackerType, isTrackerStatus } from "@/types";

describe("isTrackerType", () => {
  it("returns true for all valid TrackerType values", () => {
    for (const value of Object.values(TrackerType)) {
      expect(isTrackerType(value)).toBe(true);
    }
  });

  it("returns false for invalid strings", () => {
    expect(isTrackerType("INVALID")).toBe(false);
    expect(isTrackerType("timer")).toBe(false); // lowercase
    expect(isTrackerType("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isTrackerType(null)).toBe(false);
    expect(isTrackerType(undefined)).toBe(false);
    expect(isTrackerType(42)).toBe(false);
    expect(isTrackerType({})).toBe(false);
  });
});

describe("isTrackerStatus", () => {
  it("returns true for all valid TrackerStatus values", () => {
    for (const value of Object.values(TrackerStatus)) {
      expect(isTrackerStatus(value)).toBe(true);
    }
  });

  it("returns false for invalid strings", () => {
    expect(isTrackerStatus("DELETED")).toBe(false);
    expect(isTrackerStatus("active")).toBe(false); // lowercase
    expect(isTrackerStatus("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isTrackerStatus(null)).toBe(false);
    expect(isTrackerStatus(undefined)).toBe(false);
    expect(isTrackerStatus(0)).toBe(false);
  });
});
