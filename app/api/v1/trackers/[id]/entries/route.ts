import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";

const EntryCreateSchema = z.object({
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  value: z.number().optional().nullable(),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  date: z.string().datetime().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/trackers/:id/entries
 * List entries for a tracker.
 * Query params: page, limit, sort (asc|desc)
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });

    if (!tracker) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;
    const sortOrder = searchParams.get("sort") === "asc" ? "asc" : "desc";

    const [total, entries] = await Promise.all([
      prisma.trackerEntry.count({ where: { trackerId: id } }),
      prisma.trackerEntry.findMany({
        where: { trackerId: id },
        orderBy: { date: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    return Response.json({
      data: entries,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[api:entries] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/trackers/:id/entries
 * Create a new entry for a tracker.
 */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });

    if (!tracker) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[api:entries] Operation failed:", error);
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = EntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { startTime, endTime, date, ...rest } = parsed.data;

    const entry = await prisma.trackerEntry.create({
      data: {
        ...rest,
        trackerId: id,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        date: date ? new Date(date) : new Date(),
      },
    });

    return Response.json({ data: entry }, { status: 201 });
  } catch (error) {
    console.error("[api:entries] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
