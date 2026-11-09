import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

function formatAuthor(a: any) {
  return {
    id: a.id,
    firstName: a.firstName || "",
    lastName: a.lastName || "",
    name: `${a.firstName || ""} ${a.lastName || ""}`.trim(),
    role: a.role || "user",
    profilePicture: a.profilePicture || null,
    avatar: a.profilePicture
      ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${a.profilePicture}`
      : null,
  };
}

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

    const member = await getAuthenticatedMember(req);
    const viewerId = member?.id ?? null;

    const rows = await (db as any).comment.findMany({
      where: { postId, parentId: null },
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
        ...(viewerId
          ? { commentLikes: { where: { memberId: viewerId }, select: { memberId: true } } }
          : {}),
        replies: {
          orderBy: { createdAt: "asc" },
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
            ...(viewerId
              ? { commentLikes: { where: { memberId: viewerId }, select: { memberId: true } } }
              : {}),
          },
        },
      },
    });

    const comments = rows.map((c: any) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      isPinned: Boolean(c.isPinned),
      likeCount: c.likeCount ?? 0,
      isLiked: viewerId ? (c.commentLikes?.length ?? 0) > 0 : false,
      author: formatAuthor(c.author),
      replies: (c.replies ?? []).map((r: any) => ({
        id: r.id,
        postId: c.postId,
        parentId: c.id,
        content: r.content,
        createdAt: r.createdAt.toISOString(),
        likeCount: r.likeCount ?? 0,
        isLiked: viewerId ? (r.commentLikes?.length ?? 0) > 0 : false,
        author: formatAuthor(r.author),
      })),
    }));

    return NextResponse.json({
      success: true,
      comments,
      data: { comments },
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
    const action = String(body?.action || "");

    // 1. Toggle Like on a Comment or Reply
    if (action === "like") {
      const cid = Number(body?.commentId);
      if (!cid) return NextResponse.json({ success: false, message: "Invalid comment ID" }, { status: 400 });
      const existing = await (db as any).commentLike.findUnique({
        where: { commentId_memberId: { commentId: cid, memberId: member.id } },
      });
      if (existing) {
        await (db as any).commentLike.delete({
          where: { commentId_memberId: { commentId: cid, memberId: member.id } },
        });
        await (db as any).comment.update({
          where: { id: cid },
          data: { likeCount: { decrement: 1 } },
        });
        return NextResponse.json({ success: true, liked: false });
      } else {
        await (db as any).commentLike.create({
          data: { commentId: cid, memberId: member.id },
        });
        await (db as any).comment.update({
          where: { id: cid },
          data: { likeCount: { increment: 1 } },
        });
        return NextResponse.json({ success: true, liked: true });
      }
    }

    // 2. Pin / Unpin a Comment
    if (action === "pin" || action === "unpin") {
      const cid = Number(body?.commentId);
      const comment = await (db as any).comment.findUnique({
        where: { id: cid },
        include: { post: { select: { authorId: true } } },
      });
      if (!comment) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      const isPostOwner = comment.post.authorId === member.id;
      const isAdmin = ["admin", "moderator"].includes(member.role ?? "");
      if (!isPostOwner && !isAdmin) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      const pin = action === "pin";
      if (pin) {
        await (db as any).comment.updateMany({
          where: { postId: comment.postId },
          data: { isPinned: false },
        });
      }
      const updated = await (db as any).comment.update({
        where: { id: cid },
        data: { isPinned: pin, pinnedById: pin ? member.id : null },
      });
      return NextResponse.json({ success: true, isPinned: updated.isPinned });
    }

    // 3. Delete a Comment or Reply
    if (action === "delete") {
      const cid = Number(body?.commentId);
      const comment = await (db as any).comment.findUnique({
        where: { id: cid },
        select: { id: true, authorId: true, post: { select: { authorId: true } } },
      });
      if (!comment) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      const isOwner = comment.authorId === member.id;
      const isPostOwner = comment.post.authorId === member.id;
      const isAdmin = ["admin", "moderator"].includes(member.role ?? "");
      if (!isOwner && !isPostOwner && !isAdmin) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      await (db as any).comment.delete({ where: { id: cid } });
      return NextResponse.json({ success: true, deleted: true });
    }

    // 4. Create Comment or Reply
    const content = String(body?.content || "").trim();
    const parentId = body?.parentId ? Number(body.parentId) : null;
    const mentionedMemberIds: number[] = Array.isArray(body?.mentionedMemberIds)
      ? body.mentionedMemberIds.map((x: any) => Number(x)).filter((n: number) => !isNaN(n) && n > 0)
      : [];

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

    const created = await (db as any).comment.create({
      data: {
        postId,
        authorId: member.id,
        content,
        parentId: parentId || null,
      },
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

    await db.post
      .update({
        where: { id: postId },
        data: { bumpedAt: new Date() },
      })
      .catch(() => {});

    const authorName = `${member.firstName} ${member.lastName}`.trim();
    const preview = content.slice(0, 80);
    const postLink = `/feed?post=${postId}&comment=${created.id}`;
    const notified = new Set<number>([member.id]);

    if (parentId) {
      const parent = await (db as any).comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });
      if (parent && !notified.has(parent.authorId)) {
        notified.add(parent.authorId);
        createNotification({
          memberId: parent.authorId,
          type: "comment_reply",
          title: `${authorName} replied to your comment`,
          body: preview,
          link: postLink,
          actorId: member.id,
        }).catch(() => {});
      }
      if (post.authorId && !notified.has(post.authorId)) {
        notified.add(post.authorId);
        createNotification({
          memberId: post.authorId,
          type: "new_comment",
          title: `${authorName} replied in your post`,
          body: preview,
          link: postLink,
          actorId: member.id,
        }).catch(() => {});
      }
    } else if (post.authorId && !notified.has(post.authorId)) {
      notified.add(post.authorId);
      createNotification({
        memberId: post.authorId,
        type: "new_comment",
        title: `${authorName} commented on your post`,
        body: preview,
        link: postLink,
        actorId: member.id,
      }).catch(() => {});
    }

    for (const targetId of mentionedMemberIds) {
      if (!notified.has(targetId)) {
        notified.add(targetId);
        createNotification({
          memberId: targetId,
          type: "mention",
          title: `${authorName} mentioned you in a comment`,
          body: preview,
          link: postLink,
          actorId: member.id,
        }).catch(() => {});
      }
    }

    const formattedComment = {
      id: created.id,
      postId: created.postId,
      parentId: created.parentId || null,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      isPinned: false,
      likeCount: 0,
      isLiked: false,
      author: formatAuthor(created.author),
      replies: [],
    };

    return NextResponse.json({
      success: true,
      comment: formattedComment,
      data: { commentId: created.id, comment: formattedComment },
    });
  } catch (err: any) {
    console.error("[api/mobile/posts/[id]/comments POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to add comment" }, { status: 500 });
  }
}
