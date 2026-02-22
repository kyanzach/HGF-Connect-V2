"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

interface PrayerRequest {
  id: number;
  request: string;
  isAnswered: boolean;
  prayerCount: number;
  createdAt: string;
  author: { firstName: string; lastName: string; profilePicture?: string | null };
  _count: { responses: number };
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PrayerWallPage() {
  const [tab, setTab] = useState<"active" | "answered">("active");
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [praying, setPraying] = useState<Record<number, boolean>>({});

  const load = useCallback(async (t: "active" | "answered") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prayer?tab=${t}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function handlePray(id: number) {
    if (praying[id]) return;
    setPraying((p) => ({ ...p, [id]: true }));
    setRequests((prev) =>
      prev.map((r) => r.id === id ? { ...r, prayerCount: r.prayerCount + 1 } : r)
    );
    try {
      await fetch(`/api/prayer/${id}/pray`, { method: "POST" });
    } catch {
      // optimistic — no rollback needed for prayer count
    }
  }

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          padding: "1.25rem 1rem",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🙏</div>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 0.25rem" }}>Prayer Wall</h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: 0 }}>
          Stand together in prayer for one another
        </p>
        <Link
          href="/prayer/new"
          style={{
            display: "inline-block",
            marginTop: "0.875rem",
            background: "white",
            color: "#7c3aed",
            padding: "0.45rem 1.25rem",
            borderRadius: "999px",
            fontSize: "0.8125rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Submit Prayer Request
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {(["active", "answered"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "none",
              borderBottom: tab === t ? `2.5px solid #7c3aed` : "2.5px solid transparent",
              background: "none",
              fontSize: "0.875rem",
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "#7c3aed" : "#64748b",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t === "active" ? "🔴 Active" : "✅ Answered"}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0.875rem 1rem 0" }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "1rem",
                marginBottom: "0.75rem",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, marginBottom: 8, width: "40%" }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "70%" }} />
            </div>
          ))
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🙏</div>
            <p style={{ fontSize: "0.9rem" }}>
              {tab === "active" ? "No active prayer requests. Be the first to share!" : "No answered prayers yet. Keep praying!"}
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              style={{
                background: "white",
                borderRadius: "16px",
                marginBottom: "0.75rem",
                padding: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
            >
              {/* Author + time */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#a855f7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {req.author.firstName[0]}{req.author.lastName[0]}
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>
                    {req.author.firstName} {req.author.lastName}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                    {timeAgo(req.createdAt)}
                  </span>
                </div>
              </div>

              {/* Prayer request text */}
              <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.65, margin: "0 0 0.75rem", whiteSpace: "pre-line" }}>
                {req.request}
              </p>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
                <button
                  onClick={() => handlePray(req.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.45rem 0.875rem",
                    background: praying[req.id] ? "#faf5ff" : "#f5f3ff",
                    border: "1px solid #e9d5ff",
                    borderRadius: "999px",
                    fontSize: "0.8125rem",
                    color: "#7c3aed",
                    fontWeight: 600,
                    cursor: praying[req.id] ? "default" : "pointer",
                  }}
                >
                  🙏 Praying {req.prayerCount > 0 && `· ${req.prayerCount}`}
                </button>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  💬 {req._count.responses} responses
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
