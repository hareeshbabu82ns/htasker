import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";
import { TrackerStatus, TrackerType } from "@/app/generated/prisma";

const TrackerUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name cannot exceed 50 characters")
    .optional(),
  description: z
    .string()
    .max(200, "Description cannot exceed 200 characters")
    .optional()
    .nullable(),
  type: z.nativeEnum(TrackerType).optional(),
  status: z.nativeEnum(TrackerStatus).optional(),
  tags: z.array(z.string()).optional(),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format")
    .optional()
    .nullable(),
  icon: z.string().optional().nullable(),
  isPinned: z.boolean().optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/trackers/:id
 * Get a single tracker by ID.
 */
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    const tracker = await prisma.tracker.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!tracker) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }

    return Response.json({ data: tracker });
  } catch (error) {
    console.error("[api:tracker] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/v1/trackers/:id
 * Update a tracker.
 */
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[api:tracker] Operation failed:", error);
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = TrackerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    // Verify ownership first, then update — avoids null race on findUnique after updateMany
    const existing = await prisma.tracker.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }

    const tracker = await prisma.tracker.update({
      where: { id },
      data: parsed.data,
    });

    return Response.json({ data: tracker });
  } catch (error) {
    console.error("[api:tracker] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/trackers/:id
 * Delete a tracker and all its entries (cascade via Prisma delete).
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    // Verify ownership first — delete (not deleteMany) triggers Prisma cascade on MongoDB
    const existing = await prisma.tracker.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true },
    });

    if (!existing) {
      return Response.json({ error: "Tracker not found" }, { status: 404 });
    }

    await prisma.tracker.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[api:tracker] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
