import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import MultimediaDashboardClient from "./MultimediaDashboardClient";

export const metadata: Metadata = { title: "Multimedia Dashboard — Admin" };

export default async function MultimediaAdminPage() {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher", "multimedia"].includes(session.user.role)) {
    redirect("/login");
  }

  // Get the nearest Sunday Service event (upcoming first, otherwise most recent)
  const now = new Date();
  let event = await db.event.findFirst({
    where: { eventType: "sunday_service", eventDate: { gte: now } },
    orderBy: { eventDate: "asc" },
    include: {
      sopTasks: {
        orderBy: { id: "asc" },
        include: {
          completedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      creator: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!event) {
    event = await db.event.findFirst({
      where: { eventType: "sunday_service" },
      orderBy: { eventDate: "desc" },
      include: {
        sopTasks: {
          orderBy: { id: "asc" },
          include: {
            completedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        creator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  // Get all members who are in the multimedia team
  const multimediaCrew = await db.member.findMany({
    where: { role: "multimedia" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
    },
  });

  // Serialize Date objects to JSON-friendly format
  const serializedEvent = event ? JSON.parse(JSON.stringify(event)) : null;
  const serializedCrew = JSON.parse(JSON.stringify(multimediaCrew));
  const serializedSession = JSON.parse(JSON.stringify(session));

  return (
    <MultimediaDashboardClient
      event={serializedEvent}
      crew={serializedCrew}
      session={serializedSession}
    />
  );
}
