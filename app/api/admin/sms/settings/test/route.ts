import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sms/settings/test
 * Sends a test birthday SMS to the logged-in admin's phone number.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { template, verse } = body;

    const admin = await db.member.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });

    if (!admin || !admin.phone) {
      return NextResponse.json({ error: "Your account does not have a valid mobile phone number registered." }, { status: 400 });
    }

    const testVerseText = verse?.text || "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.";
    const testVerseRef = verse?.ref || "Numbers 6:24-25";

    let message = template || "Happy Birthday, {firstName}! 🎉 {verseText} ({verseRef})";
    message = message
      .replace(/{firstName}/g, admin.firstName)
      .replace(/{lastName}/g, admin.lastName)
      .replace(/{verseText}/g, testVerseText)
      .replace(/{verseRef}/g, testVerseRef);

    const result = await sendSms(admin.phone, `[TEST PREVIEW]\n${message}`, admin.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send test SMS" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recipient: admin.phone,
      preview: message,
    });
  } catch (err: any) {
    console.error("[api/admin/sms/settings/test]", err?.message);
    return NextResponse.json({ error: err.message || "Failed to send test SMS" }, { status: 500 });
  }
}
