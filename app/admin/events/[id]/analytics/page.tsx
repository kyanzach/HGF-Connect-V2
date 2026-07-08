import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import EventAnalyticsClient from "./EventAnalyticsClient";

export const metadata: Metadata = { title: "Event Attendance Analytics" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventAnalyticsPage({ params }: PageProps) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role)) {
    redirect("/login");
  }

  const { id } = await params;
  const eventId = parseInt(id);

  if (isNaN(eventId)) {
    notFound();
  }

  // 1. Fetch the event
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      creator: { select: { firstName: true, lastName: true } },
    },
  });

  if (!event) {
    notFound();
  }

  // 2. Fetch attendance records for this event
  const attendance = await db.attendanceRecord.findMany({
    where: { eventId },
    include: {
      member: true,
    },
  });

  // 3. Fetch all active/approved/inactive/guest members for comparison
  const members = await db.member.findMany({
    where: {
      status: { in: ["active", "inactive", "approved", "guest"] },
    },
    include: {
      attendance: {
        orderBy: { attendanceDate: "desc" },
        take: 12, // Retrieve past 12 attendances to calculate consecutive absences
      },
    },
  });

  // Serialize to JSON-compatible format for Client Component boundaries
  const serializedEvent = JSON.parse(JSON.stringify(event));
  const serializedAttendance = JSON.parse(JSON.stringify(attendance));
  const serializedMembers = JSON.parse(JSON.stringify(members));

  return (
    <EventAnalyticsClient
      event={serializedEvent}
      attendance={serializedAttendance}
      members={serializedMembers}
    />
  );
}
