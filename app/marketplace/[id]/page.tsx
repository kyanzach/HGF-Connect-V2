import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicNav from "@/components/layout/PublicNav";
import ListingDetailClient from "./ListingDetailClient";
import crypto from "crypto";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { ref } = await searchParams;

  const listing = await db.marketplaceListing.findUnique({
    where: { id: parseInt(id) },
    select: {
      title: true, description: true, ogPrice: true, discountedPrice: true,
      photos: { take: 1, select: { photoPath: true } },
    },
  });
  if (!listing) return { title: "Listing Not Found" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://connect.houseofgrace.ph";
  const imageUrl = listing.photos[0]
    ? `${baseUrl}/uploads/marketplace/${listing.photos[0].photoPath}`
    : undefined;

  // ── Sharer-specific OG tags (v1.1 §26-31) ─────────────────────────────────
  if (ref) {
    const share = await db.listingShare.findFirst({
      where: { shareCode: ref, listingId: parseInt(id) },
      include: { sharer: { select: { firstName: true, lastName: true } } },
    }).catch(() => null);

    if (share) {
      const sharerName = `${share.sharer.firstName} ${share.sharer.lastName}`;
      const ogPrice = listing.ogPrice ? `₱${Number(listing.ogPrice).toLocaleString()}` : null;
      const discPrice = listing.discountedPrice ? `₱${Number(listing.discountedPrice).toLocaleString()}` : null;
      const priceStr = ogPrice && discPrice ? `${ogPrice} → ${discPrice}` : ogPrice ?? "Free";

      return {
        title: `${sharerName} shared: ${listing.title} — ${priceStr} | HGF Marketplace`,
        description: `${sharerName} thinks you'll be interested and wanted to share this offer with you.`,
        openGraph: {
          title: `${sharerName} has shared this discounted ${listing.title}: ${priceStr}`,
          description: `${sharerName} thinks you'll be interested and wanted to share this discount with you.`,
          type: "website",
          images: imageUrl ? [imageUrl] : [],
        },
      };
    }
  }

  // ── Default OG tags (no ref, or ref not found) ─────────────────────────────
  return {
    title: `${listing.title} | HGF Marketplace`,
    description: listing.description?.slice(0, 160) ?? "Listed on HGF Connect Marketplace",
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160) ?? "",
      type: "website",
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ListingDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ref } = await searchParams;

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

  // Log impression for this share code (fire and forget, v1.1 §77)
  if (ref) {
    db.marketplaceImpression.create({
      data: {
        listingId: listing.id,
        shareCode: ref,
        event: "impression",
        ipHash: null, // IP not available in RSC without headers(), impression still logged
      },
    }).catch(() => {});
  }

  // Check if current user is the seller (to hide share button for own listings)
  const session = await auth();
  const isOwner = session?.user?.id ? parseInt(session.user.id) === listing.seller.id : false;
  const isLoggedIn = !!session?.user;

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
      id: listing.seller.id,
      firstName: listing.seller.firstName,
      lastName: listing.seller.lastName,
      profilePicture: listing.seller.profilePicture,
    },
    isOwner,
    isLoggedIn,
    shareToken: ref ?? null,
  };

  return (
    <>
      <PublicNav />
      <ListingDetailClient listing={safeListingData} />
    </>
  );
}
