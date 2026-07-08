import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PostType, type Prisma } from "@prisma/client";
import { notifyAllMembers } from "@/lib/notify";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const memberId = searchParams.get("member") ? parseInt(searchParams.get("member")!) : null;
  const limit = 20;
  const skip = (page - 1) * limit;

  const session = await auth();

  const visibilityFilter = {
    OR: [
      { visibility: "PUBLIC" as const },
      ...(session ? [{ visibility: "MEMBERS_ONLY" as const }] : []),
    ],
  };

  const checkNew = searchParams.get("checkNew") === "true";
  const latestId = searchParams.get("latestId") ? parseInt(searchParams.get("latestId")!) : null;

  if (checkNew && latestId) {
    try {
      const count = await db.post.count({
        where: {
          id: { gt: latestId },
          ...visibilityFilter,
        },
      });
      return NextResponse.json({ newPostsCount: count });
    } catch (error) {
      console.error("[api/posts checkNew GET]", error);
      return NextResponse.json({ error: "Failed to check new posts" }, { status: 500 });
    }
  }

  // System post types that are community-wide, not personal content.
  // Exclude from profile walls so they don't appear as the creator's own posts.
  const SYSTEM_POST_TYPES: PostType[] = [
    PostType.QUIZ_DAILY,
    PostType.QUIZ_ANNOUNCEMENT,
    PostType.EVENT,
    PostType.BIRTHDAY_MONTHLY,
    PostType.BIRTHDAY_DAILY,
    PostType.QUIZ_REWARD,
  ];

  const isChurch = searchParams.get("church") === "true";

  const where: any = {
    ...visibilityFilter,
    ...(isChurch
      ? { type: { in: [PostType.EVENT, PostType.BIRTHDAY_MONTHLY, PostType.BIRTHDAY_DAILY] } }
      : memberId
      ? { authorId: memberId, type: { notIn: SYSTEM_POST_TYPES } }
      : {}),
  };

  try {
    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
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
          _count: {
            select: { likes: true, comments: true },
          },
          photos: {
            orderBy: { sortOrder: "asc" },
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
                }
              }
            }
          },
        },
        orderBy: { bumpedAt: "desc" },
        skip,
        take: limit,
      }),
      db.post.count({ where }),
    ]);

    // Fetch dynamic member details for daily/monthly birthday posts & event details for event posts
    const memberIds: number[] = [];
    const eventIds: number[] = [];
    posts.forEach((post) => {
      if (post.type === PostType.BIRTHDAY_DAILY && post.content) {
        try {
          const data = JSON.parse(post.content);
          if (data && typeof data.memberId === "number") {
            memberIds.push(data.memberId);
          }
        } catch {}
      } else if (post.type === PostType.BIRTHDAY_MONTHLY && post.content) {
        try {
          const data = JSON.parse(post.content);
          if (data && Array.isArray(data.celebrants)) {
            data.celebrants.forEach((c: any) => {
              if (c && typeof c.id === "number") {
                memberIds.push(c.id);
              }
            });
          }
        } catch {}
      } else if (post.type === PostType.EVENT && post.content) {
        try {
          const match = post.content.match(/\[event:(\d+)\]/);
          if (match) {
            eventIds.push(parseInt(match[1]));
          }
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

    const postsWithLiked = posts.map((p: any) => {
      let updatedContent = p.content;
      let updatedImageUrl = p.imageUrl;
      if (p.type === PostType.EVENT && p.content) {
        try {
          const match = p.content.match(/\[event:(\d+)\]/);
          if (match) {
            const eventId = parseInt(match[1]);
            const dbEvent = eventMap.get(eventId);
            if (dbEvent) {
              const eventDateFormatted = new Date(dbEvent.eventDate).toLocaleDateString("en-PH", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
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

              const feedContent = [
                `📅 ${titlePrefix}: ${dbEvent.title}`,
                `🗓️ ${eventDateFormatted}`,
                `🕒 ${timeStartFormatted}${timeEndFormatted ? ` – ${timeEndFormatted}` : ""}`,
                dbEvent.location ? `📍 ${dbEvent.location}` : null,
                dbEvent.description ? `\n${dbEvent.description}` : null,
                `\n[event:${dbEvent.id}]`,
              ].filter(Boolean).join("\n");

              updatedContent = feedContent;
              updatedImageUrl = dbEvent.coverPhoto ? `uploads/events/${dbEvent.coverPhoto}` : null;
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
              // Format the message with the updated name
              if (data.message && data.message.includes("Wishing a very Happy and Blessed Birthday to our dear")) {
                data.message = `🎉 Wishing a very Happy and Blessed Birthday to our dear ${dbMember.firstName}! 🎂🎈\n\nOn this special day, we praise God for the gift of your life and the unique blessing you are to our church family. May the Lord guide your steps, keep you in His perfect peace, and shower you with His abundant grace in this new year of your life!\n\nWe celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️`;
              }
              let imagePath = null;
              if (dbMember.profilePicture) {
                imagePath = `/uploads/profile_pictures/${dbMember.profilePicture}`;
              } else if (dbMember.coverPhoto) {
                imagePath = `/uploads/cover_photos/${dbMember.coverPhoto}`;
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
                    imagePath = `/uploads/profile_pictures/${dbMember.profilePicture}`;
                  } else if (dbMember.coverPhoto) {
                    imagePath = `/uploads/cover_photos/${dbMember.coverPhoto}`;
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

      const myLike = session ? p.likes.find((l: any) => l.memberId === parseInt(session.user.id)) : null;
      return {
        ...p,
        content: updatedContent,
        imageUrl: updatedImageUrl,
        isLiked: !!myLike,
        likedType: myLike ? myLike.type : null,
      };
    });

    return NextResponse.json({
      posts: postsWithLiked,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[api/posts GET]", error);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, type, imageUrl, verseRef, verseText, aiCaption, visibility, linkUrl, linkTitle, linkDesc, linkImage, photos } = body;

    if (!content && !imageUrl && !verseText && !linkUrl && (!photos || photos.length === 0)) {
      return NextResponse.json({ error: "Post must have content, image, photos, verse, or link" }, { status: 400 });
    }

    let prayerRequestVal = null;
    if (type === "PRAYER") {
      prayerRequestVal = await db.prayerRequest.create({
        data: {
          authorId: parseInt(session.user.id),
          request: content?.trim() || "",
          visibility: visibility ?? "MEMBERS_ONLY",
        }
      });
    }

    const post = await db.post.create({
      data: {
        authorId: parseInt(session.user.id),
        type: type ?? "TEXT",
        content: content ?? null,
        imageUrl: imageUrl ?? null,
        aiCaption: prayerRequestVal ? String(prayerRequestVal.id) : (aiCaption ?? null),
        verseRef: verseRef ?? null,
        verseText: verseText ?? null,
        visibility: visibility ?? "MEMBERS_ONLY",
        linkUrl: linkUrl ?? null,
        linkTitle: linkTitle ?? null,
        linkDesc: linkDesc ?? null,
        linkImage: linkImage ?? null,
        photos: {
          create: (photos || []).map((photoUrl: string, index: number) => ({
            photoPath: photoUrl,
            sortOrder: index,
          })),
        },
      },
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
        photos: {
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    // ------ Notify all members (fire-and-forget) ------
    const TYPE_LABEL: Record<string, string> = {
      TEXT: "a thought", DEVO: "a devotional", VERSE_CARD: "a Bible verse",
      PRAYER: "a prayer", PRAISE: "a testimony", EVENT: "an event",
    };
    const label = TYPE_LABEL[type ?? "TEXT"] ?? "something";
    const isQuizPost = type === "QUIZ_ANNOUNCEMENT" || type === "QUIZ_DAILY" || type === "QUIZ_REWARD";
    const isBirthdayPost = type === "BIRTHDAY_MONTHLY" || type === "BIRTHDAY_DAILY";
    const isEventPost = type === "EVENT";
    const isChurchPost = isBirthdayPost || isEventPost;

    const displayAuthor = isQuizPost
      ? "HGF Quiz For Christ"
      : isChurchPost
      ? "House of Grace Fellowship"
      : `${post.author.firstName} ${post.author.lastName}`;

    const preview = (content ?? verseText ?? "")?.slice(0, 80);
    const link = (type === "PRAYER" && prayerRequestVal)
      ? `/prayer?highlight=${prayerRequestVal.id}`
      : `/feed?post=${post.id}`;

    void notifyAllMembers({
      actorId: parseInt(session.user.id),
      type: "new_post",
      title: `${displayAuthor} shared ${label}`,
      body: preview || "(No preview)",
      link,
    });
    // --------------------------------------------------

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[api/posts POST]", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
