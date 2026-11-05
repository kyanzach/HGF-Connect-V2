import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const [upcomingEvents, pastEvents, activeMembers, memberCount, ministryCount] = await Promise.all([
      db.event.findMany({
        where: { eventDate: { gte: now }, status: "scheduled" },
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
        take: 20,
      }),
      db.event.findMany({
        where: {
          OR: [
            { eventDate: { lt: now } },
            { status: { in: ["completed", "cancelled"] } },
          ],
        },
        orderBy: [{ eventDate: "desc" }],
        take: 15,
      }),
      db.member.findMany({
        where: {
          status: { in: ["active", "approved"] },
          birthdate: { not: null },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          birthdate: true,
        },
      }),
      db.member.count({ where: { status: { notIn: ["pending", "archived"] } } }),
      db.ministry.count({ where: { status: "active" } }),
    ]);

    const celebrants = activeMembers
      .filter((m) => {
        if (!m.birthdate) return false;
        const mMonth = new Date(m.birthdate).getUTCMonth() + 1;
        return mMonth === currentMonth;
      })
      .map((m) => {
        const bDate = new Date(m.birthdate!);
        return {
          id: m.id,
          name: `${m.firstName} ${m.lastName}`.trim(),
          birthDay: bDate.getUTCDate(),
          birthMonth: bDate.getUTCMonth() + 1,
          avatar: m.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
            : null,
        };
      })
      .sort((a, b) => a.birthDay - b.birthDay);

    const formatEvent = (e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description || "",
      eventDate: e.eventDate ? new Date(e.eventDate).toISOString() : null,
      startTime: e.startTime ? new Date(e.startTime).toISOString() : null,
      location: e.location || "House of Grace Fellowship",
      eventType: e.eventType,
      status: e.status,
      speaker: e.speaker || null,
      coverPhoto: e.coverPhoto
        ? `https://connect.houseofgrace.ph/uploads/events/${e.coverPhoto}`
        : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          memberCount,
          ministryCount,
          upcomingCount: upcomingEvents.length,
        },
        upcomingEvents: upcomingEvents.map(formatEvent),
        pastEvents: pastEvents.map(formatEvent),
        celebrants,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/events GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load events" }, { status: 500 });
  }
}
