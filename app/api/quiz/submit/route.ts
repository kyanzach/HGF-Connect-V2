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
import { getDayNumber, canAccessDay, getRewardTier, gradeEssay } from "@/lib/quiz-helpers";

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
    if (question.quiz.status !== "published") {
      return NextResponse.json({ error: "Quiz not active" }, { status: 400 });
    }

    // Check day access
    const currentDay = getDayNumber();
    if (!canAccessDay(question.dayNumber, currentDay)) {
      return NextResponse.json({ error: "This day's quiz is not available yet" }, { status: 403 });
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
      case "MULTIPLE_CHOICE": {
        // Exact match against correct answer text
        isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
        aiFeedback = isCorrect
          ? "Correct! 🎉"
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
        isCorrect = correctOrder.length === userOrder.length &&
          correctOrder.every((c, i) => userOrder[i] === c);
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

    // ── Check if all 5 days completed → generate reward ──
    const totalSubmissions = await db.quizSubmission.count({
      where: { quizId: question.quiz.id, memberId },
    });

    let reward = null;
    if (totalSubmissions === 5) {
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

        // Notify member about their reward
        await db.notification.create({
          data: {
            memberId,
            type: "quiz_reward",
            title: tier === "PERFECT"
              ? "🏆 PERFECT SCORE! Claim your reward!"
              : tier === "PARTICIPANT"
                ? "🙏 Quiz for Christ complete!"
                : "🎁 You earned a prize this week!",
            body: tier === "PERFECT"
              ? "You aced all 5 days! Tap to claim your Christian statement t-shirt."
              : tier === "PARTICIPANT"
                ? `You scored ${finalScore}/5. Keep growing in the Word!`
                : `You scored ${finalScore}/5! Your prize will be announced this Sunday. 🎁`,
            link: "/quiz",
          },
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
