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
        _count: {
          select: {
            submissions: {
              where: { memberId },
            },
          },
        },
      },
    });

    return NextResponse.json(JSON.parse(JSON.stringify(quizzes)));
  } catch (error: any) {
    console.error("[api/quiz/history]", error?.message);
    return NextResponse.json({ error: "Failed to fetch quiz history" }, { status: 500 });
  }
}
