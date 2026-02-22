import { NextResponse } from "next/server";
import axios from "axios";

const SYSTEM_PROMPT = `You are HGF Connect AI, a helpful assistant for House of Grace church members.

YOUR STRICT SCOPE: You ONLY suggest Bible verses relevant to the topic or text provided.
PERSONALITY: Warm, encouraging, faith-based, Filipino-friendly English.

OUTPUT FORMAT — respond with strictly this JSON (no extra text):
{
  "verse": "Verse text here",
  "reference": "Book Chapter:Verse",
  "context": "One sentence on why this verse applies"
}`;

export async function POST(request: Request) {
  try {
    const { topic, text } = await request.json();
    const userInput = topic || text || "faith and encouragement";
    const prompt = `${SYSTEM_PROMPT}\n\nSuggest a relevant Bible verse for this topic or text: "${userInput}"`;

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

    const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
    const completions = response.data?.data?.completions;
    let rawReply =
      completions?.[model]?.completion?.choices?.[0]?.message?.content ||
      response.data?.completion?.choices?.[0]?.message?.content ||
      response.data?.data?.completion?.choices?.[0]?.message?.content ||
      "";

    let verse = '"The Lord is my shepherd; I shall not want."';
    let reference = "Psalm 23:1";
    let context = "God provides for all our needs.";

    try {
      const cleaned = rawReply.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      verse = parsed.verse || verse;
      reference = parsed.reference || reference;
      context = parsed.context || context;
    } catch {
      if (rawReply) verse = rawReply.substring(0, 300);
    }

    return NextResponse.json({ verse, reference, context });
  } catch (error: any) {
    console.error("[api/ai/verse]", error?.message);
    return NextResponse.json({
      verse: '"I can do all things through Christ who strengthens me."',
      reference: "Philippians 4:13",
      context: "God gives us strength for every challenge.",
    });
  }
}
