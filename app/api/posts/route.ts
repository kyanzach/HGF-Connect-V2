import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PostType, type Prisma } from "@prisma/client";
import { notifyAllMembers } from "@/lib/notify";

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

  // System post types that are community-wide, not personal content.
  // Exclude from profile walls so they don't appear as the creator's own posts.
  const SYSTEM_POST_TYPES: PostType[] = [
    PostType.QUIZ_DAILY,
    PostType.QUIZ_ANNOUNCEMENT,
    PostType.EVENT,
    PostType.BIRTHDAY_MONTHLY,
    PostType.BIRTHDAY_DAILY,
    PostType.QUIZ_REWARD,
  ];

  const isChurch = searchParams.get("church") === "true";

  const where: any = {
    ...visibilityFilter,
    ...(isChurch
      ? { type: { in: [PostType.EVENT, PostType.BIRTHDAY_MONTHLY, PostType.BIRTHDAY_DAILY] } }
      : memberId
      ? { authorId: memberId, type: { notIn: SYSTEM_POST_TYPES } }
      : {}),
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
          photos: {
            orderBy: { sortOrder: "asc" },
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
    const { content, type, imageUrl, verseRef, verseText, aiCaption, visibility, linkUrl, linkTitle, linkDesc, linkImage, photos } = body;

    if (!content && !imageUrl && !verseText && !linkUrl && (!photos || photos.length === 0)) {
      return NextResponse.json({ error: "Post must have content, image, photos, verse, or link" }, { status: 400 });
    }

    let prayerRequestVal = null;
    if (type === "PRAYER") {
      prayerRequestVal = await db.prayerRequest.create({
        data: {
          authorId: parseInt(session.user.id),
          request: content?.trim() || "",
          visibility: visibility ?? "MEMBERS_ONLY",
        }
      });
    }

    const post = await db.post.create({
      data: {
        authorId: parseInt(session.user.id),
        type: type ?? "TEXT",
        content: content ?? null,
        imageUrl: imageUrl ?? null,
        aiCaption: prayerRequestVal ? String(prayerRequestVal.id) : (aiCaption ?? null),
        verseRef: verseRef ?? null,
        verseText: verseText ?? null,
        visibility: visibility ?? "MEMBERS_ONLY",
        linkUrl: linkUrl ?? null,
        linkTitle: linkTitle ?? null,
        linkDesc: linkDesc ?? null,
        linkImage: linkImage ?? null,
        photos: {
          create: (photos || []).map((photoUrl: string, index: number) => ({
            photoPath: photoUrl,
            sortOrder: index,
          })),
        },
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
        photos: {
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    // ------ Notify all members (fire-and-forget) ------
    const TYPE_LABEL: Record<string, string> = {
      TEXT: "a thought", DEVO: "a devotional", VERSE_CARD: "a Bible verse",
      PRAYER: "a prayer", PRAISE: "a testimony", EVENT: "an event",
    };
    const label = TYPE_LABEL[type ?? "TEXT"] ?? "something";
    const authorName = `${post.author.firstName} ${post.author.lastName}`;
    const preview = (content ?? verseText ?? "")?.slice(0, 80);
    const link = (type === "PRAYER" && prayerRequestVal)
      ? `/prayer?highlight=${prayerRequestVal.id}`
      : `/feed?post=${post.id}`;

    void notifyAllMembers({
      actorId: parseInt(session.user.id),
      type: "new_post",
      title: `${authorName} shared ${label}`,
      body: preview || "(No preview)",
      link,
    });
    // --------------------------------------------------

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[api/posts POST]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
