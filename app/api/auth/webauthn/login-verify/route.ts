import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

// POST /api/auth/webauthn/login-verify
export async function POST(req: Request) {
  const body = await req.json();
  const { memberId, ...assertionResponse } = body;

  if (!memberId) return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { id: true, webauthnChallenge: true },
  });

  if (!member?.webauthnChallenge) {
    return NextResponse.json({ error: "No challenge. Please restart." }, { status: 400 });
  }

  // Find the matching credential by base64url ID from the assertion
  const credentialId = assertionResponse.id ?? assertionResponse.rawId;
  const credential = await db.webauthnCredential.findUnique({
    where: { credentialId },
  });

  if (!credential || credential.memberId !== memberId) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: member.webauthnChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      // v9 uses `authenticator` not `credential`
      authenticator: {
        credentialID: Buffer.from(credential.credentialId, "base64url"),
        credentialPublicKey: Buffer.from(credential.publicKey, "base64"),
        counter: Number(credential.counter),
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // Update counter
    await db.webauthnCredential.update({
      where: { id: credential.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    // Clear challenge
    await db.member.update({ where: { id: memberId }, data: { webauthnChallenge: null } });

    return NextResponse.json({ verified: true, memberId });
  } catch (err) {
    console.error("WebAuthn login-verify error:", err);
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }
}
