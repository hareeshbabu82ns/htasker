import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Mock auth
vi.mock("@/auth", () => ({ auth: vi.fn() }));

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    $transaction: vi.fn(),
    apiToken: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { auth } from "@/auth";
import prisma from "@/lib/db/prisma";
import { generateApiToken, listApiTokens, revokeApiToken } from "@/app/actions/api-tokens";

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

const MOCK_USER_ID = "user-123";
const MOCK_TOKEN_ID = "token-abc";

function mockAuthenticated() {
  mockAuth.mockResolvedValue({ user: { id: MOCK_USER_ID } } as any);
}

function mockUnauthenticated() {
  mockAuth.mockResolvedValue(null as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── generateApiToken ────────────────────────────────────────────────────────

describe("generateApiToken", () => {
  // Helper: make $transaction call the callback with the same mock prisma (as tx)
  function setupTransaction() {
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma as unknown as typeof mockPrisma)
    );
  }

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await generateApiToken({ name: "My token" });
    expect(result.success).toBe(false);
  });

  it("returns error when name is empty (Zod validation before transaction)", async () => {
    mockAuthenticated();
    const result = await generateApiToken({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/required/i);
  });

  it("returns error when user has 10 tokens (limit reached inside transaction)", async () => {
    mockAuthenticated();
    setupTransaction();
    mockPrisma.apiToken.count.mockResolvedValue(10 as any);
    const result = await generateApiToken({ name: "Overflow" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/maximum/i);
  });

  it("creates a token and returns the plain-text value", async () => {
    mockAuthenticated();
    setupTransaction();
    mockPrisma.apiToken.count.mockResolvedValue(0 as any);
    mockPrisma.apiToken.create.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      name: "Test token",
      tokenPrefix: "htk_aaaaaaaa",
      createdAt: new Date(),
      expiresAt: null,
    } as any);

    const result = await generateApiToken({ name: "Test token" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toMatch(/^htk_/);
      expect(result.data.id).toBe(MOCK_TOKEN_ID);
    }
  });

  it("creates a token with expiry when expiresInDays is set", async () => {
    mockAuthenticated();
    setupTransaction();
    mockPrisma.apiToken.count.mockResolvedValue(0 as any);
    mockPrisma.apiToken.create.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      name: "Expiring",
      tokenPrefix: "htk_aaaaaaaa",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400_000),
    } as any);

    const result = await generateApiToken({ name: "Expiring", expiresInDays: 30 });
    expect(result.success).toBe(true);

    const createCall = mockPrisma.apiToken.create.mock.calls[0][0];
    expect(createCall.data.expiresAt).toBeInstanceOf(Date);
  });

  it("stores the hash not the raw token in DB", async () => {
    mockAuthenticated();
    setupTransaction();
    mockPrisma.apiToken.count.mockResolvedValue(0 as any);
    mockPrisma.apiToken.create.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      name: "Sec check",
      tokenPrefix: "htk_aaaaaaaa",
      createdAt: new Date(),
      expiresAt: null,
    } as any);

    await generateApiToken({ name: "Sec check" });

    const createCall = mockPrisma.apiToken.create.mock.calls[0][0];
    // The hash should be 64 hex chars (SHA-256), not the raw token
    expect(createCall.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    // The raw token should NOT be stored
    expect(createCall.data.tokenHash).not.toMatch(/^htk_/);
  });
});

// ─── listApiTokens ───────────────────────────────────────────────────────────

describe("listApiTokens", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await listApiTokens();
    expect(result.success).toBe(false);
  });

  it("returns empty array when user has no tokens", async () => {
    mockAuthenticated();
    mockPrisma.apiToken.findMany.mockResolvedValue([] as any);
    const result = await listApiTokens();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual([]);
  });

  it("returns list of tokens without raw token values", async () => {
    mockAuthenticated();
    const mockTokens = [
      {
        id: MOCK_TOKEN_ID,
        name: "CI token",
        tokenPrefix: "htk_12345678",
        lastUsedAt: null,
        createdAt: new Date(),
        expiresAt: null,
      },
    ];
    mockPrisma.apiToken.findMany.mockResolvedValue(mockTokens as any);
    const result = await listApiTokens();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty("tokenHash");
    }
  });
});

// ─── revokeApiToken ──────────────────────────────────────────────────────────

describe("revokeApiToken", () => {
  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await revokeApiToken(MOCK_TOKEN_ID);
    expect(result.success).toBe(false);
  });

  it("returns error when token does not belong to user", async () => {
    mockAuthenticated();
    mockPrisma.apiToken.findFirst.mockResolvedValue(null as any);
    const result = await revokeApiToken(MOCK_TOKEN_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/not found/i);
  });

  it("deletes the token and returns success", async () => {
    mockAuthenticated();
    mockPrisma.apiToken.findFirst.mockResolvedValue({
      id: MOCK_TOKEN_ID,
      userId: MOCK_USER_ID,
    } as any);
    mockPrisma.apiToken.delete.mockResolvedValue({} as any);

    const result = await revokeApiToken(MOCK_TOKEN_ID);
    expect(result.success).toBe(true);
    expect(mockPrisma.apiToken.delete).toHaveBeenCalledWith({
      where: { id: MOCK_TOKEN_ID },
    });
  });
});
