import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body?.identifier || body?.username || "").trim();
    const password = String(body?.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: "Please enter both your username/email and password." },
        { status: 400 }
      );
    }

    const member = await db.member.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
          { phone: identifier },
        ],
        status: { not: "archived" },
      },
      include: {
        ministries: {
          where: { status: "active" },
          include: { ministry: { select: { id: true, name: true } } },
        },
      },
    });

    if (!member || !member.password) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials. Please check your username and password." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, member.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials. Please check your username and password." },
        { status: 401 }
      );
    }

    await db.member
      .update({
        where: { id: member.id },
        data: { lastLogin: new Date() },
      })
      .catch(() => {});

    const token = signMobileToken({
      id: member.id,
      role: member.role,
      status: member.status,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          fullName: `${member.firstName} ${member.lastName}`.trim(),
          username: member.username,
          email: member.email,
          phone: member.phone,
          role: member.role,
          status: member.status,
          type: member.type,
          ageGroup: member.ageGroup,
          favoriteVerse: member.favoriteVerse,
          profilePicture: member.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${member.profilePicture}`
            : null,
          coverPhoto: member.coverPhoto
            ? `https://connect.houseofgrace.ph/uploads/cover_photos/${member.coverPhoto}`
            : null,
          ministries: member.ministries.map((mm) => mm.ministry.name),
        },
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/login]", err?.message);
    return NextResponse.json(
      { success: false, message: "Authentication error. Please try again." },
      { status: 500 }
    );
  }
}
