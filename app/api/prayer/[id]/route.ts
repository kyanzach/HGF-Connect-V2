import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const existing = await db.prayerRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Prayer request not found" }, { status: 404 });
    }

    const currentUserId = parseInt(session.user.id);
    const role = (session.user as any).role ?? "";
    const isAdmin = ["admin", "moderator"].includes(role);

    if (existing.authorId !== currentUserId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await db.prayerRequest.update({
      where: { id },
      data: {
        request: body.request !== undefined ? body.request.trim() : undefined,
        isAnswered: body.isAnswered !== undefined ? body.isAnswered : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[api/prayer/[id] PATCH]", error);
    return NextResponse.json({ error: "Failed to update prayer request" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const existing = await db.prayerRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Prayer request not found" }, { status: 404 });
    }

    const currentUserId = parseInt(session.user.id);
    const role = (session.user as any).role ?? "";
    const isAdmin = ["admin", "moderator"].includes(role);

    if (existing.authorId !== currentUserId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.prayerRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/prayer/[id] DELETE]", error);
    return NextResponse.json({ error: "Failed to delete prayer request" }, { status: 500 });
  }
}
