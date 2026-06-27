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

  // Get the start of today in Manila time (UTC+8) for safe date comparison
  const now = new Date();
  const manilaDateString = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const todayStart = new Date(`${manilaDateString}T00:00:00.000+08:00`);

  // Get upcoming and today's events (up to 10)
  let eventsList = await db.event.findMany({
    where: { eventDate: { gte: todayStart } },
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
    take: 10,
  });

  // If no upcoming events, fall back to the last 5 past events
  if (eventsList.length === 0) {
    eventsList = await db.event.findMany({
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
      take: 5,
    });
  }

  // Prioritize the event that has a sermon presentation uploaded as the default
  const defaultEvent = eventsList.find(e => e.presentationFile !== null) || eventsList[0] || null;

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

  // Get customize settings for signal patches and default SOP list
  const settingsList = await db.churchSetting.findMany({
    where: {
      key: {
        in: ["multimedia_patch_soundboard", "multimedia_patch_switcher", "multimedia_sop_defaults"],
      },
    },
  });

  const settingsObj = settingsList.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  // Serialize Date objects to JSON-friendly format
  const serializedEvent = defaultEvent ? JSON.parse(JSON.stringify(defaultEvent)) : null;
  const serializedEventsList = JSON.parse(JSON.stringify(eventsList));
  const serializedCrew = JSON.parse(JSON.stringify(multimediaCrew));
  const serializedSession = JSON.parse(JSON.stringify(session));

  return (
    <MultimediaDashboardClient
      event={serializedEvent}
      upcomingEvents={serializedEventsList}
      crew={serializedCrew}
      session={serializedSession}
      customSettings={settingsObj}
    />
  );
}
