import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getQuizDayForDate, isQuizWeekExpired, canAccessDay } from "@/lib/quiz-helpers";

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
    let isCatchup = false;

    // Enforce day access checks (including 7-day Catch-Up pass)
    if (isQuizWeekExpired(question.quiz.sermonDate)) {
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

    if (!isCatchup) {
      const quizRelativeDay = getQuizDayForDate(question.quiz.sermonDate);
      const currentDay = Math.min(Math.max(quizRelativeDay, 0), 7);
      if (!canAccessDay(question.dayNumber, currentDay)) {
        return NextResponse.json({ error: "This question is not unlocked yet" }, { status: 403 });
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
    });
  } catch (error: any) {
    console.error("[api/quiz/question]", error?.message);
    return NextResponse.json({ error: "Failed to fetch question" }, { status: 500 });
  }
}
