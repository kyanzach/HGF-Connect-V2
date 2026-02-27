import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props { params: Promise<{ id: string }> }

/**
 * Generate a human-readable coupon code for a sharer.
 * Format: [FIRSTNAME][FIRST_LETTER_OF_LAST][SEQUENCE_NUMBER]
 * e.g. Ryan Paco sharing their 1st listing → RYANP01
 *      Ryan Paco sharing their 3rd listing  → RYANP03
 * All uppercase, max 12 chars.
 */
function buildCouponCode(firstName: string, lastName: string, sequence: number): string {
  const first = firstName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  const lastInitial = lastName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 1);
  const seq = String(sequence).padStart(2, "0");
  return `${first}${lastInitial}${seq}`;
}

// GET — return the current user's share link & coupon code for this listing (or null)
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

  const baseUrl = "https://connect.houseofgrace.ph";
  return NextResponse.json({
    shareLink: `${baseUrl}/marketplace/${listingId}?ref=${share.shareCode}`,
    shareCode: share.shareCode,
    loveGiftEarned: Number(share.loveGiftEarned),
    status: share.status,
    createdAt: share.createdAt,
  });
}

// POST — create (or return existing) share link + branded coupon code
export async function POST(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const sharerId = parseInt(session.user.id);

  // Verify listing exists and is active
  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, loveGiftAmount: true, status: true, memberId: true },
  });
  if (!listing || listing.status !== "active") {
    return NextResponse.json({ error: "Listing not found or inactive" }, { status: 404 });
  }

  // Can't generate a share link for your own listing
  if (listing.memberId === sharerId) {
    return NextResponse.json({ error: "You cannot share your own listing" }, { status: 400 });
  }

  // Return existing if already created
  const existing = await db.listingShare.findFirst({
    where: { listingId, sharerId },
    select: { shareCode: true },
  });

  if (existing) {
    const baseUrl = "https://connect.houseofgrace.ph";
    return NextResponse.json({
      shareLink: `${baseUrl}/marketplace/${listingId}?ref=${existing.shareCode}`,
      shareCode: existing.shareCode,
      loveGiftAmount: Number(listing.loveGiftAmount),
      isNew: false,
    });
  }

  // Build coupon code: get sharer's name + count existing shares to get sequence
  const sharer = await db.member.findUnique({
    where: { id: sharerId },
    select: { firstName: true, lastName: true },
  });
  if (!sharer) return NextResponse.json({ error: "Sharer not found" }, { status: 404 });

  const existingShareCount = await db.listingShare.count({ where: { sharerId } });
  const sequence = existingShareCount + 1; // 1-indexed: first share = 01

  let shareCode = buildCouponCode(sharer.firstName ?? "USER", sharer.lastName ?? "X", sequence);

  // Ensure uniqueness — if collision, increment until unique
  let attempt = sequence;
  while (true) {
    const collision = await db.listingShare.findFirst({ where: { shareCode }, select: { id: true } });
    if (!collision) break;
    attempt += 1;
    shareCode = buildCouponCode(sharer.firstName ?? "USER", sharer.lastName ?? "X", attempt);
  }

  await db.listingShare.create({
    data: {
      listingId,
      sharerId,
      shareCode,
      loveGiftEarned: 0,
      status: "pending",
    },
  });

  const baseUrl = "https://connect.houseofgrace.ph";
  return NextResponse.json({
    shareLink: `${baseUrl}/marketplace/${listingId}?ref=${shareCode}`,
    shareCode,
    loveGiftAmount: Number(listing.loveGiftAmount),
    isNew: true,
  });
}
