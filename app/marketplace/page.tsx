import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";

export const metadata: Metadata = {
  title: "Marketplace | HGF Connect",
  description: "Buy, sell, and trade with fellow HGF church members in a safe, trusted community marketplace.",
  openGraph: {
    title: "HGF Connect — Marketplace",
    description: "Support your church family. Buy, sell, donate and share with HGF members.",
    type: "website",
  },
};

const PRIMARY = "#4EB1CB";

const CATEGORY_ICONS: Record<string, string> = {
  Electronics: "📱", Clothing: "👗", Furniture: "🛋️", Books: "📚",
  Food: "🍱", Services: "🛠️", Vehicles: "🚗", "Home & Garden": "🌿",
  Toys: "🧸", Pets: "🐾", Other: "📦",
};

const TYPE_LABELS: Record<string, string> = {
  sale: "For Sale", trade: "Trade", free: "Free", service: "Service",
  borrow: "Borrow", official_store: "Official Store",
};
const TYPE_COLORS: Record<string, string> = {
  sale: "#10b981", trade: "#3b82f6", free: "#f59e0b", service: "#8b5cf6",
  borrow: "#f97316", official_store: "#ec4899",
};

export default async function MarketplaceSSRPage() {
  // Check session server-side so we can show auth-aware CTAs
  const session = await auth();
  const isLoggedIn = !!session?.user;

  const rawListings = await db.marketplaceListing.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      seller: { select: { firstName: true, lastName: true } },
      photos: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });
  const listings = rawListings as any[];

  return (
    <>
      <PublicNav />

      <div style={{ background: PRIMARY, padding: "2rem 1rem 1.5rem", textAlign: "center", color: "white" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.375rem" }}>🛍️ Marketplace</h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.85, margin: "0 0 1rem" }}>
          Buy, sell &amp; trade with your church family
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          {/* Auth-aware: logged in goes to /marketplace/sell, guest goes to /login */}
          <Link
            href={isLoggedIn ? "/marketplace/sell" : "/login"}
            style={{
              display: "inline-block",
              background: "white",
              color: PRIMARY,
              padding: "0.5rem 1.5rem",
              borderRadius: "999px",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            + Post a Listing
          </Link>
          <Link
            href="/marketplace/love-gifts"
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 1.25rem",
              borderRadius: "999px",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.875rem",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            ❤️ Love Gifts
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "1rem" }}>
        {listings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "4rem", marginBottom: "0.75rem" }}>🛍️</div>
            <h2 style={{ fontSize: "1.125rem", color: "#64748b", fontWeight: 700 }}>No listings yet</h2>
            <p style={{ fontSize: "0.9rem" }}>Be the first to post something!</p>
            {/* Only show login prompt if guest — logged-in users already see the button above */}
            {isLoggedIn ? (
              <Link
                href="/marketplace/sell"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  background: PRIMARY,
                  color: "white",
                  padding: "0.75rem 2rem",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                + Post a Listing
              </Link>
            ) : (
              <Link
                href="/login"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  background: PRIMARY,
                  color: "white",
                  padding: "0.75rem 2rem",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Login to Post
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "white",
                    borderRadius: "14px",
                    overflow: "hidden",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.09)",
                  }}
                >
                  {/* Photo or placeholder */}
                  <div
                    style={{
                      width: "100%",
                      height: 130,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2.5rem",
                      position: "relative",
                    }}
                  >
                    {listing.photos[0] ? (
                      <Image
                        src={`/uploads/marketplace/${listing.photos[0].photoPath}`}
                        alt={listing.title}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      CATEGORY_ICONS[listing.category ?? ""] ?? "📦"
                    )}
                    {/* Type badge */}
                    <span
                      style={{
                        position: "absolute",
                        top: "0.375rem",
                        left: "0.375rem",
                        background: TYPE_COLORS[listing.listingType] ?? PRIMARY,
                        color: "white",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      {TYPE_LABELS[listing.listingType] ?? listing.listingType}
                    </span>
                    {/* Love Gift badge */}
                    {Number(listing.loveGiftAmount) > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "0.375rem",
                          right: "0.375rem",
                          background: "#ef4444",
                          color: "white",
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                        }}
                      >
                        ❤️ ₱{Number(listing.loveGiftAmount).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: "0.625rem" }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        color: "#1e293b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {listing.title}
                    </div>
                    {/* Show OG price with "from" indicator — discounted price is gated */}
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: PRIMARY }}>
                      {listing.ogPrice
                        ? `₱${Number(listing.ogPrice).toLocaleString()}`
                        : listing.price
                          ? `₱${Number(listing.price).toLocaleString()}`
                          : listing.priceLabel ?? "Free"}
                    </div>
                    {listing.locationArea && (
                      <div style={{ fontSize: "0.675rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                        📍 {listing.locationArea}
                      </div>
                    )}
                    <div style={{ fontSize: "0.675rem", color: "#94a3b8", marginTop: "0.125rem" }}>
                      {listing.seller.firstName} {listing.seller.lastName}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
