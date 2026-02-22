import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/marketplace/listings/mine — return session user's listings
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberId = parseInt(session.user.id);

  const listings = await db.marketplaceListing.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      photos: { take: 1, orderBy: { sortOrder: "asc" }, select: { photoPath: true } },
      _count: { select: { prospects: true, shares: true } },
    },
  });

  return NextResponse.json({
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      listingType: l.listingType as string,
      category: l.category,
      ogPrice: l.ogPrice ? Number(l.ogPrice) : null,
      price: l.price ? Number(l.price) : null,
      priceLabel: l.priceLabel,
      loveGiftAmount: Number(l.loveGiftAmount ?? 0),
      status: l.status as string,
      viewCount: l.viewCount,
      createdAt: l.createdAt.toISOString(),
      photo: l.photos[0]?.photoPath ?? null,
      prospectCount: l._count.prospects,
      shareCount: l._count.shares,
    })),
  });
}
