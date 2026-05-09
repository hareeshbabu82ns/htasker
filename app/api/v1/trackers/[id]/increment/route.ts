import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";
import { TrackerType } from "@/app/generated/prisma";

const IncrementSchema = z.object({
  value: z.number().positive("Value must be positive").optional().default(1),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().default(""),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/trackers/:id/increment
 * Increment a counter tracker.
 * Body: { value?: number (default: 1), note?: string }
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[api:increment] Operation failed:", error);
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = IncrementSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { value, note } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const tracker = await tx.tracker.findFirst({
        where: { id, userId: auth.userId },
        select: { id: true, type: true, statistics: true },
      });

      if (!tracker) {
        return { notFound: true } as const;
      }

      if (tracker.type !== TrackerType.COUNTER) {
        return { wrongType: true, type: tracker.type } as const;
      }

      const entry = await tx.trackerEntry.create({
        data: { trackerId: id, value, note, date: new Date() },
      });

      await tx.tracker.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          statistics: {
            totalEntries: (tracker.statistics?.totalEntries ?? 0) + 1,
            totalValue: (tracker.statistics?.totalValue ?? 0) + value,
            totalTime: tracker.statistics?.totalTime ?? 0,
            totalCustom: tracker.statistics?.totalCustom ?? "",
          },
        },
      });

      return {
        entryId: entry.id,
        totalValue: (tracker.statistics?.totalValue ?? 0) + value,
        totalEntries: (tracker.statistics?.totalEntries ?? 0) + 1,
      };
    });

    if ("notFound" in result) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }
    if ("wrongType" in result) {
      return Response.json(
        { error: `Tracker is not a counter (type: ${result.type})` },
        { status: 400 }
      );
    }

    return Response.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("[api:increment] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
