import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrackerType, TrackerStatus } from "@/types";

// Mock next/cache before importing actions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    tracker: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { createTracker, getTrackers, deleteTracker } from "@/app/actions/trackers";
import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

const MOCK_USER_ID = "user-123";
const MOCK_TRACKER_ID = "tracker-abc";

function mockAuthenticated() {
  mockAuth.mockResolvedValue({ user: { id: MOCK_USER_ID } } as any);
}

function mockUnauthenticated() {
  mockAuth.mockResolvedValue(null as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createTracker", () => {
  it("returns success when input is valid and user is authenticated", async () => {
    mockAuthenticated();
    mockPrisma.tracker.create.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);

    const result = await createTracker({
      name: "My Tracker",
      type: TrackerType.COUNTER,
      tags: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MOCK_TRACKER_ID);
    }
    expect(mockPrisma.tracker.create).toHaveBeenCalledOnce();
  });

  it("returns error when user is not authenticated", async () => {
    mockUnauthenticated();

    const result = await createTracker({
      name: "My Tracker",
      type: TrackerType.COUNTER,
      tags: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
    expect(mockPrisma.tracker.create).not.toHaveBeenCalled();
  });

  it("returns validation error when name is empty", async () => {
    mockAuthenticated();

    const result = await createTracker({
      name: "",
      type: TrackerType.COUNTER,
      tags: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Validation failed");
    }
    expect(mockPrisma.tracker.create).not.toHaveBeenCalled();
  });

  it("returns validation error when name exceeds 50 characters", async () => {
    mockAuthenticated();

    const result = await createTracker({
      name: "A".repeat(51),
      type: TrackerType.COUNTER,
      tags: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Validation failed");
    }
  });

  it("returns validation error for invalid color format", async () => {
    mockAuthenticated();

    const result = await createTracker({
      name: "Valid Name",
      type: TrackerType.TIMER,
      tags: [],
      color: "not-a-color",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Validation failed");
    }
  });

  it("accepts valid hex color", async () => {
    mockAuthenticated();
    mockPrisma.tracker.create.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);

    const result = await createTracker({
      name: "Colored Tracker",
      type: TrackerType.AMOUNT,
      tags: [],
      color: "#FF5733",
    });

    expect(result.success).toBe(true);
  });

  it("returns error when database throws", async () => {
    mockAuthenticated();
    mockPrisma.tracker.create.mockRejectedValue(new Error("DB connection failed"));

    const result = await createTracker({
      name: "My Tracker",
      type: TrackerType.COUNTER,
      tags: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to create tracker");
    }
  });
});

describe("getTrackers", () => {
  it("returns paginated trackers for authenticated user", async () => {
    mockAuthenticated();
    const mockTrackers = [
      {
        id: "t1",
        name: "Tracker 1",
        type: TrackerType.COUNTER,
        status: TrackerStatus.INACTIVE,
        userId: MOCK_USER_ID,
        statistics: { totalEntries: 5, totalValue: 10 },
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockPrisma.tracker.count.mockResolvedValue(1);
    mockPrisma.tracker.findMany.mockResolvedValue(mockTrackers as any);

    const result = await getTrackers();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackers).toHaveLength(1);
      expect(result.data.total).toBe(1);
      expect(result.data.page).toBe(1);
    }
  });

  it("returns error when user is not authenticated", async () => {
    mockUnauthenticated();

    const result = await getTrackers();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("applies default pagination (page 1, limit 10)", async () => {
    mockAuthenticated();
    mockPrisma.tracker.count.mockResolvedValue(0);
    mockPrisma.tracker.findMany.mockResolvedValue([]);

    await getTrackers();

    expect(mockPrisma.tracker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    );
  });

  it("applies custom pagination", async () => {
    mockAuthenticated();
    mockPrisma.tracker.count.mockResolvedValue(0);
    mockPrisma.tracker.findMany.mockResolvedValue([]);

    await getTrackers({ page: 3, limit: 5 });

    expect(mockPrisma.tracker.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
  });
});

describe("deleteTracker", () => {
  it("returns success when tracker exists and user owns it", async () => {
    mockAuthenticated();
    mockPrisma.tracker.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteTracker(MOCK_TRACKER_ID);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MOCK_TRACKER_ID);
    }
  });

  it("returns error when tracker not found or not owned by user", async () => {
    mockAuthenticated();
    mockPrisma.tracker.deleteMany.mockResolvedValue({ count: 0 });

    const result = await deleteTracker("non-existent");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Tracker not found");
    }
  });

  it("returns error when user is not authenticated", async () => {
    mockUnauthenticated();

    const result = await deleteTracker(MOCK_TRACKER_ID);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unauthorized");
    }
  });
});
