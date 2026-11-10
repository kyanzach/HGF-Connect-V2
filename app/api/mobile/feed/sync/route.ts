import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { auth } from "@/lib/auth";
import { PostType } from "@prisma/client";

export const dynamic = "force-dynamic";

function formatPreviewAuthor(a: any) {
  if (!a) {
    return {
      id: 0,
      firstName: "Member",
      lastName: "",
      name: "Member",
      role: "user",
      profilePicture: null,
      avatar: null,
    };
  }
  return {
    id: a.id,
    firstName: a.firstName || "",
    lastName: a.lastName || "",
    name: `${a.firstName || ""} ${a.lastName || ""}`.trim() || "Member",
    role: a.role || "user",
    profilePicture: a.profilePicture || null,
    avatar: a.profilePicture
      ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${a.profilePicture}`
      : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const mobileMember = await getAuthenticatedMember(req);
    let viewerId: number | null = mobileMember?.id ?? null;

    if (!viewerId) {
      const session = await auth().catch(() => null);
      if (session?.user?.id) {
        viewerId = parseInt(session.user.id, 10) || null;
      }
    }

    const { searchParams } = new URL(req.url);
    const rawIds = searchParams.get("postIds") || "";
    const postIds = rawIds
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)
      .slice(0, 40);

    const latestId = parseInt(searchParams.get("latestId") || "0", 10) || 0;
    const memberId = parseInt(searchParams.get("memberId") || "0", 10) || 0;

    const SYSTEM_POST_TYPES: PostType[] = [
      PostType.QUIZ_DAILY,
      PostType.QUIZ_ANNOUNCEMENT,
      PostType.EVENT,
      PostType.BIRTHDAY_MONTHLY,
      PostType.BIRTHDAY_DAILY,
      PostType.QUIZ_REWARD,
    ];

    const visibilityFilter: any = viewerId
      ? { visibility: { in: ["PUBLIC", "MEMBERS_ONLY"] } }
      : { visibility: "PUBLIC" };

    const [rows, newPostsCount] = await Promise.all([
      postIds.length > 0
        ? db.post.findMany({
            where: {
              id: { in: postIds },
            },
            select: {
              id: true,
              bumpedAt: true,
              _count: {
                select: { comments: true, likes: true },
              },
              likes: {
                select: {
                  memberId: true,
                  type: true,
                  member: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      profilePicture: true,
                    },
                  },
                },
              },
              comments: {
                where: { parentId: null },
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                take: 2,
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
                  replies: {
                    orderBy: { createdAt: "asc" },
                    take: 2,
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
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      latestId > 0
        ? db.post.count({
            where: {
              id: { gt: latestId },
              ...visibilityFilter,
              ...(memberId > 0
                ? { authorId: memberId, type: { notIn: SYSTEM_POST_TYPES } }
                : {}),
            },
          })
        : Promise.resolve(0),
    ]);

    const updates = rows.map((p: any) => {
      const myReaction = viewerId
        ? p.likes.find((l: any) => l.memberId === viewerId)?.type || null
        : null;

      const reactionCounts: Record<string, number> = {
        HEART: 0,
        PRAY: 0,
        HUG: 0,
      };
      for (const l of p.likes) {
        reactionCounts[l.type] = (reactionCounts[l.type] || 0) + 1;
      }

      // Keep pinned comments first, otherwise chronological (oldest -> newest of the latest 2)
      const pinned = (p.comments || []).filter((c: any) => c.isPinned);
      const unpinned = (p.comments || []).filter((c: any) => !c.isPinned).reverse();
      const orderedComments = [...pinned, ...unpinned];

      const latestComments = orderedComments.map((c: any) => ({
        id: c.id,
        postId: c.postId,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        isPinned: Boolean(c.isPinned),
        likeCount: c.likeCount ?? 0,
        author: formatPreviewAuthor(c.author),
        replies: (c.replies || []).map((r: any) => ({
          id: r.id,
          postId: c.postId,
          parentId: c.id,
          content: r.content,
          createdAt: r.createdAt.toISOString(),
          likeCount: r.likeCount ?? 0,
          author: formatPreviewAuthor(r.author),
        })),
      }));

      return {
        id: p.id,
        bumpedAt: p.bumpedAt?.toISOString() ?? null,
        likeCount: p._count.likes,
        commentCount: p._count.comments,
        myReaction,
        reactionCounts,
        likes: p.likes.map((l: any) => ({
          memberId: l.memberId,
          type: l.type,
          member: l.member
            ? {
                id: l.member.id,
                firstName: l.member.firstName,
                lastName: l.member.lastName,
                profilePicture: l.member.profilePicture,
                avatar: l.member.profilePicture
                  ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${l.member.profilePicture}`
                  : null,
              }
            : null,
        })),
        latestComments,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        updates,
        existingIds: rows.map((r: any) => r.id),
        newPostsCount,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/feed/sync GET]", err?.message);
    return NextResponse.json(
      { success: false, message: "Sync failed" },
      { status: 500 }
    );
  }
}
