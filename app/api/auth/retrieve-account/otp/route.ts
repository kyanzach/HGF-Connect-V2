import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

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

    // Generate 6-digit OTP code and set expiry to 30 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Priority 1: SMS (if member has phone number)
    if (member.phone && member.phone.trim()) {
      // Insert recovery code
      await db.accountRecoveryCode.create({
        data: {
          memberId: member.id,
          code,
          phone: member.phone,
          expiresAt,
        },
      });

      // Send SMS synchronously immediately using the central helper
      const smsMessage = `HGF Connect: Your recovery OTP is ${code}. Valid for 30 minutes.`;
      const smsResult = await sendSms(member.phone, smsMessage, member.id);

      if (!smsResult.success) {
        return NextResponse.json({ error: "Failed to send SMS OTP: " + smsResult.error }, { status: 500 });
      }

      // Mask phone for frontend display
      const cleanPhone = member.phone.trim();
      const maskedPhone = cleanPhone.length >= 7
        ? `${cleanPhone.slice(0, 4)}*******${cleanPhone.slice(-3)}`
        : cleanPhone;

      return NextResponse.json({
        success: true,
        method: "sms",
        maskedPhone,
        message: "Verification code sent to your registered phone."
      });
    }

    // Priority 2: Email (if member has email address)
    if (member.email && member.email.trim()) {
      // Insert recovery code (store empty string in required phone field)
      await db.accountRecoveryCode.create({
        data: {
          memberId: member.id,
          code,
          phone: "",
          expiresAt,
        },
      });

      // Send the email OTP
      const emailSubject = "HGF Connect: Account Recovery Verification";
      const plainText = `HGF Connect: Your recovery OTP is ${code}. Valid for 30 minutes.`;
      const htmlBody = `
        <div style="font-family: 'Outfit', 'Inter', sans-serif; padding: 2rem; background-color: #f8fafc; color: #1e293b; max-width: 500px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <span style="font-size: 2.5rem;">🤖</span>
            <h2 style="color: #0f172a; margin: 0.5rem 0 0; font-weight: 800; font-size: 1.25rem;">Grace AI Helper</h2>
            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Account Recovery Verification</p>
          </div>
          <div style="background-color: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #475569;">Use the following One-Time Password (OTP) to recover your account:</p>
            <div style="font-size: 2rem; font-weight: 800; letter-spacing: 0.5rem; color: #4EB1CB; margin: 1rem 0; font-family: monospace;">${code}</div>
            <p style="margin: 1rem 0 0 0; font-size: 0.8rem; color: #94a3b8;">This code is valid for <strong>30 minutes</strong> and can only be used once.</p>
          </div>
          <div style="text-align: center; margin-top: 1.5rem; font-size: 0.75rem; color: #94a3b8;">
            <p style="margin: 0;">If you did not request this, you can safely ignore this email.</p>
            <p style="margin: 0.25rem 0 0 0;">&copy; HGF Connect</p>
          </div>
        </div>
      `;

      const emailResult = await sendEmail({
        to: member.email,
        subject: emailSubject,
        text: plainText,
        html: htmlBody,
      });

      if (!emailResult.success) {
        return NextResponse.json({ error: "Failed to send email OTP: " + emailResult.error }, { status: 500 });
      }

      // Mask email for frontend display
      const cleanEmail = member.email.trim();
      const atIndex = cleanEmail.indexOf("@");
      const maskedEmail = atIndex > 1
        ? `${cleanEmail[0]}***${cleanEmail.slice(atIndex)}`
        : cleanEmail;

      return NextResponse.json({
        success: true,
        method: "email",
        maskedEmail,
        message: "Verification code sent to your registered email."
      });
    }

    // Priority 3: Neither (Direct bypass)
    return NextResponse.json({
      success: true,
      method: "none",
      message: "Profile verified directly. No verification code required."
    });
  } catch (err: any) {
    console.error("[retrieve-account/otp]", err?.message);
    return NextResponse.json({ error: "Failed to generate OTP." }, { status: 500 });
  }
}
