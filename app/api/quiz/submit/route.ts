/**
 * POST /api/quiz/submit — Member answer submission + grading
 *
 * Validates day access (catch-up OK, no peek-ahead).
 * Grades answer (instant for MC/FIB/SO, AI for SHORT_ANSWER/TFE).
 * Creates QuizSubmission + auto-generates QuizReward after day 5.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notify";
import { getQuizDayForDate, isQuizWeekExpired, canAccessDay, getRewardTier, gradeEssay } from "@/lib/quiz-helpers";
import { isQuizDripEnabled } from "@/lib/quiz-settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  try {
    const { questionId, answer } = await request.json();
    if (!questionId || answer === undefined || answer === null) {
      return NextResponse.json({ error: "questionId and answer required" }, { status: 400 });
    }

    // Load question + quiz
    const question = await db.quizQuestion.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    if (!["published", "completed"].includes(question.quiz.status)) {
      return NextResponse.json({ error: "Quiz not active" }, { status: 400 });
    }

    // Check day access & catch-up session (skipped when Open Access Mode is active)
    const dripEnabled = await isQuizDripEnabled();
    let isCatchup = !dripEnabled;
    let catchupSession = null;

    if (dripEnabled && isQuizWeekExpired(question.quiz.sermonDate)) {
      catchupSession = await db.quizCatchupSession.findUnique({
        where: { quizId_memberId: { quizId: question.quiz.id, memberId } },
      });

      if (catchupSession && !catchupSession.isCompleted && new Date() < catchupSession.expiresAt) {
        isCatchup = true;
      } else {
        return NextResponse.json({ error: "This quiz week has ended" }, { status: 403 });
      }
    }

    if (dripEnabled && !isCatchup) {
      const quizRelativeDay = getQuizDayForDate(question.quiz.sermonDate);
      const currentDay = Math.min(Math.max(quizRelativeDay, 0), 7);
      if (!canAccessDay(question.dayNumber, currentDay)) {
        return NextResponse.json({ error: "This day's quiz is not available yet" }, { status: 403 });
      }
    }

    // Check duplicate submission
    const existing = await db.quizSubmission.findUnique({
      where: { questionId_memberId: { questionId, memberId } },
    });
    if (existing) {
      return NextResponse.json({
        error: "Already submitted",
        isCorrect: existing.isCorrect,
        score: existing.score,
        feedback: existing.aiFeedback,
      }, { status: 409 });
    }

    // ── Grade the answer ──
    let isCorrect = false;
    let aiFeedback: string | null = null;
    const userAnswer = String(answer).trim();

    switch (question.questionType) {
      case "MULTIPLE_CHOICE":
      case "TREE_OF_LIFE": {
        // Exact match against correct answer text
        isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
        aiFeedback = isCorrect
          ? question.questionType === "TREE_OF_LIFE"
            ? "Wisdom unlocked! Your Tree of Wisdom flourishes! 🌳"
            : "Correct! 🎉"
          : `The correct answer was: ${question.correctAnswer}`;
        break;
      }

      case "FILL_IN_BLANKS": {
        // Compare each blank answer (comma-separated)
        const expectedParts = question.correctAnswer.split(",").map((s) => s.trim().toLowerCase());
        const userParts = userAnswer.split(",").map((s) => s.trim().toLowerCase());

        // All blanks must match
        isCorrect = expectedParts.length === userParts.length &&
          expectedParts.every((exp, i) => userParts[i] === exp);

        aiFeedback = isCorrect
          ? "Perfect! You filled in the blanks correctly! ✏️"
          : `The correct answer was: ${question.correctAnswer}`;
        break;
      }

      case "SHORT_ANSWER": {
        // AI semantic grading
        const grading = await gradeEssay(
          question.questionText,
          question.correctAnswer,
          userAnswer
        );
        isCorrect = grading.isCorrect;
        aiFeedback = grading.feedback;
        break;
      }

      case "SCRIPTURE_ORDERING": {
        // Compare ordered segments (correct order stored as " | " delimited)
        const correctOrder = question.correctAnswer.split(" | ").map((s) => s.trim().toLowerCase());
        let userOrder: string[];
        try {
          userOrder = JSON.parse(userAnswer).map((s: string) => s.trim().toLowerCase());
        } catch {
          userOrder = userAnswer.split(" | ").map((s) => s.trim().toLowerCase());
        }

        // Normalize text to ignore punctuation and spacing mismatches
        const normalize = (str: string) => str.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
        const cleanCorrect = correctOrder.map(normalize);
        const cleanUser = userOrder.map(normalize);

        isCorrect = cleanCorrect.length === cleanUser.length &&
          cleanCorrect.every((c, i) => cleanUser[i] === c);
        aiFeedback = isCorrect
          ? "You arranged the verse perfectly! 🧩"
          : "Not quite the right order. Keep studying the Word!";
        break;
      }

      case "TRUE_FALSE_EXPLAIN": {
        // Grade T/F part + explanation quality
        let userTF: string;
        let userExplanation: string;
        try {
          const parsed = JSON.parse(userAnswer);
          userTF = String(parsed.answer).toUpperCase();
          userExplanation = String(parsed.explanation || "");
        } catch {
          userTF = userAnswer.toUpperCase().startsWith("TRUE") ? "TRUE" : "FALSE";
          userExplanation = userAnswer;
        }

        const tfCorrect = userTF === question.correctAnswer.toUpperCase();

        if (!tfCorrect) {
          isCorrect = false;
          aiFeedback = `The statement was actually ${question.correctAnswer}. ${question.explanation || ""}`;
        } else if (userExplanation.length < 10) {
          // T/F correct but explanation too short — still count as correct
          isCorrect = true;
          aiFeedback = "Correct! Though a more detailed explanation would strengthen your understanding.";
        } else {
          // AI grade the explanation
          const grading = await gradeEssay(
            `Why is this statement ${question.correctAnswer}? "${question.questionText}"`,
            question.explanation || question.correctAnswer,
            userExplanation
          );
          isCorrect = true; // T/F was correct, explanation is bonus
          aiFeedback = grading.feedback;
        }
        break;
      }
    }

    const score = isCorrect ? 1 : 0;

    // ── Save submission ──
    await db.quizSubmission.create({
      data: {
        quizId: question.quiz.id,
        questionId,
        memberId,
        answer: userAnswer,
        isCorrect,
        score,
        aiFeedback,
      },
    });

    // ── Check if all 7 days completed → generate reward ──
    const totalSubmissions = await db.quizSubmission.count({
      where: { quizId: question.quiz.id, memberId },
    });

    if (catchupSession && totalSubmissions >= 7) {
      await db.quizCatchupSession.update({
        where: { id: catchupSession.id },
        data: { isCompleted: true },
      });
    }

    let reward = null;
    if (totalSubmissions === 7) {
      const totalScore = await db.quizSubmission.aggregate({
        _sum: { score: true },
        where: { quizId: question.quiz.id, memberId },
      });
      const finalScore = totalScore._sum.score || 0;
      const tier = getRewardTier(finalScore);

      const existingReward = await db.quizReward.findUnique({
        where: { quizId_memberId: { quizId: question.quiz.id, memberId } },
      });

      if (!existingReward) {
        await db.quizReward.create({
          data: {
            quizId: question.quiz.id,
            memberId,
            totalScore: finalScore,
            rewardTier: tier,
          },
        });

        // Notify member about their completion (spoiler-free during Thanksgiving Open Access Mode)
        const notifTitle = !dripEnabled
          ? tier === "PERFECT"
            ? "Perfect 7/7 Score!"
            : "Quiz Complete!"
          : tier === "PERFECT"
            ? "🏆 PERFECT SCORE! Claim your reward!"
            : tier === "PARTICIPANT"
              ? "🙏 Quiz for Christ complete!"
              : "🎁 You earned a prize this week!";

        const notifBody = !dripEnabled
          ? tier === "PERFECT"
            ? "You aced all 7 items! Your points are added to the Dec 13 Thanksgiving Mystery Prize standings."
            : `You scored ${finalScore}/7! Keep playing more Sunday quizzes to climb the Thanksgiving standings.`
          : tier === "PERFECT"
            ? "You aced all 7 days! Tap to claim your Christian statement t-shirt."
            : tier === "PARTICIPANT"
              ? `You scored ${finalScore}/7. Keep growing in the Word!`
              : `You scored ${finalScore}/7! Your prize will be announced this Sunday. 🎁`;

        await createNotification({
          memberId,
          type: "quiz_reward",
          title: notifTitle,
          body: notifBody,
          link: !dripEnabled ? "/quiz/hub" : "/quiz",
        });

        reward = { totalScore: finalScore, tier };
      }
    }

    return NextResponse.json({
      success: true,
      isCorrect,
      score,
      feedback: aiFeedback,
      explanation: question.explanation,
      totalSubmissions,
      reward,
    });
  } catch (error: any) {
    console.error("[api/quiz/submit]", error?.message);
    return NextResponse.json({ error: "Failed to submit answer" }, { status: 500 });
  }
}
