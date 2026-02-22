import { db } from "@/lib/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicNav from "@/components/layout/PublicNav";
import ListingDetailClient from "./ListingDetailClient";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await db.marketplaceListing.findUnique({
    where: { id: parseInt(id) },
    select: {
      title: true, description: true, ogPrice: true,
      photos: { take: 1, select: { photoPath: true } },
    },
  });
  if (!listing) return { title: "Listing Not Found" };
  return {
    title: `${listing.title} | HGF Marketplace`,
    description: listing.description?.slice(0, 160) ?? "Listed on HGF Connect Marketplace",
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160) ?? "",
      type: "website",
      images: listing.photos[0] ? [`/uploads/marketplace/${listing.photos[0].photoPath}`] : [],
    },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;
  const listing = await db.marketplaceListing.findUnique({
    where: { id: parseInt(id) },
    include: {
      seller: { select: { id: true, firstName: true, lastName: true, profilePicture: true } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!listing || listing.status !== "active") notFound();

  // Increment view count (fire and forget)
  db.marketplaceListing.update({
    where: { id: listing.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Serialize — strip discountedPrice before sending to client (NEVER expose it here)
  const safeListingData = {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType,
    category: listing.category,
    ogPrice: listing.ogPrice ? Number(listing.ogPrice) : null,
    // discountedPrice deliberately OMITTED — only returned after prospect submit (v1.1 §170)
    hasDiscount: !!(listing.discountedPrice && listing.ogPrice && Number(listing.discountedPrice) < Number(listing.ogPrice)),
    priceLabel: listing.priceLabel,
    conditionType: listing.conditionType,
    locationArea: listing.locationArea,
    loveGiftAmount: Number(listing.loveGiftAmount ?? 0),
    viewCount: listing.viewCount,
    createdAt: listing.createdAt.toISOString(),
    photos: listing.photos.map((p) => ({ photoPath: p.photoPath })),
    seller: {
      firstName: listing.seller.firstName,
      lastName: listing.seller.lastName,
      profilePicture: listing.seller.profilePicture,
    },
  };

  return (
    <>
      <PublicNav />
      <ListingDetailClient listing={safeListingData} />
    </>
  );
}
