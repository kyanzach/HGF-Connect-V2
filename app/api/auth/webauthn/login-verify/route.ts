import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
// Import the shared challenge store from login-options
import { passkeyChallengStore } from "@/app/api/auth/webauthn/login-options/route";

const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

/**
 * POST /api/auth/webauthn/login-verify
 *
 * Two modes:
 *
 *   Usernameless (passkey): body has sessionToken, no memberId
 *     → look up challenge from passkeyChallengStore
 *     → look up credential by credential.id → identify memberId from there
 *     → verify → return { verified, memberId }
 *
 *   Username-first (legacy): body has memberId
 *     → existing flow unchanged
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { memberId: bodyMemberId, sessionToken, ...assertionResponse } = body;

  const credentialId = assertionResponse.id ?? assertionResponse.rawId;

  // ── USERNAMELESS (passkey) mode ─────────────────────────────────────────────
  if (sessionToken && !bodyMemberId) {
    const entry = passkeyChallengStore.get(sessionToken);
    if (!entry || entry.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Challenge expired. Please try again." }, { status: 400 });
    }

    // Look up credential by ID — this tells us who the user is
    const credential = await (db as any).webauthnCredential.findUnique({
      where: { credentialId },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found on this device" }, { status: 404 });
    }

    const memberId = credential.memberId;

    try {
      const verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: entry.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
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

      // Update counter + clean up challenge
      await (db as any).webauthnCredential.update({
        where: { id: credential.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });
      passkeyChallengStore.delete(sessionToken);

      return NextResponse.json({ verified: true, memberId });
    } catch (err) {
      console.error("[WebAuthn passkey verify error]", err);
      return NextResponse.json({ error: "Auth error" }, { status: 500 });
    }
  }

  // ── USERNAME-FIRST (legacy) mode ────────────────────────────────────────────
  const memberId = bodyMemberId;
  if (!memberId) return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

  const member = await (db as any).member.findUnique({
    where: { id: memberId },
    select: { id: true, webauthnChallenge: true },
  });

  if (!member?.webauthnChallenge) {
    return NextResponse.json({ error: "No challenge. Please restart." }, { status: 400 });
  }

  const credential = await (db as any).webauthnCredential.findUnique({
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

    await (db as any).webauthnCredential.update({
      where: { id: credential.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    await (db as any).member.update({ where: { id: memberId }, data: { webauthnChallenge: null } });

    return NextResponse.json({ verified: true, memberId });
  } catch (err) {
    console.error("WebAuthn login-verify error:", err);
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }
}
