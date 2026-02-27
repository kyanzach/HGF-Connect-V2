import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Only accept URLs produced by our own upload endpoint. */
const AUDIO_URL_PATTERN =
  /^\/uploads\/prayer_audio\/prayer_\d+_\d+\.\w{1,5}$/;

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

  // Block inactive / pending accounts that still hold a valid JWT
  if (session.user.status !== "active") {
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
    const message =
      rawMessage.slice(0, MAX_MESSAGE_LENGTH).trim() || "🙏 Prayed";

    // Only allow URLs that match our upload endpoint pattern
    const audioUrl =
      typeof body.audioUrl === "string" &&
      AUDIO_URL_PATTERN.test(body.audioUrl)
        ? body.audioUrl
        : null;

    // ── Verify the prayer request exists ─────────────────────────────
    const prayerRequest = await db.prayerRequest.findUnique({
      where: { id: requestId },
      select: { id: true },
    });
    if (!prayerRequest) {
      return NextResponse.json(
        { error: "Prayer request not found" },
        { status: 404 }
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

    // ── Badge evaluation (non-critical) ──────────────────────────────
    try {
      const [totalPrayers, totalVoice, uniqueMembers] = await Promise.all([
        (db as any).prayerResponse.count({
          where: { authorId, type: "PRAYER" },
        }),
        // FIX: filter by type:"PRAYER" — only voice *prayers* count
        (db as any).prayerResponse.count({
          where: { authorId, type: "PRAYER", audioUrl: { not: null } },
        }),
        // FIX: filter by type:"PRAYER" — only prayer responses count
        (db as any).prayerResponse.findMany({
          where: { authorId, type: "PRAYER" },
          select: { request: { select: { authorId: true } } },
          distinct: ["requestId"],
        }),
      ]);

      // FIX: exclude self-prayers from the unique-member count
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

      // Batch all badge upserts into one transaction
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
      // Non-critical — don't fail the prayer response
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/prayer/[id]/pray]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
