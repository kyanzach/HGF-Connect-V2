import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ListingDetailClient from "./ListingDetailClient";
import crypto from "crypto";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}

function cleanDescription(desc: string | null): string {
  if (!desc) return "";
  return desc.replace(/\[video:(https?:\/\/[^\]\s]+)\]/g, "").trim();
}

function strikeText(text: string): string {
  return text.split("").map((c) => c + "\u0336").join("");
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { ref } = await searchParams;

  const listing = await db.marketplaceListing.findUnique({
    where: { id: parseInt(id) },
    select: {
      title: true, description: true, ogPrice: true, discountedPrice: true,
      isPrivate: true,
      photos: { take: 1, select: { photoPath: true } },
    },
  });
  if (!listing) return { title: "Listing Not Found" };
  if (listing.isPrivate) return { title: "Private Listing | StewardShop" };

  const baseUrl = "https://connect.houseofgrace.ph";
  const imageUrl = listing.photos[0]
    ? `${baseUrl}/api/marketplace/image/${listing.photos[0].photoPath}`
    : `${baseUrl}/stewardshop_default_og.png`;

  const imageType = listing.photos[0] ? "image/jpeg" : "image/png";

  const cleanedDesc = cleanDescription(listing.description).slice(0, 160) || "Listed on HGF Connect Marketplace";

  const hasDiscount = !!(listing.discountedPrice && listing.ogPrice && Number(listing.discountedPrice) > 0 && Number(listing.discountedPrice) < Number(listing.ogPrice));
  const ogPriceFormatted = listing.ogPrice ? `₱${Number(listing.ogPrice).toLocaleString()}` : null;
  const struckPrice = ogPriceFormatted ? strikeText(ogPriceFormatted) : "";

  const pct = listing.ogPrice && listing.discountedPrice
    ? Math.round(((Number(listing.ogPrice) - Number(listing.discountedPrice)) / Number(listing.ogPrice)) * 100)
    : 0;

  // ── Sharer-specific OG tags (v1.1 §26-31) ─────────────────────────────────
  if (ref) {
    const share = await db.listingShare.findFirst({
      where: { shareCode: ref, listingId: parseInt(id) },
      include: { sharer: { select: { firstName: true, lastName: true } } },
    }).catch(() => null);

    if (share) {
      const sharerName = `${share.sharer.firstName} ${share.sharer.lastName}`;
      
      let priceStr = ogPriceFormatted ?? "Free";
      let descStr = `${sharerName} thinks you'll be interested and wanted to share this offer with you.`;
      
      if (hasDiscount) {
        priceStr = `${struckPrice} (${pct}% OFF) reveal the discounted price!`;
        descStr = `${sharerName} wants you to see this special deal! (${pct}% OFF) reveal the discounted price now.`;
      }

      return {
        title: `${sharerName} shared: ${listing.title} — ${priceStr} | HGF StewardShop`,
        description: descStr,
        openGraph: {
          title: `${sharerName} shared: ${listing.title} — ${priceStr}`,
          description: descStr,
          type: "website",
          images: [
            {
              url: imageUrl,
              width: 1200,
              type: imageType,
            }
          ],
          url: `${baseUrl}/stewardshop/${id}?ref=${ref}`,
        },
      };
    }
  }

  // ── Default OG tags (no ref, or ref not found) ─────────────────────────────
  let priceStr = ogPriceFormatted ?? "Free";
  let descStr = cleanedDesc;

  if (hasDiscount) {
    priceStr = `${struckPrice} (${pct}% OFF) reveal the discounted price!`;
    descStr = `🔒 Special discount available! (${pct}% OFF) reveal the discounted price now! ${cleanedDesc}`;
  }

  const defaultTitle = `${listing.title} — ${priceStr} | HGF StewardShop`;

  return {
    title: defaultTitle,
    description: descStr,
    openGraph: {
      title: defaultTitle,
      description: descStr,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          type: imageType,
        }
      ],
      url: `${baseUrl}/stewardshop/${id}`,
    },
  };
}

