import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get active quiz
    const activeQuiz = await db.sermonQuiz.findFirst({
      where: { status: { in: ["published", "completed"] } },
      orderBy: { sermonDate: "desc" },
    });

    let weeklyLeaderboard: any[] = [];

    if (activeQuiz) {
      const activeSubmissions = await db.quizSubmission.findMany({
        where: {
          quizId: activeQuiz.id,
          isCorrect: true,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
      });

      const scoreMap: Record<number, { member: any; score: number }> = {};
      for (const sub of activeSubmissions) {
        if (!sub.member) continue;
        const mId = sub.memberId;
        if (!scoreMap[mId]) {
          scoreMap[mId] = {
            member: sub.member,
            score: 0,
          };
        }
        scoreMap[mId].score += 1;
      }

      weeklyLeaderboard = Object.values(scoreMap)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }

    // 2. All-Time Leaderboard
    const allTimeMembers = await db.member.findMany({
      where: { status: "active" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        _count: {
          select: {
            quizSubmissions: {
              where: { isCorrect: true },
            },
          },
        },
      },
      orderBy: {
        quizSubmissions: {
          _count: "desc",
        },
      },
      take: 10,
    });

    const allTimeLeaderboard = allTimeMembers
      .map((m) => ({
        member: {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          profilePicture: m.profilePicture,
        },
        score: m._count.quizSubmissions,
      }))
      .filter((m) => m.score > 0);

    return NextResponse.json({
      success: true,
      weekly: weeklyLeaderboard,
      allTime: allTimeLeaderboard,
    });
  } catch (error: any) {
    console.error("[api/quiz/leaderboard]", error?.message);
    return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
