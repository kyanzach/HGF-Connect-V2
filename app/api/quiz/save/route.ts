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
import { isQuizWeekExpired } from "@/lib/quiz-helpers";

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
    const {
      quizId,
      title,
      sermonDate,
      youtubeUrl,
      transcriptText,
      announcementCaption,
      questions,
      eventId,
      archiveMode,
    } = body;

    if (!title || !sermonDate || !questions?.length) {
      return NextResponse.json({ error: "Title, sermon date, and questions are required" }, { status: 400 });
    }

    const memberId = parseInt(session.user.id, 10);
    const youtubeVideoId = youtubeUrl ? extractVideoId(youtubeUrl) : null;
    const isPast = isQuizWeekExpired(sermonDate);
    const targetStatus = (archiveMode || isPast) ? "completed" : "draft";

    let parsedEventId = eventId ? parseInt(eventId, 10) : NaN;
    if (isNaN(parsedEventId) || !parsedEventId) {
      const sDate = new Date(sermonDate);
      const startOfDay = new Date(sDate.toISOString().split("T")[0] + "T00:00:00.000Z");
      const endOfDay = new Date(sDate.toISOString().split("T")[0] + "T23:59:59.999Z");

      const existingEvent = await db.event.findFirst({
        where: {
          eventType: "sunday_service",
          eventDate: { gte: startOfDay, lte: endOfDay },
        },
      });

      if (existingEvent) {
        parsedEventId = existingEvent.id;
      } else {
        const newEvent = await db.event.create({
          data: {
            title: title || "Sunday Worship Service",
            eventType: "sunday_service",
            eventDate: sDate,
            startTime: new Date("1970-01-01T09:00:00Z"),
            location: "House of Grace Sanctuary",
            description: `Sunday Service sermon: ${title}`,
            createdBy: memberId,
          },
        });
        parsedEventId = newEvent.id;
      }
    }

    if (quizId) {
      // ── Update existing draft ──
      const existing = await db.sermonQuiz.findUnique({ where: { id: quizId } });
      if (!existing || (existing.status !== "draft" && !archiveMode && !isPast)) {
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
          status: targetStatus,
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

      return NextResponse.json({ success: true, quizId, status: targetStatus });
    } else {
      // ── Create new quiz ──
      const quiz = await db.sermonQuiz.create({
        data: {
          title,
          sermonDate: new Date(sermonDate),
          youtubeUrl: youtubeUrl || null,
          youtubeVideoId: youtubeVideoId || null,
          transcriptText: transcriptText || null,
          announcementCaption: announcementCaption || null,
          status: targetStatus,
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
