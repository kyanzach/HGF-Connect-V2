import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayCount, weekCount, monthCount, totalMembers] = await Promise.all([
    db.attendanceRecord.count({ where: { attendanceDate: { gte: startOfToday } } }),
    db.attendanceRecord.count({ where: { attendanceDate: { gte: startOfWeek } } }),
    db.attendanceRecord.count({ where: { attendanceDate: { gte: startOfMonth } } }),
    db.member.count({ where: { status: "active" } }),
  ]);

  return NextResponse.json({ todayCount, weekCount, monthCount, totalMembers });
}
