import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the API auth helper
vi.mock("@/lib/api/auth", () => ({
  validateApiToken: vi.fn(),
  unauthorizedResponse: vi.fn(
    () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  ),
}));

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    tracker: {
      findFirst: vi.fn(),
    },
    trackerEntry: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { validateApiToken } from "@/lib/api/auth";
import prisma from "@/lib/db/prisma";
import { GET as GETEntries, POST as POSTEntry } from "@/app/api/v1/trackers/[id]/entries/route";
import {
  GET as GETEntry,
  PUT as PUTEntry,
  DELETE as DELETEEntry,
} from "@/app/api/v1/trackers/[id]/entries/[entryId]/route";

const mockValidate = vi.mocked(validateApiToken);
const mockPrisma = vi.mocked(prisma);

const MOCK_AUTH = { userId: "user-123", tokenId: "token-abc" };
const MOCK_TRACKER_ID = "tracker-xyz";
const MOCK_ENTRY_ID = "entry-001";
const MOCK_ENTRY = {
  id: MOCK_ENTRY_ID,
  trackerId: MOCK_TRACKER_ID,
  startTime: null,
  endTime: null,
  value: 5,
  date: new Date(),
  note: "test note",
  tags: [],
  createdAt: new Date(),
};

function makeTrackerParams(trackerId: string) {
  return { params: Promise.resolve({ id: trackerId }) };
}

function makeEntryParams(trackerId: string, entryId: string) {
  return { params: Promise.resolve({ id: trackerId, entryId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/v1/trackers/:id/entries ────────────────────────────────────────

describe("GET /api/v1/trackers/:id/entries", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await GETEntries(
      new Request("http://localhost/"),
      makeTrackerParams(MOCK_TRACKER_ID)
    );
    expect(resp.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const resp = await GETEntries(
      new Request("http://localhost/"),
      makeTrackerParams(MOCK_TRACKER_ID)
    );
    expect(resp.status).toBe(404);
  });

  it("returns paginated entries", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.count.mockResolvedValue(1 as any);
    mockPrisma.trackerEntry.findMany.mockResolvedValue([MOCK_ENTRY] as any);

    const resp = await GETEntries(
      new Request("http://localhost/"),
      makeTrackerParams(MOCK_TRACKER_ID)
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it("applies sort=asc parameter", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.count.mockResolvedValue(0 as any);
    mockPrisma.trackerEntry.findMany.mockResolvedValue([] as any);

    await GETEntries(new Request("http://localhost/?sort=asc"), makeTrackerParams(MOCK_TRACKER_ID));

    const callArg = mockPrisma.trackerEntry.findMany.mock.calls[0][0] as any;
    expect(callArg.orderBy.date).toBe("asc");
  });
});

// ─── POST /api/v1/trackers/:id/entries ───────────────────────────────────────

describe("POST /api/v1/trackers/:id/entries", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
    });
    const resp = await POSTEntry(req, makeTrackerParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
    });
    const resp = await POSTEntry(req, makeTrackerParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(404);
  });

  it("returns 400 for malformed JSON", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    const req = new Request("http://localhost/", {
      method: "POST",
      body: "not-json",
    });
    const resp = await POSTEntry(req, makeTrackerParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(400);
  });

  it("creates an entry and returns 201", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.create.mockResolvedValue(MOCK_ENTRY as any);

    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ value: 5, note: "test note" }),
    });
    const resp = await POSTEntry(req, makeTrackerParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(201);
    const body = await resp.json();
    expect(body.data.id).toBe(MOCK_ENTRY_ID);
  });

  it("sets trackerId from the URL, not the body", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.create.mockResolvedValue(MOCK_ENTRY as any);

    const req = new Request("http://localhost/", {
      method: "POST",
      body: JSON.stringify({ value: 5 }),
    });
    await POSTEntry(req, makeTrackerParams(MOCK_TRACKER_ID));

    const createArg = (mockPrisma.trackerEntry.create.mock.calls[0][0] as any).data;
    expect(createArg.trackerId).toBe(MOCK_TRACKER_ID);
  });
});

// ─── GET /api/v1/trackers/:id/entries/:entryId ───────────────────────────────

describe("GET /api/v1/trackers/:id/entries/:entryId", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await GETEntry(
      new Request("http://localhost/"),
      makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID)
    );
    expect(resp.status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const resp = await GETEntry(
      new Request("http://localhost/"),
      makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID)
    );
    expect(resp.status).toBe(404);
  });

  it("returns the entry when found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.findFirst.mockResolvedValue(MOCK_ENTRY as any);

    const resp = await GETEntry(
      new Request("http://localhost/"),
      makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID)
    );
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data.id).toBe(MOCK_ENTRY_ID);
  });
});

// ─── PUT /api/v1/trackers/:id/entries/:entryId ───────────────────────────────

describe("PUT /api/v1/trackers/:id/entries/:entryId", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ value: 10 }),
    });
    const resp = await PUTEntry(req, makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID));
    expect(resp.status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ value: 10 }),
    });
    const resp = await PUTEntry(req, makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID));
    expect(resp.status).toBe(404);
  });

  it("updates and returns the entry", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.findFirst.mockResolvedValue(MOCK_ENTRY as any);
    mockPrisma.trackerEntry.update.mockResolvedValue({
      ...MOCK_ENTRY,
      value: 10,
    } as any);

    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ value: 10 }),
    });
    const resp = await PUTEntry(req, makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID));
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data.value).toBe(10);
  });
});

// ─── DELETE /api/v1/trackers/:id/entries/:entryId ────────────────────────────

describe("DELETE /api/v1/trackers/:id/entries/:entryId", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await DELETEEntry(
      new Request("http://localhost/"),
      makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID)
    );
    expect(resp.status).toBe(401);
  });

  it("returns 404 when entry not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const resp = await DELETEEntry(
      new Request("http://localhost/"),
      makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID)
    );
    expect(resp.status).toBe(404);
  });

  it("deletes entry and returns 204", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue({ id: MOCK_TRACKER_ID } as any);
    mockPrisma.trackerEntry.findFirst.mockResolvedValue(MOCK_ENTRY as any);
    mockPrisma.trackerEntry.delete.mockResolvedValue(MOCK_ENTRY as any);

    const resp = await DELETEEntry(
      new Request("http://localhost/"),
      makeEntryParams(MOCK_TRACKER_ID, MOCK_ENTRY_ID)
    );
    expect(resp.status).toBe(204);
  });
});
