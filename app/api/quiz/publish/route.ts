/**
 * POST /api/quiz/publish — Publish quiz + create announcement post + notify
 *
 * Admin/Pastor only.
 * Changes quiz status from draft → published.
 * Creates the QUIZ_ANNOUNCEMENT feed post.
 * Fires bell notifications to all active members.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin") return true;
  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;
  const pm = await db.memberMinistry.findFirst({
    where: { memberId, ministryId: 11, status: "active" },
  });
  return !!pm;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { quizId } = await request.json();
    if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

    const quiz = await db.sermonQuiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (quiz.status !== "draft") {
      return NextResponse.json({ error: "Quiz already published" }, { status: 400 });
    }
    if (quiz.questions.length < 5) {
      return NextResponse.json({ error: "Quiz must have 5 questions (one per day)" }, { status: 400 });
    }

    const memberId = parseInt(session.user.id, 10);

    // ── Create announcement post in community feed ──
    const videoId = quiz.youtubeVideoId;
    const thumbnailUrl = videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null;

    const postContent = [
      quiz.announcementCaption || `📺 Here's a replay of Sunday's sermon: "${quiz.title}"`,
      "",
      "🧠 Get ready for this week's Quiz for Christ!",
      "5 daily challenges starting Tuesday — from easy to hard.",
      "Perfect score? You might win a prize! 🎁",
    ].join("\n");

    const post = await db.post.create({
      data: {
        authorId: memberId,
        type: "QUIZ_ANNOUNCEMENT",
        content: postContent,
        imageUrl: thumbnailUrl,
        visibility: "MEMBERS_ONLY",
      },
    });

    // ── Update quiz status ──
    await db.sermonQuiz.update({
      where: { id: quizId },
      data: {
        status: "published",
        announcementPostId: post.id,
      },
    });

    // ── Fire bell notifications to all active members ──
    const activeMembers = await db.member.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    if (activeMembers.length > 0) {
      await db.notification.createMany({
        data: activeMembers.map((m) => ({
          memberId: m.id,
          type: "quiz_announcement" as const,
          title: "🧠 Quiz for Christ is HERE!",
          body: `This week's quiz based on "${quiz.title}" starts Tuesday. Are you ready?`,
          link: "/quiz",
          actorId: memberId,
        })),
      });
    }

    return NextResponse.json({ success: true, postId: post.id });
  } catch (error: any) {
    console.error("[api/quiz/publish]", error?.message);
    return NextResponse.json({ error: "Failed to publish quiz" }, { status: 500 });
  }
}
