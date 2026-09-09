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

  const [rawSmsLogs, rawAppLogs, adminMember] = await Promise.all([
    db.smsLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 300,
      include: {
        member: {
          select: { firstName: true, lastName: true, phone: true },
        },
        reminder: {
          select: { reminderType: true, event: { select: { title: true } } },
        },
      },
    }),
    db.appLog.findMany({
      where: {
        actionType: { in: ["sms_sent", "sms_failed", "sms_queued", "SMS_SENT", "SMS_FAILED", "sms_settings_updated"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.member.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { phone: true },
    }),
  ]);

  const smsLogsFormatted = rawSmsLogs.map((log) => {
    const memberName = log.member
      ? `${log.member.firstName} ${log.member.lastName}`.trim()
      : null;
    const target = memberName ? `${memberName} (${log.phoneNumber})` : log.phoneNumber;
    const performedBy = log.reminder?.event
      ? `Event: ${log.reminder.event.title}`
      : "System / Direct Gateway";

    return {
      id: log.id,
      actionType: log.status.toLowerCase() === "sent" ? "sms_sent" : "sms_failed",
      description: log.errorMessage ? `[Error: ${log.errorMessage}] ${log.message}` : log.message,
      performedByName: performedBy,
      targetName: target,
      createdAt: log.sentAt.toISOString(),
    };
  });

  const appLogsFormatted = rawAppLogs.map((log) => ({
    id: 1000000 + log.id,
    actionType: log.actionType,
    description: log.description,
    performedByName: log.performedByName,
    targetName: log.targetName,
    createdAt: log.createdAt.toISOString(),
  }));

  const allLogs = [...smsLogsFormatted, ...appLogsFormatted].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AdminSmsHubClient
      initialLogs={JSON.parse(JSON.stringify(allLogs))}
      currentAdminPhone={adminMember?.phone || null}
    />
  );
}

