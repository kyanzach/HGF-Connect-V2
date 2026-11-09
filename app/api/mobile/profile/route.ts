import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import bcrypt from "bcryptjs";

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
          bio: (fullMember as any).bio || "",
          favoriteVerse: fullMember.favoriteVerse || "",
          familyMembers: fullMember.familyMembers || "",
          invitedBy: fullMember.invitedBy || "",
          role: fullMember.role,
          status: fullMember.status,
          type: fullMember.type,
          ageGroup: fullMember.ageGroup,
          joinDate: fullMember.joinDate ? fullMember.joinDate.toISOString() : null,
          profilePicture: fullMember.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${fullMember.profilePicture}`
            : null,
          coverPhoto: fullMember.coverPhoto
            ? `https://connect.houseofgrace.ph/uploads/cover_photos/${fullMember.coverPhoto}`
            : null,
          coverPhotoPositionX: Number(fullMember.coverPhotoPositionX) || 50,
          coverPhotoPositionY: Number(fullMember.coverPhotoPositionY) || 50,
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

async function handleProfileUpdate(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = String(body?.action || "");

    // 1. Independent Username Update (v2.24.11 & v2.24.18)
    if (action === "update_username") {
      const username = String(body?.username || "").trim().toLowerCase();
      if (!username || username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
        return NextResponse.json(
          { success: false, error: "Username must be at least 3 characters (letters, numbers, ., _, -)." },
          { status: 400 }
        );
      }
      const existing = await db.member.findFirst({
        where: { username, id: { not: member.id } },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Username is already taken." },
          { status: 400 }
        );
      }
      await db.member.update({
        where: { id: member.id },
        data: { username },
      });
      return NextResponse.json({
        success: true,
        message: "Username updated successfully.",
      });
    }

    // 2. Independent Password Update without current password requirement (v2.24.20)
    if (action === "update_password") {
      const newPassword = String(body?.newPassword || "");
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters." },
          { status: 400 }
        );
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.member.update({
        where: { id: member.id },
        data: { password: hashedPassword },
      });
      return NextResponse.json({
        success: true,
        message: "Password updated successfully.",
      });
    }

    // 3. Standard Profile Info & Bio/Verse Update
    const firstName = String(body?.firstName || member.firstName).trim();
    const lastName = String(body?.lastName || member.lastName).trim();
    const email = body?.email !== undefined ? (String(body.email).trim() || null) : member.email;
    const phone = body?.phone !== undefined ? (String(body.phone).trim() || null) : member.phone;
    const address = body?.address !== undefined ? (String(body.address).trim() || null) : member.address;
    const favoriteVerse =
      body?.favoriteVerse !== undefined ? (String(body.favoriteVerse).trim() || null) : member.favoriteVerse;
    const familyMembers =
      body?.familyMembers !== undefined ? (String(body.familyMembers).trim() || null) : member.familyMembers;

    await db.member.update({
      where: { id: member.id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        address,
        favoriteVerse,
        familyMembers,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
    });
  } catch (err: any) {
    console.error("[api/mobile/profile UPDATE]", err?.message);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  return handleProfileUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handleProfileUpdate(req);
}
