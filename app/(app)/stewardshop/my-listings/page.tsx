"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", sold: "#6366f1", expired: "#f59e0b", removed: "#94a3b8", reserved: "#f59e0b",
};

// ── Rotating Bible verses (honesty for sellers) ──────────────────────────────
const SELLER_QUOTES = [
  { text: "Whoever walks in integrity walks securely.", ref: "Proverbs 10:9" },
  { text: "The Lord detests dishonest scales, but accurate weights find favor with Him.", ref: "Proverbs 11:1" },
  { text: "Better a little with righteousness than much gain with injustice.", ref: "Proverbs 16:8" },
  { text: "A good name is more desirable than great riches.", ref: "Proverbs 22:1" },
  { text: "Do to others as you would have them do to you.", ref: "Luke 6:31" },
  { text: "Let your 'Yes' be 'Yes,' and your 'No,' 'No.'", ref: "Matthew 5:37" },
];

interface Listing {
  id: number; title: string; listingType: string; category: string | null;
  ogPrice: number | null; price: number | null; priceLabel: string | null;
  loveGiftAmount: number; status: string; viewCount: number;
  createdAt: string; photo: string | null;
  prospectCount: number; shareCount: number;
  // Sold-state fields:
  buyerName?: string | null; sharerName?: string | null;
  loveGiftCredited?: boolean; claimStatus?: string | null;
}

interface Prospect {
  id: number; prospectName: string; actionType: string; status: string;
  shareToken: string | null; sharerName: string | null;
}

// ── Rotating Quote Banner ────────────────────────────────────────────────────
function QuoteBanner() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SELLER_QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  const q = SELLER_QUOTES[idx];
  return (
    <div style={{ background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "0.625rem 1rem", margin: "0 0 1rem", textAlign: "center", transition: "opacity 0.5s ease" }}>
      <p style={{ fontSize: "0.78rem", fontStyle: "italic", color: "#166534", margin: 0, lineHeight: 1.5 }}>
        ✝️ &ldquo;{q.text}&rdquo;
      </p>
      <p style={{ fontSize: "0.65rem", color: "#15803d", margin: "0.25rem 0 0", fontWeight: 600 }}>
        — {q.ref}
      </p>
    </div>
  );
}

