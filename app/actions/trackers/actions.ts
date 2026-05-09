"use server";

import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth/server";
import type { TrackerActionResponse } from "./crud";

const GoalSchema = z.object({
  enabled: z.boolean(),
  value: z.number().optional().nullable(),
  period: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  unit: z.string().max(20, "Unit cannot exceed 20 characters").optional().nullable(),
});

/**
 * Pin a tracker (mark as favourite)
 */
export async function pinTracker(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const result = await prisma.tracker.updateMany({
      where: { id, userId },
      data: { isPinned: true },
    });

    if (result.count === 0) {
      return { success: false, error: "Tracker not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error pinning tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to pin tracker" };
  }
}

/**
 * Unpin a tracker (remove from favourites)
 */
export async function unpinTracker(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const result = await prisma.tracker.updateMany({
      where: { id, userId },
      data: { isPinned: false },
    });

    if (result.count === 0) {
      return { success: false, error: "Tracker not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/trackers");

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error unpinning tracker:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    return { success: false, error: "Failed to unpin tracker" };
  }
}

/**
 * Set or update goal settings on a tracker
 */
export async function setTrackerGoal(
  id: string,
  goal: {
    enabled: boolean;
    value?: number | null;
    period?: string | null;
    unit?: string | null;
  }
): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const idSchema = z.string().min(1);
    idSchema.parse(id);
    const validatedGoal = GoalSchema.parse(goal);

    const existing = await prisma.tracker.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Tracker not found" };
    }

    await prisma.tracker.update({
      where: { id },
      data: {
        goalEnabled: validatedGoal.enabled,
        goalValue: validatedGoal.value ?? null,
        goalPeriod: validatedGoal.period ?? null,
        goalUnit: validatedGoal.unit ?? null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/trackers/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error setting tracker goal:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation failed: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }
    return { success: false, error: "Failed to set tracker goal" };
  }
}

/**
 * Clear goal settings from a tracker
 */
export async function clearTrackerGoal(id: string): Promise<TrackerActionResponse<{ id: string }>> {
  try {
    const userId = await requireUserId();

    const idSchema = z.string().min(1);
    idSchema.parse(id);

    const existing = await prisma.tracker.findFirst({ where: { id, userId } });
    if (!existing) {
      return { success: false, error: "Tracker not found" };
    }

    await prisma.tracker.update({
      where: { id },
      data: {
        goalEnabled: false,
        goalValue: null,
        goalPeriod: null,
        goalUnit: null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/trackers/${id}`);

    return { success: true, data: { id } };
  } catch (error) {
    console.error("Error clearing tracker goal:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return { success: false, error: "Unauthorized" };
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: "Invalid tracker ID" };
    }
    return { success: false, error: "Failed to clear tracker goal" };
  }
}
