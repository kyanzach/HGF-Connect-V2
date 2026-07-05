import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, age, area } = body;

    // Validation
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (fullName.trim().length > 100) {
      return NextResponse.json({ error: "Full name must be 100 characters or less." }, { status: 400 });
    }

    const parsedAge = parseInt(String(age), 10);
    if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      return NextResponse.json({ error: "Please enter a valid age." }, { status: 400 });
    }

    if (!area || typeof area !== "string" || !area.trim()) {
      return NextResponse.json({ error: "Area selection is required." }, { status: 400 });
    }
    if (area.trim().length > 150) {
      return NextResponse.json({ error: "Area description must be 150 characters or less." }, { status: 400 });
    }

    const registration = await db.lifeGroupRegistration.create({
      data: {
        fullName: fullName.trim(),
        age: parsedAge,
        area: area.trim(),
      },
    });

    return NextResponse.json({ success: true, id: registration.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to register LIFE Group membership:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
