import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = parseInt(id);

  try {
    await db.prayerRequest.update({
      where: { id: requestId },
      data: { prayerCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/prayer/[id]/pray]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
