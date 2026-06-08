import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ChurchClient from "./ChurchClient";

export const dynamic = "force-dynamic";

export default async function ChurchPage() {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const now = new Date();

  // 1. Fetch all active members who have a birthday set
  const activeMembers = await db.member.findMany({
    where: {
      status: "active",
      birthdate: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
      coverPhoto: true,
      birthdate: true,
    },
  });

  // 2. Fetch upcoming and past events
  const [upcoming, allPast] = await Promise.all([
    db.event.findMany({
      where: { eventDate: { gte: now }, status: "scheduled" },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      select: { id: true, title: true, description: true, eventDate: true, startTime: true, endTime: true, location: true, eventType: true, status: true },
    }),
    db.event.findMany({
      where: {
        OR: [
          { eventDate: { lt: now } },
          { status: { in: ["completed", "cancelled"] } },
        ],
      },
      orderBy: [{ eventDate: "desc" }],
      select: { id: true, title: true, description: true, eventDate: true, startTime: true, endTime: true, location: true, eventType: true, status: true },
    }),
  ]);

  // Serialize Prisma objects to prevent next.js date boundary issues
  const serializedMembers = JSON.parse(JSON.stringify(activeMembers));
  const serializedUpcoming = JSON.parse(JSON.stringify(upcoming));
  const serializedPast = JSON.parse(JSON.stringify(allPast));

  return (
    <ChurchClient
      initialMembers={serializedMembers}
      upcomingEvents={serializedUpcoming}
      pastEvents={serializedPast}
    />
  );
}
