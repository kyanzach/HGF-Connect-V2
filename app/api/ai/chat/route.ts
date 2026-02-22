import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// ── Church knowledge KB — loaded once at module startup ───────────────────────
let churchKnowledgeText = "";
try {
  const kbPath = path.join(process.cwd(), "data/church_knowledge.json");
  const kb = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
  kb.categories.forEach((cat: { label: string; articles: { title: string; content: string }[] }) => {
    churchKnowledgeText += `\n\n=== ${cat.label} ===\n`;
    cat.articles.forEach((a) => { churchKnowledgeText += `\n[${a.title}]\n${a.content}\n`; });
  });
} catch {
  churchKnowledgeText = "House of Grace: Sunday services at 9AM and 11AM. Cell groups meet weekly.";
}

// ── Rate limiting constants ───────────────────────────────────────────────────
const DAILY_LIMIT = 20;
const MIN_SECONDS_BETWEEN = 5;
const inFlight = new Set<number>(); // per-user in-flight lock (single process)

// ── Off-topic detection ───────────────────────────────────────────────────────
const OFF_TOPIC_PATTERNS = [
  /what.*(weather|temperature|forecast)/i,
  /tell me a joke/i,
  /write.*(code|script|essay|poem|story)/i,
  /who.*(president|prime minister|politician|actor|singer|celebrity)/i,
  /recipe|ingredients|cook|bake/i,
  /movie|film|series|netflix|show|episode/i,
  /\b(game|play|minecraft|roblox|fortnite)\b/i,
  /\b(stock|crypto|bitcoin|forex|nft)\b/i,
  /\b(politics|election|vote|senate)\b/i,
  /^(test|testing|1234|asdf|hello world|lol|haha|ok|nice|kamusta|musta)\.?$/i,
  /what are you|are you (an ai|human|robot|gpt|chatgpt)/i,
  /which.*(religion|denomination) is (right|true|best)/i,
  /\b(lottery|gambling|taya|sugal)\b/i,
];

function isOffTopic(message: string): boolean {
  if (message.trim().length <= 3) return true;
  return OFF_TOPIC_PATTERNS.some((p) => p.test(message.trim()));
}

const RATE_MESSAGES = {
  in_flight: "✋ I'm still thinking about your last question! Give me a moment to finish. 🙏",
  too_fast: "⏳ Whoa, slow down a little! Give me at least a few seconds between questions so I can give you a thoughtful answer 🙏",
  daily_limit: `🎉 You've been really active today — you've used all **${DAILY_LIMIT} questions** for today!\n\nNo worries, your limit resets at midnight. See you tomorrow 🌙`,
  off_topic: `😄 I appreciate the curiosity! But I'm built specifically to help with church-related questions — events, cell groups, services, and prayer.\n\nTry asking something like:\n- "When is the next Sunday service?"\n- "How do I join a cell group?"\n- "I need prayer support"\n\nI'm here when you're ready! 🙏`,
};

// ── DB helpers (wrapped so rate limiting NEVER breaks the AI call) ─────────────
async function getUsage(memberId: number): Promise<{ today: string; count: number; lastAt: Date | null }> {
  const today = new Date().toISOString().slice(0, 10);
  const row = await db.$queryRaw<{ question_count: number; last_request_at: Date | null }[]>`
    SELECT question_count, last_request_at FROM ai_usage
    WHERE member_id = ${memberId} AND usage_date = ${today}
    LIMIT 1
  `;
  return { today, count: row[0]?.question_count ?? 0, lastAt: row[0]?.last_request_at ?? null };
}

async function incrementUsage(memberId: number, today: string): Promise<void> {
  await db.$executeRaw`
    INSERT INTO ai_usage (member_id, usage_date, question_count, last_request_at)
    VALUES (${memberId}, ${today}, 1, NOW())
    ON DUPLICATE KEY UPDATE question_count = question_count + 1, last_request_at = NOW()
  `;
}

// ── Conversation helpers (§5.3) ───────────────────────────────────────────────
async function getOrCreateConversation(memberId: number, convId: number | null): Promise<number> {
  if (convId) {
    const existing = await db.aiConversation.findFirst({ where: { id: convId, memberId } });
    if (existing) return convId;
  }
  const created = await db.aiConversation.create({ data: { memberId } });
  return created.id;
}

async function saveMessage(convId: number, memberId: number, role: "user" | "assistant", content: string): Promise<void> {
  await db.aiMessage.create({ data: { conversationId: convId, memberId, role, content } });
  await db.aiConversation.update({
    where: { id: convId },
    data: { messageCount: { increment: 1 } },
  });
}

