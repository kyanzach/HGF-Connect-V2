/**
 * POST /api/quiz/auto-generate-sunday — Instant Sunday 12:00 PM Quiz Generator
 *
 * Protected by X-Cron-Secret header.
 * Runs automatically every Sunday at 12:00 PM Manila time (04:00 UTC) right after Sunday service,
 * and can also be called with { eventId } or { date: "YYYY-MM-DD" } to backfill any missing Sunday.
 *
 * Works WITHOUT a YouTube script or video — builds questions from the Sunday Service event's
 * commentary (slide notes), description, and title. YouTube replay can always be attached later.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateQuiz, isQuizWeekExpired, QUIZ_DAYS, QUIZ_TYPE_LABELS } from "@/lib/quiz-helpers";
import { isQuizDripEnabled } from "@/lib/quiz-settings";

export const dynamic = "force-dynamic";

function formatYMD(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayManilaYMD(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: { eventId?: number; date?: string; notifyMembers?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is valid for cron calls
    }

    // 1. Locate target Sunday Service event
    let targetEvent = null;

    if (body.eventId) {
      targetEvent = await db.event.findUnique({ where: { id: Number(body.eventId) } });
    } else {
      const targetDateStr = body.date || getTodayManilaYMD();
      const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

      // Prefer a Sunday service with commentary or slides if multiple exist on the same date
      const candidates = await db.event.findMany({
        where: {
          eventType: "sunday_service",
          eventDate: { gte: startOfDay, lte: endOfDay },
        },
        orderBy: { id: "asc" },
      });

      if (candidates.length > 0) {
        // Avoid picking youth fellowship if a main Sunday service exists on the same date
        targetEvent =
          candidates.find((e) => !/youth fellowship/i.test(e.title)) || candidates[0];
      }
    }

    if (!targetEvent) {
      return NextResponse.json({
        skipped: true,
        message: "No Sunday Service event found for target date.",
      });
    }

    const sermonDateStr = formatYMD(new Date(targetEvent.eventDate));
    const dayStart = new Date(`${sermonDateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${sermonDateStr}T23:59:59.999Z`);

    // 2. Idempotency check: skip if quiz already exists for this event or date
    const existingQuiz = await db.sermonQuiz.findFirst({
      where: {
        OR: [
          { eventId: targetEvent.id },
          { sermonDate: { gte: dayStart, lte: dayEnd } },
        ],
      },
      select: { id: true, title: true, status: true },
    });

    if (existingQuiz) {
      return NextResponse.json({
        skipped: true,
        existingQuizId: existingQuiz.id,
        message: `Quiz already exists for ${sermonDateStr}: ${existingQuiz.title}`,
      });
    }

    // 3. Build sermon source text without requiring YouTube script/video
    const parts: string[] = [];
    parts.push(`Sunday Worship Service Sermon Title: ${targetEvent.title}`);
    if (targetEvent.speaker) parts.push(`Preacher / Speaker: ${targetEvent.speaker}`);
    if (targetEvent.description && targetEvent.description.trim()) {
      parts.push(`Sermon Description:\n${targetEvent.description.trim()}`);
    }
    if (targetEvent.commentary && targetEvent.commentary.trim()) {
      parts.push(`Sermon Slides & Study Commentary:\n${targetEvent.commentary.trim()}`);
    }
    const sourceText = parts.join("\n\n");

    // 4. Generate 7 progressive questions via AI
    const generated = await generateQuiz(sourceText, sermonDateStr, {
      titleHint: targetEvent.title,
      speaker: targetEvent.speaker,
      skipCleanup: true,
      hasVideo: false,
    });

    if (!generated?.questions || generated.questions.length < 7) {
      return NextResponse.json(
        { error: "AI returned fewer than 7 questions", count: generated?.questions?.length ?? 0 },
        { status: 500 }
      );
    }

    // Determine creator (event creator, or fallback to first admin)
    let creatorId = targetEvent.createdBy;
    if (!creatorId) {
      const admin = await db.member.findFirst({
        where: { role: "admin" },
        select: { id: true },
      });
      creatorId = admin?.id ?? 1;
    }

    const expired = isQuizWeekExpired(sermonDateStr);
    const targetStatus = expired ? "completed" : "published";

    // Auto-complete any previously published expired quizzes if publishing a new live quiz
    if (targetStatus === "published") {
      const oldPublished = await db.sermonQuiz.findMany({
        where: { status: "published" },
        select: { id: true, sermonDate: true },
      });
      for (const oldQ of oldPublished) {
        if (isQuizWeekExpired(oldQ.sermonDate)) {
          await db.sermonQuiz.update({
            where: { id: oldQ.id },
            data: { status: "completed" },
          });
        }
      }
    }

    // 5. Save SermonQuiz + 7 QuizQuestion rows (youtubeUrl / youtubeVideoId remain null until added later)
    const createdQuiz = await db.sermonQuiz.create({
      data: {
        title: generated.title || `${targetEvent.title} — ${sermonDateStr}`,
        sermonDate: new Date(`${sermonDateStr}T00:00:00.000Z`),
        youtubeUrl: null,
        youtubeVideoId: null,
        transcriptText: targetEvent.commentary || targetEvent.description || null,
        announcementCaption: generated.announcementCaption || null,
        status: targetStatus,
        createdById: creatorId,
        eventId: targetEvent.id,
        questions: {
          create: generated.questions.slice(0, 7).map((q: any, idx: number) => ({
            dayNumber: q.dayNumber || idx + 1,
            questionType: q.questionType || QUIZ_DAYS[idx].type,
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            options: q.options ?? null,
            hint: q.hint ?? null,
            explanation: q.explanation ?? null,
          })),
        },
      },
      include: { questions: true },
    });

    // 6. If live (published), create feed announcement post + Day 1 link + bell notifications
    let announcementPostId: number | null = null;
    let notifiedCount = 0;

    if (targetStatus === "published") {
      const dripEnabled = await isQuizDripEnabled();
      const postContent = [
        createdQuiz.announcementCaption ||
          `Sunday's Quiz for Christ is now LIVE: "${createdQuiz.title}"`,
        "",
        dripEnabled
          ? "7 daily challenges built on Sunday's message — Day 1 is open right now!"
          : "All 7 interactive quizzes are unlocked right now — play at your own pace!",
        "Tap below to start playing and climb the leaderboard.",
      ].join("\n");

      const post = await db.post.create({
        data: {
          authorId: creatorId,
          type: "QUIZ_ANNOUNCEMENT",
          content: postContent,
          imageUrl: null,
          visibility: "MEMBERS_ONLY",
        },
      });
      announcementPostId = post.id;

      await db.sermonQuiz.update({
        where: { id: createdQuiz.id },
        data: { announcementPostId: post.id },
      });

      const day1 = createdQuiz.questions.find((q) => q.dayNumber === 1);
      if (day1) {
        await db.quizQuestion.update({
          where: { id: day1.id },
          data: { feedPostId: post.id },
        });
      }

      const shouldNotify = body.notifyMembers !== false;
      if (shouldNotify) {
        const activeMembers = await db.member.findMany({
          where: { status: { in: ["active", "approved"] } },
          select: { id: true },
        });

        if (activeMembers.length > 0) {
          const day1Type = QUIZ_TYPE_LABELS[QUIZ_DAYS[0].type];
          await db.notification.createMany({
            data: activeMembers.map((m) => ({
              memberId: m.id,
              type: "quiz_announcement" as const,
              title: "Sunday's Quiz for Christ is LIVE!",
              body: dripEnabled
                ? `"${targetEvent!.title}" — Day 1 (${day1Type.label}) is ready right now. Tap to play!`
                : `"${targetEvent!.title}" — All 7 interactive quizzes are unlocked now. Tap to play!`,
              link: `/quiz?quizId=${createdQuiz.id}`,
              actorId: creatorId,
            })),
          });
          notifiedCount = activeMembers.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      quizId: createdQuiz.id,
      eventId: targetEvent.id,
      sermonDate: sermonDateStr,
      title: createdQuiz.title,
      status: targetStatus,
      questionsCreated: createdQuiz.questions.length,
      announcementPostId,
      notifiedCount,
    });
  } catch (error: any) {
    console.error("[api/quiz/auto-generate-sunday]", error?.message || error);
    return NextResponse.json(
      { error: "Failed to auto-generate Sunday quiz: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
