import { NextResponse } from "next/server";
import { callOpenAIJson } from "@/lib/ai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are HGF Connect AI, a helpful assistant for House of Grace church members.

YOUR STRICT SCOPE: You ONLY suggest Bible verses relevant to the topic or text provided.
PERSONALITY: Warm, encouraging, faith-based, Filipino-friendly English.

OUTPUT FORMAT — respond with strictly this JSON (no extra text):
{
  "verse": "Verse text here",
  "reference": "Book Chapter:Verse",
  "context": "One sentence on why this verse applies"
}`;

interface VerseResponse {
  verse: string;
  reference: string;
  context: string;
}

export async function POST(request: Request) {
  try {
    const { topic, text } = await request.json();
    const userInput = topic || text || "faith and encouragement";
    const userPrompt = `Suggest a relevant Bible verse for this topic or text: "${userInput}"`;

    const fallback: VerseResponse = {
      verse: '"I can do all things through Christ who strengthens me."',
      reference: "Philippians 4:13",
      context: "God gives us strength for every challenge.",
    };

    const parsed = await callOpenAIJson<VerseResponse>(
      {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.7,
        timeoutMs: 20000,
      },
      fallback
    );

    return NextResponse.json({
      verse: parsed.verse || fallback.verse,
      reference: parsed.reference || fallback.reference,
      context: parsed.context || fallback.context,
    });
  } catch (error: any) {
    console.error("[api/ai/verse]", error?.message);
    return NextResponse.json({
      verse: '"I can do all things through Christ who strengthens me."',
      reference: "Philippians 4:13",
      context: "God gives us strength for every challenge.",
    });
  }
}
