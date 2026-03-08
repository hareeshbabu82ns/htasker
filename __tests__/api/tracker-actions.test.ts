import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/auth", () => ({
  validateApiToken: vi.fn(),
  unauthorizedResponse: vi.fn(
    () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    tracker: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    trackerEntry: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { validateApiToken } from "@/lib/api/auth";
import prisma from "@/lib/db/prisma";
import { POST as Increment } from "@/app/api/v1/trackers/[id]/increment/route";
import { POST as Decrement } from "@/app/api/v1/trackers/[id]/decrement/route";
import { POST as Start } from "@/app/api/v1/trackers/[id]/start/route";
import { POST as Stop } from "@/app/api/v1/trackers/[id]/stop/route";

const mockValidate = vi.mocked(validateApiToken);
const mockPrisma = vi.mocked(prisma);

const MOCK_AUTH = { userId: "user-123", tokenId: "token-abc" };
const TRACKER_ID = "tracker-xyz";
const ENTRY_ID = "entry-abc";

// Make $transaction pass the same mock object as `tx`
function setupTransaction() {
  mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
    fn(mockPrisma)
  );
}

function makeParams(id = TRACKER_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: unknown = {}) {
  return new Request("http://localhost/api/v1/trackers/xyz/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockValidate.mockResolvedValue(MOCK_AUTH);
  setupTransaction();
});

// ─── INCREMENT ───────────────────────────────────────────────────────────────

describe("POST /api/v1/trackers/:id/increment", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await Increment(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue(null);
    const res = await Increment(makeRequest(), makeParams());
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "Tracker not found" });
  });

  it("returns 400 when tracker is not a COUNTER", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      statistics: null,
    });
    const res = await Increment(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("not a counter");
  });

  it("increments by 1 by default", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "COUNTER",
      statistics: { totalEntries: 5, totalValue: 10 },
    });
    mockPrisma.trackerEntry.create.mockResolvedValue({ id: ENTRY_ID });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Increment(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.entryId).toBe(ENTRY_ID);
    expect(json.data.totalValue).toBe(11);
    expect(json.data.totalEntries).toBe(6);
    expect(mockPrisma.trackerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: 1 }) })
    );
  });

  it("increments by custom value", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "COUNTER",
      statistics: { totalEntries: 0, totalValue: 0 },
    });
    mockPrisma.trackerEntry.create.mockResolvedValue({ id: ENTRY_ID });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Increment(makeRequest({ value: 5 }), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.totalValue).toBe(5);
    expect(mockPrisma.trackerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: 5 }) })
    );
  });

  it("returns 422 for negative value", async () => {
    const res = await Increment(makeRequest({ value: -3 }), makeParams());
    expect(res.status).toBe(422);
  });

  it("returns 400 for invalid JSON body", async () => {
    const badReq = new Request("http://localhost/api/v1/trackers/xyz/increment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await Increment(badReq, makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns 500 on unexpected error", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("DB error"));
    const res = await Increment(makeRequest(), makeParams());
    expect(res.status).toBe(500);
  });
});

// ─── DECREMENT ───────────────────────────────────────────────────────────────

describe("POST /api/v1/trackers/:id/decrement", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await Decrement(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue(null);
    const res = await Decrement(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 400 when tracker is not a COUNTER", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "AMOUNT",
      statistics: null,
    });
    const res = await Decrement(makeRequest(), makeParams());
    expect(res.status).toBe(400);
  });

  it("decrements by 1 (stores -1 as value)", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "COUNTER",
      statistics: { totalEntries: 3, totalValue: 10 },
    });
    mockPrisma.trackerEntry.create.mockResolvedValue({ id: ENTRY_ID });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Decrement(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.totalValue).toBe(9);
    expect(mockPrisma.trackerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: -1 }) })
    );
  });

  it("decrements by custom value", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "COUNTER",
      statistics: { totalEntries: 0, totalValue: 20 },
    });
    mockPrisma.trackerEntry.create.mockResolvedValue({ id: ENTRY_ID });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Decrement(makeRequest({ value: 3 }), makeParams());
    const json = await res.json();

    expect(json.data.totalValue).toBe(17);
    expect(mockPrisma.trackerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ value: -3 }) })
    );
  });
});

