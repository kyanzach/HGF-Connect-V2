import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/prayer/[id]/responses — list who prayed for this request
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = parseInt(id);

  try {
    const responses = await (db as any).prayerResponse.findMany({
      where: { requestId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, profilePicture: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error("[api/prayer/[id]/responses]", error);
    return NextResponse.json({ error: "Failed to load responses" }, { status: 500 });
  }
}
