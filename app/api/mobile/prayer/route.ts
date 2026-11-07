import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

function mapPrayer(r: any, currentMemberId?: number) {
  return {
    id: r.id,
    authorId: r.authorId,
    isOwner: Boolean(currentMemberId && r.authorId === currentMemberId),
    request: r.request,
    visibility: r.visibility,
    isAnswered: Boolean(r.isAnswered),
    prayerCount: r.prayerCount || 0,
    responseCount: r._count?.responses ?? (r.responses ? r.responses.length : 0),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    author: {
      id: r.author.id,
      firstName: r.author.firstName,
      lastName: r.author.lastName,
      name: `${r.author.firstName} ${r.author.lastName}`.trim(),
      avatar: r.author.profilePicture
        ? r.author.profilePicture.startsWith("http")
          ? r.author.profilePicture
          : `https://connect.houseofgrace.ph/uploads/profile_pictures/${r.author.profilePicture}`
        : null,
    },
    photos: (r.photos || []).map((p: any) =>
      p.url.startsWith("http")
        ? p.url
        : `https://connect.houseofgrace.ph${p.url.startsWith("/") ? "" : "/uploads/posts/"}${p.url}`
    ),
    responses: (r.responses || []).map((resp: any) => ({
      id: resp.id,
      message: resp.message,
      audioUrl: resp.audioUrl
        ? resp.audioUrl.startsWith("http")
          ? resp.audioUrl
          : `https://connect.houseofgrace.ph${resp.audioUrl}`
        : null,
      type: resp.type,
      createdAt: resp.createdAt instanceof Date ? resp.createdAt.toISOString() : String(resp.createdAt),
      authorId: resp.author?.id,
      authorName: resp.author ? `${resp.author.firstName} ${resp.author.lastName}`.trim() : "Member",
      authorAvatar: resp.author?.profilePicture
        ? resp.author.profilePicture.startsWith("http")
          ? resp.author.profilePicture
          : `https://connect.houseofgrace.ph/uploads/profile_pictures/${resp.author.profilePicture}`
        : null,
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const singleId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
    const filter = searchParams.get("filter") || searchParams.get("tab") || "active";
    const mine = searchParams.get("mine") === "true" || filter === "mine";

    if (singleId) {
      const prayer = await db.prayerRequest.findUnique({
        where: { id: singleId },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
          _count: { select: { responses: true } },
          responses: {
            orderBy: { createdAt: "desc" },
            include: {
              author: {
                select: { id: true, firstName: true, lastName: true, profilePicture: true },
              },
            },
          },
        },
      });
      if (!prayer) {
        return NextResponse.json({ success: false, message: "Prayer request not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          prayer: mapPrayer(prayer, member?.id),
        },
      });
    }

    const where: any = {};
    if (mine && member) {
      where.authorId = member.id;
    }
    if (filter === "answered") {
      where.isAnswered = true;
    } else if (filter === "active") {
      where.isAnswered = false;
    }

    const requests = await db.prayerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        _count: { select: { responses: true } },
        responses: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, profilePicture: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        prayers: requests.map((r) => mapPrayer(r, member?.id)),
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/prayer GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load prayers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    if (!member || member.status === "pending") {
      return NextResponse.json({ success: false, message: "Approved account required." }, { status: 403 });
    }

    const body = await req.json();
    const action = body?.action || "create";

    if (action === "mark_answered" || action === "toggle_answered") {
      const prayerId = Number(body?.prayerId);
      const existing = await db.prayerRequest.findUnique({
        where: { id: prayerId },
        select: { id: true, authorId: true, isAnswered: true },
      });
      if (!existing || (existing.authorId !== member.id && member.role !== "admin" && member.role !== "moderator")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      const nextAnswered =
        body?.isAnswered !== undefined ? Boolean(body.isAnswered) : !existing.isAnswered;
      await db.prayerRequest.update({
        where: { id: prayerId },
        data: { isAnswered: nextAnswered },
      });
      return NextResponse.json({
        success: true,
        data: { isAnswered: nextAnswered },
        message: nextAnswered
          ? "Praise God! Marked as Answered Prayer."
          : "Moved back to Active Prayers.",
      });
    }

    if (action === "edit") {
      const prayerId = Number(body?.prayerId);
      const requestText = String(body?.request || "").trim();
      if (!requestText) {
        return NextResponse.json({ success: false, message: "Prayer request cannot be empty." }, { status: 400 });
      }
      const existing = await db.prayerRequest.findUnique({
        where: { id: prayerId },
        select: { id: true, authorId: true },
      });
      if (!existing || (existing.authorId !== member.id && member.role !== "admin" && member.role !== "moderator")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      const updated = await db.prayerRequest.update({
        where: { id: prayerId },
        data: { request: requestText },
      });
      return NextResponse.json({
        success: true,
        data: { request: updated.request },
        message: "Prayer request updated!",
      });
    }

    if (action === "delete") {
      const prayerId = Number(body?.prayerId);
      const existing = await db.prayerRequest.findUnique({
        where: { id: prayerId },
        select: { id: true, authorId: true },
      });
      if (!existing || (existing.authorId !== member.id && member.role !== "admin" && member.role !== "moderator")) {
        return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
      }
      await db.prayerRequest.delete({ where: { id: prayerId } });
      return NextResponse.json({
        success: true,
        message: "Prayer request deleted.",
      });
    }

    if (action === "pray") {
      const prayerId = Number(body?.prayerId);
      if (!prayerId) {
        return NextResponse.json({ success: false, message: "Invalid prayer ID" }, { status: 400 });
      }
      const updated = await db.prayerRequest.update({
        where: { id: prayerId },
        data: { prayerCount: { increment: 1 } },
      });
      const msgText = body?.message ? String(body.message).trim() : "";

      const createdResp = await db.prayerResponse.create({
        data: {
          requestId: prayerId,
          authorId: member.id,
          message: msgText || "",
          type: "PRAYER",
        },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
        },
      });

      if (updated.authorId && updated.authorId !== member.id) {
        createNotification({
          memberId: updated.authorId,
          type: "general",
          title: `🙏 ${member.firstName} ${member.lastName} prayed for your request`,
          body: msgText ? `"${msgText.slice(0, 100)}"` : updated.request.slice(0, 100),
          link: `/prayer/${prayerId}`,
          actorId: member.id,
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        data: {
          prayerCount: updated.prayerCount,
          response: {
            id: createdResp.id,
            message: createdResp.message,
            type: createdResp.type,
            createdAt: createdResp.createdAt.toISOString(),
            authorId: createdResp.author.id,
            authorName: `${createdResp.author.firstName} ${createdResp.author.lastName}`.trim(),
          },
        },
      });
    }

    const requestText = String(body?.request || "").trim();
    if (!requestText) {
      return NextResponse.json({ success: false, message: "Please enter your prayer request." }, { status: 400 });
    }

    const visibility = body?.visibility === "PUBLIC" ? "PUBLIC" : "MEMBERS_ONLY";
    const imageUrls: string[] = Array.isArray(body?.imageUrls) ? body.imageUrls : [];

    const created = await db.prayerRequest.create({
      data: {
        authorId: member.id,
        request: requestText,
        visibility,
      },
    });

    // Also create a corresponding PRAYER post on the community feed (matching web app behavior)
    await db.post
      .create({
        data: {
          authorId: member.id,
          type: "PRAYER",
          content: `[prayer:${created.id}] ${requestText}`,
          visibility,
          imageUrl: imageUrls[0] ? imageUrls[0].replace("https://connect.houseofgrace.ph", "") : null,
          ...(imageUrls.length > 0 && {
            photos: {
              create: imageUrls.map((url, idx) => ({
                photoPath: url.replace("https://connect.houseofgrace.ph", ""),
                sortOrder: idx,
              })),
            },
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      data: { prayerId: created.id },
    });
  } catch (err: any) {
    console.error("[api/mobile/prayer POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to process prayer request" }, { status: 500 });
  }
}