// ─── START ───────────────────────────────────────────────────────────────────

describe("POST /api/v1/trackers/:id/start", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await Start(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue(null);
    const res = await Start(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 400 when tracker is not a TIMER", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "COUNTER",
      status: "INACTIVE",
    });
    const res = await Start(makeRequest(), makeParams());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("not a timer");
  });

  it("returns 409 when timer is already running", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      status: "ACTIVE",
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue({ id: ENTRY_ID });

    const res = await Start(makeRequest(), makeParams());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Timer is already running");
    expect(json.data.entryId).toBe(ENTRY_ID);
  });

  it("starts timer and returns entryId and startTime", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      status: "INACTIVE",
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue(null);
    const now = new Date();
    mockPrisma.trackerEntry.create.mockResolvedValue({ id: ENTRY_ID, startTime: now });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Start(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.entryId).toBe(ENTRY_ID);
    expect(json.data.startTime).toBeDefined();
    expect(mockPrisma.tracker.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) })
    );
  });

  it("passes note to created entry", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      status: "INACTIVE",
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue(null);
    mockPrisma.trackerEntry.create.mockResolvedValue({ id: ENTRY_ID, startTime: new Date() });
    mockPrisma.tracker.update.mockResolvedValue({});

    await Start(makeRequest({ note: "morning run" }), makeParams());

    expect(mockPrisma.trackerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: "morning run" }),
      })
    );
  });
});

// ─── STOP ────────────────────────────────────────────────────────────────────

describe("POST /api/v1/trackers/:id/stop", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const res = await Stop(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue(null);
    const res = await Stop(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns 400 when tracker is not a TIMER", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "COUNTER",
      statistics: null,
    });
    const res = await Stop(makeRequest(), makeParams());
    expect(res.status).toBe(400);
  });

  it("returns 409 when no active timer entry exists", async () => {
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      statistics: { totalEntries: 0, totalTime: 0 },
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue(null);

    const res = await Stop(makeRequest(), makeParams());
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("No active timer found");
  });

  it("stops auto-detected active timer and returns duration", async () => {
    const startTime = new Date(Date.now() - 60_000); // 60 seconds ago
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      statistics: { totalEntries: 2, totalTime: 120 },
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue({
      id: ENTRY_ID,
      startTime,
      note: null,
    });
    mockPrisma.trackerEntry.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Stop(makeRequest(), makeParams());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.entryId).toBe(ENTRY_ID);
    expect(json.data.duration).toBeGreaterThanOrEqual(59);
    expect(json.data.duration).toBeLessThanOrEqual(61);
    expect(json.data.totalTime).toBeGreaterThanOrEqual(179);
    expect(mockPrisma.tracker.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "INACTIVE" }) })
    );
  });

  it("stops timer by explicit entryId", async () => {
    const startTime = new Date(Date.now() - 30_000);
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      statistics: { totalEntries: 0, totalTime: 0 },
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue({
      id: ENTRY_ID,
      startTime,
      note: null,
    });
    mockPrisma.trackerEntry.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.tracker.update.mockResolvedValue({});

    const res = await Stop(makeRequest({ entryId: ENTRY_ID }), makeParams());
    expect(res.status).toBe(200);

    // Verify the entryId filter was passed to findFirst
    expect(mockPrisma.trackerEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: ENTRY_ID }),
      })
    );
  });

  it("appends note to existing note on stop", async () => {
    const startTime = new Date(Date.now() - 10_000);
    mockPrisma.tracker.findFirst.mockResolvedValue({
      id: TRACKER_ID,
      type: "TIMER",
      statistics: { totalEntries: 0, totalTime: 0 },
    });
    mockPrisma.trackerEntry.findFirst.mockResolvedValue({
      id: ENTRY_ID,
      startTime,
      note: "initial note",
    });
    mockPrisma.trackerEntry.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.tracker.update.mockResolvedValue({});

    await Stop(makeRequest({ note: "done" }), makeParams());

    expect(mockPrisma.trackerEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: "initial note done" }),
      })
    );
  });
});
