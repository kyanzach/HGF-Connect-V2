import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";

export const metadata = { title: "Notifications — HGF Connect" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const memberId = parseInt(session.user.id);

  const notifications = await (db as any).notification.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });

  // Mark all as read when page is opened
  await (db as any).notification.updateMany({
    where: { memberId, isRead: false },
    data: { isRead: true },
  });

  return <NotificationsClient notifications={notifications} />;
}
