/**
 * POST /api/quiz/daily-post — Cron endpoint for auto-posting daily quiz
 *
 * Called by server crontab at 6:00 AM Manila (Tue–Sat).
 * Protected by X-Cron-Secret header.
 * Creates QUIZ_DAILY feed post + fires notifications.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUIZ_DAYS, QUIZ_TYPE_LABELS } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // ── Auth: cron secret ──
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // What day is it in Manila?
    const now = new Date();
    const manila = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const weekday = manila.getDay(); // 0=Sun ... 6=Sat

    const dayInfo = QUIZ_DAYS.find((d) => d.weekday === weekday);
    if (!dayInfo) {
      return NextResponse.json({ message: "Not a quiz day (Sun/Mon)" });
    }

    // Find the currently published quiz
    const quiz = await db.sermonQuiz.findFirst({
      where: { status: "published" },
      orderBy: { sermonDate: "desc" },
      include: {
        questions: { where: { dayNumber: dayInfo.dayNumber } },
        creator: { select: { id: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ message: "No active published quiz" });
    }

    const question = quiz.questions[0];
    if (!question) {
      return NextResponse.json({ message: `No question found for day ${dayInfo.dayNumber}` });
    }

    // Check if post already created for this day
    if (question.feedPostId) {
      return NextResponse.json({ message: "Daily post already created" });
    }

    const typeInfo = QUIZ_TYPE_LABELS[dayInfo.type];

    // ── Create feed post ──
    const postContent = [
      `🧠 Day ${dayInfo.dayNumber} Quiz is LIVE!`,
      "",
      `${typeInfo.emoji} Today's Challenge: ${typeInfo.label}`,
      `Difficulty: ${typeInfo.difficulty}`,
      "",
      `Based on: "${quiz.title}"`,
      "",
      "Tap below to play! →",
    ].join("\n");

    const post = await db.post.create({
      data: {
        authorId: quiz.creator.id,
        type: "QUIZ_DAILY",
        content: postContent,
        visibility: "MEMBERS_ONLY",
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

    // If this is the last day (Saturday), also mark quiz as completed
    if (dayInfo.dayNumber === 5) {
      // We'll complete it the next day (Sunday) or leave it published
      // so late Saturday players can still submit
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      day: dayInfo.dayNumber,
      label: dayInfo.label,
      notified: activeMembers.length,
    });
  } catch (error: any) {
    console.error("[api/quiz/daily-post]", error?.message);
    return NextResponse.json({ error: "Failed to create daily post" }, { status: 500 });
  }
}
