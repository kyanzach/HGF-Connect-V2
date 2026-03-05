import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MarketplaceListingType } from "@prisma/client";

interface Props { params: Promise<{ id: string }> }

// GET /api/marketplace/listings/[id] — owner can see full listing incl. discountedPrice
export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);

  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId },
    include: { photos: { orderBy: { sortOrder: "asc" } } },
  });
  if (!listing || listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  return NextResponse.json({
    listing: {
      ...listing,
      ogPrice: listing.ogPrice ? Number(listing.ogPrice) : null,
      discountedPrice: listing.discountedPrice ? Number(listing.discountedPrice) : null,
      price: listing.price ? Number(listing.price) : null,
      loveGiftAmount: Number(listing.loveGiftAmount ?? 0),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);

  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId }, select: { memberId: true },
  });
  if (!listing || listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const body = await req.json();

  // Handle special status actions
  // NOTE: mark_sold is now handled by POST /api/marketplace/listings/{id}/mark-sold
  // with full $transaction support, prospect selection, and Love Gift crediting.

  if (body.action === "delete") {
    await db.marketplaceListing.update({
      where: { id: listingId },
      data: { status: "removed" },
    });
    return NextResponse.json({ ok: true, status: "removed" });
  }

  if (body.action === "reactivate") {
    // P1: Block reactivation if Love Gift was already credited
    const creditedClaim = await db.loveGiftClaim.findFirst({
      where: { listingId, status: { not: "disputed" } },
      select: { id: true },
    });
    if (creditedClaim) {
      return NextResponse.json({
        error: "Cannot reactivate — a Love Gift was already credited for this listing.",
      }, { status: 400 });
    }

    await db.marketplaceListing.update({
      where: { id: listingId },
      data: { status: "active", soldProspectId: null },
    });
    return NextResponse.json({ ok: true, status: "active" });
  }

  // General field update
  const { title, description, listingType, category, ogPrice, discountedPrice, priceLabel, conditionType, locationArea, loveGiftAmount, photoPaths } = body;
  const validTypes = Object.values(MarketplaceListingType);

  const updated = await db.marketplaceListing.update({
    where: { id: listingId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(listingType && validTypes.includes(listingType) && { listingType }),
      ...(category !== undefined && { category }),
      ...(ogPrice !== undefined && { ogPrice: ogPrice === "" ? null : Number(ogPrice) }),
      ...(discountedPrice !== undefined && { discountedPrice: discountedPrice === "" ? null : Number(discountedPrice) }),
      ...(priceLabel !== undefined && { priceLabel: priceLabel?.trim() || null }),
      ...(conditionType !== undefined && { conditionType }),
      ...(locationArea !== undefined && { locationArea: locationArea?.trim() || null }),
      ...(loveGiftAmount !== undefined && { loveGiftAmount: Number(loveGiftAmount) || 0 }),
    },
  });

  // Sync photos if photoPaths provided
  if (Array.isArray(photoPaths)) {
    await db.marketplaceListingPhoto.deleteMany({ where: { listingId } });
    if (photoPaths.length > 0) {
      await db.marketplaceListingPhoto.createMany({
        data: photoPaths.map((photoPath: string, idx: number) => ({
          listingId,
          photoPath,
          sortOrder: idx,
        })),
      });
    }
  }

  return NextResponse.json({ listing: updated });
}

// DELETE /api/marketplace/listings/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listingId = parseInt(id);
  const memberId = parseInt(session.user.id);

  const listing = await db.marketplaceListing.findUnique({
    where: { id: listingId }, select: { memberId: true },
  });
  if (!listing || listing.memberId !== memberId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  await db.marketplaceListing.update({
    where: { id: listingId },
    data: { status: "removed" },
  });

  return NextResponse.json({ ok: true });
}
