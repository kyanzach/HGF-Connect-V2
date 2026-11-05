import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const fullMember = await db.member.findUnique({
      where: { id: member.id },
      include: {
        ministries: {
          where: { status: { in: ["active", "pending"] } },
          include: { ministry: { select: { id: true, name: true } } },
        },
        _count: {
          select: {
            posts: true,
            prayerRequests: true,
            attendance: true,
          },
        },
      },
    });

    if (!fullMember) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: fullMember.id,
          firstName: fullMember.firstName,
          lastName: fullMember.lastName,
          fullName: `${fullMember.firstName} ${fullMember.lastName}`.trim(),
          username: fullMember.username || "",
          email: fullMember.email || "",
          phone: fullMember.phone || "",
          address: fullMember.address || "",
          favoriteVerse: fullMember.favoriteVerse || "",
          role: fullMember.role,
          status: fullMember.status,
          type: fullMember.type,
          ageGroup: fullMember.ageGroup,
          joinDate: fullMember.joinDate ? fullMember.joinDate.toISOString() : null,
          profilePicture: fullMember.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${fullMember.profilePicture}`
            : null,
          ministries: fullMember.ministries.map((m) => ({
            id: m.ministry.id,
            name: m.ministry.name,
            status: m.status,
          })),
          stats: {
            posts: fullMember._count.posts,
            prayers: fullMember._count.prayerRequests,
            attendance: fullMember._count.attendance,
          },
        },
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/profile GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const firstName = String(body?.firstName || member.firstName).trim();
    const lastName = String(body?.lastName || member.lastName).trim();
    const email = body?.email !== undefined ? (String(body.email).trim() || null) : member.email;
    const phone = body?.phone !== undefined ? (String(body.phone).trim() || null) : member.phone;
    const address = body?.address !== undefined ? (String(body.address).trim() || null) : member.address;
    const favoriteVerse =
      body?.favoriteVerse !== undefined ? (String(body.favoriteVerse).trim() || null) : member.favoriteVerse;

    await db.member.update({
      where: { id: member.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        favoriteVerse,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch (err: any) {
    console.error("[api/mobile/profile PUT]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to update profile" }, { status: 500 });
  }
}
