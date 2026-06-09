/**
 * /api/quiz/rewards — Reward claim + admin management
 *
 * POST  — Member claims reward (submits t-shirt size for PERFECT)
 * GET   — Admin lists all rewards for a quiz week
 * PATCH — Admin marks reward as distributed
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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

// ── POST: Member claims reward ──
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id, 10);
  try {
    const { quizId, claimDetails } = await request.json();
    if (!quizId) return NextResponse.json({ error: "quizId required" }, { status: 400 });

    const reward = await db.quizReward.findUnique({
      where: { quizId_memberId: { quizId, memberId } },
    });
    if (!reward) return NextResponse.json({ error: "No reward found" }, { status: 404 });
    if (reward.rewardTier !== "PERFECT") {
      return NextResponse.json({ error: "Only perfect scores can claim details" }, { status: 400 });
    }
    if (reward.claimStatus !== "unclaimed") {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }

    await db.quizReward.update({
      where: { id: reward.id },
      data: {
        claimStatus: "claimed",
        claimDetails: claimDetails || {},
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/quiz/rewards] POST", error?.message);
    return NextResponse.json({ error: "Failed to claim reward" }, { status: 500 });
  }
}

// ── GET: Admin lists rewards ──
export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const quizId = parseInt(searchParams.get("quizId") || "", 10);

    const where = quizId ? { quizId } : {};

    const rewards = await db.quizReward.findMany({
      where,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
        quiz: { select: { id: true, title: true, sermonDate: true } },
      },
      orderBy: [{ rewardTier: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(JSON.parse(JSON.stringify(rewards)));
  } catch (error: any) {
    console.error("[api/quiz/rewards] GET", error?.message);
    return NextResponse.json({ error: "Failed to load rewards" }, { status: 500 });
  }
}

// ── PATCH: Admin marks reward as distributed ──
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { rewardId } = await request.json();
    if (!rewardId) return NextResponse.json({ error: "rewardId required" }, { status: 400 });

    await db.quizReward.update({
      where: { id: rewardId },
      data: {
        claimStatus: "distributed",
        distributedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[api/quiz/rewards] PATCH", error?.message);
    return NextResponse.json({ error: "Failed to update reward" }, { status: 500 });
  }
}
