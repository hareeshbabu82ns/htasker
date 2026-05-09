import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";

const EntryUpdateSchema = z.object({
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  value: z.number().optional().nullable(),
  note: z.string().max(500, "Note cannot exceed 500 characters").optional().nullable(),
  tags: z.array(z.string()).optional(),
  date: z.string().datetime().optional(),
});

interface RouteContext {
  params: Promise<{ id: string; entryId: string }>;
}

async function getOwnedEntry(trackerId: string, entryId: string, userId: string) {
  const tracker = await prisma.tracker.findFirst({
    where: { id: trackerId, userId },
    select: { id: true },
  });
  if (!tracker) return null;

  return prisma.trackerEntry.findFirst({
    where: { id: entryId, trackerId },
  });
}

/**
 * GET /api/v1/trackers/:id/entries/:entryId
 * Get a single entry.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id, entryId } = await params;

    const entry = await getOwnedEntry(id, entryId, auth.userId);
    if (!entry) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    return Response.json({ data: entry });
  } catch (error) {
    console.error("[api:entries] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/v1/trackers/:id/entries/:entryId
 * Update a single entry.
 */
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id, entryId } = await params;

    const existing = await getOwnedEntry(id, entryId, auth.userId);
    if (!existing) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[api:entries] Operation failed:", error);
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = EntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { startTime, endTime, date, ...rest } = parsed.data;

    const updated = await prisma.trackerEntry.update({
      where: { id: entryId },
      data: {
        ...rest,
        ...(startTime !== undefined && { startTime: startTime ? new Date(startTime) : null }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(date !== undefined && { date: new Date(date) }),
      },
    });

    return Response.json({ data: updated });
  } catch (error) {
    console.error("[api:entries] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/trackers/:id/entries/:entryId
 * Delete a single entry.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id, entryId } = await params;

    const existing = await getOwnedEntry(id, entryId, auth.userId);
    if (!existing) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    await prisma.trackerEntry.delete({ where: { id: entryId } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[api:entries] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
