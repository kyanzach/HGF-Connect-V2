import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import {
  getQuizDayForDate,
  isQuizWeekExpired,
  QUIZ_DAYS,
  QUIZ_TYPE_LABELS,
  REWARD_DISPLAY,
  getRewardTier,
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

    const [members, ministries, resources, submissions, journalEntries, latestQuiz] =
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
            take: 250,
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
            where: { status: { in: ["published", "completed"] } },
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
                },
              },
              rewardItems: true,
              event: true,
            },
          })
          .catch(() => null),
      ]);

    // Build quizStatus for the authenticated viewer (identical to /api/quiz/status)
    let quizStatus: any = { active: false };
    if (latestQuiz) {
      const memberId = viewer?.id || 0;
      const isAdminOrPastor =
        viewer?.role === "admin" || viewer?.role === "moderator";

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
        };
      });

      const completedCount = userSubs.length;
      const totalScore = userSubs.reduce((sum, s) => sum + s.score, 0);
      const isWeekComplete = completedCount >= 7;
      const rewardTier = isWeekComplete ? getRewardTier(totalScore) : null;

      quizStatus = {
        active: true,
        attended: true,
        isActiveQuiz: true,
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
          rewardDisplay: rewardTier ? { ...REWARD_DISPLAY[rewardTier] } : null,
          rewardClaim: null,
        },
      };
    }

    // Aggregate quiz leaderboard by member
    const scoreMap = new Map<
      number,
      { id: number; name: string; avatar: string | null; totalScore: number; quizzesTaken: number }
    >();
    for (const sub of submissions) {
      if (!sub.member || !["active", "approved"].includes(sub.member.status)) continue;
      const mId = sub.member.id;
      const existing = scoreMap.get(mId) || {
        id: mId,
        name: `${sub.member.firstName} ${sub.member.lastName}`.trim(),
        avatar: sub.member.profilePicture
          ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${sub.member.profilePicture}`
          : null,
        totalScore: 0,
        quizzesTaken: 0,
      };
      existing.totalScore += Number(sub.score || sub.totalScore || 0);
      existing.quizzesTaken += 1;
      scoreMap.set(mId, existing);
    }

    const leaderboard = Array.from(scoreMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20);

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
        leaderboard,
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
      if (!quizId) {
        return NextResponse.json({ success: false, message: "Quiz ID required" }, { status: 400 });
      }
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.quizCatchupSession.upsert({
        where: { quizId_memberId: { quizId, memberId: member.id } },
        update: { isCompleted: false, expiresAt },
        create: { quizId, memberId: member.id, expiresAt },
      });
      return NextResponse.json({
        success: true,
        data: { expiresAt: expiresAt.toISOString() },
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
