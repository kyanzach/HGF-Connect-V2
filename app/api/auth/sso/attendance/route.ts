import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const memberId = parseInt(session.user.id, 10);
  const role = session.user.role;

  // Verify authorization (admin, moderator, or usher only)
  // Let's also check if user has usher status in ministries
  let hasAccess = role === "admin" || role === "moderator";

  if (!hasAccess) {
    // Check if user is in Usher ministry (id 1 or custom)
    // Or check if they have role === "usher" or any active usher ministry membership
    const usherMinistry = await db.memberMinistry.findFirst({
      where: {
        memberId,
        ministryId: 6, // 6 is typically usher/attendance ministry, but let's allow if role is usher
        status: "active",
      },
    });
    if (usherMinistry || role === "usher") {
      hasAccess = true;
    }
  }

  // Fallback: Check if they are simply designated as usher in their member record
  if (!hasAccess) {
    const member = await db.member.findUnique({
      where: { id: memberId },
      select: { role: true },
    });
    if (member && (member.role === "usher" || member.role === "admin" || member.role === "moderator")) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return new NextResponse("Forbidden: You do not have permissions to access the attendance app.", { status: 403 });
  }

  try {
    const token = randomUUID();
    // Expiration: 30 seconds
    const expiresAt = new Date(Date.now() + 30 * 1000);

    // Save SSO token in the database
    await db.ssoToken.create({
      data: {
        token,
        memberId,
        expiresAt,
      },
    });

    // Redirect directly to the legacy app's SSO bridge
    const redirectUrl = `https://app.houseofgrace.ph/attendance/sso.php?token=${token}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("[api/auth/sso/attendance] GET", error?.message);
    return new NextResponse("SSO initialization failed", { status: 500 });
  }
}
