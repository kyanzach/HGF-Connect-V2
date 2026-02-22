import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";

function b64ToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(b64 + pad, "base64");
}

// POST /api/auth/webauthn/login-options
// Body: { username: string }
export async function POST(req: Request) {
  const { username } = await req.json();

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
