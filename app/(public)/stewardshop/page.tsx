import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import Link from "next/link";
import MarketplaceFilters from "@/components/marketplace/MarketplaceFilters";

export const metadata: Metadata = {
  title: "StewardShop | HGF Connect",
  description: "Trade well. Give well. Serve well. — A trusted community shop for HGF members.",
  openGraph: {
    title: "HGF Connect — StewardShop",
    description: "Trade well. Give well. Serve well.",
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
  rent: "Rent", official_store: "Official Store",
};
const TYPE_COLORS: Record<string, string> = {
  sale: "#10b981", trade: "#3b82f6", free: "#f59e0b", service: "#8b5cf6",
  rent: "#f97316", official_store: "#ec4899",
};

const PAGE_SIZE = 24;

export default async function MarketplaceSSRPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; page?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const listingType = sp.type || "";
  const q = sp.q?.trim() || "";
  const minPrice = sp.minPrice ? parseFloat(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? parseFloat(sp.maxPrice) : undefined;

  // Build the where clause
  const where: any = { status: "active" };
  if (listingType) where.listingType = listingType;

  // Search: title, description, category, area
  const conditions: any[] = [];
  if (q) {
    conditions.push({ OR: [
      { title: { contains: q } },
      { description: { contains: q } },
      { category: { contains: q } },
      { locationArea: { contains: q } },
    ]});
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: any = {};
    if (minPrice !== undefined) priceFilter.gte = minPrice;
    if (maxPrice !== undefined) priceFilter.lte = maxPrice;
    conditions.push({ ogPrice: priceFilter });
  }
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const [rawListings, total] = await Promise.all([
    db.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        seller: { select: { firstName: true, lastName: true } },
        photos: { take: 1, orderBy: { sortOrder: "asc" } },
      },
    }),
    db.marketplaceListing.count({ where }),
  ]);
  const listings = rawListings as any[];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Active filter summary for UI
  const hasFilters = !!(listingType || q || minPrice || maxPrice);

  return (
    <>

      <div style={{ background: PRIMARY, padding: "2rem 1rem 1.5rem", textAlign: "center", color: "white" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.375rem" }}>🤝 StewardShop</h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.85, margin: "0 0 1rem" }}>
          Trade well. Give well. Serve well.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href={isLoggedIn ? "/stewardshop/sell" : "/login"}
            style={{ display: "inline-block", background: "white", color: PRIMARY, padding: "0.5rem 1.5rem", borderRadius: "999px", fontWeight: 700, textDecoration: "none", fontSize: "0.875rem" }}
          >
            + Post a Listing
          </Link>
          <Link
            href="/stewardshop/love-gifts"
            style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", color: "white", padding: "0.5rem 1.25rem", borderRadius: "999px", fontWeight: 600, textDecoration: "none", fontSize: "0.875rem", border: "1px solid rgba(255,255,255,0.35)" }}
          >
            ❤️ Love Gifts
          </Link>
        </div>
      </div>

      {/* Search + filter (client component) */}
      <MarketplaceFilters
        q={q}
        listingType={listingType}
        minPrice={sp.minPrice ?? ""}
        maxPrice={sp.maxPrice ?? ""}
      />

      <div style={{ width: "100%", boxSizing: "border-box", padding: "0 0.75rem 1.5rem" }}>
        {hasFilters && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {total} {total === 1 ? "result" : "results"}
              {q && <> for &ldquo;<strong>{q}</strong>&rdquo;</>}
            </span>
            <Link href="/stewardshop" style={{ fontSize: "0.75rem", color: "#ef4444", textDecoration: "none", fontWeight: 600 }}>
              ✕ Clear filters
            </Link>
          </div>
        )}

        {listings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "4rem", marginBottom: "0.75rem" }}>🤝</div>
            <h2 style={{ fontSize: "1.125rem", color: "#64748b", fontWeight: 700 }}>
              {hasFilters ? "No listings found" : "No listings yet"}
            </h2>
            <p style={{ fontSize: "0.9rem" }}>
              {hasFilters ? "Try adjusting your filters." : "Be the first to post something!"}
            </p>
            {hasFilters ? (
              <Link href="/stewardshop" style={{ display: "inline-block", marginTop: "1rem", background: PRIMARY, color: "white", padding: "0.75rem 2rem", borderRadius: "999px", textDecoration: "none", fontWeight: 700 }}>
                Clear Filters
              </Link>
            ) : isLoggedIn ? (
              <Link href="/stewardshop/sell" style={{ display: "inline-block", marginTop: "1rem", background: PRIMARY, color: "white", padding: "0.75rem 2rem", borderRadius: "999px", textDecoration: "none", fontWeight: 700 }}>
                + Post a Listing
              </Link>
            ) : (
              <Link href="/login" style={{ display: "inline-block", marginTop: "1rem", background: PRIMARY, color: "white", padding: "0.75rem 2rem", borderRadius: "999px", textDecoration: "none", fontWeight: 700 }}>
                Login to Post
              </Link>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "0.625rem", width: "100%" }}>
              {listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/stewardshop/${listing.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.09)", minWidth: 0, width: "100%" }}>
                    {/* Photo or placeholder */}
                    <div style={{ width: "100%", height: 130, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", position: "relative" }}>
                      {listing.photos[0] ? (
                        <img
                          src={`/uploads/marketplace/${listing.photos[0].photoPath}`}
                          alt={listing.title}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        CATEGORY_ICONS[listing.category ?? ""] ?? "📦"
                      )}
                      {/* Type badge */}
                      <span style={{ position: "absolute", top: "0.375rem", left: "0.375rem", background: TYPE_COLORS[listing.listingType] ?? PRIMARY, color: "white", fontSize: "0.625rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: "4px", textTransform: "uppercase" }}>
                        {TYPE_LABELS[listing.listingType] ?? listing.listingType}
                      </span>
                      {/* Love Gift badge — members only, bottom-right */}
                      {isLoggedIn && Number(listing.loveGiftAmount) > 0 && (
                        <span style={{ position: "absolute", bottom: "0.375rem", right: "0.375rem", background: "#ef4444", color: "white", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                          ❤️ ₱{Number(listing.loveGiftAmount).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: "0.625rem" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.25rem" }}>
                        {listing.title}
                      </div>
                      {/* Price — always original only, no discount on grid */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "nowrap", overflow: "hidden", minWidth: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", color: PRIMARY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {listing.ogPrice
                            ? `₱${Number(listing.ogPrice).toLocaleString()}`
                            : listing.price
                              ? `₱${Number(listing.price).toLocaleString()}`
                              : listing.priceLabel ?? "Free"}
                        </span>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
                {page > 1 && (
                  <Link
                    href={`/stewardshop?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${listingType ? `&type=${listingType}` : ""}`}
                    style={{ padding: "0.5rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "999px", textDecoration: "none", color: "#64748b", fontWeight: 600, fontSize: "0.875rem" }}
                  >
                    ← Prev
                  </Link>
                )}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page - 2 + i;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <Link
                      key={p}
                      href={`/stewardshop?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${listingType ? `&type=${listingType}` : ""}`}
                      style={{ padding: "0.5rem 0.875rem", border: `1.5px solid ${p === page ? PRIMARY : "#e2e8f0"}`, borderRadius: "999px", textDecoration: "none", color: p === page ? "white" : "#64748b", background: p === page ? PRIMARY : "transparent", fontWeight: 600, fontSize: "0.875rem" }}
                    >
                      {p}
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link
                    href={`/stewardshop?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${listingType ? `&type=${listingType}` : ""}`}
                    style={{ padding: "0.5rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "999px", textDecoration: "none", color: "#64748b", fontWeight: 600, fontSize: "0.875rem" }}
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
