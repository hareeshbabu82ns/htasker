import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";
import { TrackerType } from "@/app/generated/prisma";

const StopSchema = z.object({
  entryId: z.string().optional(),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().default(""),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/trackers/:id/stop
 * Stop a running timer tracker.
 * Body: { entryId?: string (auto-detected if omitted), note?: string }
 * Returns: { data: { entryId, duration, totalTime } }
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = StopSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { entryId: requestedEntryId, note } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const tracker = await tx.tracker.findFirst({
        where: { id, userId: auth.userId },
        select: { id: true, type: true, statistics: true },
      });

      if (!tracker) {
        return { notFound: true } as const;
      }

      if (tracker.type !== TrackerType.TIMER) {
        return { wrongType: true, type: tracker.type } as const;
      }

      // Find the active entry: either the requested one or auto-detect
      const activeEntry = await tx.trackerEntry.findFirst({
        where: requestedEntryId
          ? {
              id: requestedEntryId,
              trackerId: id,
              startTime: { not: null },
              endTime: null,
            }
          : {
              trackerId: id,
              startTime: { not: null },
              endTime: null,
            },
        select: { id: true, startTime: true, note: true },
        orderBy: { startTime: "desc" },
      });

      if (!activeEntry || !activeEntry.startTime) {
        return { noActiveTimer: true } as const;
      }

      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - activeEntry.startTime.getTime()) / 1000);

      const updatedNote = note ? `${activeEntry.note ?? ""} ${note}`.trim() : activeEntry.note;

      // Guard endTime: null in the update filter so a concurrent stop can't double-fire
      await tx.trackerEntry.updateMany({
        where: { id: activeEntry.id, endTime: null },
        data: { endTime, note: updatedNote, value: duration },
      });

      const currentEntries = tracker.statistics?.totalEntries ?? 0;
      const currentTime = tracker.statistics?.totalTime ?? 0;

      await tx.tracker.update({
        where: { id },
        data: {
          status: "INACTIVE",
          updatedAt: new Date(),
          statistics: {
            totalEntries: currentEntries + 1,
            totalTime: currentTime + duration,
            totalValue: tracker.statistics?.totalValue ?? 0,
            totalCustom: tracker.statistics?.totalCustom ?? "",
          },
        },
      });

      return {
        entryId: activeEntry.id,
        duration,
        totalTime: currentTime + duration,
      };
    });

    if ("notFound" in result) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }
    if ("wrongType" in result) {
      return Response.json(
        { error: `Tracker is not a timer (type: ${result.type})` },
        { status: 400 }
      );
    }
    if ("noActiveTimer" in result) {
      return Response.json({ error: "No active timer found" }, { status: 409 });
    }

    return Response.json({ data: result }, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
