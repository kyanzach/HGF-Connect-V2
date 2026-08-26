import { NextResponse } from "next/server";
import { callOpenAIJson } from "@/lib/ai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are HGF Connect AI, a devoted assistant for House of Grace church members.

YOUR STRICT SCOPE — you ONLY help with:
1. Generating a short, warm caption for a handwritten devotional photo
2. Suggesting a relevant Bible verse based on the devotional content
3. Encouraging the member to share their faith journey

PERSONALITY: Warm, encouraging, faith-based, Filipino-friendly English. Max 2-3 sentences for caption.

OUTPUT FORMAT — respond with strictly this JSON (no extra text):
{
  "caption": "A warm, encouraging caption summarizing the devotional thought...",
  "suggestedVerse": "Verse text here",
  "verseRef": "Book Chapter:Verse"
}`;

interface CaptionResponse {
  caption: string;
  suggestedVerse: string;
  verseRef: string;
}

export async function POST(request: Request) {
  try {
    const { extractedText } = await request.json();

    const userContent = extractedText
      ? `The devotional contains this text: "${extractedText}". Generate a caption and suggest a relevant Bible verse.`
      : "Generate an encouraging devotional caption and suggest a relevant Bible verse for a member who shared their devotional photo.";

    const fallback: CaptionResponse = {
      caption: "What a beautiful devotional thought! Keep seeking God daily. 🙏",
      suggestedVerse: '"For I know the plans I have for you," declares the Lord.',
      verseRef: "Jeremiah 29:11",
    };

    const parsed = await callOpenAIJson<CaptionResponse>(
      {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: userContent,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.7,
        timeoutMs: 20000,
      },
      fallback
    );

    return NextResponse.json({
      caption: parsed.caption || fallback.caption,
      suggestedVerse: parsed.suggestedVerse || fallback.suggestedVerse,
      verseRef: parsed.verseRef || fallback.verseRef,
    });
  } catch (error: any) {
    console.error("[api/ai/caption]", error?.message);
    // Always return a graceful fallback — never a 500
    return NextResponse.json({
      caption: "Keep sharing your faith journey! Every devotional inspires the community. 🙏",
      suggestedVerse: '"Your word is a lamp to my feet and a light to my path."',
      verseRef: "Psalm 119:105",
    });
  }
}
