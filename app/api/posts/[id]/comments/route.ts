import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notify";

interface Props { params: Promise<{ id: string }> }

// GET /api/posts/[id]/comments — fetch all comments (pinned first, then date asc)
export async function GET(
  _request: NextRequest,
  { params }: Props
) {
  const { id } = await params;
  const postId = parseInt(id);
  const session = await auth();
  const viewerId = session?.user?.id ? parseInt(session.user.id) : null;

  try {
    const rows = await (db as any).comment.findMany({
      where: { postId, parentId: null },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
          },
          orderBy: { createdAt: "asc" },
        },
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

// POST /api/posts/[id]/comments — create comment or reply
export async function POST(
  request: NextRequest,
  { params }: Props
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = parseInt(id);
  const authorId = parseInt(session.user.id);

  try {
    const { content, parentId, mentionedMemberIds } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });

    // Create comment
    const comment = await (db as any).comment.create({
      data: {
        postId,
        authorId,
        content: content.trim(),
        parentId: parentId ? parseInt(parentId) : null,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
      },
    });

    const authorName = `${comment.author.firstName} ${comment.author.lastName}`;
    const preview = content.trim().slice(0, 80);
    const postLink = `/feed?post=${postId}`;

    // ── Notifications (fire-and-forget, never blocks response) ───────────────

    // Fetch post author once — needed for all branches
    const post = await (db as any).post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    const postAuthorId: number | null = post?.authorId ?? null;

    // Track who we've already notified to avoid duplicates
    const notified = new Set<number>([authorId]);

    if (parentId) {
      // ── REPLY ──
      // 1. Notify parent comment's author (comment_reply)
      const parent = await (db as any).comment.findUnique({
        where: { id: parseInt(parentId) },
        select: { authorId: true },
      });
      if (parent && !notified.has(parent.authorId)) {
        notified.add(parent.authorId);
        void createNotification({
          memberId: parent.authorId,
          type: "comment_reply",
          title: `${authorName} replied to your comment`,
          body: preview,
          link: postLink,
          actorId: authorId,
        });
      }

      // 2. Also notify post author (new_comment) if different from parent author and commenter
      if (postAuthorId && !notified.has(postAuthorId)) {
        notified.add(postAuthorId);
        void createNotification({
          memberId: postAuthorId,
          type: "new_comment",
          title: `${authorName} replied in your post`,
          body: preview,
          link: postLink,
          actorId: authorId,
        });
      }
    } else {
      // ── TOP-LEVEL COMMENT ──
      // Notify post author (new_comment)
      if (postAuthorId && !notified.has(postAuthorId)) {
        notified.add(postAuthorId);
        void createNotification({
          memberId: postAuthorId,
          type: "new_comment",
          title: `${authorName} commented on your post`,
          body: preview,
          link: postLink,
          actorId: authorId,
        });
      }
    }

    // ── @Mention notifications (deduped) ──────────────────────────────────
    const mentionIds: number[] = (mentionedMemberIds ?? [])
      .map((x: any) => parseInt(x))
      .filter((mid: number) => !isNaN(mid) && !notified.has(mid));

    for (const targetId of mentionIds) {
      notified.add(targetId);
      void createNotification({
        memberId: targetId,
        type: "mention",
        title: `${authorName} mentioned you in a comment`,
        body: preview,
        link: postLink,
        actorId: authorId,
      });
    }
    // ─────────────────────────────────────────────────────────────────────

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[api/posts/[id]/comments POST]", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}
