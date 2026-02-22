"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const PRIMARY = "#4EB1CB";

interface Share {
  id: number;
  listing: { id: number; title: string; price: string | null; loveGiftPercent: string | null };
  loveGiftEarned: string;
  status: string;
  createdAt: string;
}

export default function LoveGiftsDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (!session) return;
    fetch("/api/marketplace/love-gifts")
      .then((r) => r.json())
      .then((d) => {
        setShares(d.shares ?? []);
        setTotalEarned(d.totalEarned ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (!session) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
        <p>Please log in to view your love gift earnings.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #be123c 0%, #ef4444 100%)",
          padding: "1.5rem 1rem",
          color: "white",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", cursor: "pointer", position: "absolute", left: "1rem", fontWeight: 600 }}
        >
          ←
        </button>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.375rem" }}>❤️</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.25rem" }}>Love Gifts</h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: "0 0 1rem" }}>
          Earn by sharing listings with your network
        </p>
        <div
          style={{
            display: "inline-block",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "16px",
            padding: "0.75rem 2rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", opacity: 0.85 }}>Total Earned</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>₱{totalEarned.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        {/* How it works */}
        <div style={{ background: "#fff7ed", borderRadius: "14px", padding: "1rem", marginBottom: "1rem", border: "1px solid #fed7aa" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#c2410c", margin: "0 0 0.5rem" }}>💡 How Love Gifts Work</h3>
          <ol style={{ fontSize: "0.8rem", color: "#9a3412", paddingLeft: "1.25rem", margin: 0, lineHeight: 1.8 }}>
            <li>Browse the marketplace and find listings with ❤️ badges</li>
            <li>Share the listing with your network (friends, family, socials)</li>
            <li>When they buy, they mention your name</li>
            <li>You receive a love gift % of the sale price directly from the seller</li>
          </ol>
        </div>

        {/* Shares list */}
        <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.75rem" }}>Your Shares</h2>

        {loading ? (
          [1, 2].map((i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, height: 80, marginBottom: "0.75rem", animation: "pulse 1.5s infinite" }} />
          ))
        ) : shares.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎁</div>
            <p style={{ fontSize: "0.9rem" }}>You haven&apos;t shared any listings yet.</p>
            <button
              onClick={() => router.push("/marketplace")}
              style={{
                marginTop: "0.75rem",
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "0.625rem 1.5rem",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Browse Marketplace
            </button>
          </div>
        ) : (
          shares.map((share) => (
            <div
              key={share.id}
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1rem",
                marginBottom: "0.75rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "12px",
                  background: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  flexShrink: 0,
                }}
              >
                ❤️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {share.listing.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  {share.listing.loveGiftPercent}% of ₱{Number(share.listing.price ?? 0).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: Number(share.loveGiftEarned) > 0 ? "#16a34a" : "#94a3b8" }}>
                  ₱{Number(share.loveGiftEarned).toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: "0.675rem",
                    color: share.status === "paid" ? "#16a34a" : "#f59e0b",
                    fontWeight: 600,
                    textTransform: "capitalize",
                  }}
                >
                  {share.status}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );
}
