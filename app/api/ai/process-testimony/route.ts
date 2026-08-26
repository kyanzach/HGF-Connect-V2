import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callOpenAIJson } from "@/lib/ai";

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

interface ProcessedTestimony {
  translatedContent: string;
  category: string;
  tags: string[];
}

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

    const fallback: ProcessedTestimony = {
      translatedContent: content,
      category: "Other",
      tags: [],
    };

    const parsed = await callOpenAIJson<ProcessedTestimony>(
      {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Testimony to process:\n"${content}"`,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.5,
        timeoutMs: 25000,
      },
      fallback
    );

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
