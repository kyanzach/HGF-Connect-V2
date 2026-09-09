import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const memberIdStr = searchParams.get("memberId");
  const logIdStr = searchParams.get("logId");

  if (!memberIdStr && !logIdStr) {
    return NextResponse.json({ error: "Missing memberId or logId" }, { status: 400 });
  }

  try {
    let memberId = memberIdStr ? parseInt(memberIdStr, 10) : null;
    let targetLog: any = null;

    if (logIdStr) {
      targetLog = await db.smsLog.findUnique({
        where: { id: parseInt(logIdStr, 10) },
        include: {
          member: true,
          reminder: {
            include: { event: true },
          },
        },
      });
      if (targetLog && !memberId) {
        memberId = targetLog.memberId;
      }
    }

    if (!memberId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const member = await db.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        type: true,
        status: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // 1. Lifetime SMS counts for this member
    const [totalSmsCount, totalSentCount, totalFailedCount] = await Promise.all([
      db.smsLog.count({ where: { memberId } }),
      db.smsLog.count({ where: { memberId, status: "Sent" } }),
      db.smsLog.count({ where: { memberId, status: "Failed" } }),
    ]);

    // 2. Lifetime Attendance records
    const attendanceRecords = await db.attendanceRecord.findMany({
      where: { memberId },
      orderBy: { createdAt: "desc" },
      include: {
        event: {
          select: { id: true, title: true, eventDate: true, startTime: true, eventType: true },
        },
      },
      take: 20,
    });

    const totalAttendance = await db.attendanceRecord.count({ where: { memberId } });

    // 3. Find all event reminder logs sent to this member to compute conversion rate
    // We look for SMS logs with a reminder relation or messages containing event quotes
    const reminderLogs = await db.smsLog.findMany({
      where: {
        memberId,
        status: "Sent",
      },
      include: {
        reminder: {
          include: { event: true },
        },
      },
      orderBy: { sentAt: "desc" },
      take: 100,
    });

    // Extract unique events that this member was reminded of
    const allEvents = await db.event.findMany({
      where: { status: { in: ["scheduled", "completed"] } },
      select: { id: true, title: true, eventDate: true },
      orderBy: { eventDate: "desc" },
      take: 50,
    });

    const remindedEventIds = new Set<number>();
    const remindedEventMap = new Map<number, { id: number; title: string; eventDate: Date }>();

    for (const log of reminderLogs) {
      if (log.reminder?.event) {
        remindedEventIds.add(log.reminder.event.id);
        remindedEventMap.set(log.reminder.event.id, log.reminder.event);
      } else if (log.message) {
        // Check if message quotes any known event title
        const matched = allEvents.find((e) => log.message.includes(e.title));
        if (matched) {
          remindedEventIds.add(matched.id);
          remindedEventMap.set(matched.id, matched);
        }
      }
    }

    // For each reminded event, check if member attended
    let attendedRemindedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pastRemindedCount = 0;

    for (const [eventId, ev] of Array.from(remindedEventMap.entries())) {
      const evDate = new Date(ev.eventDate);
      evDate.setHours(0, 0, 0, 0);

      // Only count past events for the strict conversion ratio (exclude future/today events)
      if (evDate < today) {
        pastRemindedCount++;
        const attended = attendanceRecords.some((ar) => {
          if (ar.eventId === eventId) return true;
          if (ar.attendanceDate) {
            const aDate = new Date(ar.attendanceDate);
            aDate.setHours(0, 0, 0, 0);
            return aDate.getTime() === evDate.getTime();
          }
          return false;
        });
        if (attended) {
          attendedRemindedCount++;
        }
      }
    }

    const conversionRatePercent = pastRemindedCount > 0
      ? Math.round((attendedRemindedCount / pastRemindedCount) * 100)
      : (totalAttendance > 0 ? 100 : 0);

    // 4. Target Event check-in status (if targetLog belongs to an event)
    let thisEventAttendance: any = null;
    let targetEvent: any = targetLog?.reminder?.event ?? null;

    if (!targetEvent && targetLog?.message) {
      targetEvent = allEvents.find((e) => targetLog.message.includes(e.title)) || null;
    }

    if (targetEvent) {
      const evDate = new Date(targetEvent.eventDate);
      evDate.setHours(0, 0, 0, 0);

      const matchingAttendance = attendanceRecords.find((ar) => {
        if (ar.eventId === targetEvent.id) return true;
        if (ar.attendanceDate) {
          const aDate = new Date(ar.attendanceDate);
          aDate.setHours(0, 0, 0, 0);
          return aDate.getTime() === evDate.getTime();
        }
        return false;
      });

      let checkInTimeFormatted: string | null = null;
      if (matchingAttendance) {
        const timeObj = matchingAttendance.attendanceTime || matchingAttendance.createdAt;
        if (timeObj) {
          checkInTimeFormatted = new Date(timeObj).toLocaleTimeString("en-PH", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: "Asia/Manila",
          });
        }
      }

      const isFutureOrToday = evDate >= today;

      thisEventAttendance = {
        hasEvent: true,
        eventId: targetEvent.id,
        eventTitle: targetEvent.title,
        eventDate: targetEvent.eventDate.toISOString(),
        attended: !!matchingAttendance,
        checkInTime: checkInTimeFormatted,
        isFutureOrToday,
      };
    }

    // 5. Recent attendance formatting
    const recentAttendance = attendanceRecords.slice(0, 5).map((ar) => {
      const timeObj = ar.attendanceTime || ar.createdAt;
      return {
        id: ar.id,
        eventTitle: ar.event?.title ?? "Gathering / Service",
        date: ar.attendanceDate ? ar.attendanceDate.toISOString() : ar.createdAt.toISOString(),
        time: timeObj
          ? new Date(timeObj).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })
          : null,
        isFirstVisit: ar.isFirstVisit,
        notes: ar.notes,
      };
    });

    const payload = {
      member,
      totalSmsReceived: totalSmsCount,
      totalSmsSent: totalSentCount,
      totalSmsFailed: totalFailedCount,
      totalAttendance,
      firstAttendanceDate: attendanceRecords[attendanceRecords.length - 1]?.createdAt.toISOString() ?? null,
      latestAttendanceDate: attendanceRecords[0]?.createdAt.toISOString() ?? null,
      reminderConversion: {
        totalEventsReminded: pastRemindedCount,
        totalEventsAttended: attendedRemindedCount,
        conversionRatePercent,
      },
      thisEventAttendance,
      recentAttendance,
    };

    return NextResponse.json(JSON.parse(JSON.stringify(payload)));
  } catch (error: any) {
    console.error("GET /api/admin/sms/analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
