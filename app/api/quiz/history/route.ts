import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isQuizWeekExpired, QUIZ_TYPE_LABELS } from "@/lib/quiz-helpers";
import { isQuizDripEnabled } from "@/lib/quiz-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberId = parseInt(session.user.id, 10);
  if (isNaN(memberId)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const dripEnabled = await isQuizDripEnabled();
    const openAccess = !dripEnabled;

    const quizzes = await db.sermonQuiz.findMany({
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
        rewards: {
          where: { memberId },
          select: {
            totalScore: true,
            rewardTier: true,
            claimStatus: true,
          },
        },
        submissions: {
          where: { memberId },
          select: {
            questionId: true,
            isCorrect: true,
          },
        },
        catchupSessions: {
          where: { memberId },
          select: {
            id: true,
            startedAt: true,
            expiresAt: true,
            isCompleted: true,
          },
        },
      },
    });

    const formatted = quizzes.map((q) => {
      const reward = q.rewards[0];
      const played = q.submissions.length > 0;
      const submissionsCount = q.submissions.length;
      const isExpired = isQuizWeekExpired(q.sermonDate);

      const subByQuestion = new Map(q.submissions.map((s) => [s.questionId, s]));

      // Catch-up status calculation
      const catchup = q.catchupSessions[0] || null;
      let catchupStatus: "none" | "active" | "completed" | "expired" = "none";
      if (catchup) {
        if (catchup.isCompleted || submissionsCount >= 7) {
          catchupStatus = "completed";
        } else if (new Date() < catchup.expiresAt) {
          catchupStatus = "active";
        } else {
          catchupStatus = "expired";
        }
      }

      const score = reward ? reward.totalScore : q.submissions.filter((s) => s.isCorrect).length;

      let tier = reward?.rewardTier || null;
      if (played && !tier) {
        if (score >= 7) tier = "PERFECT";
        else if (score >= 6) tier = "EXCELLENT";
        else if (score >= 4) tier = "GOOD";
        else tier = "PARTICIPANT";
      }

      const slotGameNames: Record<number, string> = {
        1: "Balloon Pop",
        2: "Tree of Wisdom",
        3: "Spotlight 50:50",
        4: "Floating Lanterns",
        5: "Scale of Truth",
        6: "3D Word Harvest",
        7: "Lantern of Grace",
      };

      const items = q.questions.map((item) => {
        const sub = subByQuestion.get(item.id);
        const typeInfo = QUIZ_TYPE_LABELS[item.questionType];
        return {
          questionId: item.id,
          dayNumber: item.dayNumber,
          questionType: item.questionType,
          typeLabel: slotGameNames[item.dayNumber] || typeInfo?.label || item.questionType,
          difficulty: typeInfo?.difficulty || "Medium",
          previewText: item.questionText,
          answered: Boolean(sub),
          isCorrect: sub ? sub.isCorrect : null,
        };
      });

      return {
        id: q.id,
        title: q.title,
        sermonDate: q.sermonDate,
        status: q.status,
        played,
        score,
        tier,
        submissionsCount,
        isExpired,
        openAccess,
        catchupStatus,
        catchupExpiresAt: catchup ? catchup.expiresAt.toISOString() : null,
        hasVideo: Boolean(q.youtubeVideoId),
        items,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[api/quiz/history]", error?.message);
    return NextResponse.json({ error: "Failed to fetch quiz history" }, { status: 500 });
  }
}
