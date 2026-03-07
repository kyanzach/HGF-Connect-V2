import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props { params: Promise<{ claimId: string }> }

/**
 * PATCH /api/marketplace/love-gifts/{claimId}/received
 * Sharer confirms they received the Love Gift payment.
 * Creates an auto-feed celebration post and notifies the seller with a thank-you.
 */
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { claimId } = await params;
  const sharerId = parseInt(session.user.id);

  const claim = await db.loveGiftClaim.findUnique({
    where: { id: Number(claimId) },
    select: {
      id: true, sharerId: true, sellerId: true, status: true, amount: true,
      listing: { select: { id: true, title: true } },
      sharer: { select: { id: true, firstName: true, lastName: true } },
      seller: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!claim || claim.sharerId !== sharerId) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status === "received") {
    return NextResponse.json({ ok: true, message: "Already confirmed! 🎉" });
  }

  if (claim.status !== "paid") {
    return NextResponse.json({ error: `Cannot confirm receipt — claim is ${claim.status}` }, { status: 400 });
  }

  // Optional thank-you note
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const thankYouNote = body.thankYou?.trim() || null;

  await db.$transaction(async (tx) => {
    // 1. Update claim to received
    await tx.loveGiftClaim.update({
      where: { id: claim.id },
      data: { status: "received", receivedAt: new Date() },
    });

    // 2. Auto-feed celebration post
    const sellerName = `${claim.seller.firstName} ${claim.seller.lastName}`;
    const amount = Number(claim.amount);

    await tx.post.create({
      data: {
        authorId: sharerId,
        type: "TEXT",
        content: `🎉 I just received a ₱${amount.toLocaleString()} Love Gift from ${sellerName} for referring "${claim.listing.title}" on StewardShop! ${thankYouNote ? `\n\n"${thankYouNote}"` : ""}\n\n❤️ God is good! #StewardShop #LoveGift`,
        visibility: "MEMBERS_ONLY",
      },
    });
  });

  // 3. Notify seller (thank you)
  try {
    const sharerName = `${claim.sharer.firstName} ${claim.sharer.lastName}`;
    await db.notification.create({
      data: {
        memberId: claim.sellerId,
        type: "love_gift_received" as any,
        title: "✅ Love Gift Received!",
        body: thankYouNote
          ? `${sharerName} confirmed receipt of ₱${Number(claim.amount).toLocaleString()} and says: "${thankYouNote}"`
          : `${sharerName} confirmed receipt of ₱${Number(claim.amount).toLocaleString()} Love Gift. Thank you for your generosity!`,
        link: `/stewardshop/my-listings/${claim.listing.id}/prospects`,
      },
    });
  } catch (err) {
    console.error("Failed to notify seller about receipt:", err);
  }

  return NextResponse.json({
    ok: true,
    message: "Receipt confirmed! A celebration post has been created. 🎉",
  });
}
