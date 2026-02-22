import { NextResponse } from "next/server";
import axios from "axios";

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

export async function POST(request: Request) {
  try {
    const { imageBase64, extractedText } = await request.json();

    const userContent = extractedText
      ? `The devotional contains this text: "${extractedText}". Generate a caption and suggest a relevant Bible verse.`
      : "Generate an encouraging devotional caption and suggest a relevant Bible verse for a member who shared their devotional photo.";

    const prompt = `${SYSTEM_PROMPT}\n\nUser request: ${userContent}`;

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

    // 3 fallback extraction paths (Straico format can vary)
    const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
    const completions = response.data?.data?.completions;
    let rawReply =
      completions?.[model]?.completion?.choices?.[0]?.message?.content ||
      response.data?.completion?.choices?.[0]?.message?.content ||
      response.data?.data?.completion?.choices?.[0]?.message?.content ||
      "";

    // Parse JSON response
    let caption = "What a beautiful devotional thought! Keep seeking God daily. 🙏";
    let suggestedVerse = '"For I know the plans I have for you," declares the Lord.';
    let verseRef = "Jeremiah 29:11";

    try {
      // Strip markdown code fences if present
      const cleaned = rawReply.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      caption = parsed.caption || caption;
      suggestedVerse = parsed.suggestedVerse || suggestedVerse;
      verseRef = parsed.verseRef || verseRef;
    } catch {
      // AI didn't return JSON — extract what we can
      if (rawReply) caption = rawReply.substring(0, 200);
    }

    return NextResponse.json({ caption, suggestedVerse, verseRef });
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
