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
  if (role === "admin" || role === "moderator") return true;

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
    const { sermonText, sermonDate, eventId } = body;

    if (!sermonDate) {
      return NextResponse.json({ error: "Sermon date is required" }, { status: 400 });
    }

    let sourceText = sermonText;
    let transcriptSource = "manual";

    if ((!sourceText || !sourceText.trim()) && eventId) {
      const event = await db.event.findUnique({
        where: { id: eventId },
        select: { commentary: true },
      });
      if (event && event.commentary && event.commentary.trim()) {
        sourceText = event.commentary;
        transcriptSource = "slides";
      }
    }

    if (!sourceText || !sourceText.trim()) {
      return NextResponse.json(
        { error: "Sermon notes are required, or link an event with uploaded slides to generate from slides." },
        { status: 400 }
      );
    }

    // Generate quiz via AI
    const result = await generateQuiz(sourceText, sermonDate);

    return NextResponse.json({
      success: true,
      transcriptSource,
      videoId: null,
      transcriptLength: sourceText.length,
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
