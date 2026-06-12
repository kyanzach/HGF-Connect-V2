import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin" || role === "moderator" || role === "usher") return true;

  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;

  const pm = await db.memberMinistry.findFirst({
    where: { memberId, ministryId: 11, status: "active" }, // Quiz ministry
  });
  return !!pm;
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const events = await db.event.findMany({
      orderBy: { eventDate: "desc" },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventType: true,
        presentationFile: true,
        presentationSlides: true,
        speaker: true,
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(events)));
  } catch (error: any) {
    console.error("[api/quiz/admin/events]", error?.message);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
