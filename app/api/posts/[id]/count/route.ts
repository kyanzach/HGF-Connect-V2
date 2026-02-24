import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/posts/[id]/count — lightweight live count for comment + like badges
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id);

  try {
    // Count ALL comments (top-level + replies) for this post
    const [commentCount, likeCount] = await Promise.all([
      (db as any).comment.count({ where: { postId } }),
      (db as any).postLike.count({ where: { postId } }),
    ]);
    return NextResponse.json({ commentCount, likeCount });
  } catch (error) {
    console.error("[api/posts/[id]/count GET]", error);
    return NextResponse.json({ commentCount: 0, likeCount: 0 });
  }
}
