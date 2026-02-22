import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/auth/webauthn/has-credentials
// Returns whether the current user (or a given username) has registered biometric credentials
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  // If username provided, check for that user (used on login page before signing in)
  if (username) {
    const member = await db.member.findFirst({
      where: { OR: [{ username }, { email: username }], status: "active" },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ hasCredentials: false });

    const count = await db.webauthnCredential.count({ where: { memberId: member.id } });
    return NextResponse.json({ hasCredentials: count > 0 });
  }

  // Otherwise check the current session user
  const session = await auth();
  if (!session?.user) return NextResponse.json({ hasCredentials: false });

  const count = await db.webauthnCredential.count({
    where: { memberId: parseInt(session.user.id) },
  });

  return NextResponse.json({ hasCredentials: count > 0 });
}
