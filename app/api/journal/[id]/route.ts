import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = parseInt(session.user.id);
  const resolvedParams = await params;
  const entryId = parseInt(resolvedParams.id);

  try {
    const entry = await db.journalEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.authorId !== memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("[api/journal/[id] GET]", error);
    return NextResponse.json({ error: "Failed to fetch journal entry" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = parseInt(session.user.id);
  const resolvedParams = await params;
  const entryId = parseInt(resolvedParams.id);

  try {
    const entry = await db.journalEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.authorId !== memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, content, mood, verseRef, verseText, visibility } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const updated = await db.journalEntry.update({
      where: { id: entryId },
      data: {
        title: title?.trim() || null,
        content: content.trim(),
        mood: mood || null,
        verseRef: verseRef || null,
        verseText: verseText || null,
        visibility: visibility || "PRIVATE",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[api/journal/[id] PUT]", error);
    return NextResponse.json({ error: "Failed to update journal entry" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = parseInt(session.user.id);
  const resolvedParams = await params;
  const entryId = parseInt(resolvedParams.id);

  try {
    const entry = await db.journalEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (entry.authorId !== memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.journalEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/journal/[id] DELETE]", error);
    return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
  }
}
