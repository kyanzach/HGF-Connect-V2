import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import axios from "axios";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a helpful assistant for a Christian church application (House of Grace Fellowship).
Your task is to analyze a testimony or praise report written in Bisaya (Cebuano) or English.
1. Translate the text into natural, uplifting English. Preserve the spiritual tone.
2. Determine the primary category of the testimony. Choose ONE from this list: Healing, Provision, Relationships, Deliverance, Career, Spiritual Growth, Other.
3. Generate 2 to 4 relevant context tags (e.g., "hospital bill", "family reconciliation", "job offer").

Output the result strictly as a JSON object with this format (no extra text):
{
  "translatedContent": "The English translation here...",
  "category": "Provision",
  "tags": ["tag1", "tag2"]
}`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const prompt = `${SYSTEM_PROMPT}\n\nTestimony to process:\n"${content}"`;

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
        timeout: 30000,
      }
    );

    // Extract reply — 3 fallback paths (Straico response format can vary)
    const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
    const completions = response.data?.data?.completions;
    const rawReply =
      completions?.[model]?.completion?.choices?.[0]?.message?.content ||
      response.data?.completion?.choices?.[0]?.message?.content ||
      response.data?.data?.completion?.choices?.[0]?.message?.content ||
      "";

    if (!rawReply) {
      throw new Error("No text returned from Straico API");
    }

    // Parse JSON — strip markdown code fences if present
    const cleaned = rawReply.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      translatedContent: parsed.translatedContent || content,
      category: parsed.category || "Other",
      tags: parsed.tags || [],
    });
  } catch (error: any) {
    console.error("[api/ai/process-testimony]", error?.message);
    return NextResponse.json({ error: "Failed to process testimony with AI" }, { status: 500 });
  }
}
