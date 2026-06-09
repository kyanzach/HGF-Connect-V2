import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generateUsername } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = ["admin", "moderator", "usher"].includes(session.user.role);
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);

  const member = await db.member.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, username: true }
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // 1. Generate username if missing
  let username = member.username;
  if (!username) {
    username = await generateUsername(member.firstName, member.lastName, db);
  }

  // 2. Generate temporary password: Grace + 5 random digits (e.g. Grace12345)
  const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
  const tempPassword = `Grace${randomDigits}`;

  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await db.member.update({
    where: { id },
    data: {
      password: hashedPassword,
      username,
    }
  });

  return NextResponse.json({
    success: true,
    username,
    password: tempPassword,
    name: `${member.firstName} ${member.lastName}`
  });
}
