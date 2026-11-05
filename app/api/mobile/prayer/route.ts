import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedMember } from "@/lib/mobileAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const member = await getAuthenticatedMember(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "active";

    const where: any = {};
    if (filter === "answered") {
      where.isAnswered = true;
    } else if (filter === "mine" && member) {
      where.authorId = member.id;
    } else {
      where.isAnswered = false;
    }

    const requests = await db.prayerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        responses: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        prayers: requests.map((r) => ({
          id: r.id,
          request: r.request,
          isAnswered: r.isAnswered,
          prayerCount: r.prayerCount,
          createdAt: r.createdAt.toISOString(),
          author: {
            id: r.author.id,
            name: `${r.author.firstName} ${r.author.lastName}`.trim(),
            avatar: r.author.profilePicture
              ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${r.author.profilePicture}`
              : null,
          },
          responses: r.responses.map((resp) => ({
            id: resp.id,
            message: resp.message,
            type: resp.type,
            createdAt: resp.createdAt.toISOString(),
            authorName: `${resp.author.firstName} ${resp.author.lastName}`.trim(),
          })),
        })),
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

    if (action === "pray") {
      const prayerId = Number(body?.prayerId);
      if (!prayerId) {
        return NextResponse.json({ success: false, message: "Invalid prayer ID" }, { status: 400 });
      }
      const updated = await db.prayerRequest.update({
        where: { id: prayerId },
        data: { prayerCount: { increment: 1 } },
      });
      if (body?.message && String(body.message).trim()) {
        await db.prayerResponse.create({
          data: {
            requestId: prayerId,
            authorId: member.id,
            message: String(body.message).trim(),
            type: "PRAYER",
          },
        });
      }
      return NextResponse.json({
        success: true,
        data: { prayerCount: updated.prayerCount },
      });
    }

    const requestText = String(body?.request || "").trim();
    if (!requestText) {
      return NextResponse.json({ success: false, message: "Please enter your prayer request." }, { status: 400 });
    }

    const created = await db.prayerRequest.create({
      data: {
        authorId: member.id,
        request: requestText,
        visibility: "MEMBERS_ONLY",
      },
    });

    return NextResponse.json({
      success: true,
      data: { prayerId: created.id },
    });
  } catch (err: any) {
    console.error("[api/mobile/prayer POST]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to process prayer request" }, { status: 500 });
  }
}
