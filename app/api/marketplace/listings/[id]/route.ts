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
  if (body.action === "mark_sold") {
    await db.marketplaceListing.update({
      where: { id: listingId },
      data: { status: "sold", soldAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "sold" });
  }

  if (body.action === "delete") {
    await db.marketplaceListing.update({
      where: { id: listingId },
      data: { status: "removed" },
    });
    return NextResponse.json({ ok: true, status: "removed" });
  }

  if (body.action === "reactivate") {
    await db.marketplaceListing.update({
      where: { id: listingId },
      data: { status: "active" },
    });
    return NextResponse.json({ ok: true, status: "active" });
  }

  // General field update
  const { title, description, listingType, category, ogPrice, discountedPrice, priceLabel, conditionType, locationArea, loveGiftAmount } = body;
  const validTypes = Object.values(MarketplaceListingType);

  const updated = await db.marketplaceListing.update({
    where: { id: listingId },
    data: {
      ...(title && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(listingType && validTypes.includes(listingType) && { listingType }),
      ...(category && { category }),
      ...(ogPrice !== undefined && { ogPrice: ogPrice ?? null }),
      ...(discountedPrice !== undefined && { discountedPrice: discountedPrice ?? null }),
      ...(priceLabel !== undefined && { priceLabel: priceLabel?.trim() || null }),
      ...(conditionType && { conditionType }),
      ...(locationArea !== undefined && { locationArea: locationArea?.trim() || null }),
      ...(loveGiftAmount !== undefined && { loveGiftAmount: parseInt(loveGiftAmount) || 0 }),
    },
  });

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
