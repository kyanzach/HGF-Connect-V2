/**
 * POST /api/quiz/save — Save or update a quiz as draft
 *
 * Admin/Pastor only.
 * Creates a new SermonQuiz + QuizQuestion rows in draft status.
 * If quizId is provided, updates existing draft quiz.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractVideoId } from "@/lib/youtube";

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
    const body = await request.json();
    const {
      quizId,
      title,
      sermonDate,
      youtubeUrl,
      transcriptText,
      announcementCaption,
      questions,
      eventId,
    } = body;

    if (!title || !sermonDate || !questions?.length) {
      return NextResponse.json({ error: "Title, sermon date, and questions are required" }, { status: 400 });
    }
    if (!eventId) {
      return NextResponse.json({ error: "Linked Sunday Service event (eventId) is required" }, { status: 400 });
    }

    const memberId = parseInt(session.user.id, 10);
    const youtubeVideoId = youtubeUrl ? extractVideoId(youtubeUrl) : null;
    const parsedEventId = parseInt(eventId, 10);
    if (isNaN(parsedEventId)) {
      return NextResponse.json({ error: "Invalid Event ID" }, { status: 400 });
    }

    if (quizId) {
      // ── Update existing draft ──
      const existing = await db.sermonQuiz.findUnique({ where: { id: quizId } });
      if (!existing || existing.status !== "draft") {
        return NextResponse.json({ error: "Quiz not found or already published" }, { status: 400 });
      }

      // Update quiz metadata
      await db.sermonQuiz.update({
        where: { id: quizId },
        data: {
          title,
          sermonDate: new Date(sermonDate),
          youtubeUrl: youtubeUrl || null,
          youtubeVideoId: youtubeVideoId || null,
          transcriptText: transcriptText || null,
          announcementCaption: announcementCaption || null,
          eventId: parsedEventId,
        },
      });

      // Replace all questions
      await db.quizQuestion.deleteMany({ where: { quizId } });
      await db.quizQuestion.createMany({
        data: questions.map((q: any) => ({
          quizId,
          dayNumber: q.dayNumber,
          questionType: q.questionType,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          options: q.options || null,
          hint: q.hint || null,
          explanation: q.explanation || null,
        })),
      });

      return NextResponse.json({ success: true, quizId });
    } else {
      // ── Create new draft quiz ──
      const quiz = await db.sermonQuiz.create({
        data: {
          title,
          sermonDate: new Date(sermonDate),
          youtubeUrl: youtubeUrl || null,
          youtubeVideoId: youtubeVideoId || null,
          transcriptText: transcriptText || null,
          announcementCaption: announcementCaption || null,
          status: "draft",
          createdById: memberId,
          eventId: parsedEventId,
          questions: {
            create: questions.map((q: any) => ({
              dayNumber: q.dayNumber,
              questionType: q.questionType,
              questionText: q.questionText,
              correctAnswer: q.correctAnswer,
              options: q.options || null,
              hint: q.hint || null,
              explanation: q.explanation || null,
            })),
          },
        },
      });

      return NextResponse.json({ success: true, quizId: quiz.id });
    }
  } catch (error: any) {
    console.error("[api/quiz/save]", error?.message);
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
  }
}
