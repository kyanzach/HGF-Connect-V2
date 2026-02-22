import { Metadata } from "next";
import { db } from "@/lib/db";
import EventsClient from "./EventsClient";

export const metadata: Metadata = {
  title: "Events | HGF Connect",
  description:
    "Upcoming and past events at House of Grace Fellowship — Sunday services, prayer meetings, Bible studies, grace nights, and special events.",
  openGraph: {
    title: "HGF Events — House of Grace Fellowship",
    description: "Explore upcoming events at HGF Davao City.",
  },
};

export default async function EventsPage() {
  const now = new Date();

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
      // No take limit — fetch ALL past events for client-side pagination
      select: { id: true, title: true, description: true, eventDate: true, startTime: true, endTime: true, location: true, eventType: true, status: true },
    }),
  ]);

  return <EventsClient upcoming={upcoming as any} allPast={allPast as any} />;
}
