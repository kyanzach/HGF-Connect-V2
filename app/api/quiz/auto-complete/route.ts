/**
 * POST /api/quiz/auto-complete — Auto-archive expired quizzes
 *
 * Called by the cron script before daily posting.
 * Protected by X-Cron-Secret header.
 * Finds any "published" quiz whose week has expired and transitions it to "completed".
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isQuizWeekExpired } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // ── Auth: cron secret ──
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all published quizzes
    const publishedQuizzes = await db.sermonQuiz.findMany({
      where: { status: "published" },
      select: { id: true, title: true, sermonDate: true },
    });

    const completed: { id: number; title: string }[] = [];

    for (const quiz of publishedQuizzes) {
      if (isQuizWeekExpired(quiz.sermonDate)) {
        await db.sermonQuiz.update({
          where: { id: quiz.id },
          data: { status: "completed" },
        });
        completed.push({ id: quiz.id, title: quiz.title });
        console.log(`[auto-complete] Archived quiz #${quiz.id}: ${quiz.title}`);
      }
    }

    if (completed.length === 0) {
      return NextResponse.json({ message: "No expired quizzes to archive" });
    }

    return NextResponse.json({
      success: true,
      archived: completed,
    });
  } catch (error: any) {
    console.error("[api/quiz/auto-complete]", error?.message);
    return NextResponse.json({ error: "Failed to auto-complete quizzes" }, { status: 500 });
  }
}
