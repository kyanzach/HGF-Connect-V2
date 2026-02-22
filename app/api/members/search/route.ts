import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (query.length < 2) {
    return NextResponse.json({ members: [] });
  }

  const session = await auth();
  const isStaff = session && ["admin", "moderator", "usher"].includes(session.user.role);

  const members = await db.member.findMany({
    where: {
      OR: [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
      ],
      status: isStaff ? undefined : "active",
    },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      type: true,
      username: true,
      profilePicture: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return NextResponse.json({ members });
}
