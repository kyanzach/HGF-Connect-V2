import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

// Load church knowledge once at module startup (cached by Node.js require cache)
let churchKnowledgeText = "";
try {
  const kbPath = path.join(process.cwd(), "data/church_knowledge.json");
  const kb = JSON.parse(fs.readFileSync(kbPath, "utf-8"));
  kb.categories.forEach((cat: any) => {
    churchKnowledgeText += `\n\n=== ${cat.label} ===\n`;
    cat.articles.forEach((a: any) => {
      churchKnowledgeText += `\n[${a.title}]\n${a.content}\n`;
    });
  });
} catch {
  churchKnowledgeText = "House of Grace: Sunday services at 9AM and 11AM. Cell groups meet weekly.";
}

function buildSystemPrompt(memberName: string, cellGroup?: string) {
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
${cellGroup ? `- Cell Group: ${cellGroup}` : ""}

CHURCH KNOWLEDGE BASE:
${churchKnowledgeText}

Answer helpfully and concisely (max 3 paragraphs). Add a relevant emoji when appropriate.`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, conversationHistory } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ reply: "Please ask me something! 🙏" });
    }

    const memberName = `${session.user.firstName ?? ""} ${session.user.lastName ?? ""}`.trim() || "Friend";
    const systemPrompt = buildSystemPrompt(memberName);

    // Build context from conversation history (last 5 exchanges max)
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? "\n\nPREVIOUS CONVERSATION:\n" +
          conversationHistory
            .slice(-5)
            .map((m: any) => `${m.role === "user" ? "Member" : "AI"}: ${m.content}`)
            .join("\n")
        : "";

    // Straico format: single flat string, NOT OpenAI messages array
    const prompt = `${systemPrompt}${historyContext}\n\nMember asks: "${message}"`;

    const response = await axios.post(
      "https://api.straico.com/v1/prompt/completion",
      {
        models: [process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini"],
        message: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.STRAICO_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    // 3 fallback extraction paths (Straico format changes across versions)
    const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
    const completions = response.data?.data?.completions;
    let reply =
      completions?.[model]?.completion?.choices?.[0]?.message?.content ||
      response.data?.completion?.choices?.[0]?.message?.content ||
      response.data?.data?.completion?.choices?.[0]?.message?.content ||
      "";

    if (!reply) {
      reply = "I'm having a bit of trouble right now. Please try again in a moment. 🙏";
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("[api/ai/chat]", error?.message);
    // Always return graceful fallback — never a 500 from chat endpoint
    return NextResponse.json({
      reply: "I'm having trouble right now. Please try again in a moment. 🙏",
    });
  }
}
