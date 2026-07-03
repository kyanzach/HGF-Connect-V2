import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props { params: Promise<{ claimId: string }> }

/**
 * PATCH /api/marketplace/love-gifts/{claimId}/pay
 * Seller marks a Love Gift claim as "paid".
 * Sends notification to sharer to confirm receipt.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { claimId } = await params;
  const sellerId = parseInt(session.user.id);

  const claim = await db.loveGiftClaim.findUnique({
    where: { id: Number(claimId) },
    select: {
      id: true, sellerId: true, sharerId: true, status: true, amount: true, listingId: true,
      listing: { select: { title: true } },
    },
  });

  if (!claim || claim.sellerId !== sellerId) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "pending") {
    return NextResponse.json({ error: `Claim is already ${claim.status}` }, { status: 400 });
  }

  // Find HGF Church member ID
  const church = await db.member.findFirst({
    where: { email: "church@houseofgrace.ph" },
    select: { id: true }
  }).catch(() => null);

  const isChurchClaim = church && claim.sharerId === church.id;

  if (isChurchClaim) {
    // Transactional: set status to received directly + publish celebration feed post
    await db.$transaction(async (tx) => {
      await tx.loveGiftClaim.update({
        where: { id: claim.id },
        data: { status: "received", paidAt: new Date(), receivedAt: new Date() },
      });

      const seller = await tx.member.findUnique({
        where: { id: sellerId },
        select: { firstName: true, lastName: true },
      });
      const sellerName = `${seller?.firstName ?? "Seller"} ${seller?.lastName ?? ""}`.trim();
      const amount = Number(claim.amount);

      await tx.post.create({
        data: {
          authorId: claim.sharerId,
          type: "TEXT",
          content: `🎉 HGF StewardShop Celebration! HGF Church has received a ₱${amount.toLocaleString()} Love Gift contribution from ${sellerName} for the listing "${claim.listing.title}". Thank you for your stewardship! Praise God! 🎁\n\nCheck out the StewardShop at connect.houseofgrace.ph/stewardshop to support our community!`,
        },
      });
    });
  } else {
    await db.loveGiftClaim.update({
      where: { id: claim.id },
      data: { status: "paid", paidAt: new Date() },
    });

    // Notify normal sharer
    try {
      const seller = await db.member.findUnique({
        where: { id: sellerId },
        select: { firstName: true },
      });
      await db.notification.create({
        data: {
          memberId: claim.sharerId,
          type: "love_gift_paid",
          title: "💸 Love Gift Payment Sent!",
          body: `${seller?.firstName ?? "Seller"} marked your ₱${Number(claim.amount).toLocaleString()} Love Gift for "${claim.listing.title}" as paid. Please confirm receipt!`,
          link: `/stewardshop/my-shares?tab=won&listing=${claim.listingId}`,
        },
      });
    } catch (err) {
      console.error("Failed to notify sharer about payment:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Marked as paid! The sharer will be notified to confirm receipt.",
  });
}
