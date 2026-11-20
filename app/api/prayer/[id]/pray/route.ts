import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Accept URLs produced by our upload endpoint: /uploads/prayer_audio/prayer_<anything>.<audioExt> */
const AUDIO_URL_PATTERN =
  /^\/uploads\/prayer_audio\/prayer_[\w]+\.(webm|mp4|m4a|ogg|aac|wav|mp3)$/i;

const MAX_MESSAGE_LENGTH = 500;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── Auth ────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Block pending / archived accounts that still hold a valid JWT
  if (session.user.status === "pending" || session.user.status === "archived") {
    return NextResponse.json(
      { error: "Account not active" },
      { status: 403 }
    );
  }

  // ── Input validation ───────────────────────────────────────────────
  const { id } = await params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId) || requestId <= 0) {
    return NextResponse.json(
      { error: "Invalid prayer request ID" },
      { status: 400 }
    );
  }

  const authorId = parseInt(session.user.id, 10);

  try {
    const body = await request.json().catch(() => ({}));

    const rawMessage = typeof body.message === "string" ? body.message : "";
    const trimmedMessage = rawMessage.slice(0, MAX_MESSAGE_LENGTH).trim();
    const message = trimmedMessage || "🙏 Prayed";

    // Only allow URLs that match our upload endpoint pattern
    const audioUrl =
      typeof body.audioUrl === "string" &&
      AUDIO_URL_PATTERN.test(body.audioUrl)
        ? body.audioUrl
        : null;

    // ── Verify the prayer request exists ─────────────────────────────
    const prayerRequest = await db.prayerRequest.findUnique({
      where: { id: requestId },
      select: { id: true, authorId: true, request: true },
    });
    if (!prayerRequest) {
      return NextResponse.json(
        { error: "Prayer request not found" },
        { status: 404 }
      );
    }

    // ── Block self-praying ─────────────────────────────────────────────
    if (prayerRequest.authorId === authorId) {
      return NextResponse.json(
        { error: "You cannot pray for your own request" },
        { status: 403 }
      );
    }

    // ── Atomic: create response + increment count ────────────────────
    await db.$transaction([
      (db as any).prayerResponse.create({
        data: {
          requestId,
          authorId,
          message,
          audioUrl,
          type: "PRAYER",
        },
      }),
      db.prayerRequest.update({
        where: { id: requestId },
        data: { prayerCount: { increment: 1 } },
      }),
    ]);

    // ── Notify prayer author (non-critical) ──────────────────────────
    if (prayerRequest.authorId && prayerRequest.authorId !== authorId) {
      const responderName = session.user.name || "A church member";
      const notifBody = trimmedMessage && trimmedMessage !== "🙏 Prayed"
        ? `"${trimmedMessage.slice(0, 100)}"`
        : audioUrl
          ? "Sent you a voice prayer"
          : prayerRequest.request.slice(0, 100);
      createNotification({
        memberId: prayerRequest.authorId,
        type: "general",
        title: `🙏 ${responderName} prayed for your request`,
        body: notifBody,
        link: `/prayer/${requestId}`,
        actorId: authorId,
      }).catch(() => {});
    }

    // ── Badge evaluation (non-critical) ──────────────────────────────
    try {
      const [totalPrayers, totalVoice, uniqueMembers] = await Promise.all([
        (db as any).prayerResponse.count({
          where: { authorId, type: "PRAYER" },
        }),
        (db as any).prayerResponse.count({
          where: { authorId, type: "PRAYER", audioUrl: { not: null } },
        }),
        (db as any).prayerResponse.findMany({
          where: { authorId, type: "PRAYER" },
          select: { request: { select: { authorId: true } } },
          distinct: ["requestId"],
        }),
      ]);

      const uniqueCount = new Set(
        uniqueMembers
          .map((r: any) => r.request.authorId as number)
          .filter((rid: number) => rid !== authorId)
      ).size;

      const badgesToAward: string[] = [];
      if (totalPrayers >= 10) badgesToAward.push("PRAYER_WARRIOR_1");
      if (totalPrayers >= 50 && totalVoice >= 5)
        badgesToAward.push("PRAYER_WARRIOR_2");
      if (totalPrayers >= 100 && totalVoice >= 15 && uniqueCount >= 25)
        badgesToAward.push("PRAYER_WARRIOR_3");

      if (badgesToAward.length > 0) {
        await db.$transaction(
          badgesToAward.map((badgeType) =>
            (db as any).memberBadge.upsert({
              where: {
                memberId_badgeType: { memberId: authorId, badgeType },
              },
              create: { memberId: authorId, badgeType },
              update: {},
            })
          )
        );
      }
    } catch (badgeErr) {
      console.error("[badge eval]", badgeErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/prayer/[id]/pray]", error);
    return NextResponse.json({ ok: false, error: "Failed to submit prayer" }, { status: 500 });
  }
}
