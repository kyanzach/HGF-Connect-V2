import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props { params: Promise<{ id: string }> }

// GET /api/marketplace/listings/[id]/prospects — prospects for a listing (owner-scoped)
// Enhanced: includes Love Gift claim data for each prospect
export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);

  // Verify ownership
  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { memberId: true, title: true, loveGiftAmount: true, status: true },
  });
  if (!listing || listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prospects = await db.marketplaceProspect.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
  });

  // Attach sharer name if sharerUserId is set
  const sharerIds = [...new Set(
    prospects
      .filter((p) => p.sharerUserId !== null)
      .map((p) => p.sharerUserId as number)
  )];
  const sharers = sharerIds.length > 0
    ? await db.member.findMany({ where: { id: { in: sharerIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const sharerMap: Record<number, string> = Object.fromEntries(sharers.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

  // Load Love Gift claims for this listing (seller-side view)
  const claims = await db.loveGiftClaim.findMany({
    where: { listingId },
    select: {
      id: true, listingShareId: true, sharerId: true,
      amount: true, method: true, status: true,
      gcashName: true, gcashMobile: true,
      createdAt: true, paidAt: true, receivedAt: true,
      sharer: { select: { firstName: true, lastName: true } },
    },
  });

  // Map claims by sharerId for easy lookup
  const claimBySharerId = new Map(claims.map((c) => [c.sharerId, c]));

  return NextResponse.json({
    listing: {
      title: listing.title,
      loveGiftAmount: Number(listing.loveGiftAmount ?? 0),
      status: listing.status as string,
    },
    prospects: prospects.map((p) => ({
      id: p.id,
      prospectName: p.prospectName,
      prospectMobile: p.prospectMobile,
      prospectEmail: p.prospectEmail,
      actionType: p.actionType as string,
      status: p.status as string,
      consented: p.consented,
      shareToken: p.shareToken,
      sharerName: p.sharerUserId ? (sharerMap[p.sharerUserId] ?? "Unknown") : null,
      sharerUserId: p.sharerUserId,
      createdAt: p.createdAt.toISOString(),
    })),
    // Session 2: Love Gift claims for this listing
    claims: claims.map((c) => ({
      id: c.id,
      sharerId: c.sharerId,
      sharerName: `${c.sharer.firstName} ${c.sharer.lastName}`,
      amount: Number(c.amount),
      method: c.method as string,
      status: c.status as string,
      gcashName: c.gcashName,
      gcashMobile: c.gcashMobile,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
    })),
  });
}

// PATCH /api/marketplace/listings/[id]/prospects — update prospect status
export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);
  const body = await req.json();
  const { prospectId, status } = body;

  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId }, select: { memberId: true },
  });
  if (!listing || listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.marketplaceProspect.update({
    where: { id: parseInt(prospectId) },
    data: { status },
  });

  return NextResponse.json({ prospect: updated });
}
