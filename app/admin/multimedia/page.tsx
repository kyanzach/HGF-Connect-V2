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

  // Get the nearest event (upcoming/today first, otherwise most recent past)
  let event = await db.event.findFirst({
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
  });

  if (!event) {
    event = await db.event.findFirst({
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
  const serializedEvent = event ? JSON.parse(JSON.stringify(event)) : null;
  const serializedCrew = JSON.parse(JSON.stringify(multimediaCrew));
  const serializedSession = JSON.parse(JSON.stringify(session));

  return (
    <MultimediaDashboardClient
      event={serializedEvent}
      crew={serializedCrew}
      session={serializedSession}
      customSettings={settingsObj}
    />
  );
}
