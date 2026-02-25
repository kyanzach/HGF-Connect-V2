import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generateUsername, formatPhoneNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type");
  const status = searchParams.get("status") as any;
  const role = searchParams.get("role") as any;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  // Admins/mods see all fields; public/non-admin sees privacy-filtered data
  const isAdmin =
    session && ["admin", "moderator"].includes(session.user.role);

  const where: any = {};
  if (!isAdmin) {
    where.status = "active";
  }
  if (status) where.status = status;
  if (type) where.type = type;
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: isAdmin ? { contains: search } : undefined },
      { phone: isAdmin ? { contains: search } : undefined },
    ].filter((c) => Object.values(c)[0] !== undefined);
  }

  const [members, total] = await Promise.all([
    db.member.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: isAdmin ? true : undefined,
        phone: true,          // needed for completeness score (won't expose value to non-admin)
        profilePicture: true,
        coverPhoto: true,     // needed for card background + completeness score
        ageGroup: true,
        type: true,
        status: true,
        role: isAdmin ? true : undefined,
        joinDate: true,
        createdAt: true,
        birthdate: true,      // completeness
        baptismDate: true,    // completeness
        invitedBy: true,      // completeness (name only, non-sensitive)
        address: true,        // completeness
        favoriteVerse: true,  // completeness + shown on card
        familyMembers: true,  // completeness
        showEmail: true,
        showPhone: true,
        showAddress: true,
        ministries: {
          where: { status: "active" },
          include: { ministry: { select: { name: true } } },
        },
      },
    }) as any,
    db.member.count({ where }),
  ]);

  return NextResponse.json({ members, total, page, limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    password,
    ageGroup,
    type,
    invitedBy,
  } = body;

  // Basic validation
  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "First name, last name, email, and password are required." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  // Check for duplicate email
  const existing = await db.member.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const username = await generateUsername(firstName, lastName, db);
  const normalizedPhone = phone ? formatPhoneNumber(phone) : undefined;

  const member = await db.member.create({
    data: {
      firstName,
      lastName,
      email,
      phone: normalizedPhone,
      password: hashedPassword,
      username,
      ageGroup: (ageGroup as any) || "Adult",
      type: (type?.replace(" ", "") as any) || "GrowingFriend",
      invitedBy,
      status: "pending",
      role: "user",
    },
  });

  return NextResponse.json(
    {
      id: member.id,
      username: member.username,
      message: `Account created for ${firstName}! Your account is pending admin approval.`,
    },
    { status: 201 }
  );
}
