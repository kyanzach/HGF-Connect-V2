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
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const body = await request.json();
  const { title, description, eventDate, startTime, endTime, location, eventType, status, coverPhoto } = body;

  const updated = await db.event.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(eventDate && { eventDate: new Date(eventDate) }),
      ...(startTime && { startTime: new Date(`1970-01-01T${startTime}`) }),
      ...(endTime !== undefined && { endTime: endTime ? new Date(`1970-01-01T${endTime}`) : null }),
      ...(location !== undefined && { location }),
      ...(eventType && { eventType }),
      ...(status && { status }),
      ...(coverPhoto !== undefined && { coverPhoto: coverPhoto || null }),
    },
  });
  return NextResponse.json({ success: true, event: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: idStr } = await params;
  await db.event.delete({ where: { id: parseInt(idStr) } });
  return NextResponse.json({ success: true });
}
