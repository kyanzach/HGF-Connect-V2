import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = session.user.id as unknown as number;

  try {
    const entries = await db.journalEntry.findMany({
      where: { authorId: memberId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        mood: true,
        verseRef: true,
        createdAt: true,
      },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("[api/journal GET]", error);
    return NextResponse.json({ error: "Failed to load journal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = session.user.id as unknown as number;

  try {
    const { title, content, mood, verseRef, verseText } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Journal entry cannot be empty" }, { status: 400 });
    }

    const entry = await db.journalEntry.create({
      data: {
        authorId: memberId,
        title: title?.trim() || null,
        content: content.trim(),
        mood: mood || null,
        verseRef: verseRef || null,
        verseText: verseText || null,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("[api/journal POST]", error);
    return NextResponse.json({ error: "Failed to save journal entry" }, { status: 500 });
  }
}
