import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminEventsClient from "./AdminEventsClient";

export const metadata: Metadata = { title: "Events — Admin" };

export default async function AdminEventsPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) redirect("/login");

  const events = await db.event.findMany({
    orderBy: [{ eventDate: "desc" }],
    include: { creator: { select: { firstName: true, lastName: true } } },
  });

  return <AdminEventsClient events={events as any} />;
}
