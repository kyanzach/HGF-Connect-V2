import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, birthdate, phone } = body;

    if (!firstName || !lastName || !birthdate) {
      return NextResponse.json({ error: "First name, last name, and birthdate are required." }, { status: 400 });
    }

    const parsedBirthdate = new Date(birthdate);
    if (isNaN(parsedBirthdate.getTime())) {
      return NextResponse.json({ error: "Invalid birthdate format." }, { status: 400 });
    }

    const birthdateStr = parsedBirthdate.toISOString().slice(0, 10);

    // Build conditions for matching first name AND last name, or mobile number
    const orConditions: any[] = [
      {
        AND: [
          { firstName: { contains: firstName.trim() } },
          { lastName: { contains: lastName.trim() } },
        ]
      }
    ];

    if (phone && phone.trim()) {
      orConditions.push({ phone: { contains: phone.trim() } });
    }

    // Fetch active members matching name or phone
    const rawMembers = await db.member.findMany({
      where: {
        OR: orConditions,
        status: { in: ["active", "pending"] }, // Include active or pending accounts for recovery
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        phone: true,
        email: true,
        birthdate: true,
        profilePicture: true,
      },
    });

    // Filter by matching birthdate, or allow missing birthdate for potential duplicate merge
    const matched = rawMembers.filter((m) => {
      if (!m.birthdate) return true;
      const mBirthdateStr = new Date(m.birthdate).toISOString().slice(0, 10);
      return mBirthdateStr === birthdateStr;
    });

    return NextResponse.json({ accounts: matched });
  } catch (err: any) {
    console.error("[retrieve-account/search]", err?.message);
    return NextResponse.json({ error: "Failed to search accounts." }, { status: 500 });
  }
}
