import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification } from "@/lib/notify";
import {
  getQuizDayForDate,
  isQuizWeekExpired,
  canAccessDay,
  QUIZ_DAYS,
  QUIZ_TYPE_LABELS,
  REWARD_DISPLAY,
  getRewardTier,
  gradeEssay,
} from "@/lib/quiz-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const viewer = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const memberIdParam = searchParams.get("memberId");

    if (memberIdParam) {
      const targetId = parseInt(memberIdParam, 10);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = 20;
      const skip = (page - 1) * limit;

      if (isNaN(targetId)) {
        return NextResponse.json({ error: "Invalid memberId" }, { status: 400 });
      }
      const member = await db.member.findUnique({
        where: { id: targetId },
        include: {
          ministries: {
            where: { status: "active" },
            include: { ministry: { select: { id: true, name: true } } },
            orderBy: { joinedDate: "asc" },
          },
        },
      });
      if (!member || member.status === "archived") {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      const isOwn = viewer?.id === targetId;
      const isAdmin = viewer ? ["admin", "moderator"].includes(viewer.role ?? "") : false;

      const postWhere: any = {
        authorId: targetId,
        type: {
          notIn: [
            "QUIZ_DAILY",
            "QUIZ_ANNOUNCEMENT",
            "EVENT",
            "BIRTHDAY_MONTHLY",
            "BIRTHDAY_DAILY",
            "QUIZ_REWARD",
          ] as any,
        },
        OR: [
          { visibility: "PUBLIC" },
          { visibility: "MEMBERS_ONLY" },
          ...(isOwn ? [{ visibility: "PRIVATE" as const }] : []),
        ],
      };

      const [posts, totalPosts, photoHistory] = await Promise.all([
        db.post.findMany({
          where: postWhere,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
                username: true,
              },
            },
            _count: { select: { likes: true, comments: true } },
            photos: { orderBy: { sortOrder: "asc" } },
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
          orderBy: { bumpedAt: "desc" },
          skip,
          take: limit,
        }),
        db.post.count({ where: postWhere }),
        (db as any).memberPhoto
          ? (db as any).memberPhoto
              .findMany({
                where: { memberId: targetId },
                orderBy: { createdAt: "desc" },
              })
              .catch(() => [])
          : Promise.resolve([]),
      ]);

      const totalPages = Math.max(1, Math.ceil(totalPosts / limit));

      return NextResponse.json(
        JSON.parse(
          JSON.stringify({
            success: true,
            data: {
              member: {
                id: member.id,
                firstName: member.firstName ?? "",
                lastName: member.lastName ?? "",
                profilePicture: member.profilePicture ?? null,
                coverPhoto: member.coverPhoto ?? null,
                coverPhotoPositionX: Number(member.coverPhotoPositionX) || 50,
                coverPhotoPositionY: Number(member.coverPhotoPositionY) || 50,
                favoriteVerse: member.favoriteVerse ?? null,
                joinDate: member.joinDate?.toISOString() ?? null,
                birthdate: member.birthdate?.toISOString() ?? null,
                baptismDate: member.baptismDate?.toISOString() ?? null,
                invitedBy: member.invitedBy ?? null,
                address: member.address ?? null,
                gender: member.gender ?? null,
                email: member.email ?? null,
                phone: member.phone ?? null,
                showEmail: member.showEmail ?? false,
                showPhone: member.showPhone ?? false,
                showAddress: member.showAddress ?? false,
                familyMembers: member.familyMembers ?? null,
                ministries: member.ministries.map((mm) => ({
                  id: mm.id,
                  ministry: mm.ministry,
                  joinedDate: mm.joinedDate?.toISOString() ?? null,
                })),
                isOwn,
                isAdmin,
              },
              posts: posts.map((p: any) => ({
                ...p,
                likeCount: p._count?.likes ?? 0,
                commentCount: p._count?.comments ?? 0,
                isLiked: viewer ? p.likes.some((l: any) => l.memberId === viewer.id) : false,
                myReaction: viewer
                  ? p.likes.find((l: any) => l.memberId === viewer.id)?.type || null
                  : null,
                latestComments: [
                  ...(p.comments || []).filter((c: any) => c.isPinned),
                  ...(p.comments || []).filter((c: any) => !c.isPinned).reverse(),
                ].map((c: any) => ({
                  id: c.id,
                  postId: c.postId,
                  content: c.content,
                  createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
                  isPinned: Boolean(c.isPinned),
                  likeCount: c.likeCount ?? 0,
                  author: {
                    id: c.author?.id ?? 0,
                    firstName: c.author?.firstName || "",
                    lastName: c.author?.lastName || "",
                    name: `${c.author?.firstName || ""} ${c.author?.lastName || ""}`.trim() || "Member",
                    role: c.author?.role || "user",
                    profilePicture: c.author?.profilePicture || null,
                    avatar: c.author?.profilePicture
                      ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${c.author.profilePicture}`
                      : null,
                  },
                  replies: (c.replies || []).map((r: any) => ({
                    id: r.id,
                    postId: c.postId,
                    parentId: c.id,
                    content: r.content,
                    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
                    likeCount: r.likeCount ?? 0,
                    author: {
                      id: r.author?.id ?? 0,
                      firstName: r.author?.firstName || "",
                      lastName: r.author?.lastName || "",
                      name: `${r.author?.firstName || ""} ${r.author?.lastName || ""}`.trim() || "Member",
                      role: r.author?.role || "user",
                      profilePicture: r.author?.profilePicture || null,
                      avatar: r.author?.profilePicture
                        ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${r.author.profilePicture}`
                        : null,
                    },
                  })),
                })),
              })),
              page,
              totalPages,
              hasMore: page < totalPages,
              photoHistory,
            },
          })
        )
      );
    }

    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const quizIdParam = searchParams.get("quizId");
    const requestedQuizId = quizIdParam ? parseInt(quizIdParam, 10) : null;

    const [members, ministries, resources, submissions, journalEntries, latestQuiz, allQuizzes] =
      await Promise.all([
        db.member.findMany({
          where: {
            status: { notIn: ["pending", "archived"] },
            ...(q
              ? {
                  OR: [
                    { firstName: { contains: q } },
                    { lastName: { contains: q } },
                    { username: { contains: q } },
                  ],
                }
              : {}),
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          take: 600,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            role: true,
            type: true,
            ageGroup: true,
            profilePicture: true,
            coverPhoto: true,
            joinDate: true,
            birthdate: true,
            baptismDate: true,
            invitedBy: true,
            familyMembers: true,
            phone: true,
            address: true,
            favoriteVerse: true,
            ministries: {
              where: { status: "active" },
              include: {
                ministry: { select: { id: true, name: true } },
              },
            },
          },
        }),
        db.ministry.findMany({
          where: { status: "active" },
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                members: { where: { status: "active" } },
              },
            },
          },
        }),
        db.event.findMany({
          where: {
            presentationFile: { not: null },
          },
          orderBy: { eventDate: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            eventDate: true,
            coverPhoto: true,
            presentationFile: true,
            presentationOriginalName: true,
            presentationSlides: true,
            speaker: true,
            commentary: true,
          },
        }),
        (db as any).quizSubmission
          .findMany({
            take: 500,
            orderBy: { score: "desc" },
            include: {
              member: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePicture: true,
                  status: true,
                },
              },
            },
          })
          .catch(() => []),
        viewer
          ? db.journalEntry.findMany({
              where: { authorId: viewer.id },
              orderBy: { createdAt: "desc" },
              take: 50,
            })
          : Promise.resolve([]),
        db.sermonQuiz
          .findFirst({
            where:
              requestedQuizId && !isNaN(requestedQuizId)
                ? { id: requestedQuizId, status: { in: ["published", "completed"] } }
                : { status: { in: ["published", "completed"] } },
            orderBy: { sermonDate: "desc" },
            include: {
              questions: {
                orderBy: { dayNumber: "asc" },
                select: {
                  id: true,
                  dayNumber: true,
                  questionType: true,
                  questionText: true,
                  options: true,
                  hint: true,
                  correctAnswer: true,
                  explanation: true,
                },
              },
              rewardItems: true,
              event: true,
            },
          })
          .catch(() => null),
        db.sermonQuiz
          .findMany({
            where: { status: { in: ["published", "completed"] } },
            orderBy: { sermonDate: "desc" },
            include: {
              rewards: {
                where: { memberId: viewer?.id || 0 },
                select: {
                  totalScore: true,
                  rewardTier: true,
                  claimStatus: true,
                },
              },
              submissions: {
                where: { memberId: viewer?.id || 0 },
                select: {
                  isCorrect: true,
                },
              },
              catchupSessions: {
                where: { memberId: viewer?.id || 0 },
                select: {
                  id: true,
                  startedAt: true,
                  expiresAt: true,
                  isCompleted: true,
                },
              },
            },
          })
          .catch(() => []),
      ]);

    const mostRecentQuizId = allQuizzes[0]?.id ?? latestQuiz?.id ?? null;

    // Build quizHistory (identical to /api/quiz/history)
    const quizHistory = (allQuizzes || []).map((qz: any) => {
      const reward = qz.rewards?.[0];
      const played = (qz.submissions?.length || 0) > 0;
      const submissionsCount = qz.submissions?.length || 0;
      const isExpired = isQuizWeekExpired(qz.sermonDate);
      const catchup = qz.catchupSessions?.[0] || null;
      let catchupStatus: "none" | "active" | "completed" | "expired" = "none";
      if (catchup) {
        if (catchup.isCompleted || submissionsCount >= 7) {
          catchupStatus = "completed";
        } else if (new Date() < catchup.expiresAt) {
          catchupStatus = "active";
        } else {
          catchupStatus = "expired";
        }
      }
      const score = reward
        ? reward.totalScore
        : (qz.submissions || []).filter((s: any) => s.isCorrect).length;
      let tier = reward?.rewardTier || null;
      if (played && !tier) {
        if (score >= 7) tier = "PERFECT";
        else if (score >= 6) tier = "EXCELLENT";
        else if (score >= 4) tier = "GOOD";
        else tier = "PARTICIPANT";
      }
      return {
        id: qz.id,
        title: qz.title,
        sermonDate: qz.sermonDate.toISOString(),
        status: qz.status,
        played,
        score,
        tier,
        submissionsCount,
        isExpired,
        catchupStatus,
        catchupExpiresAt: catchup ? catchup.expiresAt.toISOString() : null,
      };
    });

    // Build quizStatus for the authenticated viewer (identical to /api/quiz/status)
    let quizStatus: any = { active: false };
    if (latestQuiz) {
      const memberId = viewer?.id || 0;
      let isAdminOrPastor =
        viewer?.role === "admin" || viewer?.role === "moderator";
      if (!isAdminOrPastor && memberId) {
        const pm = await db.memberMinistry
          .findFirst({
            where: { memberId, ministryId: 11, status: "active" },
          })
          .catch(() => null);
        isAdminOrPastor = Boolean(pm);
      }
      const isActiveQuiz = mostRecentQuizId ? latestQuiz.id === mostRecentQuizId : true;

      const userSubs = memberId
        ? await db.quizSubmission.findMany({
            where: { quizId: latestQuiz.id, memberId },
            select: {
              questionId: true,
              isCorrect: true,
              score: true,
              aiFeedback: true,
              submittedAt: true,
            },
          })
        : [];

      const submissionMap = new Map(userSubs.map((s) => [s.questionId, s]));
      const quizRelativeDay = getQuizDayForDate(latestQuiz.sermonDate);
      const currentDay = Math.min(Math.max(quizRelativeDay, 0), 7);
      const isExpired = isQuizWeekExpired(latestQuiz.sermonDate);

      const catchupSession = memberId
        ? await db.quizCatchupSession
            .findUnique({
              where: { quizId_memberId: { quizId: latestQuiz.id, memberId } },
            })
            .catch(() => null)
        : null;
      const isCatchupActive = Boolean(
        catchupSession &&
          !catchupSession.isCompleted &&
          new Date() < catchupSession.expiresAt
      );

      const days = latestQuiz.questions.map((q) => {
        const sub = submissionMap.get(q.id);
        const typeInfo = QUIZ_TYPE_LABELS[q.questionType];
        const dayMeta = QUIZ_DAYS.find((d) => d.dayNumber === q.dayNumber);

        let status: "completed" | "available" | "locked" | "today" | "expired";
        if (sub) {
          status = "completed";
        } else if (isCatchupActive) {
          status = "available";
        } else if (isExpired) {
          status = "expired";
        } else if (q.dayNumber === currentDay) {
          status = "today";
        } else if (currentDay > 0 && q.dayNumber <= currentDay) {
          status = "available";
        } else {
          status = "locked";
        }

        return {
          questionId: q.id,
          dayNumber: q.dayNumber,
          label: dayMeta?.label || `Day ${q.dayNumber}`,
          type: q.questionType,
          typeLabel: typeInfo?.label || q.questionType,
          typeEmoji: typeInfo?.emoji || "🧠",
          difficulty: typeInfo?.difficulty || "Easy",
          questionText: q.questionText,
          options: q.options ? JSON.parse(JSON.stringify(q.options)) : null,
          hint: q.hint || null,
          status,
          score: sub?.score ?? null,
          isCorrect: sub?.isCorrect ?? null,
          feedback: sub?.aiFeedback ?? null,
          correctAnswer: isAdminOrPastor ? q.correctAnswer : null,
          explanation: isAdminOrPastor ? (q as any).explanation || null : null,
        };
      });

      const completedCount = userSubs.length;
      const totalScore = userSubs.reduce((sum, s) => sum + s.score, 0);
      const isWeekComplete = completedCount >= 7;
      const rewardTier = isWeekComplete ? getRewardTier(totalScore) : null;

      let rewardClaim = null;
      if (isWeekComplete && memberId) {
        rewardClaim = await db.quizReward
          .findUnique({
            where: { quizId_memberId: { quizId: latestQuiz.id, memberId } },
            select: {
              rewardTier: true,
              claimStatus: true,
              claimDetails: true,
              totalScore: true,
            },
          })
          .catch(() => null);
      }

      let rewardDisplay: any = rewardTier ? { ...REWARD_DISPLAY[rewardTier] } : null;
      if (rewardTier && latestQuiz.rewardItems) {
        const matchedItem = latestQuiz.rewardItems.find(
          (item: any) => item.rewardTier === rewardTier
        );
        if (matchedItem) {
          rewardDisplay = {
            label: rewardDisplay?.label || matchedItem.title,
            description: matchedItem.description || rewardDisplay?.description || "",
            imageUrl: matchedItem.imageUrl || null,
          };
        }
      }

      quizStatus = {
        active: true,
        attended: true,
        isActiveQuiz,
        isExpired,
        isCatchup: isCatchupActive,
        catchupExpiresAt: catchupSession?.expiresAt
          ? catchupSession.expiresAt.toISOString()
          : null,
        catchupCompleted: catchupSession?.isCompleted || false,
        quizWeekStatus: isExpired ? "COMPLETED" : "ACTIVE",
        quiz: {
          id: latestQuiz.id,
          title: latestQuiz.title,
          sermonDate: latestQuiz.sermonDate.toISOString(),
          youtubeVideoId: latestQuiz.youtubeVideoId,
          status: latestQuiz.status,
          eventId: latestQuiz.eventId,
          presentationFile: latestQuiz.event?.presentationFile ?? null,
          presentationOriginalName:
            latestQuiz.event?.presentationOriginalName ?? null,
          presentationSlides: latestQuiz.event?.presentationSlides
            ? JSON.parse(JSON.stringify(latestQuiz.event.presentationSlides))
            : null,
          commentary: latestQuiz.event?.commentary ?? null,
          speaker: latestQuiz.event?.speaker ?? null,
        },
        days,
        currentDay,
        rewardItems: latestQuiz.rewardItems
          ? JSON.parse(JSON.stringify(latestQuiz.rewardItems))
          : [],
        progress: {
          completed: completedCount,
          total: 7,
          totalScore,
          isWeekComplete,
          rewardTier,
          rewardDisplay,
          rewardClaim: rewardClaim ? JSON.parse(JSON.stringify(rewardClaim)) : null,
        },
      };
    }

    // Dual Leaderboards (1:1 with /api/quiz/leaderboard — Weekly + All-Time)
    let weeklyLeaderboard: Array<{
      id: number;
      name: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
      score: number;
    }> = [];

    if (mostRecentQuizId) {
      const weeklySubs = await db.quizSubmission
        .findMany({
          where: { quizId: mostRecentQuizId, isCorrect: true },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePicture: true,
                status: true,
              },
            },
          },
        })
        .catch(() => []);

      const weeklyMap = new Map<
        number,
        {
          id: number;
          name: string;
          firstName: string;
          lastName: string;
          avatar: string | null;
          score: number;
        }
      >();
      for (const sub of weeklySubs) {
        if (!sub.member || !["active", "approved"].includes(sub.member.status)) continue;
        const mId = sub.member.id;
        const cur = weeklyMap.get(mId) || {
          id: mId,
          name: `${sub.member.firstName} ${sub.member.lastName}`.trim(),
          firstName: sub.member.firstName,
          lastName: sub.member.lastName,
          avatar: sub.member.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${sub.member.profilePicture}`
            : null,
          score: 0,
        };
        cur.score += 1;
        weeklyMap.set(mId, cur);
      }
      weeklyLeaderboard = Array.from(weeklyMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }

    const allTimeMembers = await db.member
      .findMany({
        where: { status: { in: ["active", "approved"] } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          _count: {
            select: {
              quizSubmissions: {
                where: { isCorrect: true },
              },
            },
          },
        },
        orderBy: {
          quizSubmissions: {
            _count: "desc",
          },
        },
        take: 20,
      })
      .catch(() => []);

    const allTimeLeaderboard = allTimeMembers
      .filter((m) => m._count.quizSubmissions > 0)
      .map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`.trim(),
        firstName: m.firstName,
        lastName: m.lastName,
        avatar: m.profilePicture
          ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
          : null,
        totalScore: m._count.quizSubmissions,
        score: m._count.quizSubmissions,
        quizzesTaken: m._count.quizSubmissions,
      }));

    const leaderboard = allTimeLeaderboard;

    return NextResponse.json({
      success: true,
      data: {
        members: JSON.parse(JSON.stringify(members)),
        directory: members.map((m) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          name: `${m.firstName} ${m.lastName}`.trim(),
          username: m.username,
          role: m.role,
          type: m.type,
          ageGroup: m.ageGroup,
          profilePicture: m.profilePicture,
          coverPhoto: m.coverPhoto,
          joinDate: m.joinDate ? m.joinDate.toISOString() : null,
          birthdate: m.birthdate ? m.birthdate.toISOString() : null,
          baptismDate: m.baptismDate ? m.baptismDate.toISOString() : null,
          invitedBy: m.invitedBy,
          familyMembers: m.familyMembers,
          phone: Boolean(m.phone),
          address: Boolean(m.address),
          favoriteVerse: m.favoriteVerse,
          avatar: m.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
            : null,
          ministries: m.ministries,
        })),
        ministries: ministries.map((min) => ({
          id: min.id,
          name: min.name,
          description: min.description || "Serving the House of Grace Fellowship family.",
          memberCount: min._count.members,
        })),
        resources: JSON.parse(JSON.stringify(resources)),
        quizStatus,
        quizHistory,
        leaderboard,
        weeklyLeaderboard,
        allTimeLeaderboard,
        journals: journalEntries.map((j) => ({
          id: j.id,
          title: j.title || null,
          content: j.content,
          verseRef: j.verseRef || null,
          mood: j.mood || null,
          visibility: j.visibility || "PRIVATE",
          createdAt: j.createdAt.toISOString(),
        })),
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/church GET]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to load church data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const body = await req.json();
    const action = String(body?.action || "ai");

    if (action === "create_journal") {
      if (!member || member.status === "pending") {
        return NextResponse.json(
          { success: false, message: "Please sign in to save a Grace Blog entry." },
          { status: 403 }
        );
      }
      const title = body?.title ? String(body.title).trim() : null;
      const content = String(body?.content || "").trim();
      const verseRef = body?.verseRef ? String(body.verseRef).trim() : null;
      const mood = body?.mood ? String(body.mood).trim().toLowerCase() : null;
      const visibility = ["PRIVATE", "MEMBERS_ONLY", "PUBLIC"].includes(body?.visibility)
        ? body.visibility
        : body?.shareToFeed
        ? "MEMBERS_ONLY"
        : "PRIVATE";

      if (!content) {
        return NextResponse.json(
          { success: false, message: "Please write your reflection before saving." },
          { status: 400 }
        );
      }

      const entry = await db.journalEntry.create({
        data: {
          authorId: member.id,
          title,
          content,
          verseRef,
          mood,
          visibility: visibility as any,
          crossPosted: visibility !== "PRIVATE",
        },
      });

      if (visibility !== "PRIVATE") {
        await db.post.create({
          data: {
            authorId: member.id,
            type: "DEVO",
            content: title ? `${title}\n\n${content}` : content,
            verseRef,
            visibility: visibility as any,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          entry: {
            id: entry.id,
            title: entry.title,
            content: entry.content,
            verseRef: entry.verseRef,
            mood: entry.mood,
            visibility: entry.visibility,
            createdAt: entry.createdAt.toISOString(),
          },
        },
        message: "Grace Blog post saved!",
      });
    }

    if (action === "delete_journal") {
      if (!member) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const journalId = Number(body?.journalId);
      if (!journalId) {
        return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
      }
      await db.journalEntry.deleteMany({
        where: { id: journalId, authorId: member.id },
      });
      return NextResponse.json({ success: true, message: "Deleted" });
    }

    if (action === "delete_post") {
      if (!member) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const postId = Number(body?.postId);
      if (!postId) {
        return NextResponse.json({ success: false, message: "Invalid postId" }, { status: 400 });
      }
      const existing = await db.post.findUnique({ where: { id: postId } });
      if (!existing) {
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      }
      const isAdmin = ["admin", "moderator"].includes(member.role ?? "");
      if (existing.authorId !== member.id && !isAdmin) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      await db.post.delete({ where: { id: postId } });
      return NextResponse.json({ success: true, message: "Post deleted" });
    }

    if (action === "generate_devo_caption") {
      const hint = String(body?.extractedText || "").trim();
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  'Generate a warm, personal 2-3 sentence devotional reflection caption and a matching Bible verse. Return JSON: {"caption": "...", "suggestedVerse": "...", "verseRef": "..."}',
              },
              {
                role: "user",
                content: hint || "God's faithfulness and grace in my daily walk.",
              },
            ],
            response_format: { type: "json_object" },
          }),
        }).catch(() => null);

        if (aiRes && aiRes.ok) {
          const json = await aiRes.json();
          const parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}");
          return NextResponse.json({
            success: true,
            data: {
              caption:
                parsed.caption ||
                "Grateful for God's unfailing grace and mercies that are new every morning.",
              suggestedVerse:
                parsed.suggestedVerse ||
                "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
              verseRef: parsed.verseRef || "Lamentations 3:22-23",
            },
          });
        }
      }
      return NextResponse.json({
        success: true,
        data: {
          caption:
            hint ||
            "Grateful for God's unfailing grace and mercies that are new every morning.",
          suggestedVerse:
            "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.",
          verseRef: "Lamentations 3:22-23",
        },
      });
    }

    if (action === "share_devo") {
      if (!member) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const content = String(body?.content || "").trim();
      const aiCaption = body?.aiCaption ? String(body.aiCaption).trim() : null;
      const verseRef = body?.verseRef ? String(body.verseRef).trim() : null;
      const verseText = body?.verseText ? String(body.verseText).trim() : null;
      if (!content) {
        return NextResponse.json(
          { success: false, message: "Add a caption or reflection before posting." },
          { status: 400 }
        );
      }
      const post = await db.post.create({
        data: {
          authorId: member.id,
          type: "DEVO",
          content,
          aiCaption,
          verseRef,
          verseText,
          visibility: "MEMBERS_ONLY",
        },
      });
      return NextResponse.json({
        success: true,
        data: { postId: post.id },
      });
    }

    if (action === "start_catchup") {
      if (!member) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const quizId = Number(body?.quizId);
      if (!quizId || isNaN(quizId)) {
        return NextResponse.json({ success: false, message: "Quiz ID required" }, { status: 400 });
      }

      const targetQuiz = await db.sermonQuiz.findUnique({
        where: { id: quizId },
        include: { questions: { select: { id: true } } },
      });
      if (!targetQuiz || !["published", "completed"].includes(targetQuiz.status)) {
        return NextResponse.json(
          { success: false, message: "Quiz not found or not published." },
          { status: 404 }
        );
      }

      // 1. Already finished all challenges?
      const subCount = await db.quizSubmission.count({
        where: { quizId, memberId: member.id },
      });
      const totalReq = targetQuiz.questions.length || 7;
      if (subCount >= totalReq) {
        return NextResponse.json(
          {
            success: false,
            message: "You have already completed all challenges for this sermon quiz!",
          },
          { status: 400 }
        );
      }

      // 2. Existing catch-up session for this quiz?
      const existingSession = await db.quizCatchupSession.findUnique({
        where: { quizId_memberId: { quizId, memberId: member.id } },
      });
      if (existingSession) {
        if (existingSession.isCompleted) {
          return NextResponse.json(
            { success: false, message: "You have already completed this catch-up challenge." },
            { status: 400 }
          );
        }
        if (new Date() >= existingSession.expiresAt) {
          return NextResponse.json(
            { success: false, message: "The 7-day catch-up window for this quiz has ended." },
            { status: 403 }
          );
        }
        return NextResponse.json({
          success: true,
          data: { expiresAt: existingSession.expiresAt.toISOString(), session: existingSession },
        });
      }

      // 3. Single-Active-Quiz Rule A: Unfinished current live week quiz?
      const latestPublished = await db.sermonQuiz.findFirst({
        where: { status: { in: ["published", "completed"] } },
        orderBy: { sermonDate: "desc" },
        include: { questions: { select: { id: true } } },
      });
      if (
        latestPublished &&
        !isQuizWeekExpired(latestPublished.sermonDate) &&
        latestPublished.id !== quizId
      ) {
        const latestSubs = await db.quizSubmission.count({
          where: { quizId: latestPublished.id, memberId: member.id },
        });
        const latestTotal = latestPublished.questions.length || 7;
        if (latestSubs < latestTotal) {
          return NextResponse.json(
            {
              success: false,
              conflict: "active_current_week",
              activeQuizId: latestPublished.id,
              activeQuizTitle: latestPublished.title,
              message: `You have the chance to answer previous Sunday quiz after you finish this one, and you have 7 days to finish this one. Finish this week's quiz ("${latestPublished.title}") first!`,
            },
            { status: 409 }
          );
        }
      }

      // 4. Single-Active-Quiz Rule B: Another active catch-up in progress?
      const activeCatchup = await db.quizCatchupSession.findFirst({
        where: {
          memberId: member.id,
          isCompleted: false,
          expiresAt: { gt: new Date() },
          quizId: { not: quizId },
        },
        include: { quiz: { select: { id: true, title: true } } },
      });
      if (activeCatchup) {
        const msLeft = activeCatchup.expiresAt.getTime() - Date.now();
        const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
        const daysLeft = Math.floor(hoursLeft / 24);
        const remainingHours = hoursLeft % 24;
        const timeLeftStr =
          daysLeft > 0 ? `${daysLeft}d ${remainingHours}h` : `${remainingHours}h`;
        return NextResponse.json(
          {
            success: false,
            conflict: "active_catchup",
            activeQuizId: activeCatchup.quiz.id,
            activeQuizTitle: activeCatchup.quiz.title,
            message: `You have the chance to answer previous Sunday quiz after you finish this one, and you have 7 days to finish this one. (${timeLeftStr} remaining on "${activeCatchup.quiz.title}")`,
          },
          { status: 409 }
        );
      }

      // 5. Create 7-day personal catch-up window
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const created = await db.quizCatchupSession.create({
        data: { quizId, memberId: member.id, expiresAt, isCompleted: false },
      });
      return NextResponse.json({
        success: true,
        data: { expiresAt: expiresAt.toISOString(), session: created },
      });
    }

    if (action === "submit_quiz_answer") {
      if (!member) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const questionId = Number(body?.questionId);
      const answer = body?.answer;
      if (!questionId || answer === undefined || answer === null) {
        return NextResponse.json(
          { success: false, message: "questionId and answer required" },
          { status: 400 }
        );
      }

      const question = await db.quizQuestion.findUnique({
        where: { id: questionId },
        include: { quiz: true },
      });
      if (!question) {
        return NextResponse.json({ success: false, message: "Question not found" }, { status: 404 });
      }
      if (!["published", "completed"].includes(question.quiz.status)) {
        return NextResponse.json({ success: false, message: "Quiz not active" }, { status: 400 });
      }

      let isCatchup = false;
      let catchupSession = null;

      if (isQuizWeekExpired(question.quiz.sermonDate)) {
        catchupSession = await db.quizCatchupSession.findUnique({
          where: { quizId_memberId: { quizId: question.quiz.id, memberId: member.id } },
        });
        if (catchupSession && !catchupSession.isCompleted && new Date() < catchupSession.expiresAt) {
          isCatchup = true;
        } else {
          return NextResponse.json(
            { success: false, message: "This quiz week has ended. Start a 7-Day Catch-Up Pass first!" },
            { status: 403 }
          );
        }
      }

      if (!isCatchup) {
        const quizRelativeDay = getQuizDayForDate(question.quiz.sermonDate);
        const currentDay = Math.min(Math.max(quizRelativeDay, 0), 7);
        if (!canAccessDay(question.dayNumber, currentDay)) {
          return NextResponse.json(
            { success: false, message: "This day's quiz is not available yet" },
            { status: 403 }
          );
        }
      }

      const existing = await db.quizSubmission.findUnique({
        where: { questionId_memberId: { questionId, memberId: member.id } },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          data: {
            alreadySubmitted: true,
            isCorrect: existing.isCorrect,
            score: existing.score,
            feedback: existing.aiFeedback || "Already submitted",
            explanation: question.explanation || "",
          },
        });
      }

      let isCorrect = false;
      let aiFeedback: string | null = null;
      const userAnswer = String(answer).trim();

      switch (question.questionType) {
        case "MULTIPLE_CHOICE":
        case "TREE_OF_LIFE": {
          isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
          aiFeedback = isCorrect
            ? question.questionType === "TREE_OF_LIFE"
              ? "Wisdom unlocked! Your Tree of Wisdom flourishes! 🌳"
              : "Correct! 🎉"
            : `The correct answer was: ${question.correctAnswer}`;
          break;
        }
        case "FILL_IN_BLANKS": {
          const expectedParts = question.correctAnswer
            .split(",")
            .map((s) => s.trim().toLowerCase());
          const userParts = userAnswer.split(",").map((s) => s.trim().toLowerCase());
          isCorrect =
            expectedParts.length === userParts.length &&
            expectedParts.every((exp, i) => userParts[i] === exp);
          aiFeedback = isCorrect
            ? "Perfect! You filled in the blanks correctly! ✏️"
            : `The correct answer was: ${question.correctAnswer}`;
          break;
        }
        case "SHORT_ANSWER": {
          const grading = await gradeEssay(
            question.questionText,
            question.correctAnswer,
            userAnswer
          );
          isCorrect = grading.isCorrect;
          aiFeedback = grading.feedback;
          break;
        }
        case "SCRIPTURE_ORDERING": {
          const correctOrder = question.correctAnswer
            .split(" | ")
            .map((s) => s.trim().toLowerCase());
          let userOrder: string[];
          try {
            userOrder = JSON.parse(userAnswer).map((s: string) => s.trim().toLowerCase());
          } catch {
            userOrder = userAnswer.split(" | ").map((s) => s.trim().toLowerCase());
          }
          const normalize = (str: string) => str.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();
          const cleanCorrect = correctOrder.map(normalize);
          const cleanUser = userOrder.map(normalize);
          isCorrect =
            cleanCorrect.length === cleanUser.length &&
            cleanCorrect.every((c, i) => cleanUser[i] === c);
          aiFeedback = isCorrect
            ? "You arranged the verse perfectly! 🧩"
            : "Not quite the right order. Keep studying the Word!";
          break;
        }
        case "TRUE_FALSE_EXPLAIN": {
          let userTF: string;
          let userExplanation: string;
          try {
            const parsed = JSON.parse(userAnswer);
            userTF = String(parsed.answer).toUpperCase();
            userExplanation = String(parsed.explanation || "");
          } catch {
            userTF = userAnswer.toUpperCase().startsWith("TRUE") ? "TRUE" : "FALSE";
            userExplanation = userAnswer;
          }
          const tfCorrect = userTF === question.correctAnswer.toUpperCase();
          if (!tfCorrect) {
            isCorrect = false;
            aiFeedback = `The statement was actually ${question.correctAnswer}. ${
              question.explanation || ""
            }`;
          } else if (userExplanation.length < 10) {
            isCorrect = true;
            aiFeedback =
              "Correct! Though a more detailed explanation would strengthen your understanding.";
          } else {
            const grading = await gradeEssay(
              `Why is this statement ${question.correctAnswer}? "${question.questionText}"`,
              question.explanation || question.correctAnswer,
              userExplanation
            );
            isCorrect = true;
            aiFeedback = grading.feedback;
          }
          break;
        }
      }

      const score = isCorrect ? 1 : 0;

      await db.quizSubmission.create({
        data: {
          quizId: question.quiz.id,
          questionId,
          memberId: member.id,
          answer: userAnswer,
          isCorrect,
          score,
          aiFeedback,
        },
      });

      const totalSubmissions = await db.quizSubmission.count({
        where: { quizId: question.quiz.id, memberId: member.id },
      });

      if (catchupSession && totalSubmissions >= 7) {
        await db.quizCatchupSession.update({
          where: { id: catchupSession.id },
          data: { isCompleted: true },
        });
      }

      let reward = null;
      if (totalSubmissions === 7) {
        const totalScoreAgg = await db.quizSubmission.aggregate({
          _sum: { score: true },
          where: { quizId: question.quiz.id, memberId: member.id },
        });
        const finalScore = totalScoreAgg._sum.score || 0;
        const tier = getRewardTier(finalScore);

        const existingReward = await db.quizReward.findUnique({
          where: { quizId_memberId: { quizId: question.quiz.id, memberId: member.id } },
        });

        if (!existingReward) {
          await db.quizReward.create({
            data: {
              quizId: question.quiz.id,
              memberId: member.id,
              totalScore: finalScore,
              rewardTier: tier,
            },
          });

          await createNotification({
            memberId: member.id,
            type: "quiz_reward",
            title:
              tier === "PERFECT"
                ? "🏆 PERFECT SCORE! Claim your reward!"
                : tier === "PARTICIPANT"
                ? "🙏 Quiz for Christ complete!"
                : "🎁 You earned a prize this week!",
            body:
              tier === "PERFECT"
                ? "You aced all 7 days! Tap to claim your Christian statement t-shirt."
                : tier === "PARTICIPANT"
                ? `You scored ${finalScore}/7. Keep growing in the Word!`
                : `You scored ${finalScore}/7! Your prize will be announced this Sunday. 🎁`,
            link: "/quiz",
          });

          reward = { totalScore: finalScore, tier };
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          isCorrect,
          score,
          feedback: aiFeedback,
          explanation: question.explanation || "",
          reward,
        },
      });
    }

    if (action === "claim_quiz_reward") {
      if (!member) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
      const quizId = Number(body?.quizId);
      const size = String(body?.size || body?.tShirtSize || "").trim();
      const phone = String(body?.phone || "").trim();
      if (!quizId || !size || !phone) {
        return NextResponse.json(
          { success: false, message: "Please select a T-shirt size and provide a contact number." },
          { status: 400 }
        );
      }
      await db.quizReward.updateMany({
        where: { quizId, memberId: member.id },
        data: {
          claimStatus: "claimed",
          claimDetails: { size, phone },
        },
      });
      return NextResponse.json({
        success: true,
        message: "Your claim details have been recorded! Bring your HGF Connect app to Sunday Service to collect your T-Shirt.",
      });
    }

    const prompt = String(body?.prompt || body?.message || "").trim();

    if (!prompt) {
      return NextResponse.json(
        { success: false, message: "Please enter a question or topic." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are the HGF Connect Assistant for House of Grace Fellowship in Panacan, Davao City (Lead Pastor: Ptr. Manny Asilom, Pastora Aileen Asilom). Keep answers warm, helpful, Scripture-grounded, and concise.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 320,
        }),
      }).catch(() => null);

      if (aiRes && aiRes.ok) {
        const json = await aiRes.json();
        const reply = json?.choices?.[0]?.message?.content?.trim();
        if (reply) {
          return NextResponse.json({
            success: true,
            data: { reply },
          });
        }
      }
    }

    const nameGreeting = member ? `Hi ${member.firstName}! ` : "Hi there! ";
    return NextResponse.json({
      success: true,
      data: {
        reply: `${nameGreeting}Thank you for asking about "${prompt}". Remember God's promise in Philippians 4:6-7: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." 🙏`,
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/church POST]", err?.message);
    return NextResponse.json(
      { success: false, message: "Failed to process request" },
      { status: 500 }
    );
  }
}
