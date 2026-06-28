import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = ["admin", "moderator", "usher"].includes(session.user.role);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") === "year" ? "year" : "month";
  
  const now = new Date();
  const yearStr = searchParams.get("year");
  const yearVal = parseInt(yearStr || "") || now.getFullYear();

  const monthStr = searchParams.get("month");
  // 1-indexed (1 = Jan, 12 = Dec)
  const monthVal = parseInt(monthStr || "") || (now.getMonth() + 1);

  if (mode === "month") {
    // 0-based month in JavaScript
    const startDate = new Date(Date.UTC(yearVal, monthVal - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(yearVal, monthVal, 0, 23, 59, 59, 999));

    const services = await db.event.findMany({
      orderBy: { eventDate: "asc" },
      where: {
        eventType: { in: ["sunday_service", "grace_night", "special_event"] },
        status: { in: ["scheduled", "completed"] },
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventType: true,
        speaker: true,
        attendance: {
          select: { id: true }
        }
      }
    });

    const trend = services.map(s => ({
      id: s.id,
      title: s.title,
      eventDate: s.eventDate.toISOString(),
      eventType: s.eventType,
      speaker: s.speaker || "Unknown Preacher",
      count: s.attendance.length,
    }));

    return NextResponse.json({
      mode,
      year: yearVal,
      month: monthVal,
      trend,
    });
  } else {
    // Year mode
    const startDate = new Date(Date.UTC(yearVal, 0, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(yearVal, 11, 31, 23, 59, 59, 999));

    const services = await db.event.findMany({
      orderBy: { eventDate: "asc" },
      where: {
        eventType: { in: ["sunday_service", "grace_night", "special_event"] },
        status: { in: ["scheduled", "completed"] },
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventType: true,
        speaker: true,
        attendance: {
          select: { id: true }
        }
      }
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      totalCount: 0,
      eventCount: 0,
      events: [] as Array<{
        id: number;
        title: string;
        eventDate: string;
        eventType: string;
        speaker: string;
        count: number;
      }>
    }));

    services.forEach(s => {
      const m = new Date(s.eventDate).getUTCMonth();
      const count = s.attendance.length;
      monthlyData[m].totalCount += count;
      monthlyData[m].eventCount++;
      monthlyData[m].events.push({
        id: s.id,
        title: s.title,
        eventDate: s.eventDate.toISOString(),
        eventType: s.eventType,
        speaker: s.speaker || "Unknown Preacher",
        count,
      });
    });

    const trend = monthlyData.map((d, i) => {
      const label = new Date(yearVal, i, 1).toLocaleDateString("en-US", { month: "short" });
      const avg = d.eventCount > 0 ? Math.round(d.totalCount / d.eventCount) : 0;
      return {
        id: i,
        title: `${label} Average Attendance (${d.eventCount} services)`,
        eventDate: new Date(Date.UTC(yearVal, i, 15)).toISOString(),
        count: avg,
        events: d.events,
      };
    });

    return NextResponse.json({
      mode,
      year: yearVal,
      month: monthVal,
      trend,
    });
  }
}
