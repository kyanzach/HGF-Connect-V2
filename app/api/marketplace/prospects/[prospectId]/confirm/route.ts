import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notifySharerSaleConfirmed } from "@/lib/marketplace/notifySharer";

interface Props { params: Promise<{ prospectId: string }> }

// POST /api/marketplace/prospects/[prospectId]/confirm
// Confirm sale: marks prospect as converted, credits sharer Love Gift, marks listing as sold
export async function POST(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prospectId } = await params;
  const memberId = parseInt(session.user.id);

  // Load prospect + listing to verify ownership
  const prospect = await db.marketplaceProspect.findUnique({
    where: { id: parseInt(prospectId) },
    include: {
      listing: { select: { id: true, memberId: true, loveGiftAmount: true, title: true } },
    },
  });

  if (!prospect || prospect.listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }
  if (prospect.status === "converted") {
    return NextResponse.json({ error: "This sale has already been confirmed" }, { status: 400 });
  }

  const loveGiftAmount = Number(prospect.listing.loveGiftAmount ?? 0);

  // Mark prospect as converted
  await db.marketplaceProspect.update({
    where: { id: prospect.id },
    data: { status: "converted" },
  });

  // Mark listing as sold
  await db.marketplaceListing.update({
    where: { id: prospect.listingId },
    data: { status: "sold", soldAt: new Date() },
  });

  // Credit sharer's Love Gift if this prospect came via a share token
  let sharerCredited = false;
  if (prospect.shareToken && loveGiftAmount > 0) {
    const share = await db.listingShare.findFirst({
      where: { shareCode: prospect.shareToken, listingId: prospect.listingId },
    });
    if (share) {
      await db.listingShare.update({
        where: { id: share.id },
        data: {
          loveGiftEarned: { increment: loveGiftAmount },
          status: "credited",
        },
      });
      sharerCredited = true;

      // Phase 7: notify sharer of confirmed sale (fire-and-forget)
      void notifySharerSaleConfirmed(
        share.sharerId,
        prospect.listing.title,
        prospect.listingId,
        loveGiftAmount
      );
    }
  }

  return NextResponse.json({
    success: true,
    sharerCredited,
    loveGiftAmount,
    message: sharerCredited
      ? `Sale confirmed. Love Gift of ₱${loveGiftAmount.toLocaleString()} credited to sharer.`
      : "Sale confirmed. No sharer link was associated with this prospect.",
  });
}
