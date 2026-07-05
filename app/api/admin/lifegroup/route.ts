import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check admin role
  const member = await db.member.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { role: true },
  });
  if (!member || !["admin", "moderator", "usher"].includes(member.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registrations = await db.lifeGroupRegistration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      assignedLeader: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });

  // Fetch candidate leaders (pastors/moderators/admins)
  const leaders = await db.member.findMany({
    where: {
      role: { in: ["admin", "moderator"] },
      status: "approved"
    },
    select: {
      id: true,
      firstName: true,
      lastName: true
    },
    orderBy: { firstName: "asc" }
  });

  return NextResponse.json({ registrations, leaders });
}
