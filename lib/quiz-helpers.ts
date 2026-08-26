/**
 * lib/quiz-helpers.ts — Quiz for Christ AI prompt builders + utility functions
 *
 * - generateQuiz: builds two-phase OpenAI prompt for quiz generation
 * - gradeEssay: AI-powered semantic grading (Bisaya/Tagalog/English)
 * - getDayNumber / canAccessDay: drip schedule logic
 * - getRewardTier: score → tier mapping
 */

import { formatDate } from "./utils";
import { callOpenAI, callOpenAIJson } from "./ai";

// ── Day schedule constants ───────────────────────────────────────────────────
// 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
export const QUIZ_DAYS = [
  { dayNumber: 1, weekday: 1, label: "Monday",    type: "MULTIPLE_CHOICE"    as const },
  { dayNumber: 2, weekday: 2, label: "Tuesday",   type: "FILL_IN_BLANKS"     as const },
  { dayNumber: 3, weekday: 3, label: "Wednesday", type: "SHORT_ANSWER"       as const },
  { dayNumber: 4, weekday: 4, label: "Thursday",  type: "SCRIPTURE_ORDERING" as const },
  { dayNumber: 5, weekday: 5, label: "Friday",    type: "TRUE_FALSE_EXPLAIN" as const },
  { dayNumber: 6, weekday: 6, label: "Saturday",  type: "MULTIPLE_CHOICE"    as const },
  { dayNumber: 7, weekday: 0, label: "Sunday",    type: "SHORT_ANSWER"       as const },
] as const;

export const QUIZ_TYPE_LABELS: Record<string, { label: string; difficulty: string; emoji: string }> = {
  MULTIPLE_CHOICE:    { label: "Balloon Pop",       difficulty: "Easy",        emoji: "🎈" },
  FILL_IN_BLANKS:     { label: "Fill the Blanks",   difficulty: "Medium-Easy", emoji: "✏️" },
  SHORT_ANSWER:       { label: "In Your Own Words", difficulty: "Medium",      emoji: "📝" },
  SCRIPTURE_ORDERING: { label: "Verse Builder",     difficulty: "Medium-Hard", emoji: "🧩" },
  TRUE_FALSE_EXPLAIN: { label: "Defend Your Faith", difficulty: "Hard",        emoji: "⚖️" },
};

// ── Get current quiz day number (1–7) ────────────────────────────────────────
export function getDayNumber(date?: Date): number {
  const d = date || new Date();
  const weekdayStr = d.toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "long" });
  const found = QUIZ_DAYS.find((q) => q.label === weekdayStr);
  return found?.dayNumber ?? 1; // Default to Day 1
}

// ── Can the member access this day's quiz? (catch-up allowed, no peek-ahead) ──
export function canAccessDay(targetDay: number, currentDay: number): boolean {
  return targetDay <= currentDay;
}

// ── Quiz week boundary utilities ─────────────────────────────────────────────
// Quiz week: Monday (Day 1) through Sunday (Day 7) after the sermon date.
// sermonDate is always a Sunday. The quiz week starts the next day (Monday).

/**
 * Get the end of the quiz week (Sunday 23:59:59.999 Manila time).
 * sermonDate (Sunday) → quiz runs Mon–Sun → ends next Sunday midnight.
 */
export function getQuizWeekEnd(sermonDate: Date | string): Date {
  const sermon = new Date(sermonDate);
  const weekEndManila = new Date(sermon);
  weekEndManila.setDate(weekEndManila.getDate() + 7); // next Sunday
  weekEndManila.setHours(23, 59, 59, 999);
  // Convert Manila 23:59:59 to UTC (subtract 8 hours)
  const weekEndUTC = new Date(weekEndManila.getTime() - 8 * 60 * 60 * 1000);
  return weekEndUTC;
}

/**
 * Check if the quiz week has expired (current Manila time > Sunday 23:59:59).
 */
export function isQuizWeekExpired(sermonDate: Date | string): boolean {
  const weekEnd = getQuizWeekEnd(sermonDate);
  return new Date() > weekEnd;
}

/**
 * Get the quiz day number (1–7) relative to the quiz's actual week.
 */
export function getQuizDayForDate(sermonDate: Date | string, now?: Date): number {
  const sermon = new Date(sermonDate);
  const current = now || new Date();
  const manilaStr = current.toLocaleDateString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const sermonDay = new Date(sermon.toLocaleDateString("en-US"));
  const diffMs = manilaDate.getTime() - sermonDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays; // 1=Day1, 2=Day2, ..., 7=Day7, 8+=expired
}

