import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "all";

    const where: any = { status: "active" };
    if (category && category !== "all") {
      where.listingType = category;
    }

    const listings = await db.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            isVerified: true,
          },
        },
        photos: {
          orderBy: { sortOrder: "asc" },
          take: 4,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        listings: listings.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description || "",
          listingType: l.listingType,
          category: l.category || "General",
          price: l.price ? Number(l.price) : null,
          discountedPrice: l.discountedPrice ? Number(l.discountedPrice) : null,
          priceLabel: l.priceLabel || null,
          conditionType: l.conditionType || null,
          locationArea: l.locationArea || "Davao City",
          loveGiftAmount: l.loveGiftAmount || 0,
          createdAt: l.createdAt.toISOString(),
          seller: {
            id: l.seller.id,
            name: `${l.seller.firstName} ${l.seller.lastName}`.trim(),
            isVerified: l.seller.isVerified,
            avatar: l.seller.profilePicture
              ? `https://connect.houseofgrace.ph/uploads/profile_pictures/${l.seller.profilePicture}`
              : null,
          },
          photos: l.photos.map((p) =>
            p.photoPath.startsWith("http")
              ? p.photoPath
              : `https://connect.houseofgrace.ph/uploads/marketplace/${p.photoPath}`
          ),
        })),
      },
    });
  } catch (err: any) {
    console.error("[api/mobile/stewardshop GET]", err?.message);
    return NextResponse.json({ success: false, message: "Failed to load StewardShop" }, { status: 500 });
  }
}
