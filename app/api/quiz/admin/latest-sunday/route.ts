import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin") return true;

  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;

  const pm = await db.memberMinistry.findFirst({
    where: { memberId, ministryId: 11, status: "active" },
  });
  return !!pm;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const boundaryDate = dateStr ? new Date(dateStr) : new Date();

    const latestSunday = await db.event.findFirst({
      where: {
        eventType: "sunday_service",
        eventDate: {
          lte: boundaryDate,
        },
      },
      orderBy: {
        eventDate: "desc",
      },
    });

    if (!latestSunday) {
      return NextResponse.json({ message: "No past Sunday Service events found" });
    }

    return NextResponse.json(JSON.parse(JSON.stringify(latestSunday)));
  } catch (error: any) {
    console.error("[api/quiz/admin/latest-sunday]", error?.message);
    return NextResponse.json({ error: "Failed to fetch latest Sunday Service event" }, { status: 500 });
  }
}
