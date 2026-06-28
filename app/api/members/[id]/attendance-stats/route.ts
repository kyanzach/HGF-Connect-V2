import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const memberId = parseInt(idStr);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const yearStr = searchParams.get("year");
  const yearNum = parseInt(yearStr || "") || new Date().getFullYear();

  // Find the member details first
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Define start/end boundary dates for the requested year in UTC
  const startDate = new Date(`${yearNum}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${yearNum}-12-31T23:59:59.999Z`);

  // Fetch all Sunday Service events for that year
  const services = await db.event.findMany({
    where: {
      eventType: { in: ["sunday_service", "grace_night", "special_event"] },
      status: { in: ["scheduled", "completed"] },
      eventDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { eventDate: "asc" },
    select: {
      id: true,
      title: true,
      eventDate: true,
      eventType: true,
      speaker: true,
    },
  });

  // Fetch member's attendance records for that year
  const attendance = await db.attendanceRecord.findMany({
    where: {
      memberId: memberId,
      attendanceDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      eventId: true,
      attendanceDate: true,
    },
  });

  const attendanceEventIds = new Set(attendance.map(a => a.eventId).filter(Boolean));

  // Merge events with member's attendance status
  const history = services.map(s => ({
    eventId: s.id,
    title: s.title,
    eventDate: s.eventDate.toISOString(),
    eventType: s.eventType,
    speaker: s.speaker || "Unknown Preacher",
    attended: attendanceEventIds.has(s.id),
  }));

  // Calculate speaker (preacher) correlation statistics
  const speakerStats: Record<string, { attended: number; total: number }> = {};
  history.forEach(item => {
    const speaker = (item.speaker || "Unknown Preacher").trim();
    if (!speakerStats[speaker]) {
      speakerStats[speaker] = { attended: 0, total: 0 };
    }
    speakerStats[speaker].total++;
    if (item.attended) {
      speakerStats[speaker].attended++;
    }
  });

  // Convert speaker stats to sorted array
  const speakers = Object.entries(speakerStats).map(([name, stat]) => ({
    name,
    attended: stat.attended,
    total: stat.total,
    rate: stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total); // Sort by most sermons preached

  const totalServices = history.length;
  const totalAttended = history.filter(h => h.attended).length;
  const attendanceRate = totalServices > 0 ? Math.round((totalAttended / totalServices) * 100) : 0;

  return NextResponse.json({
    member,
    year: yearNum,
    totalServices,
    totalAttended,
    attendanceRate,
    history,
    speakers,
  });
}
