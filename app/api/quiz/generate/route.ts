/**
 * POST /api/quiz/generate — AI quiz generation (preview only, not saved to DB)
 *
 * Admin/Pastor only.
 * Accepts YouTube URL and/or manual sermon text.
 * Returns generated announcement caption + 5 quiz questions for inline preview.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractVideoId, fetchTranscript } from "@/lib/youtube";
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
    const { youtubeUrl, sermonText, sermonDate, title } = body;

    if (!sermonDate || !title) {
      return NextResponse.json({ error: "Sermon date and title are required" }, { status: 400 });
    }

    let transcript = "";
    let videoId: string | null = null;
    let transcriptSource: "youtube" | "manual" | null = null;

    // Try YouTube first if provided
    if (youtubeUrl) {
      videoId = extractVideoId(youtubeUrl);
      if (videoId) {
        const ytTranscript = await fetchTranscript(videoId);
        if (ytTranscript) {
          transcript = ytTranscript;
          transcriptSource = "youtube";
        }
      }
    }

    // Fall back to manual sermon text
    if (!transcript && sermonText) {
      transcript = sermonText;
      transcriptSource = "manual";
    }

    if (!transcript) {
      return NextResponse.json({
        error: "No transcript available. Please provide a YouTube URL with captions, or paste the sermon notes manually.",
        transcriptSource: null,
      }, { status: 400 });
    }

    // Generate quiz via AI
    const result = await generateQuiz(transcript, sermonDate, title);

    return NextResponse.json({
      success: true,
      transcriptSource,
      videoId,
      transcriptLength: transcript.length,
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
