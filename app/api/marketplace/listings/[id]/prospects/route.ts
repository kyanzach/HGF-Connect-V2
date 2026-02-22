import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

interface Props { params: Promise<{ id: string }> }

// GET /api/marketplace/listings/[id]/prospects — prospects for a listing (owner-scoped)
export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);

  // Verify ownership
  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
    select: { memberId: true, title: true, loveGiftAmount: true },
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

  return NextResponse.json({
    listing: { title: listing.title, loveGiftAmount: Number(listing.loveGiftAmount ?? 0) },
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
      createdAt: p.createdAt.toISOString(),
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
