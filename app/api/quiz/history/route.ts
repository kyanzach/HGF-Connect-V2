import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const quizzes = await db.sermonQuiz.findMany({
      where: { status: { in: ["published", "completed"] } },
      orderBy: { sermonDate: "desc" },
      include: {
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
            isCorrect: true,
          },
        },
      },
    });

    const formatted = quizzes.map((q) => {
      const reward = q.rewards[0];
      const played = q.submissions.length > 0;
      
      // Compute score: count how many of the user's submissions are correct
      const score = reward ? reward.totalScore : q.submissions.filter((s) => s.isCorrect).length;
      
      // Map score to tier if not explicitly saved in reward
      let tier = reward?.rewardTier || null;
      if (played && !tier) {
        if (score >= 7) tier = "PERFECT";
        else if (score >= 6) tier = "EXCELLENT";
        else if (score >= 4) tier = "GOOD";
        else tier = "PARTICIPANT";
      }

      return {
        id: q.id,
        title: q.title,
        sermonDate: q.sermonDate,
        status: q.status,
        played,
        score,
        tier,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[api/quiz/history]", error?.message);
    return NextResponse.json({ error: "Failed to fetch quiz history" }, { status: 500 });
  }
}
