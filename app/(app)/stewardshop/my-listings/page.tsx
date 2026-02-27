"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

const TYPE_LABELS: Record<string, string> = {
  sale: "For Sale", trade: "Trade", free: "Free",
  service: "Service", rent: "Rent", official_store: "HGF Store",
};
const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", sold: "#6366f1", expired: "#f59e0b", removed: "#94a3b8", reserved: "#f59e0b",
};

interface Listing {
  id: number; title: string; listingType: string; category: string | null;
  ogPrice: number | null; price: number | null; priceLabel: string | null;
  loveGiftAmount: number; status: string; viewCount: number;
  createdAt: string; photo: string | null;
  prospectCount: number; shareCount: number;
}

export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stewardshop/listings/mine")
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(listingId: number, action: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setActing(listingId);
    try {
      const res = await fetch(`/api/stewardshop/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok || data.status) {
        setListings((prev) => prev.map((l) => l.id === listingId ? { ...l, status: data.status } : l));
      }
    } catch { /* silent fail */ } finally { setActing(null); }
  }

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📦 My Listings</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.85 }}>Manage your marketplace listings and view prospects</p>
      </div>

      <div style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <Link href="/stewardshop/sell" style={{ background: PRIMARY, color: "white", borderRadius: "999px", padding: "0.5rem 1.25rem", textDecoration: "none", fontSize: "0.875rem", fontWeight: 700 }}>
            + New Listing
          </Link>
        </div>

        {loading && <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>Loading…</p>}

        {!loading && listings.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
            <p style={{ fontWeight: 600, color: "#64748b" }}>No listings yet</p>
            <Link href="/stewardshop/sell" style={{ display: "inline-block", marginTop: "0.75rem", background: PRIMARY, color: "white", borderRadius: "999px", padding: "0.625rem 1.5rem", textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}>
              Post Your First Listing
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {listings.map((listing) => {
            const displayPrice = listing.ogPrice ?? listing.price;
            return (
              <div key={listing.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", gap: "0.875rem", padding: "0.875rem" }}>
                  {/* Thumbnail */}
                  <div style={{ width: 64, height: 64, borderRadius: "10px", background: "#f1f5f9", flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                    {listing.photo ? (
                      <img src={`/uploads/stewardshop/${listing.photo}`} alt={listing.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : "📦"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</p>
                      <span style={{ background: STATUS_COLORS[listing.status] + "20", color: STATUS_COLORS[listing.status], fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", flexShrink: 0 }}>
                        {listing.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: PRIMARY, margin: "0.25rem 0" }}>
                      {displayPrice ? `₱${displayPrice.toLocaleString()}` : listing.priceLabel ?? "Free"}
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                      <span>👁 {listing.viewCount}</span>
                      <span>📋 {listing.prospectCount} prospects</span>
                      <span>🔗 {listing.shareCount} shares</span>
                      {listing.loveGiftAmount > 0 && <span>❤️ ₱{listing.loveGiftAmount.toLocaleString()}</span>}
                    </div>
                  </div>
                </div>

                {/* Action row */}
                <div style={{ borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex" }}>
                    <Link href={`/stewardshop/${listing.id}`} style={{ flex: 1, textAlign: "center", padding: "0.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textDecoration: "none" }}>
                      View
                    </Link>
                    <Link href={`/stewardshop/my-listings/${listing.id}/prospects`} style={{ flex: 1, textAlign: "center", padding: "0.5rem", fontSize: "0.75rem", fontWeight: 700, color: PRIMARY, textDecoration: "none", borderLeft: "1px solid #f1f5f9" }}>
                      Prospects {listing.prospectCount > 0 && `(${listing.prospectCount})`}
                    </Link>
                    <Link href={`/stewardshop/my-listings/${listing.id}/edit`} style={{ flex: 1, textAlign: "center", padding: "0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b", textDecoration: "none", borderLeft: "1px solid #f1f5f9" }}>
                      ✏️ Edit
                    </Link>
                  </div>
                  {/* Status actions */}
                  <div style={{ borderTop: "1px solid #f1f5f9", display: "flex", gap: "0.5rem", padding: "0.5rem 0.875rem", background: "#f8fafc" }}>
                    {listing.status === "active" && (
                      <button
                        onClick={() => handleAction(listing.id, "mark_sold", "Mark this listing as sold?")}
                        disabled={acting === listing.id}
                        style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6366f1", background: "#ede9fe", border: "none", borderRadius: "6px", padding: "0.25rem 0.625rem", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {acting === listing.id ? "…" : "✅ Mark Sold"}
                      </button>
                    )}
                    {(listing.status === "sold" || listing.status === "removed" || listing.status === "expired") && (
                      <button
                        onClick={() => handleAction(listing.id, "reactivate", "Reactivate this listing?")}
                        disabled={acting === listing.id}
                        style={{ fontSize: "0.7rem", fontWeight: 700, color: "#10b981", background: "#d1fae5", border: "none", borderRadius: "6px", padding: "0.25rem 0.625rem", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {acting === listing.id ? "…" : "♻️ Reactivate"}
                      </button>
                    )}
                    {listing.status !== "removed" && (
                      <button
                        onClick={() => handleAction(listing.id, "delete", "Remove this listing? It won't be visible to buyers.")}
                        disabled={acting === listing.id}
                        style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ef4444", background: "#fee2e2", border: "none", borderRadius: "6px", padding: "0.25rem 0.625rem", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {acting === listing.id ? "…" : "🗑️ Remove"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
