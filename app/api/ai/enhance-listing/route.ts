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
    const { title, description, listingType, category, conditionType, target } = await request.json();

    if (target === "title" && !title?.trim()) {
      return NextResponse.json({ error: "Title is required to enhance" }, { status: 400 });
    }
    if (target === "description" && !title?.trim()) {
      return NextResponse.json({ error: "Title is required to enhance description" }, { status: 400 });
    }

    const model = process.env.STRAICO_MODEL ?? "openai/gpt-4o-mini";
    const apiKey = process.env.STRAICO_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    let prompt = "";
    if (target === "title") {
      prompt = `You are a professional copywriter for a church community marketplace called HGF StewardShop.
The user wants to list an item:
Current Title: "${title.trim()}"
Listing Type: "${listingType || "sale"}"
Category: "${category || "Other"}"
Condition: "${conditionType || "good"}"

Your task is to write a catchy, professional, clean title for this listing. It should:
1. Be concise (max 6-9 words).
2. Highlight the key brand, item name, or service clearly.
3. Be optimized for clickability and clarity.
4. Return ONLY the polished title. Do not include any introductory remarks, explanations, quotes, or markdown styling.`;
    } else {
      prompt = `You are a professional copywriter for a church community marketplace called HGF StewardShop.
The user wants to list an item:
Title: "${title.trim()}"
Current Description: "${(description || "").trim()}"
Listing Type: "${listingType || "sale"}"
Category: "${category || "Other"}"
Condition: "${conditionType || "good"}"

Your task is to write a beautifully formatted, structured, compelling description for this listing.
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
    }

    const response = await axios.post(
      "https://api.straico.com/v1/prompt/completion",
      {
        models: [model],
        message: prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 25000,
      }
    );

    const completions = response.data?.data?.completions;
    const enhancedContent =
      completions?.[model]?.completion?.choices?.[0]?.message?.content ||
      response.data?.completion?.choices?.[0]?.message?.content ||
      response.data?.data?.completion?.choices?.[0]?.message?.content ||
      "";

    if (!enhancedContent) {
      throw new Error("Empty completion returned from AI service");
    }

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
