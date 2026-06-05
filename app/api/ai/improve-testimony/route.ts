import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import axios from "axios";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content, language } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    let langInstruction = "";
    if (language === "Bisaya") {
      langInstruction = "Translate (if needed) and rewrite the testimony entirely in Cebuano/Bisaya. Make it flow naturally in conversational Bisaya, fixing spelling and grammar.";
    } else if (language === "Taglish") {
      langInstruction = "Translate (if needed) and rewrite the testimony entirely in Taglish (Filipino mixed with English, commonly spoken in urban Philippines). Make it flow naturally, fixing spelling and grammar.";
    } else if (language === "English") {
      langInstruction = "Translate (if needed) and rewrite the testimony entirely in English. Make it flow naturally in professional yet warm English, fixing spelling and grammar.";
    } else {
      langInstruction = "Preserve their original voice, heart, emotions, and language/dialect. Improve spelling, formatting, and sentence structure.";
    }

    const systemPrompt = `You are a warm, encouraging Christian editor for a church community application.
The member has written a testimony sharing what God has done in their life.
Your task is to improve the flow, grammar, and spelling of the text.

CRITICAL RULES:
1. PRESERVE their original voice, heart, emotions, and the key details of their story.
2. ${langInstruction}
3. Do NOT change the meaning or add any external narrative details.
4. Return ONLY the rewritten, polished testimony. Do not include any introductory remarks, warnings, or explanatory notes.`;

    const prompt = `${systemPrompt}\n\nTestimony to improve:\n"${content.trim()}"`;

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
        timeout: 25000,
      }
    );

    const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
    const completions = response.data?.data?.completions;
    const improvedContent =
      completions?.[model]?.completion?.choices?.[0]?.message?.content ||
      response.data?.completion?.choices?.[0]?.message?.content ||
      response.data?.data?.completion?.choices?.[0]?.message?.content ||
      "";

    if (!improvedContent) {
      throw new Error("Empty completion returned");
    }

    return NextResponse.json({ improvedContent: improvedContent.trim() });
  } catch (err: unknown) {
    console.error("[api/ai/improve-testimony]", (err as Error).message);
    return NextResponse.json({ error: "Failed to improve text with AI" }, { status: 500 });
  }
}
