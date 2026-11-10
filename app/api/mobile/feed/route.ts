import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { notifyAllMembers } from "@/lib/notify";
import { PostType } from "@prisma/client";
import { getQuizDayForDate, isQuizWeekExpired } from "@/lib/quiz-helpers";
import { APP_VERSION } from "@/lib/version";
import { callOpenAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

const formatTimeTo12Hour = (time: Date | string | null) => {
  if (!time) return "";
  let d: Date;
  if (typeof time === "string") {
    const timeWithZ = time.includes("T") ? (time.endsWith("Z") ? time : `${time}Z`) : `1970-01-01T${time}Z`;
    d = new Date(timeWithZ);
  } else {
    d = time;
  }
  return d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const checkMetadataUrl = searchParams.get("checkMetadataUrl");
    if (checkMetadataUrl) {
      try {
        const res = await fetch(checkMetadataUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; HGFConnectBot/1.0)" },
          signal: AbortSignal.timeout(4500),
        });
        const html = await res.text();
        const getMeta = (prop: string) => {
          const m =
            html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
            html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
          return m ? m[1] : null;
        };
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = getMeta("og:title") || getMeta("twitter:title") || (titleMatch ? titleMatch[1].trim() : null);
        const description = getMeta("og:description") || getMeta("twitter:description") || getMeta("description") || null;
        const image = getMeta("og:image") || getMeta("twitter:image") || null;
        return NextResponse.json({
          success: true,
          data: { url: checkMetadataUrl, title, description, image },
        });
      } catch {
        return NextResponse.json({ success: false, data: null });
      }
    }

    const limit = Math.min(Number(searchParams.get("limit") || 25), 50);
    const targetPostId = Number(searchParams.get("post") || 0);

    const postInclude = {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          role: true,
          profilePicture: true,
        },
      },
      photos: {
        orderBy: { sortOrder: "asc" as const },
        select: { id: true, photoPath: true, sortOrder: true },
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
      _count: {
        select: { comments: true, likes: true },
      },
      comments: {
        where: { parentId: null },
        orderBy: [{ isPinned: "desc" as const }, { createdAt: "desc" as const }],
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
            orderBy: { createdAt: "asc" as const },
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
    };

    const [rawPosts, targetPost, upcomingEvent, activePrayer, latestQuiz] = await Promise.all([
      db.post.findMany({
        where: {
          visibility: member ? { in: ["PUBLIC", "MEMBERS_ONLY"] } : "PUBLIC",
        },
        orderBy: [{ bumpedAt: "desc" }, { createdAt: "desc" }],
        take: limit,
        include: postInclude,
      }),
      targetPostId > 0
        ? db.post.findUnique({
            where: { id: targetPostId },
            include: postInclude,
          })
        : Promise.resolve(null),
      db.event.findFirst({
        where: { eventDate: { gte: new Date() }, status: "scheduled" },
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      }),
      db.prayerRequest.findFirst({
        where: { isAnswered: false },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { firstName: true, lastName: true } },
        },
      }),
      db.sermonQuiz.findFirst({
        where: { status: { in: ["published", "completed"] } },
        orderBy: { sermonDate: "desc" },
        include: {
          questions: { select: { id: true, dayNumber: true } },
        },
      }),
    ]);

    const posts =
      targetPost && !rawPosts.some((p) => p.id === targetPost.id)
        ? [targetPost, ...rawPosts]
        : rawPosts;

    // Enrich BIRTHDAY_DAILY, BIRTHDAY_MONTHLY, and EVENT posts just like /api/posts
    const memberIds: number[] = [];
    const eventIds: number[] = [];
    posts.forEach((post) => {
      if (post.type === PostType.BIRTHDAY_DAILY && post.content) {
        try {
          const data = JSON.parse(post.content);
          if (data && typeof data.memberId === "number") memberIds.push(data.memberId);
        } catch {}
      } else if (post.type === PostType.BIRTHDAY_MONTHLY && post.content) {
        try {
          const data = JSON.parse(post.content);
          if (data && Array.isArray(data.celebrants)) {
            data.celebrants.forEach((c: any) => {
              if (c && typeof c.id === "number") memberIds.push(c.id);
            });
          }
        } catch {}
      } else if (post.type === PostType.EVENT && post.content) {
        try {
          const match = post.content.match(/\[event:(\d+)\]/);
          if (match) eventIds.push(parseInt(match[1], 10));
        } catch {}
      }
    });

    let memberMap = new Map<number, any>();
    if (memberIds.length > 0) {
      const members = await db.member.findMany({
        where: { id: { in: [...new Set(memberIds)] } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          coverPhoto: true,
        },
      });
      memberMap = new Map(members.map((m) => [m.id, m]));
    }

    let eventMap = new Map<number, any>();
    if (eventIds.length > 0) {
      const events = await db.event.findMany({
        where: { id: { in: [...new Set(eventIds)] } },
        select: {
          id: true,
          title: true,
          description: true,
          eventDate: true,
          startTime: true,
          endTime: true,
          location: true,
          coverPhoto: true,
        },
      });
      eventMap = new Map(events.map((e) => [e.id, e]));
    }

    // Build quizProgress for HeroCarousel
    let quizProgress: any = null;
    if (latestQuiz) {
      const isExpired = isQuizWeekExpired(latestQuiz.sermonDate);
      let completedCount = 0;
      let isCatchupActive = false;
      if (member) {
        const [subs, catchup] = await Promise.all([
          db.quizSubmission.count({ where: { quizId: latestQuiz.id, memberId: member.id } }),
          db.quizCatchupSession.findUnique({
            where: { quizId_memberId: { quizId: latestQuiz.id, memberId: member.id } },
          }),
        ]);
        completedCount = subs;
        isCatchupActive = Boolean(catchup && !catchup.isCompleted && new Date() < catchup.expiresAt);
      }
      quizProgress = {
        active: true,
        id: latestQuiz.id,
        title: latestQuiz.title,
        sermonDate: latestQuiz.sermonDate ? latestQuiz.sermonDate.toISOString() : null,
        completed: completedCount,
        total: latestQuiz.questions.length || 7,
        isExpired,
        isCatchup: isCatchupActive,
      };
    }

    const formatted = posts.map((p: any) => {
      let updatedContent = p.content || "";
      let updatedImageUrl = p.imageUrl || null;

      if (p.type === PostType.EVENT && p.content) {
        try {
          const match = p.content.match(/\[event:(\d+)\]/);
          if (match) {
            const eventId = parseInt(match[1], 10);
            const dbEvent = eventMap.get(eventId);
            if (dbEvent) {
              const eventDateFormatted = new Date(dbEvent.eventDate).toLocaleDateString("en-PH", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              });
              const timeStartFormatted = formatTimeTo12Hour(dbEvent.startTime);
              const timeEndFormatted = dbEvent.endTime ? formatTimeTo12Hour(dbEvent.endTime) : "";
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const eventDateObj = new Date(dbEvent.eventDate);
              eventDateObj.setHours(0, 0, 0, 0);
              const isPastEvent = eventDateObj.getTime() < today.getTime();
              const titlePrefix = isPastEvent ? "Event" : "New Event";

              updatedContent = [
                `📅 ${titlePrefix}: ${dbEvent.title}`,
                `🗓️ ${eventDateFormatted}`,
                `🕒 ${timeStartFormatted}${timeEndFormatted ? ` – ${timeEndFormatted}` : ""}`,
                dbEvent.location ? `📍 ${dbEvent.location}` : null,
                dbEvent.description ? `\n${dbEvent.description}` : null,
                `\n[event:${dbEvent.id}]`,
              ]
                .filter(Boolean)
                .join("\n");
              updatedImageUrl = dbEvent.coverPhoto ? `/uploads/events/${dbEvent.coverPhoto}` : null;
            }
          }
        } catch {}
      } else if (p.type === PostType.BIRTHDAY_DAILY && p.content) {
        try {
          const data = JSON.parse(p.content);
          if (data && typeof data.memberId === "number") {
            const dbMember = memberMap.get(data.memberId);
            if (dbMember) {
              data.name = `${dbMember.firstName} ${dbMember.lastName}`;
              if (data.message && data.message.includes("Wishing a very Happy and Blessed Birthday to our dear")) {
                data.message = `🎉 Wishing a very Happy and Blessed Birthday to our dear ${dbMember.firstName}! 🎂🎈\n\nOn this special day, we praise God for the gift of your life and the unique blessing you are to our church family. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace in this new year of your life!\n\nWe celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️`;
              }
              let imagePath = null;
              if (dbMember.profilePicture) {
                imagePath = `https://connect.houseofgrace.ph/uploads/profile_pictures/${dbMember.profilePicture}`;
              } else if (dbMember.coverPhoto) {
                imagePath = `https://connect.houseofgrace.ph/uploads/cover_photos/${dbMember.coverPhoto}`;
              }
              data.profilePicture = imagePath;
              updatedContent = JSON.stringify(data);
            }
          }
        } catch {}
      } else if (p.type === PostType.BIRTHDAY_MONTHLY && p.content) {
        try {
          const data = JSON.parse(p.content);
          if (data && Array.isArray(data.celebrants)) {
            data.celebrants = data.celebrants.map((c: any) => {
              if (c && typeof c.id === "number") {
                const dbMember = memberMap.get(c.id);
                if (dbMember) {
                  let imagePath = null;
                  if (dbMember.profilePicture) {
                    imagePath = `https://connect.houseofgrace.ph/uploads/profile_pictures/${dbMember.profilePicture}`;
                  } else if (dbMember.coverPhoto) {
                    imagePath = `https://connect.houseofgrace.ph/uploads/cover_photos/${dbMember.coverPhoto}`;
                  }
                  return {
                    ...c,
                    name: `${dbMember.firstName} ${dbMember.lastName}`,
                    profilePicture: imagePath,
                  };
                }
              }
              return c;
            });
            updatedContent = JSON.stringify(data);
          }
        } catch {}
      }

      const myReaction = member
        ? p.likes.find((l: any) => l.memberId === member.id)?.type || null
        : null;

      const reactionCounts: Record<string, number> = {
        HEART: 0,
        PRAY: 0,
        HUG: 0,
        AMEN: 0,
        PRAYING: 0,
        PRAISE: 0,
      };
      for (const l of p.likes) {
        reactionCounts[l.type] = (reactionCounts[l.type] || 0) + 1;
      }

      const isBgStyle = updatedImageUrl && String(updatedImageUrl).startsWith("bg:");
      const images: string[] = [];
      if (updatedImageUrl && !isBgStyle) {
        images.push(
          updatedImageUrl.startsWith("http")
            ? updatedImageUrl
            : `https://connect.houseofgrace.ph${updatedImageUrl.startsWith("/") ? "" : "/"}${updatedImageUrl}`
        );
      }
      for (const ph of p.photos) {
        const url = ph.photoPath.startsWith("http")
          ? ph.photoPath
          : ph.photoPath.startsWith("/")
          ? `https://connect.houseofgrace.ph${ph.photoPath}`
          : `https://connect.houseofgrace.ph/uploads/posts/${ph.photoPath}`;
        if (!images.includes(url)) images.push(url);
      }

      return {
        id: p.id,
        type: p.type,
        content: updatedContent,
        imageUrl: updatedImageUrl,
        aiCaption: p.aiCaption || null,
        verseRef: p.verseRef,
        verseText: p.verseText,
        linkUrl: p.linkUrl || null,
        linkTitle: p.linkTitle || null,
        linkDesc: p.linkDesc || null,
        linkImage: p.linkImage || null,
        images,
        createdAt: p.createdAt.toISOString(),
        author: {
          id: p.author.id,
          firstName: p.author.firstName,
          lastName: p.author.lastName,
          name: `${p.author.firstName} ${p.author.lastName}`.trim(),
          username: p.author.username,
          role: p.author.role,
          avatar: p.author.profilePicture
            ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${p.author.profilePicture}`
            : null,
        },
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
                avatar: l.member.profilePicture
                  ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${l.member.profilePicture}`
                  : null,
              }
            : null,
        })),
        latestComments: [
          ...(p.comments || []).filter((c: any) => c.isPinned),
          ...(p.comments || []).filter((c: any) => !c.isPinned).reverse(),
        ].map((c: any) => ({
          id: c.id,
          postId: c.postId,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
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
            createdAt: r.createdAt.toISOString(),
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
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        appVersion: APP_VERSION,
        posts: formatted,
        carousel: {
          upcomingEvent: upcomingEvent
            ? {
                id: upcomingEvent.id,
                title: upcomingEvent.title,
                eventDate: upcomingEvent.eventDate.toISOString(),
                startTime: upcomingEvent.startTime ? upcomingEvent.startTime.toISOString() : "",
                location: upcomingEvent.location,
                coverPhoto: upcomingEvent.coverPhoto
                  ? `https://connect.houseofgrace.ph/uploads/events/${upcomingEvent.coverPhoto}`
                  : null,
              }
            : null,
          prayerSpotlight: activePrayer
            ? {
                id: activePrayer.id,
                request: activePrayer.request,
                prayerCount: activePrayer.prayerCount,
                author: {
                  firstName: activePrayer.author.firstName,
                  lastName: activePrayer.author.lastName,
                },
              }
            : null,
          quizProgress,
        },
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/feed GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load feed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || member.status === "pending") {
      return NextResponse.json(
        { success: false, message: "Approved account required to publish posts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = String(body?.action || "");

    // 1. AI Improve Text (Cebuano / Taglish / English)
    if (action === "improve_text") {
      const text = String(body?.text || "").trim();
      const language = String(body?.language || "English");
      const postMode = String(body?.mode || "thoughts");
      if (!text) {
        return NextResponse.json({ success: false, message: "No text to improve." }, { status: 400 });
      }
      const systemPrompt = `You are a warm, encouraging Christian writing assistant for House of Grace Fellowship in General Santos City, Philippines. Rewrite the user's ${postMode} post in natural, heartfelt ${language}. Preserve the original personal meaning and authenticity while improving clarity, grammar, and warmth. Keep it concise and return ONLY the rewritten text with no quotes or preamble.`;
      const improved = await callOpenAI({
        systemPrompt,
        userPrompt: text,
        maxTokens: 350,
        temperature: 0.7,
      });
      return NextResponse.json({
        success: true,
        data: { improved: improved.replace(/^["']|["']$/g, "").trim() },
      });
    }

    // 2. Delete Post
    if (action === "delete_post") {
      const postId = Number(body?.postId);
      const existing = await db.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true },
      });
      if (!existing || (existing.authorId !== member.id && member.role !== "admin" && member.role !== "moderator")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      await db.post.delete({ where: { id: postId } });
      return NextResponse.json({ success: true, message: "Post deleted." });
    }

    // 3. Edit Post
    if (action === "edit_post") {
      const postId = Number(body?.postId);
      const newContent = String(body?.content || "").trim();
      const existing = await db.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true },
      });
      if (!existing || (existing.authorId !== member.id && member.role !== "admin" && member.role !== "moderator")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      const updated = await db.post.update({
        where: { id: postId },
        data: { content: newContent },
      });
      return NextResponse.json({ success: true, data: { content: updated.content }, message: "Post updated." });
    }

    const content = String(body?.content || "").trim();
    const type =
      body?.type === "PRAYER" || body?.type === "PRAISE" || body?.type === "DEVO"
        ? body.type
        : "TEXT";
    const imageUrl = body?.imageUrl ? String(body.imageUrl).trim() : null;
    let aiCaption = body?.aiCaption ? String(body.aiCaption).trim() : null;
    const verseRef = body?.verseRef ? String(body.verseRef).trim() : null;
    const verseText = body?.verseText ? String(body.verseText).trim() : null;
    const linkUrl = body?.linkUrl ? String(body.linkUrl).trim() : null;
    const linkTitle = body?.linkTitle ? String(body.linkTitle).trim() : null;
    const linkDesc = body?.linkDesc ? String(body.linkDesc).trim() : null;
    const linkImage = body?.linkImage ? String(body.linkImage).trim() : null;
    const visibility =
      body?.visibility === "PUBLIC" || body?.visibility === "PRIVATE"
        ? body.visibility
        : "MEMBERS_ONLY";
    const photos: string[] = Array.isArray(body?.photos) ? body.photos : [];

    if (!content && !imageUrl && photos.length === 0) {
      return NextResponse.json(
        { success: false, message: "Write something to share first! ✍️" },
        { status: 400 }
      );
    }

    let prayerRequestVal = null;
    if (type === "PRAYER") {
      prayerRequestVal = await db.prayerRequest.create({
        data: {
          authorId: member.id,
          request: content,
          visibility: visibility === "PUBLIC" ? "PUBLIC" : "MEMBERS_ONLY",
        },
      });
    }

    // If PRAISE (Testimony), also create the Testimony record and auto-translate if needed
    if (type === "PRAISE" && content) {
      try {
        const aiResultRaw = await callOpenAI({
          systemPrompt:
            'Analyze this Christian testimony. Return valid JSON ONLY with keys: {"englishTranslation": "English translation if written in Cebuano/Tagalog/Taglish, or empty string if already English", "category": "Healing|Provision|Salvation|Family|Breakthrough|General", "tags": "comma,separated,tags"}',
          userPrompt: content,
          maxTokens: 280,
          temperature: 0.3,
        });
        const cleaned = aiResultRaw.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.englishTranslation && parsed.englishTranslation.trim() && parsed.englishTranslation.trim() !== content) {
          aiCaption = parsed.englishTranslation.trim();
        }
        await db.testimony.create({
          data: {
            memberId: member.id,
            content,
            translatedContent: aiCaption || null,
            category: parsed.category || "General",
            tags: parsed.tags || null,
            ...(photos.length > 0 && {
              photos: {
                create: photos.map((photoPath: string, idx: number) => ({
                  photoPath: photoPath
                    .replace("https://connect.houseofgrace.ph/uploads/posts/", "")
                    .replace(/^\/uploads\/posts\//, ""),
                  sortOrder: idx,
                })),
              },
            }),
          },
        });
      } catch {
        await db.testimony
          .create({
            data: {
              memberId: member.id,
              content,
            },
          })
          .catch(() => {});
      }
    }

    const finalContent =
      type === "PRAYER" && prayerRequestVal
        ? `[prayer:${prayerRequestVal.id}] ${content}`
        : content || null;

    const post = await db.post.create({
      data: {
        authorId: member.id,
        type,
        content: finalContent,
        imageUrl,
        aiCaption: prayerRequestVal ? String(prayerRequestVal.id) : aiCaption,
        verseRef,
        verseText,
        linkUrl,
        linkTitle,
        linkDesc,
        linkImage,
        visibility,
        photos:
          photos.length > 0
            ? {
                create: photos.map((photoPath: string, index: number) => ({
                  photoPath: photoPath
                    .replace("https://connect.houseofgrace.ph/uploads/posts/", "")
                    .replace(/^\/uploads\/posts\//, ""),
                  sortOrder: index,
                })),
              }
            : undefined,
      },
    });

    notifyAllMembers({
      actorId: member.id,
      type: "new_post",
      title: `${member.firstName} ${member.lastName} shared a post`,
      body: content.slice(0, 120),
      link: `/feed?post=${post.id}`,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { postId: post.id },
    });
  } catch (err: any) {
    console.error("[api/mobile/feed POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to publish post." }, { status: 500 });
  }
}
