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
import { extractVideoId, fetchTranscriptWithMeta } from "@/lib/youtube";

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
    const { sermonText, sermonDate, eventId, youtubeUrl } = body;

    if (!sermonDate) {
      return NextResponse.json({ error: "Sermon date is required" }, { status: 400 });
    }

    let sourceText = sermonText;
    let transcriptSource = "manual";
    let videoId: string | null = null;

    // If manual notes not provided, try YouTube CC transcript first
    if ((!sourceText || !sourceText.trim()) && youtubeUrl) {
      const cleanId = extractVideoId(youtubeUrl);
      if (cleanId) {
        videoId = cleanId;
        const ytResult = await fetchTranscriptWithMeta(cleanId);
        if (ytResult && ytResult.text && ytResult.text.trim()) {
          sourceText = ytResult.text;
          transcriptSource = "youtube";
          console.log(`[quiz/generate] Successfully extracted ${ytResult.wordCount} words from YouTube CC for video ${cleanId}`);
        }
      }
    }

    let titleHint: string | undefined;
    let speaker: string | null = null;

    // If still empty, try linked presentation slides commentary, description, or title
    if ((!sourceText || !sourceText.trim()) && eventId) {
      const event = await db.event.findUnique({
        where: { id: eventId },
        select: { title: true, speaker: true, commentary: true, description: true },
      });
      if (event) {
        titleHint = event.title;
        speaker = event.speaker;
        if (event.commentary && event.commentary.trim()) {
          sourceText = `Sermon Title: ${event.title}\n${event.speaker ? `Speaker: ${event.speaker}\n` : ""}${event.description ? `Description: ${event.description}\n` : ""}\nSermon Summary:\n${event.commentary}`;
          transcriptSource = "slides";
        } else if (event.description && event.description.trim()) {
          sourceText = `Sermon Title: ${event.title}\n${event.speaker ? `Speaker: ${event.speaker}\n` : ""}Description:\n${event.description}`;
          transcriptSource = "event_description";
        } else if (event.title && event.title.trim()) {
          sourceText = `Sunday Worship Service Sermon Title: ${event.title}${event.speaker ? `\nSpeaker: ${event.speaker}` : ""}`;
          transcriptSource = "event_title";
        }
      }
    }

    if (!sourceText || !sourceText.trim()) {
      return NextResponse.json(
        {
          error:
            "Sermon material is required: please link a Sunday Service event, provide sermon notes, or paste a YouTube URL.",
        },
        { status: 400 }
      );
    }

    // Generate quiz via AI
    const result = await generateQuiz(sourceText, sermonDate, {
      titleHint,
      speaker,
      skipCleanup: transcriptSource !== "youtube" && transcriptSource !== "manual",
      hasVideo: Boolean(videoId),
    });

    return NextResponse.json({
      success: true,
      transcriptSource,
      videoId,
      sourceText,
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
