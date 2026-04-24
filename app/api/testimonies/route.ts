import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyAllMembers } from "@/lib/notify";

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

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const testimony = await db.testimony.create({
      data: {
        memberId: parseInt(session.user.id),
        content,
        translatedContent: translatedContent || null,
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
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
