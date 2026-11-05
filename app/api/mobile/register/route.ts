import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signMobileToken } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const username = String(body?.username || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const email = body?.email ? String(body.email).trim().toLowerCase() : null;
    const password = String(body?.password || "");
    const invitedBy = body?.invitedBy ? String(body.invitedBy).trim() : null;

    if (!firstName || !lastName || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in your first name, last name, username, and password.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    const existingUsername = await db.member.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          message: "That username is already taken. Please choose another.",
        },
        { status: 409 }
      );
    }

    if (email) {
      const existingEmail = await db.member.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "That email address is already registered.",
          },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const created = await db.member.create({
      data: {
        firstName,
        lastName,
        username,
        phone: phone || null,
        email,
        password: hashedPassword,
        invitedBy,
        status: "approved",
        role: "user",
        type: "GrowingFriend",
        joinDate: new Date(),
        lastLogin: new Date(),
      },
    });

    const token = signMobileToken({
      id: created.id,
      role: created.role,
      status: created.status,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: created.id,
          firstName: created.firstName,
          lastName: created.lastName,
          name: `${created.firstName} ${created.lastName}`.trim(),
          email: created.email,
          phone: created.phone,
          username: created.username || created.firstName.toLowerCase(),
          role: created.role,
          status: created.status,
          type: created.type,
          profilePicture: null,
          favoriteVerse: null,
          ministryInvolvement: null,
        },
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/register]", err?.message);
    return NextResponse.json(
      { success: false, message: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
