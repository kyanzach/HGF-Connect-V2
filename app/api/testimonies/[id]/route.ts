import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !["admin", "moderator", "usher"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { readByAnnouncer, isFeatured } = body;

    const updated = await db.testimony.update({
      where: { id },
      data: {
        ...(readByAnnouncer !== undefined && { readByAnnouncer: Boolean(readByAnnouncer) }),
        ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
      },
    });

    return NextResponse.json({ success: true, testimony: updated });
  } catch (error: any) {
    console.error("[api/testimonies/[id] PATCH]", error?.message);
    return NextResponse.json({ error: "Failed to update testimony" }, { status: 500 });
  }
}
