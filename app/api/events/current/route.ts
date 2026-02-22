import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const now = new Date();
  const event = await db.event.findFirst({
    where: {
      OR: [
        { eventDate: { gte: now }, status: "scheduled" },
      ],
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ event });
}
