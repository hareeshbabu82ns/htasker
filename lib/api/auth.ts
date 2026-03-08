import { createHash } from "crypto";
import prisma from "@/lib/db/prisma";

export interface ApiAuthResult {
  userId: string;
  tokenId: string;
}

/**
 * Validates a Bearer token from the Authorization header.
 * Returns the authenticated user's ID and token ID, or null if invalid.
 */
export async function validateApiToken(request: Request): Promise<ApiAuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) {
    return null;
  }

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const apiToken = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!apiToken) {
    return null;
  }

  if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
    return null;
  }

  // Update lastUsedAt without blocking the response
  void prisma.apiToken
    .update({
      where: { id: apiToken.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { userId: apiToken.userId, tokenId: apiToken.id };
}

/** Returns a standard 401 JSON response */
export function unauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/** Wraps a route handler in a try/catch, returning 500 on unexpected errors */
export function withErrorHandling(
  handler: (request: Request, context: unknown) => Promise<Response>
): (request: Request, context: unknown) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch {
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
