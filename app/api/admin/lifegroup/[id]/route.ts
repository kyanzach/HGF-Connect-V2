import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.member.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });
    if (!member || !["admin", "moderator", "usher"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const registrationId = parseInt(idStr, 10);
    if (isNaN(registrationId)) {
      return NextResponse.json({ error: "Invalid registration ID." }, { status: 400 });
    }

    const body = await req.json();
    const { fullName, age, phone, area, status, assignedLeaderId, sendNotificationSms } = body;

    const updateData: any = {};
    if (fullName !== undefined) {
      if (typeof fullName !== "string" || !fullName.trim()) {
        return NextResponse.json({ error: "Full name is required." }, { status: 400 });
      }
      updateData.fullName = fullName.trim();
    }

    if (age !== undefined) {
      const parsedAge = parseInt(String(age), 10);
      if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        return NextResponse.json({ error: "Invalid age value." }, { status: 400 });
      }
      updateData.age = parsedAge;
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
      }
      updateData.phone = phone.trim();
    }

    if (area !== undefined) {
      if (typeof area !== "string" || !area.trim()) {
        return NextResponse.json({ error: "Area value is required." }, { status: 400 });
      }
      updateData.area = area.trim();
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !status.trim()) {
        return NextResponse.json({ error: "Status value is required." }, { status: 400 });
      }
      updateData.status = status.trim();
    }

    if (assignedLeaderId !== undefined) {
      if (assignedLeaderId === null) {
        updateData.assignedLeaderId = null;
      } else {
        const leaderId = parseInt(String(assignedLeaderId), 10);
        if (isNaN(leaderId)) {
          return NextResponse.json({ error: "Invalid leader ID." }, { status: 400 });
        }
        updateData.assignedLeaderId = leaderId;
      }
    }

    const updated = await db.lifeGroupRegistration.update({
      where: { id: registrationId },
      data: updateData,
      include: {
        assignedLeader: {
          select: { id: true, firstName: true, lastName: true, phone: true }
        }
      }
    });

    // Send SMS notification if appointed and requested
    if (sendNotificationSms && updated.assignedLeader && updated.assignedLeader.phone) {
      try {
        const areaShort = updated.area.split(" (")[0];
        const smsText = `HGF LIFE Group: You are appointed to handle cell group request for ${updated.fullName} (${updated.age}yo, Phone: ${updated.phone}, Area: ${areaShort}). Details: connect.houseofgrace.ph/admin/lifegroup`;
        const { sendSms } = await import("@/lib/sms");
        await sendSms(updated.assignedLeader.phone, smsText, updated.assignedLeader.id);
      } catch (smsError) {
        console.error("Failed to send appointment notification SMS:", smsError);
      }
    }

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error("Failed to update LIFE Group registration:", error);
    return NextResponse.json({ error: "Failed to update registration." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await db.member.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { role: true },
    });
    if (!member || !["admin", "moderator", "usher"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const registrationId = parseInt(idStr, 10);
    if (isNaN(registrationId)) {
      return NextResponse.json({ error: "Invalid registration ID." }, { status: 400 });
    }

    await db.lifeGroupRegistration.delete({
      where: { id: registrationId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete LIFE Group registration:", error);
    return NextResponse.json({ error: "Failed to delete registration." }, { status: 500 });
  }
}
