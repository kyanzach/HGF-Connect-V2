import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const memberId = parseInt(session.user.id);
  const member = await (db as any).member.findUnique({
    where: { id: memberId },
    select: { password: true },
  });

  if (!member) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  // If account has an existing password, require current password
  if (member.password) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, member.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await (db as any).member.update({
    where: { id: memberId },
    data: { password: hashed },
  });

  return NextResponse.json({ ok: true });
}
