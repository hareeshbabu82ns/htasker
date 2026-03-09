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
import { GET, POST } from "@/app/api/v1/trackers/route";
import { GET as GETOne, PUT, DELETE } from "@/app/api/v1/trackers/[id]/route";

const mockValidate = vi.mocked(validateApiToken);
const mockPrisma = vi.mocked(prisma);

const MOCK_AUTH = { userId: "user-123", tokenId: "token-abc" };
const MOCK_TRACKER_ID = "tracker-xyz";
const MOCK_TRACKER = {
  id: MOCK_TRACKER_ID,
  name: "My Tracker",
  type: "COUNTER",
  status: "INACTIVE",
  userId: MOCK_AUTH.userId,
  tags: [],
  color: null,
  icon: null,
  isPinned: false,
  goalEnabled: false,
  goalValue: null,
  goalPeriod: null,
  goalUnit: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  statistics: null,
  description: null,
};

function makeGetRequest(url = "http://localhost/api/v1/trackers") {
  return new Request(url);
}

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/v1/trackers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/v1/trackers ────────────────────────────────────────────────────

describe("GET /api/v1/trackers", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await GET(makeGetRequest());
    expect(resp.status).toBe(401);
  });

  it("returns paginated list of trackers", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.count.mockResolvedValue(1 as any);
    mockPrisma.tracker.findMany.mockResolvedValue([MOCK_TRACKER] as any);

    const resp = await GET(makeGetRequest());
    expect(resp.status).toBe(200);

    const body = await resp.json();
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
    expect(body.data[0].id).toBe(MOCK_TRACKER_ID);
  });

  it("filters by status query param", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.count.mockResolvedValue(0 as any);
    mockPrisma.tracker.findMany.mockResolvedValue([] as any);

    await GET(makeGetRequest("http://localhost/api/v1/trackers?status=ACTIVE"));

    const whereArg = (mockPrisma.tracker.findMany.mock.calls[0][0] as any).where;
    expect(whereArg.status).toBe("ACTIVE");
  });

  it("ignores invalid status values", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.count.mockResolvedValue(0 as any);
    mockPrisma.tracker.findMany.mockResolvedValue([] as any);

    await GET(makeGetRequest("http://localhost/api/v1/trackers?status=INVALID"));

    const whereArg = (mockPrisma.tracker.findMany.mock.calls[0][0] as any).where;
    expect(whereArg.status).toBeUndefined();
  });

  it("applies search filter", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.count.mockResolvedValue(0 as any);
    mockPrisma.tracker.findMany.mockResolvedValue([] as any);

    await GET(makeGetRequest("http://localhost/api/v1/trackers?search=run"));

    const whereArg = (mockPrisma.tracker.findMany.mock.calls[0][0] as any).where;
    expect(whereArg.OR).toBeDefined();
  });
});

// ─── POST /api/v1/trackers ───────────────────────────────────────────────────

describe("POST /api/v1/trackers", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await POST(makePostRequest({ name: "T", type: "COUNTER" }));
    expect(resp.status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    const req = new Request("http://localhost/api/v1/trackers", {
      method: "POST",
      body: "not-json",
    });
    const resp = await POST(req);
    expect(resp.status).toBe(400);
  });

  it("returns 422 for validation errors", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    const resp = await POST(makePostRequest({ name: "" }));
    expect(resp.status).toBe(422);
  });

  it("creates a tracker and returns 201", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.create.mockResolvedValue(MOCK_TRACKER as any);

    const resp = await POST(makePostRequest({ name: "My Tracker", type: "COUNTER" }));
    expect(resp.status).toBe(201);

    const body = await resp.json();
    expect(body.data.id).toBe(MOCK_TRACKER_ID);
  });

  it("sets status to INACTIVE regardless of input", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.create.mockResolvedValue(MOCK_TRACKER as any);

    await POST(makePostRequest({ name: "Test", type: "COUNTER" }));

    const createArg = (mockPrisma.tracker.create.mock.calls[0][0] as any).data;
    expect(createArg.status).toBe("INACTIVE");
    expect(createArg.userId).toBe(MOCK_AUTH.userId);
  });
});

// ─── GET /api/v1/trackers/:id ────────────────────────────────────────────────

describe("GET /api/v1/trackers/:id", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await GETOne(makeGetRequest(), makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(401);
  });

  it("returns 404 when tracker not found or not owned", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const resp = await GETOne(makeGetRequest(), makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(404);
  });

  it("returns the tracker when found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(MOCK_TRACKER as any);

    const resp = await GETOne(makeGetRequest(), makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data.id).toBe(MOCK_TRACKER_ID);
  });
});

// ─── PUT /api/v1/trackers/:id ────────────────────────────────────────────────

describe("PUT /api/v1/trackers/:id", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });
    const resp = await PUT(req, makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });
    const resp = await PUT(req, makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(404);
  });

  it("returns 422 for invalid color", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);

    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ color: "red" }),
    });
    const resp = await PUT(req, makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(422);
  });

  it("updates and returns the tracker", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    // findFirst (ownership check) + update
    mockPrisma.tracker.findFirst.mockResolvedValueOnce(MOCK_TRACKER as any);
    mockPrisma.tracker.update.mockResolvedValue({
      ...MOCK_TRACKER,
      name: "Updated",
    } as any);

    const req = new Request("http://localhost/", {
      method: "PUT",
      body: JSON.stringify({ name: "Updated" }),
    });
    const resp = await PUT(req, makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data.name).toBe("Updated");
  });
});

// ─── DELETE /api/v1/trackers/:id ─────────────────────────────────────────────

describe("DELETE /api/v1/trackers/:id", () => {
  it("returns 401 when token is invalid", async () => {
    mockValidate.mockResolvedValue(null);
    const resp = await DELETE(new Request("http://localhost/"), makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(401);
  });

  it("returns 404 when tracker not found", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(null as any);
    const resp = await DELETE(new Request("http://localhost/"), makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(404);
  });

  it("deletes tracker and returns 204", async () => {
    mockValidate.mockResolvedValue(MOCK_AUTH);
    mockPrisma.tracker.findFirst.mockResolvedValue(MOCK_TRACKER as any);
    mockPrisma.tracker.delete.mockResolvedValue(MOCK_TRACKER as any);
    const resp = await DELETE(new Request("http://localhost/"), makeParams(MOCK_TRACKER_ID));
    expect(resp.status).toBe(204);
  });
});
