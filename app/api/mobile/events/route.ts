import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const singleId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentMonth = now.getMonth() + 1;

    const myAttendances = member
      ? await db.attendanceRecord.findMany({
          where: { memberId: member.id, eventId: { not: null } },
          select: { eventId: true },
        })
      : [];
    const checkedInIds = new Set(myAttendances.map((a) => a.eventId));

    const formatEvent = (e: any) => {
      let slides: string[] = [];
      if (e.presentationSlides) {
        try {
          const parsed = typeof e.presentationSlides === "string" ? JSON.parse(e.presentationSlides) : e.presentationSlides;
          if (Array.isArray(parsed)) {
            slides = parsed.map((s: string) =>
              s.startsWith("http") ? s : `https://connect.houseofgrace.ph/uploads/presentations/${s}`
            );
          }
        } catch {}
      }
      return {
        id: e.id,
        title: e.title,
        description: e.description || "",
        commentary: e.commentary || null,
        eventDate: e.eventDate ? new Date(e.eventDate).toISOString() : null,
        startTime: e.startTime ? new Date(e.startTime).toISOString() : null,
        endTime: e.endTime ? new Date(e.endTime).toISOString() : null,
        location: e.location || "House of Grace Fellowship",
        eventType: e.eventType,
        status: e.status,
        speaker: e.speaker || null,
        attendeeCount: e._count?.attendance || 0,
        rsvpCount: e._count?.attendance || 0,
        isCheckedIn: checkedInIds.has(e.id),
        userRsvp: checkedInIds.has(e.id) ? "going" : null,
        coverPhoto: e.coverPhoto
          ? e.coverPhoto.startsWith("http")
            ? e.coverPhoto
            : `https://connect.houseofgrace.ph/uploads/events/${e.coverPhoto}`
          : null,
        presentationFile: e.presentationFile
          ? e.presentationFile.startsWith("http")
            ? e.presentationFile
            : `https://connect.houseofgrace.ph/uploads/presentations/${e.presentationFile}`
          : null,
        presentationOriginalName: e.presentationOriginalName || null,
        presentationSlides: slides,
        creator: e.creator
          ? `${e.creator.firstName} ${e.creator.lastName}`.trim()
          : "House of Grace Fellowship",
      };
    };

    if (singleId) {
      const ev = await db.event.findUnique({
        where: { id: singleId },
        include: {
          _count: { select: { attendance: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      });
      if (!ev) {
        return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { event: formatEvent(ev) },
      });
    }

    const [upcomingEvents, pastEvents, activeMembers, memberCount, ministryCount] =
      await Promise.all([
        db.event.findMany({
          where: {
            eventDate: { gte: now },
            status: { not: "cancelled" },
          },
          orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
          take: 40,
          include: {
            _count: { select: { attendance: true } },
            creator: { select: { firstName: true, lastName: true } },
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
          take: 40,
          include: {
            _count: { select: { attendance: true } },
            creator: { select: { firstName: true, lastName: true } },
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

    const mappedUpcoming = upcomingEvents.map(formatEvent);
    const mappedPast = pastEvents.map(formatEvent);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          memberCount,
          ministryCount,
          upcomingCount: mappedUpcoming.length,
        },
        events: [...mappedUpcoming, ...mappedPast],
        upcomingEvents: mappedUpcoming,
        pastEvents: mappedPast,
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
