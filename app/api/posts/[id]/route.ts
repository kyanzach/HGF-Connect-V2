import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  try {
    const post = await db.post.findUnique({
      where: { id },
      select: { authorId: true, type: true, aiCaption: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Allow deletion if the user is the original author OR is an admin/moderator
    const isOwnPost = String(post.authorId) === session.user.id;
    const isAuthorized = isOwnPost || ["admin", "moderator"].includes(session.user.role);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.post.delete({
      where: { id },
    });

    if (post.type === "PRAYER" && post.aiCaption) {
      const prId = parseInt(post.aiCaption);
      if (!isNaN(prId)) {
        await db.prayerRequest.deleteMany({
          where: { id: prId },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/posts/[id]]", error?.message);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
