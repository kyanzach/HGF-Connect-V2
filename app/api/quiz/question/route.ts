import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQuizDayForDate, isQuizWeekExpired, canAccessDay } from "@/lib/quiz-helpers";
import { isQuizDripEnabled } from "@/lib/quiz-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idStr = searchParams.get("id");
  const id = idStr ? parseInt(idStr, 10) : null;

  if (!id || isNaN(id)) {
    return NextResponse.json({ error: "Question ID required" }, { status: 400 });
  }

  try {
    const question = await db.quizQuestion.findUnique({
      where: { id },
      include: { quiz: true },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    if (!["published", "completed"].includes(question.quiz.status)) {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 403 });
    }

    const memberId = parseInt(session.user.id, 10);

    // Strict 1-take anti-cheat gate: block re-opening an already answered question
    if (!isNaN(memberId)) {
      const existingSub = await db.quizSubmission.findUnique({
        where: { questionId_memberId: { questionId: question.id, memberId } },
        select: { id: true, isCorrect: true },
      });
      if (existingSub) {
        return NextResponse.json(
          { error: "Already answered — only 1 attempt is allowed per quiz item." },
          { status: 409 }
        );
      }
    }

    const dripEnabled = await isQuizDripEnabled();
    let isCatchup = !dripEnabled; // Open Access Mode unlocks all quizzes & items

    // Enforce day access checks only when Drip Mode is enabled
    if (dripEnabled && isQuizWeekExpired(question.quiz.sermonDate)) {
      if (!isNaN(memberId)) {
        const catchupSession = await db.quizCatchupSession.findUnique({
          where: { quizId_memberId: { quizId: question.quiz.id, memberId } },
        });
        if (
          catchupSession &&
          !catchupSession.isCompleted &&
          new Date() < catchupSession.expiresAt
        ) {
          isCatchup = true;
        }
      }
      if (!isCatchup) {
        return NextResponse.json({ error: "This quiz week has ended" }, { status: 403 });
      }
    }

    if (dripEnabled && !isCatchup) {
      const quizRelativeDay = getQuizDayForDate(question.quiz.sermonDate);
      const currentDay = Math.min(Math.max(quizRelativeDay, 0), 7);
      if (!canAccessDay(question.dayNumber, currentDay)) {
        return NextResponse.json({ error: "This question is not unlocked yet" }, { status: 403 });
      }
    }

    // Build safe game-specific helpers (never exposing correctAnswer directly)
    let lifelineEliminate: number[] | undefined;
    let wordChunks: string[] | undefined;

    if (question.dayNumber === 3 && Array.isArray(question.options) && question.options.length >= 4) {
      const opts = question.options as string[];
      const wrongIndices = opts
        .map((opt, idx) => ({ opt, idx }))
        .filter(({ opt }) => String(opt).trim().toLowerCase() !== question.correctAnswer.trim().toLowerCase())
        .map(({ idx }) => idx);
      // Deterministically pick 2 wrong indices to eliminate for the 50:50 lifeline
      if (wrongIndices.length >= 2) {
        const seed = question.id % wrongIndices.length;
        lifelineEliminate = [
          wrongIndices[seed],
          wrongIndices[(seed + 1) % wrongIndices.length],
        ];
      }
    }

    if (question.dayNumber === 6) {
      if (question.questionType === "SCRIPTURE_ORDERING" && Array.isArray(question.options)) {
        const raw = (question.options as string[]).map((s) => String(s).trim()).filter(Boolean);
        wordChunks = [...raw].sort((a, b) => ((a.length * 13 + question.id) % 17) - ((b.length * 13 + question.id) % 17));
      } else if (question.correctAnswer && question.correctAnswer.trim().length > 10) {
        // Split ideal answer into 5-7 clean phrase chunks for the 3D Word Harvest Tree
        const words = question.correctAnswer.trim().replace(/\s+/g, " ").split(" ");
        const targetChunks = Math.min(7, Math.max(4, Math.ceil(words.length / 3)));
        const chunkSize = Math.max(1, Math.ceil(words.length / targetChunks));
        const chunks: string[] = [];
        for (let i = 0; i < words.length; i += chunkSize) {
          chunks.push(words.slice(i, i + chunkSize).join(" "));
        }
        if (chunks.length >= 3) {
          // Deterministic shuffle so order is scrambled but stable on reload
          const shuffled = [...chunks];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = (question.id * 31 + i * 7) % (i + 1);
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          // Ensure it's not accidentally in exact original order
          if (shuffled.every((c, idx) => c === chunks[idx]) && shuffled.length > 1) {
            [shuffled[0], shuffled[shuffled.length - 1]] = [shuffled[shuffled.length - 1], shuffled[0]];
          }
          wordChunks = shuffled;
        }
      }
    }

    // Safely return only what the client needs to render the form
    return NextResponse.json({
      id: question.id,
      dayNumber: question.dayNumber,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options,
      hint: question.hint,
      lifelineEliminate,
      wordChunks,
    });
  } catch (error: any) {
    console.error("[api/quiz/question]", error?.message);
    return NextResponse.json({ error: "Failed to fetch question" }, { status: 500 });
  }
}
