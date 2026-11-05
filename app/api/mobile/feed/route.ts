import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { notifyAllMembers } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 25), 50);

    const posts = await db.post.findMany({
      where: {
        visibility: member ? { in: ["PUBLIC", "MEMBERS_ONLY"] } : "PUBLIC",
      },
      orderBy: [{ bumpedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            profilePicture: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, photoPath: true },
        },
        likes: {
          select: { memberId: true, type: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });

    const formatted = posts.map((p) => {
      const myReaction = member
        ? p.likes.find((l) => l.memberId === member.id)?.type || null
        : null;

      const reactionCounts: Record<string, number> = {
        HEART: 0,
        AMEN: 0,
        PRAYING: 0,
        PRAISE: 0,
      };
      for (const l of p.likes) {
        reactionCounts[l.type] = (reactionCounts[l.type] || 0) + 1;
      }

      const images: string[] = [];
      if (p.imageUrl) {
        images.push(
          p.imageUrl.startsWith("http")
            ? p.imageUrl
            : `https://connect.houseofgrace.ph${p.imageUrl.startsWith("/") ? "" : "/"}${p.imageUrl}`
        );
      }
      for (const ph of p.photos) {
        const url = ph.photoPath.startsWith("http")
          ? ph.photoPath
          : `https://connect.houseofgrace.ph${ph.photoPath.startsWith("/") ? "" : "/"}${ph.photoPath}`;
        if (!images.includes(url)) images.push(url);
      }

      return {
        id: p.id,
        type: p.type,
        content: p.content || "",
        verseRef: p.verseRef,
        verseText: p.verseText,
        images,
        createdAt: p.createdAt.toISOString(),
        author: {
          id: p.author.id,
          name: `${p.author.firstName} ${p.author.lastName}`.trim(),
          username: p.author.username,
          role: p.author.role,
          avatar: p.author.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${p.author.profilePicture}`
            : null,
        },
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        myReaction,
        reactionCounts,
      };
    });

    return NextResponse.json({
      success: true,
      data: { posts: formatted },
    });
  } catch (err: any) {
    console.error("[api/mobile/feed GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load feed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || member.status === "pending") {
      return NextResponse.json(
        { success: false, message: "Approved account required to publish posts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const content = String(body?.content || "").trim();
    const type = body?.type === "PRAYER" || body?.type === "PRAISE" || body?.type === "DEVO" ? body.type : "TEXT";
    const verseRef = body?.verseRef ? String(body.verseRef).trim() : null;
    const verseText = body?.verseText ? String(body.verseText).trim() : null;

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Please write something before posting." },
        { status: 400 }
      );
    }

    const post = await db.post.create({
      data: {
        authorId: member.id,
        type,
        content,
        verseRef,
        verseText,
        visibility: "MEMBERS_ONLY",
      },
    });

    notifyAllMembers({
      actorId: member.id,
      type: "new_post",
      title: `${member.firstName} ${member.lastName} shared a post`,
      body: content.slice(0, 120),
      link: `/feed?post=${post.id}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { postId: post.id },
    });
  } catch (err: any) {
    console.error("[api/mobile/feed POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to publish post." }, { status: 500 });
  }
}
