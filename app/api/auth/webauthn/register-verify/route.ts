import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

const RP_ID = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL).hostname
  : "localhost";
const ORIGIN = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id);
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { webauthnChallenge: true },
  });

  if (!member?.webauthnChallenge) {
    return NextResponse.json({ error: "No challenge found. Please restart enrollment." }, { status: 400 });
  }

  const body = await req.json();

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: member.webauthnChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: "Verification failed" }, { status: 400 });
    }

    const info = verification.registrationInfo;
    // Save the credential using v9 registrationInfo shape
    await db.webauthnCredential.create({
      data: {
        memberId,
        credentialId: Buffer.from(info.credentialID).toString("base64url"),
        publicKey: Buffer.from(info.credentialPublicKey).toString("base64"),
        counter: BigInt(info.counter),
        deviceName: body.deviceName ?? "My Device",
        transports: JSON.stringify(body.response?.transports ?? []),
      },
    });

    // Clear challenge
    await db.member.update({ where: { id: memberId }, data: { webauthnChallenge: null } });

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("WebAuthn register-verify error:", err);
    return NextResponse.json({ error: "Verification error" }, { status: 500 });
  }
}
