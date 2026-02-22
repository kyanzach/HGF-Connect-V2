import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MarketplaceListingType as ListingType } from "@prisma/client";

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
      priceLabel: true,
      conditionType: true,
      locationArea: true,
      loveGiftPercent: true,
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
  const { title, description, listingType, category, price, priceLabel, conditionType, locationArea, loveGiftPercent } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const listing = await db.marketplaceListing.create({
    data: {
      memberId: parseInt(session.user.id),
      title: title.trim(),
      description: description?.trim() || null,
      listingType: listingType ?? "sell",
      category: category || "Other",
      price: price ?? null,
      priceLabel: priceLabel?.trim() || null,
      conditionType: conditionType || null,
      locationArea: locationArea?.trim() || null,
      loveGiftPercent: loveGiftPercent ?? 0,
      status: "active",
    },
  });

  return NextResponse.json({ listing }, { status: 201 });
}
