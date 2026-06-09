import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only allow admin, moderator, usher, and multimedia
  const allowed = ["admin", "moderator", "usher", "multimedia"];
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await params;
  const taskId = parseInt(idStr, 10);
  if (isNaN(taskId)) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  try {
    // 1. Fetch current task status
    const task = await db.multimediaSopTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const nextCompleted = !task.isCompleted;
    const userId = parseInt(session.user.id, 10);

    // 2. Toggle status and assign completedById/completedAt
    const updated = await db.multimediaSopTask.update({
      where: { id: taskId },
      data: {
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date() : null,
        completedById: nextCompleted ? userId : null,
      },
      include: {
        completedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: any) {
    console.error("Error in PATCH /api/admin/multimedia/tasks/[id]/toggle:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
