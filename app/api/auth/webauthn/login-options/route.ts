import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "crypto";

const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";

// In-memory challenge store for usernameless (passkey) flow.
// Keyed by a random sessionToken returned alongside the options.
// Entries expire after 5 minutes to prevent memory growth.
const passkeyChallengStore = new Map<string, { challenge: string; expiresAt: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of passkeyChallengStore) {
    if (val.expiresAt < now) passkeyChallengStore.delete(key);
  }
}, 60_000);

function b64ToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(b64 + pad, "base64");
}

/**
 * POST /api/auth/webauthn/login-options
 *
 * Two modes:
 *   Usernameless (passkey): body = {} or { username: "" }
 *     → allowCredentials: [] — device discovers its own credentials
 *     → challenge stored in passkeyChallengStore with a sessionToken
 *     → returns { ...options, sessionToken }
 *
 *   Username-first (legacy): body = { username: "someuser" }
 *     → allowCredentials filled from DB for that user
 *     → challenge stored on member.webauthnChallenge
 *     → returns { ...options, memberId }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { username } = body as { username?: string };

  // ── USERNAMELESS (passkey) mode ─────────────────────────────────────────────
  if (!username?.trim()) {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: "required",
      allowCredentials: [], // empty = device auto-discovers resident credentials
    });

    const sessionToken = randomBytes(24).toString("hex");
    passkeyChallengStore.set(sessionToken, {
      challenge: options.challenge,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
    });

    return NextResponse.json({ ...options, sessionToken });
  }

  // ── USERNAME-FIRST (legacy) mode ────────────────────────────────────────────
  const member = await db.member.findFirst({
    where: { OR: [{ username }, { email: username }], status: "active" },
    select: { id: true },
  });

  if (!member) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const credentials = await db.webauthnCredential.findMany({
    where: { memberId: member.id },
    select: { credentialId: true, transports: true },
  });

  if (credentials.length === 0) {
    return NextResponse.json({ error: "No biometric credentials registered" }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: credentials.map((c) => ({
      id: b64ToBuffer(c.credentialId),
      type: "public-key" as const,
      transports: c.transports ? JSON.parse(c.transports) : [],
    })),
  });

  await db.member.update({ where: { id: member.id }, data: { webauthnChallenge: options.challenge } });

  return NextResponse.json({ ...options, memberId: member.id });
}

// Export store so login-verify can access it (same Node.js module instance)
export { passkeyChallengStore };
