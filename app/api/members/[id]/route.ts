import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const session = await auth();
  const isAdmin = session && ["admin", "moderator"].includes(session.user.role);

  const member = await db.member.findUnique({
    where: { id },
    include: {
      ministries: {
        where: { status: "active" },
        include: { ministry: true },
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!isAdmin && member.status !== "active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(member);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  const body = await request.json();
  const isAdmin = ["admin", "moderator"].includes(session.user.role);
  const isSelf = session.user.id === String(id);

  if (!isAdmin && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: any = {};

  if (isAdmin) {
    if (body.status !== undefined) updateData.status = body.status;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.ageGroup !== undefined) updateData.ageGroup = body.ageGroup;
    if (body.invitedBy !== undefined) updateData.invitedBy = body.invitedBy;
  }

  if (isAdmin || isSelf) {
    if (body.phone !== undefined)
      updateData.phone = body.phone
        ? body.phone.replace(/\D/g, "").replace(/^0/, "+63").slice(0, 13)
        : null;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.birthdate !== undefined)
      updateData.birthdate = body.birthdate ? new Date(body.birthdate) : null;
    if (body.baptismDate !== undefined)
      updateData.baptismDate = body.baptismDate ? new Date(body.baptismDate) : null;
    if (body.favoriteVerse !== undefined) updateData.favoriteVerse = body.favoriteVerse;
    if (body.invitedBy !== undefined) updateData.invitedBy = body.invitedBy;
    if (body.familyMembers !== undefined) updateData.familyMembers = body.familyMembers;
    if (body.showEmail !== undefined) updateData.showEmail = body.showEmail;
    if (body.showPhone !== undefined) updateData.showPhone = body.showPhone;
    if (body.showAddress !== undefined) updateData.showAddress = body.showAddress;
    if (body.sms5dayReminder !== undefined) updateData.sms5dayReminder = body.sms5dayReminder;
    if (body.sms3dayReminder !== undefined) updateData.sms3dayReminder = body.sms3dayReminder;
    if (body.sms1dayReminder !== undefined) updateData.sms1dayReminder = body.sms1dayReminder;
    if (body.smsSameDayReminder !== undefined) updateData.smsSameDayReminder = body.smsSameDayReminder;

    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }
      const bcrypt = await import("bcryptjs");
      updateData.password = await bcrypt.hash(body.newPassword, 12);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await db.member.update({ where: { id }, data: updateData });
  return NextResponse.json({ success: true, member: { id: updated.id, status: updated.status } });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (session.user.id === String(id)) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await db.member.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
