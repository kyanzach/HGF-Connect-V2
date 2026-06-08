import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 400 });
    }

    const member = await db.member.findUnique({
      where: { id: Number(memberId) },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    if (!member.phone) {
      return NextResponse.json({ error: "Selected member profile has no mobile number." }, { status: 400 });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Insert recovery code
    await db.accountRecoveryCode.create({
      data: {
        memberId: member.id,
        code,
        phone: member.phone,
        expiresAt,
      },
    });

    // Create custom SMS batch to send the OTP
    const smsMessage = `HGF Connect: Your recovery OTP is ${code}. Valid for 10 minutes.`;

    await db.customSmsBatch.create({
      data: {
        source: "account_recovery",
        status: "pending",
        priority: "high",
        createdById: member.id,
        recipients: {
          create: {
            memberId: member.id,
            phoneNumber: member.phone,
            personalizedMessage: smsMessage,
            sendStatus: "pending",
          },
        },
      },
    });

    return NextResponse.json({ success: true, message: "Verification code sent to your phone." });
  } catch (err: any) {
    console.error("[retrieve-account/otp]", err?.message);
    return NextResponse.json({ error: "Failed to generate OTP." }, { status: 500 });
  }
}
