import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    apiToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";

const mockPrisma = vi.mocked(prisma);

const MOCK_USER_ID = "user-abc123";
const MOCK_TOKEN_ID = "token-xyz";
const RAW_TOKEN = "htk_" + "a".repeat(64);

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/v1/trackers", {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateApiToken", () => {
  it("returns null when Authorization header is missing", async () => {
    const result = await validateApiToken(makeRequest());
    expect(result).toBeNull();
  });

  it("returns null when Authorization header is not Bearer", async () => {
    const result = await validateApiToken(makeRequest("Basic abc123"));
    expect(result).toBeNull();
  });

  it("returns null when Bearer token is empty", async () => {
    const result = await validateApiToken(makeRequest("Bearer "));
    expect(result).toBeNull();
  });

  it("returns null when token is not found in DB", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue(null as any);
    const result = await validateApiToken(makeRequest(`Bearer ${RAW_TOKEN}`));
    expect(result).toBeNull();
    expect(mockPrisma.apiToken.findUnique).toHaveBeenCalledOnce();
  });

  it("returns null when token is expired", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      userId: MOCK_USER_ID,
      expiresAt: new Date("2000-01-01"),
    } as any);

    const result = await validateApiToken(makeRequest(`Bearer ${RAW_TOKEN}`));
    expect(result).toBeNull();
  });

  it("returns userId and tokenId for a valid non-expiring token", async () => {
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      userId: MOCK_USER_ID,
      expiresAt: null,
    } as any);
    mockPrisma.apiToken.update.mockResolvedValue({} as any);

    const result = await validateApiToken(makeRequest(`Bearer ${RAW_TOKEN}`));
    expect(result).toEqual({ userId: MOCK_USER_ID, tokenId: MOCK_TOKEN_ID });
  });

  it("returns userId and tokenId for a valid not-yet-expired token", async () => {
    const futureDate = new Date(Date.now() + 86400_000);
    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      userId: MOCK_USER_ID,
      expiresAt: futureDate,
    } as any);
    mockPrisma.apiToken.update.mockResolvedValue({} as any);

    const result = await validateApiToken(makeRequest(`Bearer ${RAW_TOKEN}`));
    expect(result).toEqual({ userId: MOCK_USER_ID, tokenId: MOCK_TOKEN_ID });
  });

  it("hashes the token consistently (same hash for same input)", async () => {
    const { createHash } = await import("crypto");
    const hash1 = createHash("sha256").update(RAW_TOKEN).digest("hex");
    const hash2 = createHash("sha256").update(RAW_TOKEN).digest("hex");
    expect(hash1).toBe(hash2);

    mockPrisma.apiToken.findUnique.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      userId: MOCK_USER_ID,
      expiresAt: null,
    } as any);
    mockPrisma.apiToken.update.mockResolvedValue({} as any);

    await validateApiToken(makeRequest(`Bearer ${RAW_TOKEN}`));

    expect(mockPrisma.apiToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hash1 },
      select: { id: true, userId: true, expiresAt: true },
    });
  });
});

describe("unauthorizedResponse", () => {
  it("returns a 401 Response", () => {
    const resp = unauthorizedResponse();
    expect(resp.status).toBe(401);
  });
});
