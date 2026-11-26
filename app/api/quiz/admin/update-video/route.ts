/**
 * POST /api/quiz/admin/update-video — Attach or update YouTube replay URL on any quiz
 *
 * Admin/Pastor only.
 * Works for draft, published, AND completed quizzes so Sunday quizzes generated
 * without a YouTube video can have their replay added anytime later.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractVideoId } from "@/lib/youtube";

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
    const body = await request.json();
    const quizId = Number(body.quizId);
    const rawUrl = typeof body.youtubeUrl === "string" ? body.youtubeUrl.trim() : "";

    if (!quizId || isNaN(quizId)) {
      return NextResponse.json({ error: "Valid quizId is required" }, { status: 400 });
    }

    const existing = await db.sermonQuiz.findUnique({
      where: { id: quizId },
      select: { id: true, announcementPostId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    let youtubeVideoId: string | null = null;
    if (rawUrl) {
      youtubeVideoId = extractVideoId(rawUrl);
      if (!youtubeVideoId) {
        return NextResponse.json(
          { error: "Please enter a valid YouTube video URL (e.g. youtube.com/watch?v=... or youtu.be/...)." },
          { status: 400 }
        );
      }
    }

    const updated = await db.sermonQuiz.update({
      where: { id: quizId },
      data: {
        youtubeUrl: rawUrl || null,
        youtubeVideoId,
      },
      select: {
        id: true,
        youtubeUrl: true,
        youtubeVideoId: true,
      },
    });

    // If the quiz has an announcement post without a thumbnail, attach the YouTube thumbnail
    if (youtubeVideoId && existing.announcementPostId) {
      const post = await db.post.findUnique({
        where: { id: existing.announcementPostId },
        select: { id: true, imageUrl: true },
      });
      if (post && !post.imageUrl) {
        await db.post.update({
          where: { id: post.id },
          data: { imageUrl: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` },
        });
      }
    }

    return NextResponse.json({ success: true, quiz: updated });
  } catch (error: any) {
    console.error("[api/quiz/admin/update-video]", error?.message);
    return NextResponse.json({ error: "Failed to update YouTube replay" }, { status: 500 });
  }
}
