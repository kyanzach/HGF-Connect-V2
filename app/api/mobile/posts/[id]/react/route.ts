import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = Number(id);
    if (!postId) {
      return NextResponse.json({ success: false, message: "Invalid post ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const reactionType = ["HEART", "PRAY", "HUG", "AMEN", "PRAYING", "PRAISE"].includes(body?.type)
      ? body.type
      : "HEART";

    const existing = await db.postLike.findUnique({
      where: { postId_memberId: { postId, memberId: member.id } },
    });

    let myReaction: string | null = null;
    if (existing) {
      if (existing.type === reactionType) {
        await db.postLike.delete({
          where: { postId_memberId: { postId, memberId: member.id } },
        });
        myReaction = null;
      } else {
        await db.postLike.update({
          where: { postId_memberId: { postId, memberId: member.id } },
          data: { type: reactionType },
        });
        myReaction = reactionType;
      }
    } else {
      await db.postLike.create({
        data: { postId, memberId: member.id, type: reactionType },
      });
      myReaction = reactionType;

      const post = await db.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (post && post.authorId !== member.id) {
        createNotification({
          memberId: post.authorId,
          type: "general",
          title: `${member.firstName} ${member.lastName} reacted to your post`,
          body: "Tap to view your post in the community feed.",
          link: `/feed?post=${postId}`,
          actorId: member.id,
        }).catch(() => {});
      }
    }

    const count = await db.postLike.count({ where: { postId } });

    return NextResponse.json({
      success: true,
      data: { myReaction, likeCount: count },
    });
  } catch (err: any) {
    console.error("[api/mobile/posts/[id]/react]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to react" }, { status: 500 });
  }
}
