"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#4EB1CB";

const STATUS_OPTIONS = ["pending", "contacted", "converted", "rejected"] as const;
const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", contacted: "#3b82f6", converted: "#10b981", rejected: "#94a3b8", revealed: "#8b5cf6",
};

interface Prospect {
  id: number; prospectName: string; prospectMobile: string | null; prospectEmail: string | null;
  actionType: string; status: string; consented: boolean;
  shareToken: string | null; sharerName: string | null; sharerUserId: number | null; createdAt: string;
}

interface ListingInfo { title: string; loveGiftAmount: number; status: string; }

interface Claim {
  id: number; sharerId: number; sharerName: string;
  amount: number; method: string; status: string;
  gcashName: string | null; gcashMobile: string | null;
  createdAt: string; paidAt: string | null;
}

export default function ProspectsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [listing, setListing] = useState<ListingInfo | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [paying, setPaying] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? prospects.filter((p) =>
        p.prospectName.toLowerCase().includes(search.toLowerCase()) ||
        (p.shareToken?.toLowerCase().includes(search.toLowerCase())) ||
        (p.sharerName?.toLowerCase().includes(search.toLowerCase()))
      )
    : prospects;

  useEffect(() => {
    fetch(`/api/marketplace/listings/${id}/prospects`)
      .then((r) => r.json())
      .then((d) => {
        setListing(d.listing ?? null);
        setProspects(d.prospects ?? []);
        setClaims(d.claims ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function updateStatus(prospectId: number, status: string) {
    try {
      const res = await fetch(`/api/marketplace/listings/${id}/prospects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setProspects((prev) => prev.map((p) => p.id === prospectId ? { ...p, status } : p));
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  }

  async function confirmSale(prospectId: number) {
    if (!confirm("Confirm this sale and credit the sharer's Love Gift? This action cannot be undone.")) return;
    setConfirming(prospectId);
    setMessage("");
    try {
      const res = await fetch(`/api/marketplace/prospects/${prospectId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm sale");
      setMessage(data.message ?? "Sale confirmed!");
      setProspects((prev) => prev.map((p) => p.id === prospectId ? { ...p, status: "converted" } : p));
    } catch (err: any) {
      console.error(err);
      setMessage(err.message ?? "Failed to confirm sale. Try again.");
    } finally {
      setConfirming(null);
    }
  }

  async function markPaid(claimId: number) {
    if (!confirm("Mark this Love Gift as paid? The sharer will be notified.")) return;
    setPaying(claimId);
    try {
      const res = await fetch(`/api/marketplace/love-gifts/${claimId}/pay`, { method: "PATCH" });
      const data = await res.json();
      if (data.ok) {
        setClaims((prev) => prev.map((c) => c.id === claimId ? { ...c, status: "paid", paidAt: new Date().toISOString() } : c));
        setMessage(data.message ?? "Marked as paid!");
      } else {
        alert(data.error ?? "Failed");
      }
    } catch { alert("Network error"); } finally { setPaying(null); }
  }

  const isSold = listing?.status === "sold";

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← My Listings</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📋 Prospects</h1>
        {listing && <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.85 }}>{listing.title} · Love Gift: ₱{listing.loveGiftAmount.toLocaleString()}</p>}
      </div>

      <div style={{ padding: "1rem" }}>
        {message && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
            ✅ {message}
          </div>
        )}

        {/* Love Gift Claims Section (seller side) */}
        {claims.length > 0 && (
          <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "1rem", border: "1.5px solid #fecdd3" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 800, color: "#9f1239" }}>❤️ Love Gift Claims</h3>
            {claims.map((claim) => (
              <div key={claim.id} style={{ padding: "0.75rem", borderRadius: "10px", background: claim.status === "pending" ? "#fff7ed" : claim.status === "paid" ? "#f0fdf4" : "#f8fafc", marginBottom: "0.5rem", border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.375rem" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>{claim.sharerName}</p>
                    <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
                      {claim.method === "gcash" ? "💳 GCash Request" : "📞 Contact Request"} · ₱{claim.amount.toLocaleString()}
                    </p>
                  </div>
                  <span style={{ background: claim.status === "pending" ? "#fef3c7" : claim.status === "paid" ? "#d1fae5" : "#f1f5f9", color: claim.status === "pending" ? "#92400e" : claim.status === "paid" ? "#166534" : "#64748b", fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                    {claim.status === "pending" ? "⏳ PENDING" : claim.status === "paid" ? "✅ PAID" : claim.status.toUpperCase()}
                  </span>
                </div>

                {/* GCash details (seller can see) */}
                {claim.method === "gcash" && claim.gcashName && (
                  <div style={{ background: "white", borderRadius: "8px", padding: "0.5rem 0.75rem", marginTop: "0.375rem", border: "1px solid #e2e8f0" }}>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#1e293b" }}>
                      <strong>GCash:</strong> {claim.gcashName}
                    </p>
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.85rem", fontWeight: 800, color: "#0070e0", letterSpacing: "0.05em" }}>
                      📱 {claim.gcashMobile}
                    </p>
                  </div>
                )}

                {/* Mark as Paid button */}
                {claim.status === "pending" && (
                  <button
                    onClick={() => markPaid(claim.id)}
                    disabled={paying === claim.id}
                    style={{ marginTop: "0.5rem", width: "100%", padding: "0.5rem", background: paying === claim.id ? "#94a3b8" : "#10b981", color: "white", border: "none", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, cursor: paying === claim.id ? "wait" : "pointer", fontFamily: "inherit" }}
                  >
                    {paying === claim.id ? "Processing…" : "💸 Mark as Paid"}
                  </button>
                )}
                {claim.paidAt && (
                  <p style={{ margin: "0.375rem 0 0", fontSize: "0.68rem", color: "#15803d" }}>
                    Paid on {new Date(claim.paidAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by name or coupon code (e.g. RYANP01)…"
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "999px", padding: "0.625rem 1rem", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {loading && <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>Loading…</p>}

        {!loading && prospects.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
            <p style={{ fontWeight: 600, color: "#64748b" }}>No prospects yet</p>
            <p style={{ fontSize: "0.85rem" }}>Prospects appear when someone reveals the discount or contacts you via this listing.</p>
          </div>
        )}

        {!loading && prospects.length > 0 && filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem" }}>No results for &quot;{search}&quot;</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              {/* Prospect header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", margin: 0 }}>{p.prospectName}</p>
                  <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0.1rem 0 0" }}>
                    {p.actionType === "reveal" ? "🔓 Revealed discount" : "💬 Contacted seller"} · {new Date(p.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span style={{ background: STATUS_COLORS[p.status] + "20", color: STATUS_COLORS[p.status], fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                  {p.status.toUpperCase()}
                </span>
              </div>

              {/* Contact info */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.625rem" }}>
                {p.prospectMobile && (
                  <a href={`tel:${p.prospectMobile}`} style={{ background: "#f0fdf4", color: "#166534", borderRadius: "999px", padding: "0.2rem 0.625rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                    📱 {p.prospectMobile}
                  </a>
                )}
                {p.prospectEmail && (
                  <a href={`mailto:${p.prospectEmail}`} style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: "999px", padding: "0.2rem 0.625rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                    📧 {p.prospectEmail}
                  </a>
                )}
                {!p.prospectMobile && !p.prospectEmail && (
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>No contact info provided</span>
                )}
              </div>

              {/* Sharer attribution */}
              {(p.sharerName || p.shareToken) && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "8px", padding: "0.375rem 0.625rem", marginBottom: "0.625rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "#9f1239" }}>
                    ❤️ Via {p.sharerName ? <strong>{p.sharerName}</strong> : "share link"}
                  </span>
                  {p.shareToken && (
                    <span style={{ background: "white", border: "1.5px dashed #f87171", borderRadius: "6px", padding: "0.15rem 0.5rem", fontSize: "0.72rem", fontWeight: 900, color: "#be123c", letterSpacing: "0.08em", fontFamily: "monospace" }}>
                      {p.shareToken}
                    </span>
                  )}
                </div>
              )}

              {/* Actions — only show for active listings */}
              {!isSold ? (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {STATUS_OPTIONS.filter((s) => s !== p.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(p.id, s)}
                      style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      → {s}
                    </button>
                  ))}
                  {p.status !== "converted" && (
                    <button
                      onClick={() => confirmSale(p.id)}
                      disabled={confirming === p.id}
                      style={{ background: confirming === p.id ? "#94a3b8" : "#10b981", color: "white", border: "none", borderRadius: "999px", padding: "0.25rem 0.875rem", fontSize: "0.72rem", fontWeight: 700, cursor: confirming === p.id ? "wait" : "pointer", fontFamily: "inherit", marginLeft: "auto" }}
                    >
                      {confirming === p.id ? "Confirming…" : "✅ Confirm Sale & Credit Love Gift"}
                    </button>
                  )}
                  {p.status === "converted" && (
                    <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700, marginLeft: "auto" }}>✅ Sale confirmed</span>
                  )}
                </div>
              ) : (
                <div>
                  {p.status === "converted" && (
                    <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>✅ Buyer — Sale confirmed</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