export default async function ListingDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { ref } = await searchParams;

  const listing = await db.marketplaceListing.findUnique({
    where: { id: parseInt(id) },
    include: {
      seller: { select: { id: true, firstName: true, lastName: true, profilePicture: true, isVerified: true, phone: true } },
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!listing || (listing.status !== "active" && listing.status !== "sold")) notFound();

  // Authorization check for private listings
  const session = await auth();
  const isOwner = session?.user?.id ? parseInt(session.user.id) === listing.seller.id : false;
  const isModerator = ["admin", "moderator"].includes(session?.user?.role ?? "");

  if (listing.isPrivate && !isOwner && !isModerator) {
    notFound();
  }

  const isSold = listing.status === "sold";

  // ── View tracking and Geolocation (IP-based, 24h window for unique) ─────
  const hdrs = await headers();
  const clientIp = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim()
    || hdrs.get("x-real-ip")
    || "unknown";
  const ipHash = crypto.createHash("md5").update(clientIp).digest("hex").slice(0, 16);
  const userAgent = hdrs.get("user-agent") || null;

  let country = null;
  let region = null;
  let city = null;
  let ipAddress = null;

  if (clientIp !== "unknown" && clientIp !== "127.0.0.1" && clientIp !== "::1" && !clientIp.startsWith("192.168.") && !clientIp.startsWith("10.")) {
    ipAddress = clientIp;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.status === "success") {
          country = geoData.country || null;
          region = geoData.regionName || null;
          city = geoData.city || null;
        }
      }
    } catch (err) {
      console.error("Geo lookup failed in page:", err);
    }
  }

  // Check if this IP already viewed this listing in the last 24h
  const existingView = await db.marketplaceImpression.findFirst({
    where: {
      listingId: listing.id,
      event: "impression",
      ipHash,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  }).catch(() => null);

  // Always log impression event for real-time analytics logs
  db.marketplaceImpression.create({
    data: {
      listingId: listing.id,
      shareCode: ref ?? null,
      event: "impression",
      ipHash,
      ipAddress,
      country,
      region,
      city,
      userAgent,
    },
  }).catch(() => {});

  // Only increment listing viewCount for active listings if unique in 24h
  if (!isSold && !existingView) {
    db.marketplaceListing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});
  }

  // Check if current user is the seller (to hide share button for own listings)
  const isLoggedIn = !!session?.user;

  let currentUser = null;
  if (session?.user?.id) {
    const userMember = await db.member.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { firstName: true, lastName: true, email: true, phone: true }
    }).catch(() => null);
    if (userMember) {
      currentUser = {
        name: `${userMember.firstName ?? ""} ${userMember.lastName ?? ""}`.trim() || session.user.name || "",
        email: userMember.email ?? "",
        phone: userMember.phone ?? "",
      };
    }
  }

  // ── Self-referral guard: strip ref if sharer === current user ──────────────
  let effectiveRef = ref ?? null;
  if (effectiveRef && isLoggedIn && !isOwner) {
    const share = await db.listingShare.findFirst({
      where: { shareCode: effectiveRef, listingId: listing.id },
      select: { sharerId: true },
    }).catch(() => null);
    if (share && session?.user?.id && share.sharerId === parseInt(session.user.id)) {
      effectiveRef = null; // Self-referral — treat as direct browse
    }
  }
  // Owner always has no ref
  if (isOwner) effectiveRef = null;

  // Parse video url from raw description
  const videoMatch = listing.description?.match(/\[video:(https?:\/\/[^\]\s]+)\]/);
  const videoUrl = videoMatch ? videoMatch[1] : null;
  const descriptionCleaned = cleanDescription(listing.description);

  const discountPercent = listing.ogPrice && listing.discountedPrice
    ? Math.round(((Number(listing.ogPrice) - Number(listing.discountedPrice)) / Number(listing.ogPrice)) * 100)
    : 0;

  // Serialize — strip discountedPrice before sending to client (NEVER expose it here)
  const safeListingData = {
    id: listing.id,
    title: listing.title,
    description: descriptionCleaned || null,
    listingType: listing.listingType,
    category: listing.category,
    ogPrice: listing.ogPrice ? Number(listing.ogPrice) : null,
    // discountedPrice deliberately OMITTED — only returned after prospect submit (v1.1 §170)
    hasDiscount: !!(listing.discountedPrice && listing.ogPrice && Number(listing.discountedPrice) > 0 && Number(listing.discountedPrice) < Number(listing.ogPrice)),
    discountPercent,
    priceLabel: listing.priceLabel,
    conditionType: listing.conditionType,
    locationArea: listing.locationArea,
    loveGiftAmount: Number(listing.loveGiftAmount ?? 0),
    viewCount: listing.viewCount,
    createdAt: listing.createdAt.toISOString(),
    isPrivate: listing.isPrivate,
    moderationReason: listing.moderationReason,
    photos: listing.photos.map((p) => ({ photoPath: p.photoPath })),
    seller: {
      id: listing.seller.id,
      firstName: listing.seller.firstName,
      lastName: listing.seller.lastName,
      profilePicture: listing.seller.profilePicture,
      isVerified: listing.seller.isVerified,
      mobileNumber: listing.seller.phone,
    },
    isOwner,
    isLoggedIn,
    isSold,
    shareToken: effectiveRef,
    videoUrl,
    currentUser,
  };

  return (
    <>
      <ListingDetailClient listing={safeListingData} />
    </>
  );
}
