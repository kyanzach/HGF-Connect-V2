"use client";

import React, { useEffect, useState } from "react";

const PRIMARY = "#4EB1CB";
const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  sold: "#3b82f6",
  reserved: "#f59e0b",
  expired: "#ef4444",
  removed: "#64748b",
};

interface Listing {
  id: number;
  title: string;
  category: string | null;
  ogPrice: number | null;
  loveGiftAmount: number | null;
  status: string;
  isPrivate: boolean;
  moderationReason: string | null;
  createdAt: string;
  seller: {
    id: number;
    firstName: string;
    lastName: string;
    isVerified: boolean;
  };
}

interface SummaryStats {
  total: number;
  active: number;
  privateCount: number;
  verifiedSellers: number;
}

const PRESET_REASONS = [
  "Inappropriate or offensive image/content",
  "Misleading pricing or incorrect values",
  "Duplicate or spam listing",
  "Prohibited item, service, or medicine",
  "Incomplete description or details",
];

export default function StewardShopModerationPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<SummaryStats>({ total: 0, active: 0, privateCount: 0, verifiedSellers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'public' | 'private' | 'sold'
  
  // Modal states
  const [modalingListing, setModalingListing] = useState<Listing | null>(null);
  const [modalIsPrivate, setModalIsPrivate] = useState(false);
  const [modalReason, setModalReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stewardshop/listings");
      if (!res.ok) throw new Error("Failed to load listings");
      const data = await res.json();
      setListings(data.listings || []);
      setStats(data.stats || { total: 0, active: 0, privateCount: 0, verifiedSellers: 0 });
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Handle Visibility Moderation Submission
  async function submitModeration(e: React.FormEvent) {
    e.preventDefault();
    if (!modalingListing) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/stewardshop/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: modalingListing.id,
          isPrivate: modalIsPrivate,
          moderationReason: modalReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update listing visibility");

      // Update local state
      setListings((prev) =>
        prev.map((l) =>
          l.id === modalingListing.id
            ? { ...l, isPrivate: modalIsPrivate, moderationReason: modalReason.trim() }
            : l
        )
      );

      // Recalculate quick stats count locally
      const privateCount = listings.reduce((acc, curr) => {
        const check = curr.id === modalingListing.id ? modalIsPrivate : curr.isPrivate;
        return acc + (check ? 1 : 0);
      }, 0);
      setStats(prev => ({ ...prev, privateCount }));

      setModalingListing(null);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Direct toggle for Seller Verification
  async function toggleSellerVerification(sellerId: number, currentStatus: boolean) {
    try {
      const res = await fetch("/api/admin/stewardshop/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          isVerified: !currentStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update seller verification status");

      // Update state for all listings by this seller
      setListings((prev) =>
        prev.map((l) =>
          l.seller.id === sellerId
            ? { ...l, seller: { ...l.seller, isVerified: !currentStatus } }
            : l
        )
      );

      // Refresh stats to keep counts accurate
      fetchListings();
    } catch (err: any) {
      alert("Error updating seller: " + err.message);
    }
  }

  const openModerateModal = (listing: Listing) => {
    setModalingListing(listing);
    setModalIsPrivate(listing.isPrivate);
    setModalReason(listing.moderationReason || "");
  };

  // Filter listings list
  const filtered = listings.filter((l) => {
    // 1. Search matching
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      l.title.toLowerCase().includes(searchLower) ||
      `${l.seller.firstName} ${l.seller.lastName}`.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    // 2. Status matching
    if (statusFilter === "all") return true;
    if (statusFilter === "public") return !l.isPrivate;
    if (statusFilter === "private") return l.isPrivate;
    return l.status === statusFilter;
  });

  return (
    <div className="stewardshop-container" style={{ padding: "2rem 2.5rem" }}>
      <div className="stewardshop-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            🤝 StewardShop Moderation
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
            Set items to private, flag inappropriate listings, provide reasons, and verify HGF sellers.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", border: "1px solid #fee2e2" }}>
          ❌ Error: {error}
        </div>
      )}

      {/* Summary Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.25rem" }}>
        <StatCard label="Total Listings" value={stats.total} icon="📦" color={PRIMARY} />
        <StatCard label="Active Public" value={stats.active} icon="🔓" color="#10b981" />
        <StatCard label="Moderated Private" value={stats.privateCount} icon="🔒" color="#ef4444" />
        <StatCard label="Verified Sellers" value={stats.verifiedSellers} icon="🛡️" color="#8b5cf6" />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="stewardshop-filters" style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center", justifyItems: "center" }}>
        <input
          type="text"
          placeholder="Search listing title or seller name…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: "240px",
            padding: "0.625rem 1rem",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />

        {/* Filter Selection Tabs */}
        <div style={{ display: "flex", gap: "0.375rem", background: "#f1f5f9", padding: "0.25rem", borderRadius: "8px" }}>
          {[
            { key: "all", label: "All" },
            { key: "public", label: "Public" },
            { key: "private", label: "Private/Moderated" },
            { key: "sold", label: "Sold" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.775rem",
                fontWeight: 600,
                cursor: "pointer",
                background: statusFilter === tab.key ? "white" : "transparent",
                color: statusFilter === tab.key ? "#0f172a" : "#64748b",
                boxShadow: statusFilter === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                fontFamily: "inherit",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Loading listings…</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🤝</div>
          <h3 style={{ fontSize: "1.05rem", color: "#64748b", fontWeight: 700 }}>No listings match the filter</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Try modifying your search query or filters.</p>
        </div>
      )}

      {/* Main Listings Table */}
      {!loading && filtered.length > 0 && (
        <div className="stewardshop-desktop-table" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={thStyle}>Listing Details</th>
                <th style={thStyle}>Seller</th>
                <th style={thStyle}>Price & Gift</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Visibility</th>
                <th style={thStyle}>Seller Verification</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.875rem" }}>{l.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                      Category: {l.category || "General"} · Listed on {new Date(l.createdAt).toLocaleDateString()}
                    </div>
                    {l.isPrivate && l.moderationReason && (
                      <div style={{ fontSize: "0.75rem", color: "#ef4444", background: "#fef2f2", border: "1px solid #fee2e2", padding: "0.25rem 0.5rem", borderRadius: "4px", display: "inline-block", marginTop: "0.25rem" }}>
                        ⚠️ Reason: {l.moderationReason}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{l.seller.firstName} {l.seller.lastName}</div>
                    {l.seller.isVerified && (
                      <span style={{ display: "inline-block", fontSize: "0.625rem", color: "#8b5cf6", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "0.075rem 0.35rem", borderRadius: "4px", fontWeight: 700, marginTop: "0.15rem" }}>
                        🛡️ VERIFIED SELLER
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div>₱{Number(l.ogPrice ?? 0).toLocaleString()}</div>
                    {Number(l.loveGiftAmount) > 0 && (
                      <div style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.15rem" }}>
                        ❤️ ₱{Number(l.loveGiftAmount).toLocaleString()} Love Gift
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background: (STATUS_COLORS[l.status] ?? "#cbd5e1") + "20", color: STATUS_COLORS[l.status] ?? "#475569", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase" }}>
                      {l.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {l.isPrivate ? (
                      <span style={{ color: "#ef4444", background: "#fee2e2", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                        🔒 PRIVATE
                      </span>
                    ) : (
                      <span style={{ color: "#10b981", background: "#d1fae5", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>
                        🔓 PUBLIC
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleSellerVerification(l.seller.id, l.seller.isVerified)}
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: l.seller.isVerified ? "#fee2e2" : "#ecfeff",
                        color: l.seller.isVerified ? "#b91c1c" : "#0e7490",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {l.seller.isVerified ? "Remove Badge" : "Grant Verification"}
                    </button>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      onClick={() => openModerateModal(l)}
                      style={{
                        padding: "0.4rem 0.875rem",
                        borderRadius: "6px",
                        border: "none",
                        background: PRIMARY,
                        color: "white",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    >
                      Moderate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile view card listing */}
      {!loading && filtered.length > 0 && (
        <div className="stewardshop-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((l) => (
            <div key={l.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{l.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                    Category: {l.category || "General"} · Listed on {new Date(l.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ background: (STATUS_COLORS[l.status] ?? "#cbd5e1") + "20", color: STATUS_COLORS[l.status] ?? "#475569", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {l.status}
                </span>
              </div>

              {l.isPrivate && l.moderationReason && (
                <div style={{ fontSize: "0.75rem", color: "#ef4444", background: "#fef2f2", border: "1px solid #fee2e2", padding: "0.4rem 0.6rem", borderRadius: "6px", marginBottom: "0.75rem" }}>
                  ⚠️ Reason: {l.moderationReason}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.8rem", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "0.75rem 0", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 600 }}>Seller</div>
                  <div style={{ fontWeight: 600, color: "#374151", marginTop: "0.15rem" }}>{l.seller.firstName} {l.seller.lastName}</div>
                  {l.seller.isVerified && (
                    <span style={{ display: "inline-block", fontSize: "0.65rem", color: "#8b5cf6", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "0.05rem 0.35rem", borderRadius: "4px", fontWeight: 700, marginTop: "0.15rem" }}>
                      🛡️ VERIFIED
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 600 }}>Price & Gift</div>
                  <div style={{ fontWeight: 700, color: "#374151", marginTop: "0.15rem" }}>₱{Number(l.ogPrice ?? 0).toLocaleString()}</div>
                  {Number(l.loveGiftAmount) > 0 && (
                    <div style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 600, marginTop: "0.15rem" }}>
                      ❤️ ₱{Number(l.loveGiftAmount).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <div>
                  {l.isPrivate ? (
                    <span style={{ color: "#ef4444", background: "#fee2e2", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700 }}>
                      🔒 PRIVATE
                    </span>
                  ) : (
                    <span style={{ color: "#10b981", background: "#d1fae5", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700 }}>
                      🔓 PUBLIC
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => toggleSellerVerification(l.seller.id, l.seller.isVerified)}
                    style={{
                      padding: "0.375rem 0.625rem",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      background: l.seller.isVerified ? "#fee2e2" : "#ecfeff",
                      color: l.seller.isVerified ? "#b91c1c" : "#0e7490",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {l.seller.isVerified ? "Unverify" : "Verify"}
                  </button>
                  <button
                    onClick={() => openModerateModal(l)}
                    style={{
                      padding: "0.375rem 0.875rem",
                      borderRadius: "6px",
                      border: "none",
                      background: PRIMARY,
                      color: "white",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                  >
                    Moderate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .stewardshop-container {
            padding: 1rem !important;
          }
          .stewardshop-header {
            flex-direction: column;
            align-items: stretch !important;
            gap: 1rem;
          }
          .stewardshop-filters {
            flex-direction: column;
            align-items: stretch !important;
            gap: 1rem;
          }
          .stewardshop-filters input {
            width: 100% !important;
          }
          .stewardshop-filters div {
            width: 100%;
            overflow-x: auto;
          }
          .stewardshop-desktop-table {
            display: none !important;
          }
          .stewardshop-mobile-cards {
            display: flex !important;
          }
        }
      `}</style>

      {/* Moderation Dialog / Modal */}
      {modalingListing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => setModalingListing(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: PRIMARY, padding: "1.25rem 1.5rem", color: "white" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, margin: 0 }}>
                ⚖️ Moderate Listing Visibility
              </h3>
              <p style={{ fontSize: "0.775rem", opacity: 0.85, margin: "0.25rem 0 0" }}>
                {modalingListing.title}
              </p>
            </div>

            <form onSubmit={submitModeration} style={{ padding: "1.5rem" }}>
              {/* Privacy Toggle */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={modalLabelStyle}>Visibility Mode</label>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.375rem" }}>
                  <button
                    type="button"
                    onClick={() => setModalIsPrivate(false)}
                    style={{
                      flex: 1,
                      padding: "0.625rem",
                      borderRadius: "8px",
                      border: !modalIsPrivate ? `2px solid ${PRIMARY}` : "1.5px solid #cbd5e1",
                      background: !modalIsPrivate ? "#ecfeff" : "white",
                      color: !modalIsPrivate ? "#0e7490" : "#64748b",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontFamily: "inherit",
                    }}
                  >
                    🔓 Public Listing
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalIsPrivate(true)}
                    style={{
                      flex: 1,
                      padding: "0.625rem",
                      borderRadius: "8px",
                      border: modalIsPrivate ? "2px solid #ef4444" : "1.5px solid #cbd5e1",
                      background: modalIsPrivate ? "#fef2f2" : "white",
                      color: modalIsPrivate ? "#b91c1c" : "#64748b",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontFamily: "inherit",
                    }}
                  >
                    🔒 Private (Owner Only)
                  </button>
                </div>
              </div>

              {/* Moderation Explanation */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={modalLabelStyle}>Explanation / Reason</label>
                <textarea
                  placeholder="Explain why this listing is being flagged or set to private…"
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  required={modalIsPrivate}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    outline: "none",
                    marginTop: "0.375rem",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Floating Preset Tags */}
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ ...modalLabelStyle, marginBottom: "0.5rem", display: "block" }}>Suggested Reasons (Click to insert)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                  {PRESET_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setModalReason(r)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        borderRadius: "999px",
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        fontSize: "0.675rem",
                        color: "#475569",
                        cursor: "pointer",
                        fontWeight: 500,
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#e2e8f0";
                        e.currentTarget.style.color = "#0f172a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.color = "#475569";
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setModalingListing(null)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    color: "#64748b",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    background: modalIsPrivate ? "#ef4444" : "#10b981",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: "inherit",
                  }}
                >
                  {submitting ? "Saving changes…" : "Save Moderation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.875rem 1rem",
  fontWeight: 700,
  color: "#64748b",
  fontSize: "0.725rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "1rem",
  verticalAlign: "middle",
  color: "#374151",
};

const modalLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.725rem", color: "#64748b", marginTop: "0.25rem", fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}
