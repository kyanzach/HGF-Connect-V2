import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MarketplaceListingType as ListingType } from "@prisma/client";
import { notifyAllMembers } from "@/lib/notify";

// GET /api/marketplace/listings
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") ?? "1");
  const take = 20;

  const where = {
    status: "active" as const,
    ...(type && Object.values(ListingType).includes(type as ListingType) ? { listingType: type as ListingType } : {}),
    ...(category ? { category } : {}),
  };

  const listings = await db.marketplaceListing.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * take,
    take,
    select: {
      id: true,
      title: true,
      listingType: true,
      category: true,
      price: true,
      ogPrice: true,
      priceLabel: true,
      conditionType: true,
      locationArea: true,
      loveGiftAmount: true,
      createdAt: true,
      seller: { select: { id: true, firstName: true, lastName: true } },
      photos: { take: 1, select: { photoPath: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({ listings });
}

// POST /api/marketplace/listings — create listing
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    title,
    description,
    listingType,
    category,
    price,
    ogPrice,
    discountedPrice,
    priceLabel,
    conditionType,
    locationArea,
    loveGiftAmount,
    photoPaths,
  } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const validTypes = Object.values(ListingType);
  const safeType = validTypes.includes(listingType as ListingType)
    ? (listingType as ListingType)
    : ListingType.sale;

  const listing = await db.marketplaceListing.create({
    data: {
      memberId: parseInt(session.user.id),
      title: title.trim(),
      description: description?.trim() || null,
      listingType: safeType,
      category: category || "Other",
      price: price ?? null,
      ogPrice: ogPrice ?? null,
      discountedPrice: discountedPrice ?? null,
      priceLabel: priceLabel?.trim() || null,
      conditionType: conditionType || null,
      locationArea: locationArea?.trim() || null,
      loveGiftAmount: loveGiftAmount ?? 0,
      status: "active",
    },
  });

  // Save photo records
  if (Array.isArray(photoPaths) && photoPaths.length > 0) {
    await db.marketplaceListingPhoto.createMany({
      data: photoPaths.slice(0, 5).map((photoPath: string, idx: number) => ({
        listingId: listing.id,
        photoPath,
        sortOrder: idx,
      })),
    });
  }

  // ----- Notify all members (fire-and-forget) -----
  const sellerName = `${session.user.name ?? session.user.email}`;
  // Grab seller full name from DB for better notification text
  const seller = await db.member.findUnique({
    where: { id: parseInt(session.user.id) },
    select: { firstName: true, lastName: true },
  });
  const sellerFullName = seller ? `${seller.firstName} ${seller.lastName}` : sellerName;
  const typeLabels: Record<string, string> = {
    sale: "is selling", free: "is giving away", trade: "wants to trade",
    service: "is offering a service", rent: "has for rent", official_store: "posted",
  };
  const action = typeLabels[listing.listingType] ?? "listed";
  void notifyAllMembers({
    actorId: parseInt(session.user.id),
    type: "new_marketplace",
    title: `${sellerFullName} ${action}: ${listing.title}`,
    body: locationArea ? `📍 ${locationArea}` : "Check it out in the Marketplace",
    link: `/marketplace/${listing.id}`,
  });
  // -------------------------------------------------

  return NextResponse.json({ listing }, { status: 201 });
}
