import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);
  const memberId = parseInt(session.user.id);

  let reqBody: any = {};
  try {
    reqBody = await _request.json();
  } catch {}
  const reactionType = reqBody.type || "HEART";

  try {
    const existing = await db.postLike.findUnique({
      where: { postId_memberId: { postId, memberId } },
    });

    if (existing) {
      if (existing.type === reactionType) {
        await db.postLike.delete({
          where: { postId_memberId: { postId, memberId } },
        });
        return NextResponse.json({ liked: false, type: null });
      } else {
        await db.postLike.update({
          where: { postId_memberId: { postId, memberId } },
          data: { type: reactionType },
        });
        return NextResponse.json({ liked: true, type: reactionType });
      }
    } else {
      await db.postLike.create({ data: { postId, memberId, type: reactionType } });
      return NextResponse.json({ liked: true, type: reactionType });
    }
  } catch (error) {
    console.error("[api/posts/[id]/like]", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
