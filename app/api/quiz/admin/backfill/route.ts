import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QUIZ_DAYS, QUIZ_TYPE_LABELS, getDayNumber } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin" || role === "moderator") return true;

  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;

  const pm = await db.memberMinistry.findFirst({
    where: { memberId, ministryId: 11, status: "active" },
  });
  return !!pm;
}

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Find the currently active published quiz
    const quiz = await db.sermonQuiz.findFirst({
      where: { status: "published" },
      orderBy: { sermonDate: "desc" },
      include: {
        questions: { orderBy: { dayNumber: "asc" } },
        creator: { select: { id: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ message: "No active published quiz found" });
    }

    const currentDay = getDayNumber();
    const backfilledDays: number[] = [];

    // Loop through past/current days that should have posts (Day 2 to currentDay)
    for (const dayInfo of QUIZ_DAYS) {
      // Mondays (Day 1) are handled by the main announcement post.
      if (dayInfo.dayNumber === 1 || dayInfo.dayNumber > currentDay) {
        continue;
      }

      const question = quiz.questions.find((q) => q.dayNumber === dayInfo.dayNumber);
      if (!question) continue;

      // Skip if already posted
      if (question.feedPostId) continue;

      const typeInfo = QUIZ_TYPE_LABELS[dayInfo.type];

      // ── Create feed post ──
      const postContent = [
        `🧠 Day ${dayInfo.dayNumber} Quiz is LIVE! 🧠`,
        "",
        `Topic: "${quiz.title}"`,
        "",
        `${typeInfo.emoji} Today's Challenge: ${typeInfo.label}`,
        `⚡ Difficulty: ${typeInfo.difficulty}`,
        "",
        `Let's test our understanding of Sunday's sermon and study the Word together! Tap the play button below to launch today's game and earn points.`,
      ].join("\n");

      const post = await db.post.create({
        data: {
          authorId: quiz.creator.id,
          type: "QUIZ_DAILY",
          content: postContent,
          visibility: "MEMBERS_ONLY",
          createdAt: new Date(), // post now
        },
      });

      // Link post to question
      await db.quizQuestion.update({
        where: { id: question.id },
        data: { feedPostId: post.id },
      });

      // ── Fire bell notifications ──
      const activeMembers = await db.member.findMany({
        where: { status: "active" },
        select: { id: true },
      });

      if (activeMembers.length > 0) {
        await db.notification.createMany({
          data: activeMembers.map((m) => ({
            memberId: m.id,
            type: "quiz_daily" as const,
            title: `🧠 Day ${dayInfo.dayNumber}: ${typeInfo.label}`,
            body: `Today's Quiz for Christ challenge is ready! Can you get it right?`,
            link: `/quiz?day=${dayInfo.dayNumber}`,
            actorId: quiz.creator.id,
          })),
        });
      }

      backfilledDays.push(dayInfo.dayNumber);
    }

    return NextResponse.json({
      success: true,
      backfilled: backfilledDays,
      message: `Successfully backfilled feed posts and notifications for days: ${backfilledDays.join(", ")}`,
    });
  } catch (error: any) {
    console.error("[api/quiz/admin/backfill]", error?.message);
    return NextResponse.json({ error: "Failed to backfill posts: " + error.message }, { status: 500 });
  }
}
