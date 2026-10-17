/**
 * POST /api/quiz/admin/fetch-transcript
 *
 * Admin / Pastor endpoint to scrape/download closed captions (CC)
 * from a YouTube video URL and return plain text transcript + metadata.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractVideoId, fetchTranscriptWithMeta } from "@/lib/youtube";

export const dynamic = "force-dynamic";

async function isPastorOrAdmin(session: any): Promise<boolean> {
  const role = session?.user?.role;
  if (role === "admin" || role === "moderator") return true;

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
    return NextResponse.json({ error: "Only pastors and admins can fetch sermon transcripts" }, { status: 403 });
  }

  try {
    const { url, videoId } = await request.json();
    const target = (url || videoId || "").trim();

    if (!target) {
      return NextResponse.json({ error: "YouTube video URL or Video ID is required" }, { status: 400 });
    }

    const cleanId = extractVideoId(target);
    if (!cleanId) {
      return NextResponse.json({ error: "Invalid YouTube URL or Video ID format" }, { status: 400 });
    }

    const result = await fetchTranscriptWithMeta(cleanId);
    if (!result || !result.text) {
      return NextResponse.json(
        {
          error:
            "No closed captions / transcript found for this video. YouTube may still be generating auto-captions, or CC is disabled on this video.",
          videoId: cleanId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId: cleanId,
      transcript: result.text,
      title: result.title || null,
      language: result.language || "English",
      wordCount: result.wordCount,
      charCount: result.charCount,
      segmentCount: result.segmentCount,
    });
  } catch (error: any) {
    console.error("[api/quiz/admin/fetch-transcript]", error?.message);
    return NextResponse.json({ error: error?.message || "Failed to fetch YouTube transcript" }, { status: 500 });
  }
}
