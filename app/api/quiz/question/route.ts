import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDayNumber, canAccessDay } from "@/lib/quiz-helpers";

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

    if (question.quiz.status !== "published") {
      return NextResponse.json({ error: "Quiz is not active" }, { status: 403 });
    }

    // Enforce day access checks
    const currentDay = getDayNumber();
    if (!canAccessDay(question.dayNumber, currentDay)) {
      return NextResponse.json({ error: "This question is not unlocked yet" }, { status: 403 });
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