// ── Mark Sold Modal ──────────────────────────────────────────────────────────
function MarkSoldModal({ listingId, listingTitle, onClose, onDone }: {
  listingId: number; listingTitle: string;
  onClose: () => void;
  onDone: (status: string, msg: string) => void;
}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | "outside">("outside");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}/prospects`)
      .then((r) => r.json())
      .then((d) => {
        const p = (d.prospects ?? []) as Prospect[];
        setProspects(p);
        if (p.length > 0) setSelected(p[0].id);
        else setSelected("outside");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const body = selected === "outside"
        ? { soldOutside: true }
        : { prospectId: selected };
      const res = await fetch(`/api/marketplace/listings/${listingId}/mark-sold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        onDone("sold", data.message ?? "Sale confirmed!");
      } else {
        alert(data.error ?? "Something went wrong");
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "white", borderTopLeftRadius: "20px", borderTopRightRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "80vh", overflow: "auto", padding: "1.25rem", animation: "slideUp 0.25s ease" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 800 }}>🎉 Congratulations!</h2>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>Mark &ldquo;{listingTitle}&rdquo; as sold</p>

        <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0.875rem 0" }} />

        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", margin: "0 0 0.625rem" }}>Who bought this item?</p>

        {loading && <p style={{ textAlign: "center", color: "#94a3b8", padding: "1rem" }}>Loading prospects…</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {prospects.map((p) => (
            <label key={p.id} onClick={() => setSelected(p.id)} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", padding: "0.625rem", borderRadius: "10px", border: selected === p.id ? "2px solid #6366f1" : "1.5px solid #e2e8f0", background: selected === p.id ? "#eef2ff" : "white", cursor: "pointer", transition: "all 0.15s" }}>
              <input type="radio" checked={selected === p.id} readOnly style={{ marginTop: "0.15rem", accentColor: "#6366f1" }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: 0, color: "#1e293b" }}>{p.prospectName}</p>
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0.15rem 0 0" }}>
                  {p.actionType === "reveal" ? "🔓 Revealed discount" : "💬 Contacted seller"}
                </p>
                {p.sharerName ? (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "6px", padding: "0.15rem 0.5rem", marginTop: "0.25rem" }}>
                    <span style={{ fontSize: "0.68rem", color: "#9f1239" }}>❤️ via <strong>{p.sharerName}</strong></span>
                    {p.shareToken && <span style={{ fontSize: "0.65rem", color: "#be123c", fontFamily: "monospace", fontWeight: 700 }}>({p.shareToken})</span>}
                  </div>
                ) : (
                  <span style={{ display: "inline-block", fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.25rem" }}>No referral</span>
                )}
              </div>
            </label>
          ))}

          {/* Sold outside option */}
          <label onClick={() => setSelected("outside")} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", padding: "0.625rem", borderRadius: "10px", border: selected === "outside" ? "2px solid #6366f1" : "1.5px solid #e2e8f0", background: selected === "outside" ? "#eef2ff" : "white", cursor: "pointer", transition: "all 0.15s" }}>
            <input type="radio" checked={selected === "outside"} readOnly style={{ marginTop: "0.15rem", accentColor: "#6366f1" }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: 0, color: "#1e293b" }}>Sold outside StewardShop</p>
              <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0.15rem 0 0" }}>No referral — sold via Viber, in person, etc.</p>
            </div>
          </label>
        </div>

        <button
          onClick={handleConfirm}
          disabled={submitting}
          style={{ display: "block", width: "100%", marginTop: "1rem", padding: "0.75rem", background: submitting ? "#94a3b8" : "#6366f1", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit" }}
        >
          {submitting ? "Confirming…" : "✅ Confirm Sale"}
        </button>
        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: "0.5rem", padding: "0.5rem", background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MyListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  const [markSoldId, setMarkSoldId] = useState<number | null>(null);
  const [flashMsg, setFlashMsg] = useState("");

  useEffect(() => {
    fetch("/api/marketplace/listings/mine")
      .then((r) => r.json())
      .then((d) => setListings(d.listings ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(listingId: number, action: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setActing(listingId);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok || data.status) {
        setListings((prev) => prev.map((l) => l.id === listingId ? { ...l, status: data.status || l.status } : l));
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) { 
      console.error(err);
      alert("Network error — please try again");
    } finally { setActing(null); }
  }

  function handleMarkSoldDone(status: string, msg: string) {
    if (markSoldId) {
      setListings((prev) => prev.map((l) => l.id === markSoldId ? { ...l, status } : l));
    }
    setMarkSoldId(null);
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 5000);
  }

  const markSoldListing = markSoldId ? listings.find((l) => l.id === markSoldId) : null;

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📦 My Listings</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.85 }}>Manage your stewardshop listings and view prospects</p>
      </div>

      <div style={{ padding: "1rem" }}>
        {/* Bible verse quote */}
        <QuoteBanner />

        {/* Flash message */}
        {flashMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
            ✅ {flashMsg}
          </div>
        )}

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
            const isSold = listing.status === "sold";
            return (
              <div key={listing.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", opacity: isSold ? 0.7 : 1, transition: "opacity 0.3s" }}>
                <div style={{ display: "flex", gap: "0.875rem", padding: "0.875rem" }}>
                  {/* Thumbnail */}
                  <div style={{ width: 64, height: 64, borderRadius: "10px", background: "#f1f5f9", flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                    {listing.photo ? (
                      <img src={`/uploads/marketplace/${listing.photo}`} alt={listing.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: isSold ? "grayscale(100%)" : "none" }} />
                    ) : "📦"}
                    {isSold && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.1em" }}>SOLD</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <p style={{ fontWeight: 700, fontSize: "0.875rem", color: isSold ? "#94a3b8" : "#1e293b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.title}</p>
                      <span style={{ background: STATUS_COLORS[listing.status] + "20", color: STATUS_COLORS[listing.status], fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", flexShrink: 0 }}>
                        {listing.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: isSold ? "#94a3b8" : PRIMARY, margin: "0.25rem 0", textDecoration: isSold ? "line-through" : "none" }}>
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
                    {listing.status === "active" && (
                      <Link href={`/stewardshop/my-listings/${listing.id}/edit`} style={{ flex: 1, textAlign: "center", padding: "0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b", textDecoration: "none", borderLeft: "1px solid #f1f5f9" }}>
                        ✏️ Edit
                      </Link>
                    )}
                  </div>
                  {/* Status actions */}
                  <div style={{ borderTop: "1px solid #f1f5f9", display: "flex", gap: "0.5rem", padding: "0.5rem 0.875rem", background: "#f8fafc" }}>
                    {listing.status === "active" && (
                      <button
                        onClick={() => setMarkSoldId(listing.id)}
                        style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6366f1", background: "#ede9fe", border: "none", borderRadius: "6px", padding: "0.25rem 0.625rem", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        ✅ Mark Sold
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

      {/* Mark Sold Modal */}
      {markSoldListing && (
        <MarkSoldModal
          listingId={markSoldListing.id}
          listingTitle={markSoldListing.title}
          onClose={() => setMarkSoldId(null)}
          onDone={handleMarkSoldDone}
        />
      )}
    </div>
  );
}