// ── System prompt builder ─────────────────────────────────────────────────────
function buildSystemPrompt(memberName: string): string {
  return `You are HGF Connect AI, a helpful assistant for House of Grace church members.

YOUR STRICT SCOPE — you ONLY answer about:
1. Church events, schedules, and announcements
2. Cell group information
3. Church services (worship schedule, locations, prayer)
4. Member's own data provided in "MEMBER PROFILE" below
5. Biblical encouragement, prayer, and devotional guidance

If asked about ANYTHING outside this scope (other organizations, general AI questions, politics, unrelated personal advice), respond with:
"I'm your HGF Connect assistant — I can only help with church-related questions. Try asking about events, cell groups, or prayer! 🙏"

PERSONALITY: Warm, encouraging, faith-based, Filipino-friendly English.

MEMBER PROFILE:
- Name: ${memberName}

CHURCH KNOWLEDGE BASE:
${churchKnowledgeText}

Answer helpfully and concisely (max 3 paragraphs). Add a relevant emoji when appropriate.`;
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberId = parseInt(session.user.id);

  try {
    const { message, conversation_id, conversationHistory } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ reply: "Please ask me something! 🙏", questions_remaining: DAILY_LIMIT });
    }

    // ── Rate limiting (OPTIONAL — degrade gracefully if DB unavailable) ───────
    let rateCheckPassed = true;
    let usedToday = 0;
    let todayDate = new Date().toISOString().slice(0, 10);

    try {
      // 1. In-flight lock — prevents double-send
      if (inFlight.has(memberId)) {
        return NextResponse.json({ reply: RATE_MESSAGES.in_flight, rate_limited: true, questions_remaining: DAILY_LIMIT - usedToday });
      }

      // 2. Cooldown check
      const usage = await getUsage(memberId);
      todayDate = usage.today;
      usedToday = usage.count;

      if (usage.lastAt) {
        const elapsed = (Date.now() - new Date(usage.lastAt).getTime()) / 1000;
        if (elapsed < MIN_SECONDS_BETWEEN) {
          return NextResponse.json({ reply: RATE_MESSAGES.too_fast, rate_limited: true, questions_remaining: DAILY_LIMIT - usedToday });
        }
      }

      // 3. Daily limit
      if (usedToday >= DAILY_LIMIT) {
        return NextResponse.json({ reply: RATE_MESSAGES.daily_limit, rate_limited: true, questions_remaining: 0 });
      }

      // 4. Off-topic detection (still counts as a used question)
      if (isOffTopic(message)) {
        await incrementUsage(memberId, todayDate);
        return NextResponse.json({
          reply: RATE_MESSAGES.off_topic,
          off_topic: true,
          questions_remaining: Math.max(0, DAILY_LIMIT - usedToday - 1),
        });
      }
    } catch (rateErr: unknown) {
      // Rate limiting DB unavailable — still serve the AI (degrade gracefully)
      console.warn("[AI] Rate limit DB check failed (degraded mode):", (rateErr as Error).message);
      rateCheckPassed = false;
    }

    // ── Call Straico AI ───────────────────────────────────────────────────────
    inFlight.add(memberId);
    let convId: number | null = null;
    try {
      // Get or create this conversation session — best-effort, never blocks AI
      try { convId = await getOrCreateConversation(memberId, conversation_id ? parseInt(conversation_id) : null); } catch { /* degraded OK */ }

      // Save user's message — best-effort
      try { if (convId) await saveMessage(convId, memberId, "user", message); } catch { /* degraded OK */ }

      // Best-effort count increment — never let this block the AI call
      if (rateCheckPassed) {
        try { await incrementUsage(memberId, todayDate); } catch { /* degraded OK */ }
      }

      const memberName = `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim() || "Friend";
      const historyContext = conversationHistory?.length
        ? "\n\nPREVIOUS CONVERSATION:\n" + conversationHistory.slice(-5).map((m: { role: string; content: string }) => `${m.role === "user" ? "Member" : "AI"}: ${m.content}`).join("\n")
        : "";

      const prompt = `${buildSystemPrompt(memberName)}${historyContext}\n\nMember asks: "${message}"`;

      const response = await axios.post(
        "https://api.straico.com/v1/prompt/completion",
        { models: [process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini"], message: prompt },
        { headers: { Authorization: `Bearer ${process.env.STRAICO_API_KEY}`, "Content-Type": "application/json" }, timeout: 20000 }
      );

      const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
      const completions = response.data?.data?.completions;
      const reply =
        completions?.[model]?.completion?.choices?.[0]?.message?.content ||
        response.data?.completion?.choices?.[0]?.message?.content ||
        response.data?.data?.completion?.choices?.[0]?.message?.content ||
        "I'm having a bit of trouble right now. Please try again in a moment. 🙏";

      // Save AI reply — best-effort (§5.4: DB failure must never block the response)
      try { if (convId) await saveMessage(convId, memberId, "assistant", reply); } catch { /* degraded OK */ }

      const questionsRemaining = rateCheckPassed ? Math.max(0, DAILY_LIMIT - usedToday - 1) : undefined;
      // Return conversation_id so frontend can link turns (§5.4)
      return NextResponse.json({ reply, questions_remaining: questionsRemaining, conversation_id: convId });

    } finally {
      inFlight.delete(memberId); // ALWAYS release the lock
    }

  } catch (err: unknown) {
    inFlight.delete(memberId);
    console.error("[api/ai/chat]", (err as Error).message);
    return NextResponse.json({ reply: "I'm having trouble right now. Please try again in a moment. 🙏" });
  }
}
