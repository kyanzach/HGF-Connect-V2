import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/events — list events
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const upcoming = searchParams.get("upcoming") === "true";
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {};
  if (upcoming) where.eventDate = { gte: new Date() };
  if (type) where.eventType = type;

  const events = await db.event.findMany({
    where,
    orderBy: [{ eventDate: upcoming ? "asc" : "desc" }, { startTime: "asc" }],
    take: limit,
    include: { creator: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ events });
}

// POST /api/events — create event (admin/moderator only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, eventDate, startTime, endTime, location, eventType, coverPhoto } = body;

    if (!title || !eventDate || !startTime || !eventType) {
      return NextResponse.json(
        { error: "title, eventDate, startTime, and eventType are required" },
        { status: 400 }
      );
    }

    const event = await db.event.create({
      data: {
        title,
        description,
        eventDate: new Date(eventDate),
        startTime: new Date(`1970-01-01T${startTime}`),
        endTime: endTime ? new Date(`1970-01-01T${endTime}`) : null,
        location,
        coverPhoto: coverPhoto ?? null,
        eventType: eventType as any,
        createdBy: parseInt(session.user.id),
      },
    });

    // ── Auto-post to Community Feed so members see the new event ──────────
    try {
      const eventDateFormatted = new Date(eventDate).toLocaleDateString("en-PH", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      });

      const feedContent = [
        `📅 New Event: ${title}`,
        `🗓️ ${eventDateFormatted}`,
        `🕒 ${startTime}${endTime ? ` – ${endTime}` : ""}`,
        location ? `📍 ${location}` : null,
        description ? `\n${description}` : null,
        `\n[event:${event.id}]`,
      ].filter(Boolean).join("\n");

      await (db as any).post.create({
        data: {
          authorId: parseInt(session.user.id),
          type: "EVENT",
          content: feedContent,
          imageUrl: coverPhoto ? `uploads/events/${coverPhoto}` : null,
          visibility: "MEMBERS_ONLY",
        },
      });
    } catch (postError) {
      console.error("Auto-post creation failed:", postError);
      // We don't fail the whole request if only the social post fails
    }

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/events:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
