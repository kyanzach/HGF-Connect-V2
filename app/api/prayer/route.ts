import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") ?? "active"; // "active" | "answered"
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  try {
    const where = { isAnswered: tab === "answered" };
    const [requests, total] = await Promise.all([
      db.prayerRequest.findMany({
        where,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, profilePicture: true },
          },
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.prayerRequest.count({ where }),
    ]);

    return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("[api/prayer GET]", error);
    return NextResponse.json({ error: "Failed to load prayer requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { request: prayerText, visibility } = await request.json();
    if (!prayerText?.trim()) {
      return NextResponse.json({ error: "Prayer request cannot be empty" }, { status: 400 });
    }

    const prayer = await db.prayerRequest.create({
      data: {
        authorId: parseInt(session.user.id),
        request: prayerText.trim(),
        visibility: visibility ?? "MEMBERS_ONLY",
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
        _count: { select: { responses: true } },
      },
    });

    return NextResponse.json(prayer, { status: 201 });
  } catch (error) {
    console.error("[api/prayer POST]", error);
    return NextResponse.json({ error: "Failed to submit prayer request" }, { status: 500 });
  }
}
