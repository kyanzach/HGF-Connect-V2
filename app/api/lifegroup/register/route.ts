import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, age, phone, area } = body;

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

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ error: "Contact mobile number is required." }, { status: 400 });
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
        phone: phone.trim(),
        area: area.trim(),
      },
    });

    // Notify pastors/leaders via SMS (only once there is a new registration)
    try {
      const leaders = await db.member.findMany({
        where: {
          OR: [
            { firstName: "Ryan", lastName: "Paco" },
            { firstName: "Karen Joan Tan", lastName: "Paco" },
            { firstName: "Shalom Love Joy", lastName: "Baltazar" },
            { firstName: "William", lastName: "Del Carmen" },
            { firstName: "Jun-jun", lastName: "Baltazar" },
            { firstName: "Rina", lastName: "Del Carmen" },
            { firstName: "Lilybeth", lastName: "Gabonada" },
            { firstName: "Andrea Nicole", lastName: "Gabonada" }
          ],
          phone: { not: null }
        },
        select: { id: true, phone: true }
      });

      // Shorten area to first section before parenthesis list
      const areaShort = registration.area.split(" (")[0];
      const smsText = `HGF LIFE Group: New signup. Name: ${registration.fullName}, Age: ${registration.age}, Phone: ${registration.phone}, Area: ${areaShort}. Details: connect.houseofgrace.ph/admin/lifegroup. "Let's go and make disciple, let's do life together!"`;

      const { sendSms } = await import("@/lib/sms");
      for (const leader of leaders) {
        if (leader.phone) {
          await sendSms(leader.phone, smsText, leader.id);
        }
      }
    } catch (smsError) {
      console.error("Failed to send signup notification SMS:", smsError);
    }

    return NextResponse.json({ success: true, id: registration.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to register LIFE Group membership:", error);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
