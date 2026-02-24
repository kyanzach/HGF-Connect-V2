import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/comments/[commentId]/like — toggle like on a comment
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const cid = parseInt(commentId);
  const memberId = parseInt(session.user.id);

  try {
    const existing = await (db as any).commentLike.findUnique({
      where: { commentId_memberId: { commentId: cid, memberId } },
    });

    if (existing) {
      // Unlike
      await (db as any).commentLike.delete({ where: { commentId_memberId: { commentId: cid, memberId } } });
      await (db as any).comment.update({ where: { id: cid }, data: { likeCount: { decrement: 1 } } });
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await (db as any).commentLike.create({ data: { commentId: cid, memberId } });
      await (db as any).comment.update({ where: { id: cid }, data: { likeCount: { increment: 1 } } });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("[api/comments/[commentId]/like POST]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