// ── Score → reward tier ──────────────────────────────────────────────────────
export function getRewardTier(totalScore: number): "PERFECT" | "EXCELLENT" | "GOOD" | "PARTICIPANT" {
  if (totalScore >= 7) return "PERFECT";
  if (totalScore >= 6) return "EXCELLENT";
  if (totalScore >= 4) return "GOOD";
  return "PARTICIPANT";
}

export const REWARD_DISPLAY: Record<string, { label: string; description: string }> = {
  PERFECT:     { label: "🏆 Perfect Score!", description: "You've earned a Christian statement t-shirt! Claim your reward." },
  EXCELLENT:   { label: "🌟 Excellent!",     description: "🎁 Prize: TBA — to be announced this Sunday!" },
  GOOD:        { label: "👏 Good Job!",      description: "🎁 Prize: TBA — to be announced this Sunday!" },
  PARTICIPANT: { label: "🙏 Keep Growing!",  description: "Keep studying the Word. Every quiz brings you closer to God!" },
};

// ── Generate quiz prompt ─────────────────────────────────────────────────────
export async function generateQuiz(
  rawTranscript: string,
  sermonDate: string
): Promise<{
  title: string;
  announcementCaption: string;
  questions: Array<{
    dayNumber: number;
    questionType: string;
    questionText: string;
    correctAnswer: string;
    options: any;
    hint: string;
    explanation: string;
  }>;
}> {
  const formattedSermonDate = formatDate(sermonDate);

  // PHASE 1: Clean and format raw transcript using the cheap model
  const cheapModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const cleanPrompt = `You are a sermon transcription assistant for House of Grace Fellowship.
Analyze the following raw, unformatted sermon transcript. It contains a mix of English (~70%) and Tagalog/Bisaya (~30%).
Your task is to translate all Tagalog and Bisaya parts to English and compile a highly structured, comprehensive, and detailed English sermon outline/summary.

CRITICAL RULES:
1. Translate any Tagalog or Bisaya preaching sections into clear English.
2. PRESERVE all exact biblical scripture references, proper names, sermon-specific illustrations, metaphors, and key phrases used by the pastor. Do not replace or generalize important exact words used by the pastors.
3. Do NOT omit details. The summary should be thorough enough that a quiz generator can construct specific questions based on it.
4. Output only the structured English summary. No conversational preamble or postscript.

SERMON DATE: ${formattedSermonDate}
RAW TRANSCRIPT:
"""
${rawTranscript}
"""`;

  console.log(`[quiz-helpers] Starting Phase 1: Clean up via ${cheapModel}...`);
  const cleanSummary = await callOpenAI({
    userPrompt: cleanPrompt,
    model: cheapModel,
    temperature: 0.3,
    timeoutMs: 90000,
  });
  console.log(`[quiz-helpers] Phase 1 complete. Summary length: ${cleanSummary.length} chars.`);

  // PHASE 2: Generate the quiz from the summary using the smart model
  const smartModel = process.env.OPENAI_SMART_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const quizPrompt = `You are an AI assistant for House of Grace Fellowship, a Christian church.
You are creating a weekly "Quiz for Christ" based on a Sunday sermon.

SERMON DATE: ${formattedSermonDate}
SERMON SUMMARY:
"""
${cleanSummary}
"""

TASK: Generate THREE things from this sermon summary:

1. A SUITABLE QUIZ TITLE — A concise title summarizing the sermon theme, formatted as 'Topic — Month Day, Year' (e.g. 'Walking by Faith — June 1, 2026') using the provided sermon date: ${formattedSermonDate}.

2. An ANNOUNCEMENT CAPTION — A compelling, uplifting social media-style post that:
   - Starts with "Here's a replay of Sunday's sermon from ${formattedSermonDate}!"
   - Includes 2-3 key takeaways from the sermon (highly brief, only 1 sentence each, do NOT expose any quiz answers)
   - Ends with a call to action: "Get ready for the quiz! 🧠✨"
   - Tone: warm, encouraging, Bisaya-friendly (but written in English)
   - Max 150 words

3. SEVEN QUIZ QUESTIONS — One for each day (Monday to Sunday), getting progressively harder:

   DAY 1 (Monday) — MULTIPLE_CHOICE:
   - A straightforward question about the sermon's main point
   - 4 options (A, B, C, D) — only 1 correct
   - options: ["Option A text", "Option B text", "Option C text", "Option D text"]
   - correctAnswer: the exact text of the correct option

   DAY 2 (Tuesday) — FILL_IN_BLANKS:
   - A key sentence from the sermon with 1-2 missing words replaced by "______"
   - correctAnswer: the missing word(s), comma-separated if multiple blanks
   - options: null

   DAY 3 (Wednesday) — SHORT_ANSWER:
   - An open-ended question requiring the member to explain a concept in their own words
   - correctAnswer: the ideal answer (used as reference for AI grading)
   - options: null

   DAY 4 (Thursday) — SCRIPTURE_ORDERING:
   - A key Bible verse or sermon quote broken into 4-6 phrase segments
   - The segments should be shuffled in the options array
   - correctAnswer: the segments joined in the correct order, separated by " | "
   - options: ["shuffled phrase 1", "shuffled phrase 2", ...] (the phrases in WRONG order)

   DAY 5 (Friday) — TRUE_FALSE_EXPLAIN:
   - A statement about the sermon that is either true or false
   - correctAnswer: "TRUE" or "FALSE"
   - options: null
   - The explanation should explain WHY it is true or false

   DAY 6 (Saturday) — MULTIPLE_CHOICE:
   - Scripture Trivia or detailed application question from the sermon
   - 4 options (A, B, C, D) — only 1 correct
   - options: ["Option A text", "Option B text", "Option C text", "Option D text"]
   - correctAnswer: the exact text of the correct option

   DAY 7 (Sunday) — SHORT_ANSWER:
   - Reflection question asking the member how they will apply this sermon's teachings in their daily life.
   - correctAnswer: "Any sincere reflection showing personal application is correct."
   - options: null

For ALL questions, provide:
- hint: a brief helpful hint (1 sentence)
- explanation: what is shown after the user answers (educational, encouraging)

OUTPUT FORMAT — Strictly valid JSON, no extra text:
{
  "title": "...",
  "announcementCaption": "...",
  "questions": [
    {
      "dayNumber": 1,
      "questionType": "MULTIPLE_CHOICE",
      "questionText": "...",
      "correctAnswer": "...",
      "options": [...],
      "hint": "...",
      "explanation": "..."
    }
  ]
}`;

  console.log(`[quiz-helpers] Starting Phase 2: Quiz generation via ${smartModel}...`);
  const quizData = await callOpenAIJson<{
    title: string;
    announcementCaption: string;
    questions: any[];
  }>({
    userPrompt: quizPrompt,
    model: smartModel,
    temperature: 0.5,
    timeoutMs: 90000,
  });
  console.log(`[quiz-helpers] Phase 2 complete. Received ${quizData?.questions?.length ?? 0} questions.`);

  return quizData;
}

