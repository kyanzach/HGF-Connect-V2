import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/comments/[commentId] — pin/unpin (post owner or admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const cid = parseInt(commentId);

  try {
    // Find comment + post to check ownership
    const comment = await (db as any).comment.findUnique({
      where: { id: cid },
      include: { post: { select: { authorId: true } } },
    });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = parseInt(session.user.id);
    const isPostOwner = comment.post.authorId === userId;
    const isAdmin = ["admin", "moderator"].includes(session.user.role ?? "");
    if (!isPostOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { action } = await request.json(); // "pin" | "unpin"
    const pin = action === "pin";

    // Unpin all other comments on same post first (only one pinned at a time)
    if (pin) {
      await (db as any).comment.updateMany({ where: { postId: comment.postId }, data: { isPinned: false } });
    }
    const updated = await (db as any).comment.update({
      where: { id: cid },
      data: { isPinned: pin, pinnedById: pin ? userId : null },
    });
    return NextResponse.json({ isPinned: updated.isPinned });
  } catch (error) {
    console.error("[api/comments/[commentId] PATCH]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/comments/[commentId] — delete own comment or admin
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const cid = parseInt(commentId);

  try {
    const comment = await (db as any).comment.findUnique({
      where: { id: cid },
      select: { authorId: true, post: { select: { authorId: true } } },
    });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const userId = parseInt(session.user.id);
    const isOwner = comment.authorId === userId;
    const isPostOwner = comment.post.authorId === userId;
    const isAdmin = ["admin", "moderator"].includes(session.user.role ?? "");
    if (!isOwner && !isPostOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await (db as any).comment.delete({ where: { id: cid } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[api/comments/[commentId] DELETE]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
