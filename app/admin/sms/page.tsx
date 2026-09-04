import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminSmsHubClient from "./AdminSmsHubClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "SMS Hub & Verse Manager — Admin" };

export default async function AdminSmsPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) redirect("/login");

  const [allLogs, adminMember] = await Promise.all([
    db.appLog.findMany({
      where: { actionType: { in: ["sms_sent", "sms_failed", "sms_queued", "SMS_SENT", "SMS_FAILED", "sms_settings_updated"] } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.member.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { phone: true },
    }),
  ]);

  return (
    <AdminSmsHubClient
      initialLogs={JSON.parse(JSON.stringify(allLogs))}
      currentAdminPhone={adminMember?.phone || null}
    />
  );
}

