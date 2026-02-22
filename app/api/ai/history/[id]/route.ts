import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/ai/history/[id] — get full conversation with messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const memberId = parseInt(session.user.id);
  const convId = parseInt(id);

  try {
    const conv = await db.aiConversation.findFirst({
      where: { id: convId, memberId }, // Scope to requesting user (§5.10)
      include: {
        messages: {
          orderBy: { id: "asc" },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });

    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: conv.id,
      startedAt: conv.startedAt,
      messageCount: conv.messageCount,
      messages: conv.messages,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }
}
