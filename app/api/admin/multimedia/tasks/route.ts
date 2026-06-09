import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/admin/multimedia/tasks — Add custom task to event checklist (admin/moderator only)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only allow admin, moderator
  const allowed = ["admin", "moderator"];
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { eventId, taskName } = body;

    if (!eventId || !taskName) {
      return NextResponse.json({ error: "eventId and taskName are required" }, { status: 400 });
    }

    const task = await db.multimediaSopTask.create({
      data: {
        eventId: parseInt(eventId, 10),
        taskName: taskName.trim(),
        isCompleted: false,
      },
      include: {
        completedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("Error in POST /api/admin/multimedia/tasks:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
