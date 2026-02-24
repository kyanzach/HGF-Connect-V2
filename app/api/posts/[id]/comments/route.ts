import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Props { params: Promise<{ id: string }> }

// GET /api/posts/[id]/comments — fetch all comments (pinned first, then date desc)
export async function GET(
  _request: NextRequest,
  { params }: Props
) {
  const { id } = await params;
  const postId = parseInt(id);
  const session = await auth();
  const viewerId = session?.user?.id ? parseInt(session.user.id) : null;

  try {
    // Fetch top-level comments
    const rows = await (db as any).comment.findMany({
      where: { postId, parentId: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
        // Fetch replies
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        // Check if viewer liked each comment
        ...(viewerId
          ? { commentLikes: { where: { memberId: viewerId }, select: { memberId: true } } }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
    });

    const comments = rows.map((c: any) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      createdAt: c.createdAt,
      isPinned: c.isPinned ?? false,
      likeCount: c.likeCount ?? 0,
      isLiked: viewerId ? (c.commentLikes?.length ?? 0) > 0 : false,
      author: c.author,
      replies: (c.replies ?? []).map((r: any) => ({
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        likeCount: r.likeCount ?? 0,
        isLiked: false,
        author: r.author,
      })),
    }));

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[api/posts/[id]/comments GET]", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }
}

// POST /api/posts/[id]/comments — create a new comment or reply
export async function POST(
  request: NextRequest,
  { params }: Props
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);

  try {
    const { content, parentId } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });

    const comment = await (db as any).comment.create({
      data: {
        postId,
        authorId: parseInt(session.user.id),
        content: content.trim(),
        parentId: parentId ? parseInt(parentId) : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[api/posts/[id]/comments POST]", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
