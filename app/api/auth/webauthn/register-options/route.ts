import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateRegistrationOptions } from "@simplewebauthn/server";

const RP_NAME = "HGF Connect";
const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost"; // bare domain, no protocol

function b64ToBuffer(b64url: string): Buffer {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  return Buffer.from(b64 + pad, "base64");
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id);

  // Get existing credentials to exclude them
  const existingCredentials = await db.webauthnCredential.findMany({
    where: { memberId },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: String(memberId),
    userName: session.user.email ?? session.user.username ?? String(memberId),
    userDisplayName: `${session.user.firstName ?? ""} ${session.user.name ?? ""}`.trim(),
    excludeCredentials: existingCredentials.map((c) => ({
      id: b64ToBuffer(c.credentialId),
      type: "public-key" as const,
      transports: c.transports ? JSON.parse(c.transports) : [],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required", // guide §2.12: enforce biometric, not just tap
      authenticatorAttachment: "platform",
    },
  });

  // Store challenge in session via a short-lived DB record (use member's row)
  await db.member.update({
    where: { id: memberId },
    data: { webauthnChallenge: options.challenge },
  });

  return NextResponse.json(options);
}
