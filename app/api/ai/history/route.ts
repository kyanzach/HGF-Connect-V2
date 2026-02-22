import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/ai/history — list all conversations, most recent first
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id);

  try {
    const conversations = await db.aiConversation.findMany({
      where: { memberId, messageCount: { gt: 0 } },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: {
        messages: {
          where: { role: "user" },
          orderBy: { id: "asc" },
          take: 1,
          select: { content: true },
        },
      },
    });

    const result = conversations.map((c) => ({
      id: c.id,
      startedAt: c.startedAt,
      lastMessageAt: c.lastMessageAt,
      messageCount: c.messageCount,
      firstQuestion: c.messages[0]?.content ?? "",
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI] listHistory error:", (err as Error).message);
    return NextResponse.json([]); // Never 500 — return empty array
  }
}
