import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    if (!postId) {
      return NextResponse.json({ success: false, message: "Invalid post ID" }, { status: 400 });
    }

    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        comments: comments.map((c) => ({
          id: c.id,
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          author: {
            id: c.author.id,
            name: `${c.author.firstName} ${c.author.lastName}`.trim(),
            role: c.author.role,
            avatar: c.author.profilePicture
              ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${c.author.profilePicture}`
              : null,
          },
        })),
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/posts/[id]/comments GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load comments" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || member.status === "pending") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = Number(id);
    const body = await req.json();
    const content = String(body?.content || "").trim();

    if (!postId || !content) {
      return NextResponse.json({ success: false, message: "Comment cannot be empty." }, { status: 400 });
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });
    if (!post) {
      return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
    }

    const comment = await db.comment.create({
      data: {
        postId,
        authorId: member.id,
        content,
      },
    });

    await db.post
      .update({
        where: { id: postId },
        data: { bumpedAt: new Date() },
      })
      .catch(() => {});

    if (post.authorId !== member.id) {
      createNotification({
        memberId: post.authorId,
        type: "new_comment",
        title: `${member.firstName} ${member.lastName} commented on your post`,
        body: content.slice(0, 120),
        link: `/feed?post=${postId}`,
        actorId: member.id,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: { commentId: comment.id },
    });
  } catch (err: any) {
    console.error("[api/mobile/posts/[id]/comments POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to add comment" }, { status: 500 });
  }
}
