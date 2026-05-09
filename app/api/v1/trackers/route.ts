import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { validateApiToken, unauthorizedResponse } from "@/lib/api/auth";
import { TrackerStatus, TrackerType } from "@/app/generated/prisma";

const TrackerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .max(200, "Description cannot exceed 200 characters")
    .optional()
    .nullable(),
  type: z.nativeEnum(TrackerType),
  tags: z.array(z.string()).optional().default([]),
  color: z
    .string()
    .regex(/^#([0-9A-F]{3}){1,2}$/i, "Invalid color format")
    .optional()
    .nullable(),
  icon: z.string().optional().nullable(),
});

/**
 * GET /api/v1/trackers
 * List all trackers for the authenticated user.
 * Query params: status, type, search, sort, page, limit
 */
export async function GET(request: Request) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);

    const where: Record<string, unknown> = { userId: auth.userId };

    const status = searchParams.get("status");
    if (status && Object.values(TrackerStatus).includes(status as TrackerStatus)) {
      where.status = status as TrackerStatus;
    }

    const type = searchParams.get("type");
    if (type && Object.values(TrackerType).includes(type as TrackerType)) {
      where.type = type as TrackerType;
    }

    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortParam = searchParams.get("sort");
    let orderBy: Record<string, string> = { updatedAt: "desc" };
    if (sortParam === "name") orderBy = { name: "asc" };
    else if (sortParam === "created") orderBy = { createdAt: "desc" };

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const skip = (page - 1) * limit;

    const [total, trackers] = await Promise.all([
      prisma.tracker.count({ where }),
      prisma.tracker.findMany({ where, orderBy, skip, take: limit }),
    ]);

    return Response.json({
      data: trackers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[api:trackers] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/v1/trackers
 * Create a new tracker.
 */
export async function POST(request: Request) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) return unauthorizedResponse();

    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[api:trackers] Operation failed:", error);
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = TrackerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const tracker = await prisma.tracker.create({
      data: {
        ...parsed.data,
        status: TrackerStatus.INACTIVE,
        userId: auth.userId,
      },
    });

    return Response.json({ data: tracker }, { status: 201 });
  } catch (error) {
    console.error("[api:trackers] Operation failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