// ── Grade essay / short answer (AI semantic grading) ─────────────────────────
export async function gradeEssay(
  questionText: string,
  correctAnswer: string,
  userAnswer: string
): Promise<{ isCorrect: boolean; feedback: string }> {
  const prompt = `You are grading a quiz answer for a Christian church app (House of Grace Fellowship).

QUESTION: "${questionText}"
IDEAL ANSWER (reference): "${correctAnswer}"
USER'S ANSWER: "${userAnswer}"

IMPORTANT RULES:
1. The user may answer in Bisaya (Cebuano), Tagalog, or English. Evaluate based on MEANING, not exact wording or language.
2. Be GENEROUS — if the user's answer captures the core idea or spiritual truth, mark it as correct.
3. Minor details or phrasing differences should NOT cause a wrong answer.
4. Only mark as incorrect if the answer is fundamentally wrong, completely off-topic, or shows no understanding.

OUTPUT — Strictly valid JSON:
{
  "isCorrect": true or false,
  "feedback": "A warm, encouraging 1-2 sentence feedback message. If correct, affirm their understanding. If incorrect, gently explain the right answer without being harsh."
}`;

  try {
    return await callOpenAIJson<{ isCorrect: boolean; feedback: string }>({
      userPrompt: prompt,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      timeoutMs: 20000,
    });
  } catch (error: any) {
    console.error("[quiz-helpers] Essay grading failed:", error?.message);
    // Fallback: be generous, mark as correct with a note
    return {
      isCorrect: true,
      feedback: "We couldn't fully evaluate your answer with AI, but we appreciate your thoughtful response! 🙏",
    };
  }
}
