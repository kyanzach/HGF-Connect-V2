import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callOpenAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, description, listingType, category, conditionType, target } = await request.json();

    if (target === "title" && !title?.trim()) {
      return NextResponse.json({ error: "Title is required to enhance" }, { status: 400 });
    }
    if (target === "description" && !title?.trim()) {
      return NextResponse.json({ error: "Title is required to enhance description" }, { status: 400 });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (target === "title") {
      systemPrompt = `You are a professional copywriter for a church community marketplace called HGF StewardShop.
Your task is to write a catchy, professional, clean title for a listing.
Rules:
1. Be concise (max 6-9 words).
2. Highlight the key brand, item name, or service clearly.
3. Be optimized for clickability and clarity.
4. Return ONLY the polished title. Do not include any introductory remarks, explanations, quotes, or markdown styling.`;

      userPrompt = `Current Title: "${title.trim()}"
Listing Type: "${listingType || "sale"}"
Category: "${category || "Other"}"
Condition: "${conditionType || "good"}"`;
    } else {
      systemPrompt = `You are a professional copywriter for a church community marketplace called HGF StewardShop.
Your task is to write a beautifully formatted, structured, compelling description for a listing.
If the current description is very brief, expand on it naturally using typical details for this kind of item/service (like size, condition, features).
Structure it cleanly using emojis and bullet points:
- A catchy introductory sentence
- Key Features / Specifications (with clean bullet points)
- Item Condition / Details
- A warm closing inviting community members to message.

Rules:
1. Return ONLY the enhanced description. Do not include any introductory remarks, metadata, HTML tags, warnings, or explanatory notes.
2. Keep the tone friendly, honest, and helpful.
3. If a Facebook video link or tags like [video:...] are present in the current description, preserve them exactly at the bottom of the output.`;

      userPrompt = `Title: "${title.trim()}"
Current Description: "${(description || "").trim()}"
Listing Type: "${listingType || "sale"}"
Category: "${category || "Other"}"
Condition: "${conditionType || "good"}"`;
    }

    const enhancedContent = await callOpenAI({
      systemPrompt,
      userPrompt,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.7,
      timeoutMs: 25000,
    });

    let cleaned = enhancedContent.trim();
    // Clean outer quotes if any
    const quoteChars = ["\"", "'", "“", "”", "‘", "’"];
    while (
      cleaned.length >= 2 &&
      quoteChars.includes(cleaned[0]) &&
      quoteChars.includes(cleaned[cleaned.length - 1])
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return NextResponse.json({ result: cleaned });
  } catch (err: unknown) {
    console.error("[api/ai/enhance-listing]", (err as Error).message);
    return NextResponse.json({ error: "Failed to enhance listing with AI" }, { status: 500 });
  }
}
