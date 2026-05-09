"use server";

import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { auth } from "@/auth";

export type ApiTokenActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface ApiTokenSummary {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface GeneratedToken {
  id: string;
  name: string;
  token: string; // plain-text token — shown only once
  tokenPrefix: string;
  createdAt: Date;
}

const GenerateTokenSchema = z.object({
  name: z.string().min(1, "Token name is required").max(50, "Name cannot exceed 50 characters"),
  expiresInDays: z.number().int().min(1).max(365).optional().nullable(),
});

export type GenerateTokenInput = z.infer<typeof GenerateTokenSchema>;

import { requireUserId } from "@/lib/auth/server";

/**
 * Generate a new API token for the authenticated user.
 * Returns the plain-text token exactly once — it cannot be retrieved again.
 */
export async function generateApiToken(
  data: GenerateTokenInput
): Promise<ApiTokenActionResponse<GeneratedToken>> {
  try {
    const userId = await requireUserId();
    const validated = GenerateTokenSchema.parse(data);

    const rawToken = `htk_${randomBytes(32).toString("hex")}`;
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const tokenPrefix = rawToken.slice(0, 12);

    const expiresAt =
      validated.expiresInDays != null
        ? new Date(Date.now() + validated.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    // Use a transaction to make the count check + create atomic
    const apiToken = await prisma.$transaction(async (tx) => {
      const count = await tx.apiToken.count({ where: { userId } });
      if (count >= 10) {
        throw new Error("TOKEN_LIMIT_EXCEEDED");
      }
      return tx.apiToken.create({
        data: { userId, name: validated.name, tokenHash, tokenPrefix, expiresAt },
      });
    });

    revalidatePath("/settings/api-tokens");

    return {
      success: true,
      data: {
        id: apiToken.id,
        name: apiToken.name,
        token: rawToken,
        tokenPrefix: apiToken.tokenPrefix,
        createdAt: apiToken.createdAt,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(", "),
      };
    }
    if (error instanceof Error && error.message === "TOKEN_LIMIT_EXCEEDED") {
      return {
        success: false,
        error: "Maximum of 10 API tokens allowed. Please revoke one first.",
      };
    }
    console.error("Error generating API token:", error);
    return { success: false, error: "Failed to generate token. Please try again." };
  }
}

/**
 * List all API tokens for the authenticated user (without the raw token value).
 */
export async function listApiTokens(): Promise<ApiTokenActionResponse<ApiTokenSummary[]>> {
  try {
    const userId = await requireUserId();

    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: tokens };
  } catch (error) {
    console.error("Error listing API tokens:", error);
    return { success: false, error: "Failed to load tokens." };
  }
}

/**
 * Revoke (delete) an API token by ID.
 */
export async function revokeApiToken(id: string): Promise<ApiTokenActionResponse<null>> {
  try {
    const userId = await requireUserId();

    const token = await prisma.apiToken.findFirst({ where: { id, userId } });
    if (!token) {
      return { success: false, error: "Token not found." };
    }

    await prisma.apiToken.delete({ where: { id } });

    revalidatePath("/settings/api-tokens");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error revoking API token:", error);
    return { success: false, error: "Failed to revoke token." };
  }
}
