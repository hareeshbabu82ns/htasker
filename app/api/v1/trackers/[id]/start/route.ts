import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";
import { TrackerType } from "@/app/generated/prisma";

const StartSchema = z.object({
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().default(""),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/trackers/:id/start
 * Start a timer tracker.
 * Body: { note?: string }
 * Returns: { data: { entryId, startTime } }
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

    const parsed = StartSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { note } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const tracker = await tx.tracker.findFirst({
        where: { id, userId: auth.userId },
        select: { id: true, type: true, status: true },
      });

      if (!tracker) {
        return { notFound: true } as const;
      }

      if (tracker.type !== TrackerType.TIMER) {
        return { wrongType: true, type: tracker.type } as const;
      }

      // Check for an already-running timer (entry with startTime but no endTime)
      const activeEntry = await tx.trackerEntry.findFirst({
        where: { trackerId: id, startTime: { not: null }, endTime: null },
        select: { id: true },
      });

      if (activeEntry) {
        return { alreadyRunning: true, entryId: activeEntry.id } as const;
      }

      const startTime = new Date();
      const entry = await tx.trackerEntry.create({
        data: { trackerId: id, startTime, note, date: startTime },
      });

      await tx.tracker.update({
        where: { id },
        data: { status: "ACTIVE", updatedAt: new Date() },
      });

      return { entryId: entry.id, startTime };
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
    if ("alreadyRunning" in result) {
      return Response.json(
        { error: "Timer is already running", data: { entryId: result.entryId } },
        { status: 409 }
      );
    }

    return Response.json({ data: result }, { status: 200 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
