import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

interface Props { params: Promise<{ id: string }> }

// GET — return the current user's share link for this listing (or null)
export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ shareLink: null });

  const { id } = await params;
  const listingId = parseInt(id);

  const share = await db.listingShare.findFirst({
    where: { listingId, sharerId: parseInt(session.user.id) },
    select: { shareCode: true, loveGiftEarned: true, status: true, createdAt: true },
  });

  if (!share) return NextResponse.json({ shareLink: null });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://connect.houseofgrace.ph";
  return NextResponse.json({
    shareLink: `${baseUrl}/marketplace/${listingId}?ref=${share.shareCode}`,
    shareCode: share.shareCode,
    loveGiftEarned: Number(share.loveGiftEarned),
    status: share.status,
    createdAt: share.createdAt,
  });
}

// POST — create (or return existing) share link for the logged-in user
export async function POST(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);

  // Verify listing exists and is active
  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, loveGiftAmount: true, status: true, memberId: true },
  });
  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: "Listing not found or inactive" }, { status: 404 });
  }

  // Can't generate a share link for your own listing
  if (listing.memberId === parseInt(session.user.id)) {
    return NextResponse.json({ error: "You cannot share your own listing" }, { status: 400 });
  }

  // Return existing share link if already created
  const existing = await db.listingShare.findFirst({
    where: { listingId, sharerId: parseInt(session.user.id) },
    select: { shareCode: true },
  });

  const shareCode = existing?.shareCode ?? randomBytes(6).toString("hex"); // 12-char hex

  if (!existing) {
    await db.listingShare.create({
      data: {
        listingId,
        sharerId: parseInt(session.user.id),
        shareCode,
        loveGiftEarned: 0,
        status: "pending",
      },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://connect.houseofgrace.ph";
  return NextResponse.json({
    shareLink: `${baseUrl}/marketplace/${listingId}?ref=${shareCode}`,
    shareCode,
    loveGiftAmount: listing.loveGiftAmount,
    isNew: !existing,
  });
}
