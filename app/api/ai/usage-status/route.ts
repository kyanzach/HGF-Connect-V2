import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DAILY_LIMIT = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ questions_remaining: DAILY_LIMIT, daily_limit: DAILY_LIMIT, active_conversation: null });

  try {
    const memberId = parseInt(session.user.id);
    
    // Manila is UTC+8. Offset UTC time by 8 hours to get Manila today's date.
    const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const row = await db.$queryRaw<{ question_count: number }[]>`
      SELECT COALESCE(question_count, 0) AS question_count FROM ai_usage
      WHERE member_id = ${memberId} AND usage_date = ${today}
      LIMIT 1
    `;
    const used = row[0]?.question_count ?? 0;

    // Fetch the most recent active conversation updated within the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeConv = await db.aiConversation.findFirst({
      where: {
        memberId,
        lastMessageAt: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      include: {
        messages: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    const activeConversation = activeConv && activeConv.messages.length > 0 ? {
      id: activeConv.id,
      startedAt: activeConv.startedAt,
      messages: activeConv.messages.map((m) => ({
        role: m.role === "user" ? "user" : "ai",
        content: m.content,
      })),
    } : null;

    return NextResponse.json({
      questions_remaining: Math.max(0, DAILY_LIMIT - used),
      daily_limit: DAILY_LIMIT,
      active_conversation: activeConversation
    });
  } catch (err) {
    console.error("[AI] usage-status error:", err);
    return NextResponse.json({ questions_remaining: DAILY_LIMIT, daily_limit: DAILY_LIMIT, active_conversation: null });
  }
}
