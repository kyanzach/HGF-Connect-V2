import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import axios from "axios";

export const dynamic = "force-dynamic";

const REWRITE_SYSTEM_PROMPT = `You are a warm, encouraging Christian editor for a church community application.
The member has written a testimony sharing what God has done in their life.
Your task is to improve the flow, grammar, and spelling of the text.

CRITICAL RULES:
1. PRESERVE their original voice, heart, emotions, and language/dialect.
2. If they wrote in Cebuano/Bisaya, keep it in Cebuano/Bisaya (improve spelling, formatting, and sentence structure, but do NOT translate it to English).
3. If they wrote in Tagalog or Taglish, keep it in Tagalog or Taglish.
4. If they wrote in English, keep it in English.
5. Do NOT change the meaning or the details of their story.
6. Return ONLY the rewritten, polished testimony. Do not include any introductory remarks, warnings, or explanatory notes.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const prompt = `${REWRITE_SYSTEM_PROMPT}\n\nTestimony to improve:\n"${content.trim()}"`;

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
