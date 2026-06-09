import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuizRewardTier } from "@prisma/client";

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
    const { rewardTier, title, description, imageUrl } = await request.json();

    if (!rewardTier || !title) {
      return NextResponse.json({ error: "rewardTier and title are required" }, { status: 400 });
    }

    // Validate tier is valid enum
    const validTiers = Object.values(QuizRewardTier);
    if (!validTiers.includes(rewardTier)) {
      return NextResponse.json({ error: "Invalid reward tier" }, { status: 400 });
    }

    // Find current active published quiz
    const quiz = await db.sermonQuiz.findFirst({
      where: { status: "published" },
      orderBy: { sermonDate: "desc" },
    });

    if (!quiz) {
      return NextResponse.json({ error: "No active published quiz found to link the reward to" }, { status: 404 });
    }

    const memberId = parseInt(session.user.id, 10);

    // ── Create or update QuizRewardItem ──
    const item = await db.quizRewardItem.upsert({
      where: {
        quizId_rewardTier: {
          quizId: quiz.id,
          rewardTier,
        },
      },
      update: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
      },
      create: {
        quizId: quiz.id,
        rewardTier,
        title,
        description: description || null,
        imageUrl: imageUrl || null,
      },
    });

    // ── Generate exciting feed post content ──
    const tierLabels: Record<string, string> = {
      PERFECT: "🏆 7/7 Perfect Score",
      EXCELLENT: "🌟 6/7 Excellent Score",
      GOOD: "👏 4/7 or 5/7 Good Score",
      PARTICIPANT: "🙏 Sincere Participation",
    };

    const postContent = [
      `🎁 WEEKLY QUIZ REWARD ANNOUNCEMENT! 🎁`,
      "",
      `Sermon: "${quiz.title}"`,
      `Requirement: ${tierLabels[rewardTier] || rewardTier}`,
      `Prize: ${title}`,
      description ? `About the prize: ${description}` : "",
      "",
      `Let's study the Word and review Sunday's sermon together. Play the daily challenges, climb the leaderboard, and unlock this week's reward! 🧠✨`,
    ].filter(Boolean).join("\n");

    // Create the QUIZ_REWARD feed post
    const post = await db.post.create({
      data: {
        authorId: memberId,
        type: "QUIZ_REWARD",
        content: postContent,
        imageUrl: imageUrl || null,
        visibility: "MEMBERS_ONLY",
      },
    });

    // Update QuizRewardItem with link to the created feed post
    await db.quizRewardItem.update({
      where: { id: item.id },
      data: { postId: post.id },
    });

    // ── Notify members ──
    const activeMembers = await db.member.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    if (activeMembers.length > 0) {
      await db.notification.createMany({
        data: activeMembers.map((m) => ({
          memberId: m.id,
          type: "quiz_announcement" as const,
          title: "🎁 New Quiz Reward Announced!",
          body: `We are giving away "${title}" for achieving a ${rewardTier.toLowerCase()} score this week. Play now!`,
          link: "/quiz",
          actorId: memberId,
        })),
      });
    }

    return NextResponse.json({ success: true, rewardItemId: item.id, postId: post.id });
  } catch (error: any) {
    console.error("[api/quiz/rewards/announce]", error?.message);
    return NextResponse.json({ error: "Failed to publish reward announcement" }, { status: 500 });
  }
}
