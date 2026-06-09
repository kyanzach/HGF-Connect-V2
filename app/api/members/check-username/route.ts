import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase() || "";

  if (!username) {
    return NextResponse.json({ available: false, error: "Username is required." });
  }

  if (username.length < 4) {
    return NextResponse.json({ available: false, error: "Username must be at least 4 characters long." });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return NextResponse.json({ available: false, error: "Username can only contain letters, numbers, underscores, and hyphens." });
  }

  const currentUserId = parseInt(session.user.id);
  const existing = await db.member.findFirst({
    where: {
      username: username,
      id: { not: currentUserId },
    },
  });

  return NextResponse.json({ available: !existing });
}
