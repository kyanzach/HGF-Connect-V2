import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/attendance/record
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { memberId, eventId } = body;

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // Check first visit
  const existingCount = await db.attendanceRecord.count({
    where: { memberId: parseInt(memberId) },
  });
  const isFirstVisit = existingCount === 0;

  const record = await db.attendanceRecord.create({
    data: {
      memberId: parseInt(memberId),
      eventId: eventId ? parseInt(eventId) : null,
      attendanceDate: new Date(),
      attendanceTime: new Date(),
      recordedById: parseInt(session.user.id),
      isFirstVisit,
    },
  });

  // Audit log
  await db.appLog.create({
    data: {
      appSection: "Attendance App",
      pageTitle: "Record Attendance",
      actionType: "CREATE",
      description: `Attendance recorded for member ID ${memberId}`,
      targetType: "attendance_record",
      targetId: record.id,
      performedById: parseInt(session.user.id),
      performedByName: `${session.user.firstName} ${session.user.lastName}`,
      performedByRole: session.user.role,
    },
  });

  return NextResponse.json({ success: true, record, isFirstVisit });
}
