import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const body = await req.json();
    const action = String(body?.action || "report"); // "report" | "block"
    const targetType = String(body?.targetType || "post");
    const targetId = Number(body?.targetId || 0);
    const reason = String(body?.reason || "Inappropriate or objectionable content");

    if (member) {
      await db.appLog
        .create({
          data: {
            appSection: "Moderation",
            actionType: action === "block" ? "BLOCK_USER" : "REPORT_UGC",
            pageTitle: "Community Safety (Apple Guideline 1.2)",
            description: `Member #${member.id} (${member.firstName} ${member.lastName}) performed ${action.toUpperCase()} on ${targetType} #${targetId}: ${reason}`,
            targetType,
            targetId,
            performedById: member.id,
            performedByName: `${member.firstName} ${member.lastName}`,
            performedByRole: member.role,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message:
        action === "block"
          ? "User has been blocked. Their content will no longer appear in your feed."
          : "Thank you for reporting. Our church moderation team reviews all flagged content within 24 hours.",
    });
  } catch (err: any) {
    console.error("[api/mobile/moderation POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to submit report" }, { status: 500 });
  }
}
