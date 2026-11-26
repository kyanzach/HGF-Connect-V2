/**
 * POST /api/quiz/admin/upgrade-difficulty — Safely upgrades unplayed quiz questions to Adult/Hard mode
 *
 * Protected by X-Cron-Secret header.
 * For a given { quizId }, regenerates the 7 questions with our upgraded anti-easy/hard-boss AI prompt
 * and ONLY updates questions that have ZERO existing participant submissions — guaranteeing 100%
 * preservation of all recorded answers and points.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQuiz } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

function formatYMD(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const quizId = Number(body?.quizId);
    if (!quizId || isNaN(quizId)) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const quiz = await db.sermonQuiz.findUnique({
      where: { id: quizId },
      include: {
        event: {
          select: { title: true, speaker: true, description: true, commentary: true },
        },
        questions: {
          orderBy: { dayNumber: "asc" },
          include: {
            _count: { select: { submissions: true } },
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check if there are any unplayed questions at all
    const unplayedDays = quiz.questions.filter((q) => q._count.submissions === 0);
    if (unplayedDays.length === 0) {
      return NextResponse.json({
        skipped: true,
        quizId,
        message: "All questions already have submissions — skipped to preserve participant records.",
      });
    }

    // Build source material
    const parts: string[] = [];
    parts.push(`Sunday Worship Service Sermon Title: ${quiz.event?.title || quiz.title}`);
    if (quiz.event?.speaker) parts.push(`Preacher / Speaker: ${quiz.event.speaker}`);
    if (quiz.event?.description?.trim()) {
      parts.push(`Sermon Description:\n${quiz.event.description.trim()}`);
    }
    if (quiz.event?.commentary?.trim()) {
      parts.push(`Sermon Slides & Study Commentary:\n${quiz.event.commentary.trim()}`);
    } else if (quiz.transcriptText?.trim()) {
      parts.push(`Sermon Material:\n${quiz.transcriptText.trim()}`);
    }

    const sermonDateStr = formatYMD(new Date(quiz.sermonDate));
    const regenerated = await generateQuiz(parts.join("\n\n"), sermonDateStr, {
      titleHint: quiz.event?.title || quiz.title,
      speaker: quiz.event?.speaker ?? null,
      skipCleanup: true,
      hasVideo: Boolean(quiz.youtubeVideoId),
    });

    const updatedDays: number[] = [];
    const preservedDays: number[] = [];

    for (const existingQ of quiz.questions) {
      if (existingQ._count.submissions > 0) {
        preservedDays.push(existingQ.dayNumber);
        continue;
      }

      const fresh = regenerated.questions.find((q) => q.dayNumber === existingQ.dayNumber);
      if (!fresh) continue;

      await db.quizQuestion.update({
        where: { id: existingQ.id },
        data: {
          questionText: fresh.questionText,
          correctAnswer: fresh.correctAnswer,
          options: fresh.options ?? null,
          hint: fresh.hint ?? null,
          explanation: fresh.explanation ?? null,
        },
      });
      updatedDays.push(existingQ.dayNumber);
    }

    return NextResponse.json({
      success: true,
      quizId,
      title: quiz.title,
      updatedDays,
      preservedDays,
    });
  } catch (error: any) {
    console.error("[api/quiz/admin/upgrade-difficulty]", error?.message || error);
    return NextResponse.json(
      { error: "Failed to upgrade quiz difficulty: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
