import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const memberId = searchParams.get("member") ? parseInt(searchParams.get("member")!) : null;
  const limit = 20;
  const skip = (page - 1) * limit;

  const session = await auth();

  const visibilityFilter = {
    OR: [
      { visibility: "PUBLIC" as const },
      ...(session ? [{ visibility: "MEMBERS_ONLY" as const }] : []),
    ],
  };

  const where: any = {
    ...visibilityFilter,
    ...(memberId ? { authorId: memberId } : {}),
  };

  try {
    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
              username: true,
            },
          },
          _count: {
            select: { likes: true, comments: true },
          },
          ...(session
            ? {
                likes: {
                  where: { memberId: parseInt(session.user.id) },
                  select: { memberId: true },
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.post.count({ where }),
    ]);

    const postsWithLiked = posts.map((p: any) => ({
      ...p,
      isLiked: session ? (p.likes?.length ?? 0) > 0 : false,
      likes: undefined,
    }));

    return NextResponse.json({
      posts: postsWithLiked,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[api/posts GET]", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, type, imageUrl, verseRef, verseText, aiCaption, visibility } = body;

    if (!content && !imageUrl && !verseText) {
      return NextResponse.json({ error: "Post must have content, image, or verse" }, { status: 400 });
    }

    const post = await db.post.create({
      data: {
        authorId: parseInt(session.user.id),
        type: type ?? "TEXT",
        content: content ?? null,
        imageUrl: imageUrl ?? null,
        aiCaption: aiCaption ?? null,
        verseRef: verseRef ?? null,
        verseText: verseText ?? null,
        visibility: visibility ?? "MEMBERS_ONLY",
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            username: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[api/posts POST]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
