import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id || !action || !["approve", "deny"].includes(action)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    // Retrieve the target request details
    const requestDetails = await db.memberMinistry.findUnique({
      where: { id: Number(id) },
      include: {
        member: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        ministry: {
          select: { id: true, name: true },
        },
      },
    });

    if (!requestDetails) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const { member, ministry } = requestDetails;

    if (action === "approve") {
      // 1. Update status to active
      await db.memberMinistry.update({
        where: { id: Number(id) },
        data: {
          status: "active",
          approvedById: parseInt(session.user.id),
          approvedAt: new Date(),
        },
      });

      // 2. Update member's flat ministryInvolvement string (legacy compat)
      const finalMemberMinistries = await db.memberMinistry.findMany({
        where: { memberId: member.id, status: { in: ["active", "pending"] } },
        select: { ministryId: true },
      });
      const ministryInvolvementStr = finalMemberMinistries.map(m => m.ministryId).join(",");

      await db.member.update({
        where: { id: member.id },
        data: { ministryInvolvement: ministryInvolvementStr },
      });

      // 3. Log the approval
      await db.appLog.create({
        data: {
          appSection: "Ministry Management",
          pageTitle: "Review Actions",
          actionType: "APPROVE_MINISTRY",
          description: `Ministry request approved for ${member.firstName} ${member.lastName} to join ${ministry.name} by ${session.user.firstName} ${session.user.lastName}`,
          performedById: parseInt(session.user.id),
          performedByName: `${session.user.firstName} ${session.user.lastName}`.trim(),
          performedByRole: session.user.role as any,
          targetType: "member_ministry_approval",
          targetId: Number(id),
          targetName: `${member.firstName} ${member.lastName} - ${ministry.name}`,
        },
      });

      // 4. Send welcoming/transactional SMS
      if (member.phone) {
        try {
          const { sendSms } = await import("@/lib/sms");
          const smsMessage = `Hi ${member.firstName}! Great news! 🥳\n\nYour request to join the ${ministry.name} ministry has been approved. Welcome to the team!\n\nWe're excited to serve together.\n\nGod bless!\n\n— Your HGF Family`;
          
          // Use dynamically routed HGFMinistry sender ID (since message contains the word "ministry")
          await sendSms(member.phone, smsMessage, member.id);
        } catch (smsErr) {
          console.error("Failed to send welcome SMS for ministry approval:", smsErr);
        }
      }
    } else if (action === "deny") {
      // 1. Delete pending request record
      await db.memberMinistry.delete({
        where: { id: Number(id) },
      });

      // 2. Update member's flat ministryInvolvement string (legacy compat)
      const finalMemberMinistries = await db.memberMinistry.findMany({
        where: { memberId: member.id, status: { in: ["active", "pending"] } },
        select: { ministryId: true },
      });
      const ministryInvolvementStr = finalMemberMinistries.map(m => m.ministryId).join(",");

      await db.member.update({
        where: { id: member.id },
        data: { ministryInvolvement: ministryInvolvementStr },
      });

      // 3. Log the rejection
      await db.appLog.create({
        data: {
          appSection: "Ministry Management",
          pageTitle: "Review Actions",
          actionType: "DENY_MINISTRY",
          description: `Ministry request denied for ${member.firstName} ${member.lastName} to join ${ministry.name} by ${session.user.firstName} ${session.user.lastName}`,
          performedById: parseInt(session.user.id),
          performedByName: `${session.user.firstName} ${session.user.lastName}`.trim(),
          performedByRole: session.user.role as any,
          targetType: "member_ministry_denial",
          targetId: Number(id),
          targetName: `${member.firstName} ${member.lastName} - ${ministry.name}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/ministries/review:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
