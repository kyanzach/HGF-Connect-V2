/**
 * POST /api/quiz/generate — AI quiz generation (preview only, not saved to DB)
 *
 * Admin/Pastor only.
 * Accepts manual sermon text/transcript.
 * Returns generated quiz title, announcement caption, and 5 progressive quiz questions.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateQuiz } from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin") return true;

  // Check Pastoral Ministry membership (ID 11)
  const memberId = parseInt(session?.user?.id, 10);
  if (isNaN(memberId)) return false;

  const pastoralMembership = await db.memberMinistry.findFirst({
    where: {
      memberId,
      ministryId: 11,
      status: "active",
    },
  });
  return !!pastoralMembership;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorized = await isPastorOrAdmin(session);
  if (!authorized) {
    return NextResponse.json({ error: "Only pastors and admins can generate quizzes" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sermonText, sermonDate } = body;

    if (!sermonDate) {
      return NextResponse.json({ error: "Sermon date is required" }, { status: 400 });
    }
    if (!sermonText || !sermonText.trim()) {
      return NextResponse.json({ error: "Sermon notes or transcript script is required" }, { status: 400 });
    }

    // Generate quiz via AI
    const result = await generateQuiz(sermonText, sermonDate);

    return NextResponse.json({
      success: true,
      transcriptSource: "manual",
      videoId: null,
      transcriptLength: sermonText.length,
      title: result.title,
      announcementCaption: result.announcementCaption,
      questions: result.questions,
    });
  } catch (error: any) {
    console.error("[api/quiz/generate]", error?.message);
    return NextResponse.json(
      { error: "Failed to generate quiz. Please try again or edit manually." },
      { status: 500 }
    );
  }
}
