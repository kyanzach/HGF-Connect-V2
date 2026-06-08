/**
 * GET /api/quiz/status — Member's weekly quiz progress
 *
 * Returns current week's quiz with:
 * - Which days completed + scores
 * - Total score, reward tier
 * - Whether catch-up is available
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDayNumber, getQuizDayForDate, isQuizWeekExpired, QUIZ_DAYS, QUIZ_TYPE_LABELS, REWARD_DISPLAY, getRewardTier } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const quizIdParam = searchParams.get("quizId");
  const quizId = quizIdParam ? parseInt(quizIdParam, 10) : null;

  try {
    // Find active published/completed quiz
    const quiz = quizId && !isNaN(quizId)
      ? await db.sermonQuiz.findFirst({
          where: { id: quizId, status: { in: ["published", "completed"] } },
          include: {
            questions: {
              orderBy: { dayNumber: "asc" },
              select: {
                id: true,
                dayNumber: true,
                questionType: true,
                questionText: true,
              },
            },
          },
        })
      : await db.sermonQuiz.findFirst({
          where: { status: { in: ["published", "completed"] } },
          orderBy: { sermonDate: "desc" },
          include: {
            questions: {
              orderBy: { dayNumber: "asc" },
              select: {
                id: true,
                dayNumber: true,
                questionType: true,
                questionText: true,
              },
            },
          },
        });

    if (!quiz) {
      return NextResponse.json({ active: false, message: "Quiz not found" });
    }

    // Determine if the loaded quiz is the latest published/completed quiz
    const latestQuiz = await db.sermonQuiz.findFirst({
      where: { status: { in: ["published", "completed"] } },
      orderBy: { sermonDate: "desc" },
      select: { id: true },
    });
    const isActiveQuiz = latestQuiz ? quiz.id === latestQuiz.id : true;

    // Get member's submissions for this quiz
    const submissions = await db.quizSubmission.findMany({
      where: { quizId: quiz.id, memberId },
      select: {
        questionId: true,
        isCorrect: true,
        score: true,
        aiFeedback: true,
        submittedAt: true,
      },
    });

    const submissionMap = new Map(submissions.map((s) => [s.questionId, s]));
    // Use quiz-relative day number instead of raw weekday to prevent re-locking
    const quizRelativeDay = getQuizDayForDate(quiz.sermonDate);
    // Clamp to 1–7 for active week, >7 means expired
    const currentDay = Math.min(Math.max(quizRelativeDay, 0), 7);
    const isExpired = isQuizWeekExpired(quiz.sermonDate);

    // Build day status
    const days = quiz.questions.map((q) => {
      const sub = submissionMap.get(q.id);
      const typeInfo = QUIZ_TYPE_LABELS[q.questionType];
      const dayMeta = QUIZ_DAYS.find((d) => d.dayNumber === q.dayNumber);

      let status: "completed" | "available" | "locked" | "today" | "expired";
      if (sub) {
        status = "completed";
      } else if (isExpired) {
        // Week is over — unplayed days are permanently expired
        status = "expired";
      } else if (q.dayNumber === currentDay) {
        status = "today";
      } else if (currentDay > 0 && q.dayNumber <= currentDay) {
        status = "available"; // catch-up
      } else {
        status = "locked";
      }

      return {
        questionId: q.id,
        dayNumber: q.dayNumber,
        label: dayMeta?.label || `Day ${q.dayNumber}`,
        type: q.questionType,
        typeLabel: typeInfo?.label || q.questionType,
        typeEmoji: typeInfo?.emoji || "🧠",
        difficulty: typeInfo?.difficulty || "Unknown",
        status,
        score: sub?.score ?? null,
        isCorrect: sub?.isCorrect ?? null,
        feedback: sub?.aiFeedback ?? null,
      };
    });

    // Check attendance gating if event is linked to the quiz
    let attended = true;
    if (quiz.eventId) {
      const attendanceRecord = await db.attendanceRecord.findFirst({
        where: {
          memberId,
          eventId: quiz.eventId,
        },
      });
      attended = !!attendanceRecord;
    }

    // Calculate totals
    const completedCount = submissions.length;
    const totalScore = submissions.reduce((sum, s) => sum + s.score, 0);
    const isWeekComplete = completedCount >= 7;
    const rewardTier = isWeekComplete ? getRewardTier(totalScore) : null;

    // Check for existing reward claim
    let rewardClaim = null;
    if (isWeekComplete) {
      rewardClaim = await db.quizReward.findUnique({
        where: { quizId_memberId: { quizId: quiz.id, memberId } },
        select: {
          rewardTier: true,
          claimStatus: true,
          claimDetails: true,
          totalScore: true,
        },
      });
    }

    const rewardDisplay = rewardTier ? REWARD_DISPLAY[rewardTier] : null;

    // Determine week status label for the client
    const quizWeekStatus = isExpired ? "COMPLETED" : "ACTIVE";

    return NextResponse.json({
      active: true,
      attended,
      isActiveQuiz,
      isExpired,
      quizWeekStatus,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        sermonDate: quiz.sermonDate,
        youtubeVideoId: quiz.youtubeVideoId,
        status: quiz.status,
        eventId: quiz.eventId,
      },
      days,
      currentDay,
      progress: {
        completed: completedCount,
        total: 7,
        totalScore,
        isWeekComplete,
        rewardTier,
        rewardDisplay,
        rewardClaim: rewardClaim ? JSON.parse(JSON.stringify(rewardClaim)) : null,
      },
    });
  } catch (error: any) {
    console.error("[api/quiz/status]", error?.message);
    return NextResponse.json({ error: "Failed to load quiz status" }, { status: 500 });
  }
}
