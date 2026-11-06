import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const [upcomingEvents, pastEvents, activeMembers, memberCount, ministryCount, myAttendances] =
      await Promise.all([
        db.event.findMany({
          where: { eventDate: { gte: now }, status: "scheduled" },
          orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
          take: 20,
          include: {
            _count: { select: { attendance: true } },
          },
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
          include: {
            _count: { select: { attendance: true } },
          },
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
        member
          ? db.attendanceRecord.findMany({
              where: { memberId: member.id, eventId: { not: null } },
              select: { eventId: true },
            })
          : Promise.resolve([]),
      ]);

    const checkedInIds = new Set(myAttendances.map((a) => a.eventId));

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
      commentary: e.commentary || null,
      eventDate: e.eventDate ? new Date(e.eventDate).toISOString() : null,
      startTime: e.startTime ? new Date(e.startTime).toISOString() : null,
      location: e.location || "House of Grace Fellowship",
      eventType: e.eventType,
      status: e.status,
      speaker: e.speaker || null,
      attendeeCount: e._count?.attendance || 0,
      isCheckedIn: checkedInIds.has(e.id),
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

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || member.status === "pending") {
      return NextResponse.json(
        { success: false, message: "Please sign in with an approved account to RSVP / Check In." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const eventId = Number(body?.eventId);
    if (!eventId) {
      return NextResponse.json({ success: false, message: "Invalid event ID" }, { status: 400 });
    }

    const existing = await db.attendanceRecord.findFirst({
      where: { eventId, memberId: member.id },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You are already checked in / RSVP'd for this event!",
        data: { isCheckedIn: true },
      });
    }

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, eventDate: true },
    });
    if (!event) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    await db.attendanceRecord.create({
      data: {
        eventId: event.id,
        memberId: member.id,
        attendanceDate: event.eventDate,
        attendanceTime: new Date(),
        recordedById: member.id,
        notes: "RSVP / Check-in via HGF Connect Mobile App",
      },
    });

    return NextResponse.json({
      success: true,
      message: "RSVP & Attendance recorded! See you at House of Grace.",
      data: { isCheckedIn: true },
    });
  } catch (err: any) {
    console.error("[api/mobile/events POST]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to record event RSVP" },
      { status: 500 }
    );
  }
}
