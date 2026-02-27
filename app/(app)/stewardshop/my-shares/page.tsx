"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#4EB1CB";
const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", credited: "#10b981", expired: "#94a3b8" };

interface Share {
  id: number; shareCode: string; shareLink: string;
  loveGiftEarned: number; status: string; createdAt: string;
  listing: { id: number; title: string; listingType: string; ogPrice: number | null; loveGiftAmount: number; status: string; photo: string | null; };
  impressions: number; ctaClicks: number; prospectCount: number;
}

export default function MySharesPage() {
  const router = useRouter();
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stewardshop/shares/mine")
      .then((r) => r.json())
      .then((d) => setShares(d.shares ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function copyLink(link: string, code: string) {
    try { await navigator.clipboard.writeText(link); }
    catch {
      const el = document.createElement("input"); el.value = link;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(code);
    setTimeout(() => setCopied(null), 2500);
  }

  const totalEarned = shares.reduce((s, sh) => s + sh.loveGiftEarned, 0);
  const creditedShares = shares.filter((s) => s.status === "credited");

  return (
    <div style={{ paddingBottom: "2rem" }}>
      <div style={{ background: "linear-gradient(135deg, #be123c 0%, #ef4444 100%)", padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>❤️ My Share Links</h1>
        <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.75rem", opacity: 0.85 }}>Track your shared listings and Love Gift earnings</p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.625rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "0.65rem", opacity: 0.85 }}>Total Earned</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.25rem" }}>₱{totalEarned.toLocaleString()}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.625rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "0.65rem", opacity: 0.85 }}>Confirmed Sales</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.25rem" }}>{creditedShares.length}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.625rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "0.65rem", opacity: 0.85 }}>Active Shares</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.25rem" }}>{shares.length}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        {loading && <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>Loading…</p>}

        {!loading && shares.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🔗</div>
            <p style={{ fontWeight: 600, color: "#64748b" }}>No shares yet</p>
            <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Browse the marketplace and tap "Get My Share Link" on listings you&apos;d like to promote!</p>
            <Link href="/stewardshop" style={{ background: "#ef4444", color: "white", borderRadius: "999px", padding: "0.625rem 1.5rem", textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}>
              Browse Marketplace
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {shares.map((share) => (
            <div key={share.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              {/* Listing row */}
              <div style={{ display: "flex", gap: "0.875rem", padding: "0.875rem" }}>
                <div style={{ width: 56, height: 56, borderRadius: "8px", background: "#f1f5f9", flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                  {share.listing.photo ? <img src={`/uploads/stewardshop/${share.listing.photo}`} alt={share.listing.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : "📦"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{share.listing.title}</p>
                    <span style={{ background: STATUS_COLORS[share.status] + "20", color: STATUS_COLORS[share.status], fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", flexShrink: 0 }}>
                      {share.status === "credited" ? "✅ Credited" : share.status === "pending" ? "⏳ Pending" : share.status.toUpperCase()}
                    </span>
                  </div>
                  {/* Stats */}
                  <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: "#94a3b8", margin: "0.25rem 0" }}>
                    <span>👁 {share.impressions} views</span>
                    <span>🖱️ {share.ctaClicks} clicks</span>
                    <span>👤 {share.prospectCount} prospects</span>
                  </div>
                  {share.loveGiftEarned > 0 && (
                    <span style={{ background: "#f0fdf4", color: "#166534", fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      ❤️ Earned ₱{share.loveGiftEarned.toLocaleString()}
                    </span>
                  )}
                  {share.loveGiftEarned === 0 && share.listing.loveGiftAmount > 0 && (
                    <span style={{ fontSize: "0.72rem", color: "#9f1239" }}>
                      ❤️ Potential: ₱{share.listing.loveGiftAmount.toLocaleString()} per sale
                    </span>
                  )}
                </div>
              </div>

              {/* Share link + copy */}
              <div style={{ borderTop: "1px solid #f1f5f9", padding: "0.625rem 0.875rem", background: "#f8fafc" }}>
                <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: "0 0 0.375rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {share.shareLink}
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => copyLink(share.shareLink, share.shareCode)}
                    style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: "999px", padding: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {copied === share.shareCode ? "✅ Copied!" : "📋 Copy Link"}
                  </button>
                  <Link href={`/stewardshop/${share.listing.id}`} style={{ flex: 1, textAlign: "center", background: "white", color: PRIMARY, border: `1.5px solid ${PRIMARY}`, borderRadius: "999px", padding: "0.375rem", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                    View Listing
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
