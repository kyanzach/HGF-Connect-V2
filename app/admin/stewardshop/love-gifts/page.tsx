"use client";

import React, { useEffect, useState } from "react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  paid: "#3b82f6",
  received: "#10b981",
  disputed: "#ef4444",
};

interface Claim {
  id: number;
  amount: number;
  method: string | null;
  status: string;
  gcashName: string | null;
  gcashMobile: string | null;
  listing: { id: number; title: string };
  sharer: { id: number; name: string };
  seller: { id: number; name: string };
  createdAt: string;
  paidAt: string | null;
  receivedAt: string | null;
}

interface Summary {
  totalClaims: number;
  pendingCount: number;
  paidCount: number;
  receivedCount: number;
  disputedCount: number;
  totalAmount: number;
}

export default function AdminLoveGiftsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/love-gifts")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load claims");
        return r.json();
      })
      .then((d) => {
        setClaims(d.claims ?? []);
        setSummary(d.summary ?? null);
      })
      .catch((err) => {
        console.error("Failed to load admin claims:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
        ❤️ Love Gift Claims
      </h1>
      <p style={{ color: "#64748b", marginTop: "0.25rem", marginBottom: "1.5rem" }}>
        Monitor and manage all Love Gift transactions across StewardShop
      </p>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "1rem", borderRadius: "8px", marginBottom: "2rem", border: "1px solid #fee2e2" }}>
          ❌ Error: {error}
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard label="Total Claims" value={summary.totalClaims} icon="📊" color="#4eb1cb" />
          <StatCard label="Total Amount" value={`₱${summary.totalAmount.toLocaleString()}`} icon="💰" color="#10b981" />
          <StatCard label="Pending" value={summary.pendingCount} icon="⏳" color="#f59e0b" />
          <StatCard label="Paid" value={summary.paidCount} icon="💸" color="#3b82f6" />
          <StatCard label="Received" value={summary.receivedCount} icon="✅" color="#10b981" />
          <StatCard label="Disputed" value={summary.disputedCount} icon="⚠️" color="#ef4444" />
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {["all", "pending", "paid", "received", "disputed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.375rem 1rem",
              borderRadius: "999px",
              border: filter === f ? "2px solid #4eb1cb" : "1px solid #e2e8f0",
              background: filter === f ? "#ecfeff" : "white",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: filter === f ? "#0e7490" : "#64748b",
              fontFamily: "inherit",
            }}
          >
            {f === "all" ? `All (${claims.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${claims.filter((c) => c.status === f).length})`}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>Loading…</p>}

      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
          <p style={{ fontWeight: 600, color: "#64748b" }}>{filter === "all" ? "No claims yet" : `No ${filter} claims`}</p>
        </div>
      )}

      {/* Claims Table */}
      {!loading && filtered.length > 0 && (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={thStyle}>Listing</th>
                <th style={thStyle}>Sharer</th>
                <th style={thStyle}>Seller</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Method</th>
                <th style={thStyle}>GCash</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...tdStyle, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.listing.title}</td>
                  <td style={tdStyle}>{c.sharer.name}</td>
                  <td style={tdStyle}>{c.seller.name}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>₱{c.amount.toLocaleString()}</td>
                  <td style={tdStyle}>{c.method === "gcash" ? "💳 GCash" : c.method === "contact" ? "📞 Contact" : "—"}</td>
                  <td style={tdStyle}>{c.gcashMobile ? `${c.gcashName} · ${c.gcashMobile}` : "—"}</td>
                  <td style={tdStyle}>
                    <span style={{ background: (STATUS_COLORS[c.status] ?? "#94a3b8") + "20", color: STATUS_COLORS[c.status] ?? "#94a3b8", fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: "0.75rem", color: "#94a3b8" }}>{new Date(c.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  textAlign: "left",
  fontWeight: 700,
  color: "#64748b",
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = { padding: "0.75rem 1rem", color: "#374151" };

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>{label}</div>
      </div>
    </div>
  );
}
