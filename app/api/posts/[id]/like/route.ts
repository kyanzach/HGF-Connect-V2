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
  const memberId = session.user.id as unknown as number;

  try {
    const existing = await db.postLike.findUnique({
      where: { postId_memberId: { postId, memberId } },
    });

    if (existing) {
      await db.postLike.delete({
        where: { postId_memberId: { postId, memberId } },
      });
      return NextResponse.json({ liked: false });
    } else {
      await db.postLike.create({ data: { postId, memberId } });
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("[api/posts/[id]/like]", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
