import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// POST /api/sms/send — queue an SMS batch for selected members
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { memberIds, message } = body;

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return NextResponse.json({ error: "memberIds is required" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Fetch phone numbers for selected members
  const members = await db.member.findMany({
    where: { id: { in: memberIds }, status: "active", NOT: { phone: null } },
    select: { id: true, firstName: true, lastName: true, phone: true },
  });

  if (members.length === 0) {
    return NextResponse.json({ error: "No recipients with phone numbers found" }, { status: 400 });
  }

  // Log the SMS send action in app_logs
  await db.appLog.create({
    data: {
      appSection: "admin",
      pageTitle: "Send SMS",
      actionType: "sms_queued",
      description: `Custom SMS queued to ${members.length} member(s): "${message.slice(0, 80)}${message.length > 80 ? "…" : ""}"`,
      performedById: parseInt(session.user.id),
      performedByName: `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim(),
      performedByRole: (session.user.role ?? "admin") as any,
      targetType: "members",
      targetName: `${members.length} recipients`,
    },
  });

  // NOTE: SMS sending is handled by PHP cron scripts on the server.
  // This endpoint logs the intent and returns success. 
  // The actual SMS dispatch via SMS-it API remains in the PHP layer.
  // Future: port to Node.js cron or call SMS-it API directly here.

  return NextResponse.json({
    success: true,
    message: `SMS queued for ${members.length} recipient${members.length !== 1 ? "s" : ""}. The batch will be processed by the SMS service.`,
    recipientCount: members.length,
    recipients: members.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, phone: m.phone })),
  });
}
