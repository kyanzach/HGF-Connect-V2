import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const event = await db.event.findUnique({
    where: { id },
    include: {
      creator: { select: { firstName: true, lastName: true } },
      _count: { select: { attendance: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const body = await request.json();
  const {
    title,
    description,
    eventDate,
    startTime,
    endTime,
    location,
    eventType,
    status,
    coverPhoto,
    presentationFile,
    presentationOriginalName,
    presentationSlides,
    speaker,
    commentary,
  } = body;

  const updated = await db.event.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(eventDate && { eventDate: new Date(eventDate) }),
      ...(startTime && { startTime: new Date(`1970-01-01T${startTime}Z`) }),
      ...(endTime !== undefined && { endTime: endTime ? new Date(`1970-01-01T${endTime}Z`) : null }),
      ...(location !== undefined && { location }),
      ...(eventType && { eventType }),
      ...(status && { status }),
      ...(coverPhoto !== undefined && { coverPhoto: coverPhoto || null }),
      ...(presentationFile !== undefined && { presentationFile }),
      ...(presentationOriginalName !== undefined && { presentationOriginalName }),
      ...(presentationSlides !== undefined && { presentationSlides }),
      ...(speaker !== undefined && { speaker: speaker || null }),
      ...(commentary !== undefined && { commentary: commentary || null }),
    },
  });
  return NextResponse.json({ success: true, event: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  try {
    // Clean up any linked feed posts referencing this event ID
    await db.post.deleteMany({
      where: {
        type: "EVENT",
        content: {
          contains: `[event:${id}]`,
        },
      },
    });
  } catch (postDelErr) {
    console.error("Failed to delete linked event posts:", postDelErr);
  }

  await db.event.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
