import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props { params: Promise<{ id: string }> }

/**
 * POST /api/marketplace/listings/{id}/mark-sold
 * Unified endpoint: marks listing sold, credits Love Gift, creates claim row.
 * Wrapped in $transaction to prevent partial state.
 *
 * Body: { prospectId: number } | { soldOutside: true }
 */
export async function POST(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);

  // Verify ownership
  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { memberId: true, status: true, loveGiftAmount: true, title: true },
  });

  if (!listing || listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  // P0: Guard — only active listings can be marked sold
  if (listing.status !== "active") {
    return NextResponse.json({ error: "Listing is not active — cannot mark sold" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { prospectId, soldOutside } = body;

  const loveGiftAmount = Number(listing.loveGiftAmount ?? 0);

  // ─── Sold outside (no prospect, no Love Gift) ─────────────────────────
  if (soldOutside) {
    await db.$transaction(async (tx) => {
      await tx.marketplaceListing.update({
        where: { id: listingId },
        data: { status: "sold", soldAt: new Date() },
      });
    });

    // Notify all sharers that listing sold without referral
    try {
      const sharers = await db.listingShare.findMany({
        where: { listingId },
        select: { sharerId: true },
      });
      if (sharers.length > 0) {
        await db.notification.createMany({
          data: sharers.map((s) => ({
            memberId: s.sharerId,
            type: "love_gift_sold" as any,
            title: "🏷️ Listing Sold",
            body: `"${listing.title}" was sold without a referral.`,
            link: `/stewardshop/my-shares`,
          })),
        });
      }
    } catch { /* non-critical */ }

    return NextResponse.json({ ok: true, status: "sold", sharerCredited: false, message: "Sale confirmed! Listing marked as sold outside." });
  }

  // ─── Sold via prospect ─────────────────────────────────────────────────
  if (!prospectId) {
    return NextResponse.json({ error: "prospectId or soldOutside required" }, { status: 400 });
  }

  // Load prospect with share info
  const prospect = await db.marketplaceProspect.findUnique({
    where: { id: Number(prospectId) },
    select: {
      id: true, listingId: true, shareToken: true, sharerUserId: true,
      prospectName: true, status: true,
    },
  });

  if (!prospect || prospect.listingId !== listingId) {
    return NextResponse.json({ error: "Prospect not found for this listing" }, { status: 404 });
  }

  // Find sharer if prospect has a shareToken
  let share: { id: number; sharerId: number; shareCode: string } | null = null;
  let sharerCredited = false;
  let claimCreated = false;

  if (prospect.shareToken && loveGiftAmount > 0) {
    share = await db.listingShare.findFirst({
      where: { shareCode: prospect.shareToken, listingId },
      select: { id: true, sharerId: true, shareCode: true },
    });
    // P1: Prevent self-referral (seller paying themselves)
    if (share && share.sharerId === memberId) {
      share = null; // Self-referral → no Love Gift
    }
  }

  // Transactional: mark sold + convert prospect + credit sharer + create claim
  await db.$transaction(async (tx) => {
    // 1. Mark listing as sold
    await tx.marketplaceListing.update({
      where: { id: listingId },
      data: {
        status: "sold",
        soldAt: new Date(),
        soldProspectId: prospect.id,
      },
    });

    // 2. Mark prospect as converted
    await tx.marketplaceProspect.update({
      where: { id: prospect.id },
      data: { status: "converted" },
    });

    // 3. Credit sharer Love Gift + create claim row
    if (share) {
      await tx.listingShare.update({
        where: { id: share.id },
        data: {
          loveGiftEarned: { increment: loveGiftAmount },
          status: "credited",
        },
      });

      await tx.loveGiftClaim.create({
        data: {
          listingShareId: share.id,
          listingId,
          sharerId: share.sharerId,
          sellerId: memberId,
          amount: loveGiftAmount,
          // method intentionally omitted — sharer will choose (GCash or Contact) from My Share Links
          status: "pending",
        },
      });

      sharerCredited = true;
      claimCreated = true;
    }
  });

  // ─── Notifications (fire-and-forget, outside transaction) ─────────────
  try {
    const allSharers = await db.listingShare.findMany({
      where: { listingId },
      select: { sharerId: true, shareCode: true },
    });

    const notifications: Array<{
      memberId: number; type: string; title: string; body: string; link: string;
    }> = [];

    if (sharerCredited && share) {
      // Notify winning sharer
      notifications.push({
        memberId: share.sharerId,
        type: "love_gift_earned",
        title: "🎁 You earned a Love Gift!",
        body: `You earned ₱${loveGiftAmount.toLocaleString()} for sharing "${listing.title}". Tap to claim!`,
        link: "/stewardshop/my-shares",
      });

      // Notify other sharers (not the winner)
      const winnerName = await db.member.findUnique({
        where: { id: share.sharerId },
        select: { firstName: true },
      });

      for (const s of allSharers) {
        if (s.sharerId !== share.sharerId) {
          notifications.push({
            memberId: s.sharerId,
            type: "love_gift_sold",
            title: "🏷️ Listing Sold!",
            body: `"${listing.title}" was sold! ${winnerName?.firstName ?? "A sharer"} won the ₱${loveGiftAmount.toLocaleString()} Love Gift.`,
            link: "/stewardshop/my-shares",
          });
        }
      }
    } else if (allSharers.length > 0) {
      // No sharer credited — notify all it sold without referral
      for (const s of allSharers) {
        notifications.push({
          memberId: s.sharerId,
          type: "love_gift_sold",
          title: "🏷️ Listing Sold",
          body: `"${listing.title}" was sold without a referral.`,
          link: "/stewardshop/my-shares",
        });
      }
    }

    if (notifications.length > 0) {
      await db.notification.createMany({
        data: notifications.map((n) => ({ ...n, type: n.type as any })),
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({
    ok: true,
    status: "sold",
    sharerCredited,
    claimCreated,
    loveGiftAmount: sharerCredited ? loveGiftAmount : 0,
    message: sharerCredited
      ? `Sale confirmed! ₱${loveGiftAmount.toLocaleString()} Love Gift credited to sharer.`
      : "Sale confirmed. No referral Love Gift.",
  });
}
