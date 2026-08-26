import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyAllMembers } from "@/lib/notify";
import { callOpenAIJson } from "@/lib/ai";

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

async function autoProcessTestimony(content: string) {
  try {
    const fallback = {
      translatedContent: content,
      category: "Other",
      tags: [],
    };

    const parsed = await callOpenAIJson(
      {
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: `Testimony to process:\n"${content}"`,
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.5,
        timeoutMs: 25000,
      },
      fallback
    );

    return {
      translatedContent: parsed.translatedContent || content,
      category: parsed.category || "Other",
      tags: parsed.tags || [],
    };
  } catch (error) {
    console.error("autoProcessTestimony error:", error);
    return null;
  }
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const isFeatured = searchParams.get("featured") === "true";
  
  try {
    const where: any = {};
    if (category) where.category = category;
    if (isFeatured) where.isFeatured = true;

    const testimonies = await db.testimony.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(testimonies);
  } catch (error) {
    console.error("[api/testimonies GET]", error);
    return NextResponse.json({ error: "Failed to fetch testimonies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, translatedContent, category, tags, photos } = body;

    let finalTranslated = translatedContent;
    let finalCategory = category;
    let finalTags = tags;

    if (!finalCategory || !finalTags || !finalTranslated) {
      const aiResult = await autoProcessTestimony(content);
      if (aiResult) {
        finalTranslated = aiResult.translatedContent;
        finalCategory = aiResult.category;
        finalTags = aiResult.tags;
      }
    }

    const testimony = await db.testimony.create({
      data: {
        memberId: parseInt(session.user.id),
        content,
        translatedContent: finalTranslated || null,
        category: finalCategory || null,
        tags: finalTags ? (Array.isArray(finalTags) ? JSON.stringify(finalTags) : finalTags) : null,
        photos: {
          create: (photos || []).map((photoUrl: string, index: number) => ({
            photoPath: photoUrl,
            sortOrder: index,
          })),
        },
      },
      include: {
        member: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Notify all members (fire-and-forget)
    const authorName = `${testimony.member.firstName} ${testimony.member.lastName}`;
    const preview = (translatedContent || content).slice(0, 80);
    
    void notifyAllMembers({
      actorId: parseInt(session.user.id),
      type: "new_post",
      title: `${authorName} shared a new testimony!`,
      body: preview || "(No preview)",
      link: "/feed", // Or wherever testimonies will be displayed publicly
    });

    return NextResponse.json(testimony, { status: 201 });
  } catch (error) {
    console.error("[api/testimonies POST]", error);
    return NextResponse.json({ error: "Failed to submit testimony" }, { status: 500 });
  }
}
