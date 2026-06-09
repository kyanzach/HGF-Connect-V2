import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuizRewardTier } from "@prisma/client";

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

    // ── Check if reward item already exists ──
    const existingItem = await db.quizRewardItem.findUnique({
      where: {
        quizId_rewardTier: {
          quizId: quiz.id,
          rewardTier,
        },
      },
      select: { id: true, postId: true },
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

    let item;
    let finalPostId: number | null = null;

    if (existingItem) {
      // 1. Update existing reward item
      item = await db.quizRewardItem.update({
        where: { id: existingItem.id },
        data: {
          title,
          description: description || null,
          imageUrl: imageUrl || null,
        },
      });

      if (existingItem.postId) {
        // 2. Update existing feed post
        await db.post.update({
          where: { id: existingItem.postId },
          data: {
            content: postContent,
            imageUrl: imageUrl || null,
          },
        });
        finalPostId = existingItem.postId;
      } else {
        // If postId is missing for some reason, create one
        const post = await db.post.create({
          data: {
            authorId: memberId,
            type: "QUIZ_REWARD",
            content: postContent,
            imageUrl: imageUrl || null,
            visibility: "MEMBERS_ONLY",
          },
        });
        await db.quizRewardItem.update({
          where: { id: item.id },
          data: { postId: post.id },
        });
        finalPostId = post.id;
        
        // Notify members (since it's a new post)
        await notifyMembers(title, rewardTier, memberId);
      }
    } else {
      // 1. Create new reward item
      item = await db.quizRewardItem.create({
        data: {
          quizId: quiz.id,
          rewardTier,
          title,
          description: description || null,
          imageUrl: imageUrl || null,
        },
      });

      // 2. Create the feed post
      const post = await db.post.create({
        data: {
          authorId: memberId,
          type: "QUIZ_REWARD",
          content: postContent,
          imageUrl: imageUrl || null,
          visibility: "MEMBERS_ONLY",
        },
      });

      // 3. Link post to reward item
      await db.quizRewardItem.update({
        where: { id: item.id },
        data: { postId: post.id },
      });
      finalPostId = post.id;

      // 4. Notify members
      await notifyMembers(title, rewardTier, memberId);
    }

    return NextResponse.json({ success: true, rewardItemId: item.id, postId: finalPostId });
  } catch (error: any) {
    console.error("[api/quiz/rewards/announce]", error?.message);
    return NextResponse.json({ error: "Failed to publish reward announcement" }, { status: 500 });
  }
}

async function notifyMembers(title: string, rewardTier: string, actorId: number) {
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
        actorId,
      })),
    });
  }
}
