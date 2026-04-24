import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const systemPrompt = `You are a helpful assistant for a Christian church application.
Your task is to analyze a testimony or praise report written in Bisaya (Cebuano) or English.
1. Translate the text into natural, uplifting English. Preserve the spiritual tone.
2. Determine the primary category of the testimony. Choose ONE from this list: Healing, Provision, Relationships, Deliverance, Career, Spiritual Growth, Other.
3. Generate 2 to 4 relevant context tags (e.g., "hospital bill", "family reconciliation", "job offer").

Output the result strictly as a JSON object with this format:
{
  "translatedContent": "The English translation here...",
  "category": "Provision",
  "tags": ["tag1", "tag2"]
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: `\n\nTestimony to process:\n"${content}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[api/ai/process-testimony] API Error:", err);
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("No text returned from Gemini API");
    }

    const parsedResult = JSON.parse(resultText);

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("[api/ai/process-testimony]", error);
    return NextResponse.json({ error: "Failed to process testimony with AI" }, { status: 500 });
  }
}
