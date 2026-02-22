import { db } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/layout/PublicNav";
import { notFound } from "next/navigation";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await db.marketplaceListing.findUnique({
    where: { id: parseInt(id) },
    select: { title: true, description: true, photos: { take: 1, select: { photoPath: true } } },
  });
  if (!listing) return { title: "Listing Not Found" };
  return {
    title: `${listing.title} | HGF Marketplace`,
    description: listing.description?.slice(0, 160) ?? `Listed on HGF Connect Marketplace`,
    openGraph: {
      title: listing.title,
      description: listing.description?.slice(0, 160) ?? "",
      type: "website",
      images: listing.photos[0] ? [`/uploads/marketplace/${listing.photos[0].photoPath}`] : [],
    },
  };
}

const PRIMARY = "#4EB1CB";
const TYPE_LABELS: Record<string, string> = { sell: "For Sale", buy: "Wanted", service: "Service", donate: "Free / Donate", rent: "For Rent" };
const CONDITION_LABELS: Record<string, string> = { new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", poor: "For Parts" };

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
  db.marketplaceListing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const sellerInitials = `${listing.seller.firstName[0]}${listing.seller.lastName?.[0] ?? ""}`;
  const loveGift = Number(listing.loveGiftAmount ?? 0);
  const price = Number(listing.price ?? 0);
  const loveGiftAmt = (price * loveGift) / 100;

  return (
    <>
      <PublicNav />

      <div style={{ maxWidth: "600px", margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>
        {/* Back */}
        <div style={{ padding: "0.75rem 1rem", background: "white", borderBottom: "1px solid #f1f5f9" }}>
          <Link href="/marketplace" style={{ color: PRIMARY, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
            ← Marketplace
          </Link>
        </div>

        {/* Photos */}
        <div style={{ background: "#f1f5f9", width: "100%", height: 260, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
          {listing.photos[0] ? (
            <Image
              src={`/uploads/marketplace/${listing.photos[0].photoPath}`}
              alt={listing.title}
              fill
              style={{ objectFit: "cover" }}
            />
          ) : "📦"}
        </div>

        <div style={{ padding: "1rem" }}>
          {/* Title + price */}
          <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.25rem" }}>{listing.title}</h1>
              <span
                style={{
                  background: "#f0fdf4",
                  color: "#16a34a",
                  border: "1px solid #86efac",
                  borderRadius: "6px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.15rem 0.5rem",
                  whiteSpace: "nowrap",
                }}
              >
                {TYPE_LABELS[listing.listingType]}
              </span>
            </div>

            <div style={{ fontSize: "1.625rem", fontWeight: 900, color: PRIMARY, marginBottom: "0.5rem" }}>
              {listing.price ? `₱${Number(listing.price).toLocaleString()}` : listing.priceLabel ?? "Free"}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {listing.conditionType && (
                <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: "0.72rem", padding: "0.2rem 0.625rem", borderRadius: "999px", fontWeight: 600 }}>
                  {CONDITION_LABELS[listing.conditionType]}
                </span>
              )}
              {listing.category && (
                <span style={{ background: "#f5f3ff", color: "#7c3aed", fontSize: "0.72rem", padding: "0.2rem 0.625rem", borderRadius: "999px", fontWeight: 600 }}>
                  {listing.category}
                </span>
              )}
              {listing.locationArea && (
                <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>📍 {listing.locationArea}</span>
              )}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>About this item</h3>
              <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{listing.description}</p>
            </div>
          )}

          {/* Love Gift */}
          {loveGift > 0 && (
            <div style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", border: "1px solid #fecdd3" }}>
              <h3 style={{ fontSize: "0.875rem", fontWeight: 800, color: "#be123c", margin: "0 0 0.375rem" }}>❤️ Love Gift Opportunity</h3>
              <p style={{ fontSize: "0.8rem", color: "#9f1239", margin: 0, lineHeight: 1.6 }}>
                Share this listing! If the buyer mentions you, you&apos;ll earn{" "}
                <strong>₱{loveGiftAmt.toLocaleString()} ({loveGift}%)</strong> as a love gift when sold. 🎁
              </p>
              <Link
                href={`/marketplace/${listing.id}?share=1`}
                style={{
                  display: "inline-block",
                  marginTop: "0.75rem",
                  background: "#ef4444",
                  color: "white",
                  padding: "0.45rem 1.25rem",
                  borderRadius: "999px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Share & Earn
              </Link>
            </div>
          )}

          {/* Seller */}
          <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "0.875rem" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: PRIMARY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 800,
                fontSize: "1rem",
                flexShrink: 0,
              }}
            >
              {sellerInitials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                {listing.seller.firstName} {listing.seller.lastName}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>HGF Member · {listing.viewCount} views</div>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/login?redirect=/marketplace/${listing.id}`}
            style={{
              display: "block",
              width: "100%",
              background: PRIMARY,
              color: "white",
              textAlign: "center",
              padding: "0.875rem",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "1rem",
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            💬 Message Seller
          </Link>
        </div>
      </div>
    </>
  );
}
