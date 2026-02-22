import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DAILY_LIMIT = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ questions_remaining: DAILY_LIMIT, daily_limit: DAILY_LIMIT });

  try {
    const memberId = parseInt(session.user.id);
    const today = new Date().toISOString().slice(0, 10);
    const row = await db.$queryRaw<{ question_count: number }[]>`
      SELECT COALESCE(question_count, 0) AS question_count FROM ai_usage
      WHERE member_id = ${memberId} AND usage_date = ${today}
      LIMIT 1
    `;
    const used = row[0]?.question_count ?? 0;
    return NextResponse.json({ questions_remaining: Math.max(0, DAILY_LIMIT - used), daily_limit: DAILY_LIMIT });
  } catch {
    return NextResponse.json({ questions_remaining: DAILY_LIMIT, daily_limit: DAILY_LIMIT });
  }
}
