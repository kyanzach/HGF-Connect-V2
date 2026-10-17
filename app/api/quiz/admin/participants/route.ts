import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRewardTier } from "@/lib/quiz-helpers";

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const quizIdParam = searchParams.get("quizId");
  const quizId = quizIdParam ? parseInt(quizIdParam, 10) : null;

  if (!quizId || isNaN(quizId)) {
    return NextResponse.json({ error: "Valid quizId is required" }, { status: 400 });
  }

  try {
    const quiz = await db.sermonQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { dayNumber: "asc" },
          select: { id: true, dayNumber: true, questionType: true, questionText: true },
        },
        rewards: true,
        catchupSessions: {
          select: { memberId: true, isCompleted: true, startedAt: true },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Fetch all submissions for this quiz with member details
    const submissions = await db.quizSubmission.findMany({
      where: { quizId },
      include: {
        question: { select: { dayNumber: true } },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePictureThumbnail: true,
            profilePicture: true,
            phone: true,
            ministries: {
              where: { status: "active" },
              include: { ministry: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    // Group submissions by member
    const memberMap = new Map<number, {
      memberId: number;
      name: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
      maskedPhone: string;
      ministries: string[];
      submissions: any[];
      firstSubmittedAt: Date | null;
      lastSubmittedAt: Date | null;
      totalScore: number;
    }>();

    for (const sub of submissions) {
      const mId = sub.memberId;
      if (!memberMap.has(mId)) {
        const phone = sub.member.phone || "";
        const masked = phone.length > 7
          ? phone.slice(0, 4) + "****" + phone.slice(-3)
          : phone;

        memberMap.set(mId, {
          memberId: mId,
          name: `${sub.member.firstName} ${sub.member.lastName}`.trim(),
          firstName: sub.member.firstName,
          lastName: sub.member.lastName,
          photoUrl: sub.member.profilePictureThumbnail || sub.member.profilePicture || null,
          maskedPhone: masked,
          ministries: sub.member.ministries?.map((mm: any) => mm.ministry.name) || [],
          submissions: [],
          firstSubmittedAt: sub.submittedAt,
          lastSubmittedAt: sub.submittedAt,
          totalScore: 0,
        });
      }

      const mData = memberMap.get(mId)!;
      mData.submissions.push({
        questionId: sub.questionId,
        dayNumber: sub.question.dayNumber,
        isCorrect: sub.isCorrect,
        score: sub.score,
        aiFeedback: sub.aiFeedback,
        submittedAt: sub.submittedAt,
      });
      mData.totalScore += sub.score;
      if (!mData.firstSubmittedAt || sub.submittedAt < mData.firstSubmittedAt) {
        mData.firstSubmittedAt = sub.submittedAt;
      }
      if (!mData.lastSubmittedAt || sub.submittedAt > mData.lastSubmittedAt) {
        mData.lastSubmittedAt = sub.submittedAt;
      }
    }

    // Build structured participant items
    const catchupMap = new Map<number, boolean>();
    quiz.catchupSessions.forEach((c) => catchupMap.set(c.memberId, c.isCompleted));

    const rewardMap = new Map<number, any>();
    quiz.rewards.forEach((r) => rewardMap.set(r.memberId, r));

    const totalQuestions = quiz.questions.length || 7;
    const participants = Array.from(memberMap.values()).map((p) => {
      // Build day progress array for all 7 days
      const dayProgress = [];
      for (let day = 1; day <= totalQuestions; day++) {
        const subForDay = p.submissions.find((s) => s.dayNumber === day);
        dayProgress.push({
          dayNumber: day,
          completed: !!subForDay,
          isCorrect: subForDay?.isCorrect ?? false,
          score: subForDay?.score ?? 0,
          submittedAt: subForDay?.submittedAt ?? null,
        });
      }

      const daysCompleted = p.submissions.length;
      const isCompleted = daysCompleted >= totalQuestions;
      const rewardTier = getRewardTier(p.totalScore);
      const rewardClaim = rewardMap.get(p.memberId);

      return {
        memberId: p.memberId,
        name: p.name,
        firstName: p.firstName,
        lastName: p.lastName,
        photoUrl: p.photoUrl,
        maskedPhone: p.maskedPhone,
        ministries: p.ministries,
        daysCompleted,
        isCompleted,
        totalScore: p.totalScore,
        rewardTier,
        dayProgress,
        firstSubmittedAt: p.firstSubmittedAt,
        lastSubmittedAt: p.lastSubmittedAt,
        isCatchup: catchupMap.has(p.memberId),
        claimStatus: rewardClaim?.claimStatus || "unclaimed",
      };
    });

    // Sort participants: Completed first, then by highest score, then by latest active
    participants.sort((a, b) => {
      if (b.daysCompleted !== a.daysCompleted) return b.daysCompleted - a.daysCompleted;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      const timeA = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
      const timeB = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
      return timeB - timeA;
    });

    // Compute Summary Analytics
    const totalParticipants = participants.length;
    const completedCount = participants.filter((p) => p.isCompleted).length;
    const perfectScoreCount = participants.filter((p) => p.totalScore >= totalQuestions).length;
    const completionRate = totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;
    const averageScore = totalParticipants > 0
      ? parseFloat((participants.reduce((acc, p) => acc + p.totalScore, 0) / totalParticipants).toFixed(1))
      : 0;

    // Day drop-off funnel
    const dayDropoff = [];
    for (let day = 1; day <= totalQuestions; day++) {
      const count = submissions.filter((s) => s.question.dayNumber === day).length;
      const correctCount = submissions.filter((s) => s.question.dayNumber === day && s.isCorrect).length;
      dayDropoff.push({
        dayNumber: day,
        participants: count,
        correctCount,
        accuracyRate: count > 0 ? Math.round((correctCount / count) * 100) : 0,
      });
    }

    // Tier distribution
    const tierDistribution = {
      PERFECT: participants.filter((p) => p.rewardTier === "PERFECT").length,
      EXCELLENT: participants.filter((p) => p.rewardTier === "EXCELLENT").length,
      GOOD: participants.filter((p) => p.rewardTier === "GOOD").length,
      PARTICIPANT: participants.filter((p) => p.rewardTier === "PARTICIPANT").length,
    };

    return NextResponse.json({
      quiz: {
        id: quiz.id,
        title: quiz.title,
        sermonDate: quiz.sermonDate,
        status: quiz.status,
        totalQuestions,
      },
      summary: {
        totalParticipants,
        totalSubmissions: submissions.length,
        completedCount,
        completionRate,
        perfectScoreCount,
        averageScore,
        tierDistribution,
        dayDropoff,
      },
      participants,
    });
  } catch (error: any) {
    console.error("[api/quiz/admin/participants]", error?.message);
    return NextResponse.json({ error: "Failed to fetch quiz participants" }, { status: 500 });
  }
}

// POST: Nudge in-progress participant(s) via In-App Bell Notification (No SMS)
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = parseInt(session.user.id, 10);

  try {
    const { quizId, targetMemberId, nudgeAllInProgress } = await request.json();

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const quiz = await db.sermonQuiz.findUnique({
      where: { id: quizId },
      include: { questions: { select: { id: true } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const totalQuestions = quiz.questions.length || 7;

    // Identify target members to notify
    let targetIds: number[] = [];

    if (targetMemberId) {
      targetIds = [parseInt(targetMemberId, 10)];
    } else if (nudgeAllInProgress) {
      // Find all members who have started this quiz but have not finished all questions
      const submissions = await db.quizSubmission.findMany({
        where: { quizId },
        select: { memberId: true },
      });

      const memberCounts = new Map<number, number>();
      submissions.forEach((s) => {
        memberCounts.set(s.memberId, (memberCounts.get(s.memberId) || 0) + 1);
      });

      memberCounts.forEach((count, mId) => {
        if (count < totalQuestions) {
          targetIds.push(mId);
        }
      });
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "No eligible in-progress participants to nudge." });
    }

    // Create in-app bell notifications (Zero SMS)
    await db.notification.createMany({
      data: targetIds.map((mId) => ({
        memberId: mId,
        type: "quiz_daily" as const,
        title: "🧠 Keep your Quiz streak going!",
        body: `You have questions waiting in "${quiz.title}". Answer today's challenge to stay in the running for Sunday prizes!`,
        link: `/quiz?quizId=${quiz.id}`,
        actorId: adminId,
      })),
    });

    return NextResponse.json({
      success: true,
      count: targetIds.length,
      message: `Sent in-app reminder to ${targetIds.length} participant${targetIds.length > 1 ? "s" : ""}!`,
    });
  } catch (error: any) {
    console.error("[api/quiz/admin/participants/nudge]", error?.message);
    return NextResponse.json({ error: "Failed to send nudge" }, { status: 500 });
  }
}
