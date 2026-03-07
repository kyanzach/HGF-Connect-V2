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

  await db.loveGiftClaim.update({
    where: { id: claim.id },
    data: { status: "paid", paidAt: new Date() },
  });
 
  // Notify sharer
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

  return NextResponse.json({
    ok: true,
    message: "Marked as paid! The sharer will be notified to confirm receipt.",
  });
}
