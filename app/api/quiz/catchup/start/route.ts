import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isQuizWeekExpired } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = parseInt(session.user.id, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }

  try {
    const { quizId } = await req.json();
    const qId = parseInt(quizId, 10);
    if (isNaN(qId)) {
      return NextResponse.json({ error: "Invalid quiz ID" }, { status: 400 });
    }

    const quiz = await db.sermonQuiz.findUnique({
      where: { id: qId },
      include: {
        questions: { select: { id: true } },
      },
    });

    if (!quiz || !["published", "completed"].includes(quiz.status)) {
      return NextResponse.json({ error: "Quiz not found or not published" }, { status: 404 });
    }

    // 1. Check if user already finished all questions for this quiz
    const submissionCount = await db.quizSubmission.count({
      where: { quizId: qId, memberId },
    });
    const totalRequired = quiz.questions.length || 7;
    if (submissionCount >= totalRequired) {
      return NextResponse.json(
        { error: "You have already completed all challenges for this sermon quiz!" },
        { status: 400 }
      );
    }

    // 2. Check if a catch-up session already exists for this specific quiz
    const existingSession = await db.quizCatchupSession.findUnique({
      where: { quizId_memberId: { quizId: qId, memberId } },
    });

    if (existingSession) {
      if (existingSession.isCompleted) {
        return NextResponse.json(
          { error: "You have already completed this catch-up challenge." },
          { status: 400 }
        );
      }
      if (new Date() >= existingSession.expiresAt) {
        return NextResponse.json(
          { error: "The 7-day catch-up window for this quiz has ended." },
          { status: 403 }
        );
      }
      // Session is still active
      return NextResponse.json({ success: true, session: existingSession });
    }

    // 3. Rule Check A: Active Present Latest Sunday Quiz
    const latestQuiz = await db.sermonQuiz.findFirst({
      where: { status: { in: ["published", "completed"] } },
      orderBy: { sermonDate: "desc" },
      include: { questions: { select: { id: true } } },
    });

    if (latestQuiz && !isQuizWeekExpired(latestQuiz.sermonDate) && latestQuiz.id !== qId) {
      const latestSubmissions = await db.quizSubmission.count({
        where: { quizId: latestQuiz.id, memberId },
      });
      const latestTotal = latestQuiz.questions.length || 7;
      if (latestSubmissions < latestTotal) {
        return NextResponse.json(
          {
            conflict: "active_current_week",
            activeQuizId: latestQuiz.id,
            activeQuizTitle: latestQuiz.title,
            message: `You have the chance to answer previous Sunday quiz after you finish this one, and you have 7 days to finish this one. Finish this week's quiz ("${latestQuiz.title}") first!`,
          },
          { status: 409 }
        );
      }
    }

    // 4. Rule Check B: Another Active Previous Sunday Catch-Up in Progress
    const activeCatchup = await db.quizCatchupSession.findFirst({
      where: {
        memberId,
        isCompleted: false,
        expiresAt: { gt: new Date() },
        quizId: { not: qId },
      },
      include: {
        quiz: { select: { id: true, title: true } },
      },
    });

    if (activeCatchup) {
      const msLeft = activeCatchup.expiresAt.getTime() - Date.now();
      const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
      const daysLeft = Math.floor(hoursLeft / 24);
      const remainingHours = hoursLeft % 24;
      const timeLeftStr = daysLeft > 0 ? `${daysLeft}d ${remainingHours}h` : `${remainingHours}h`;

      return NextResponse.json(
        {
          conflict: "active_catchup",
          activeQuizId: activeCatchup.quiz.id,
          activeQuizTitle: activeCatchup.quiz.title,
          message: `You have the chance to answer previous Sunday quiz after you finish this one, and you have 7 days to finish this one. (${timeLeftStr} remaining on "${activeCatchup.quiz.title}")`,
        },
        { status: 409 }
      );
    }

    // 5. Create new 7-day Catch-up window
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newSession = await db.quizCatchupSession.create({
      data: {
        quizId: qId,
        memberId,
        expiresAt,
        isCompleted: false,
      },
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error: any) {
    console.error("Error starting quiz catch-up session:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
