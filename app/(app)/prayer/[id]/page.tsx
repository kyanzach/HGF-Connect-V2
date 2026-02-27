"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import PrayCommitModal from "@/components/prayer/PrayCommitModal";

interface PrayerRequestDetail {
  id: number;
  request: string;
  isAnswered: boolean;
  prayerCount: number;
  createdAt: string;
  author: { id: number; firstName: string; lastName: string; profilePicture?: string | null };
  _count: { responses: number };
}

interface PrayerResponseItem {
  id: number;
  message: string;
  audioUrl: string | null;
  type: string;
  createdAt: string;
  author: { id: number; firstName: string; lastName: string; profilePicture?: string | null };
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PrayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<PrayerRequestDetail | null>(null);
  const [responses, setResponses] = useState<PrayerResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, respRes] = await Promise.all([
        fetch(`/api/prayer?tab=active`),
        fetch(`/api/prayer/${id}/responses`),
      ]);
      const reqData = await reqRes.json();
      // Find this specific request
      const found = (reqData.requests ?? []).find((r: any) => r.id === parseInt(id));
      if (!found) {
        // Try answered tab
        const answeredRes = await fetch(`/api/prayer?tab=answered`);
        const answeredData = await answeredRes.json();
        const foundAnswered = (answeredData.requests ?? []).find((r: any) => r.id === parseInt(id));
        if (foundAnswered) setRequest(foundAnswered);
      } else {
        setRequest(found);
      }

      const respData = await respRes.json();
      setResponses(respData.responses ?? []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function handlePrayed() {
    if (request) {
      setRequest({
        ...request,
        prayerCount: request.prayerCount + 1,
        _count: { responses: request._count.responses + 1 },
      });
    }
    // Reload responses to show the new one
    setTimeout(() => {
      fetch(`/api/prayer/${id}/responses`)
        .then((r) => r.json())
        .then((d) => setResponses(d.responses ?? []))
        .catch(() => {});
    }, 500);
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", animation: "pulse 1.5s infinite" }}>🙏</div>
        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Loading prayer request…</p>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  if (!request) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#94a3b8" }}>Prayer request not found.</p>
        <Link href="/prayer" style={{ color: "#7c3aed" }}>← Back to Prayer Wall</Link>
      </div>
    );
  }

  const date = new Date(request.createdAt).toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div style={{ paddingBottom: "1.5rem" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", padding: "1rem", color: "white" }}>
        <Link href="/prayer" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.8rem" }}>
          ← Prayer Wall
        </Link>
        <h1 style={{ fontSize: "1rem", fontWeight: 800, margin: "0.5rem 0 0" }}>
          Prayer Request
        </h1>
      </div>

      {/* Request card */}
      <div style={{ padding: "1rem" }}>
        <div
          style={{
            background: "white", borderRadius: 16, padding: "1.125rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {request.author.profilePicture ? (
              <img
                src={`/uploads/profile_pictures/${request.author.profilePicture}`}
                alt=""
                style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: "50%", background: "#a855f7",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700,
              }}>
                {request.author.firstName[0]}{request.author.lastName[0]}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, color: "#1e293b" }}>
                {request.author.firstName} {request.author.lastName}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{date}</div>
            </div>
          </div>

          <p style={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.7, margin: "0 0 1rem", whiteSpace: "pre-line" }}>
            {request.request}
          </p>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding: "0.5rem 1rem", borderRadius: 999,
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                border: "none", color: "white", fontSize: "0.85rem",
                fontWeight: 700, cursor: "pointer",
              }}
            >
              🙏 Pray for {request.author.firstName}
            </button>
            <span style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600 }}>
              {request.prayerCount} praying
            </span>
          </div>
        </div>

        {/* Responses section */}
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#334155", marginBottom: "0.75rem" }}>
          🙏 Who&apos;s Praying ({responses.length})
        </h3>

        {responses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8" }}>
            <p style={{ fontSize: "0.85rem" }}>Be the first to pray for this request!</p>
          </div>
        ) : (
          responses.map((resp) => (
            <div
              key={resp.id}
              style={{
                background: "white", borderRadius: 14, padding: "0.875rem",
                marginBottom: "0.625rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                {resp.author.profilePicture ? (
                  <img
                    src={`/uploads/profile_pictures/${resp.author.profilePicture}`}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "#c084fc",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "0.65rem", fontWeight: 700,
                  }}>
                    {resp.author.firstName[0]}{resp.author.lastName[0]}
                  </div>
                )}
                <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#1e293b" }}>
                  {resp.author.firstName} {resp.author.lastName}
                </span>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>
                  {timeAgo(resp.createdAt)}
                </span>
              </div>

              {resp.message && resp.message !== "🙏 Prayed" && (
                <p style={{ fontSize: "0.82rem", color: "#475569", margin: "0 0 0.375rem", lineHeight: 1.5 }}>
                  {resp.message}
                </p>
              )}

              {resp.audioUrl && (
                <audio
                  src={resp.audioUrl}
                  controls
                  style={{ width: "100%", height: 36, marginTop: 4 }}
                />
              )}

              {resp.message === "🙏 Prayed" && !resp.audioUrl && (
                <p style={{ fontSize: "0.78rem", color: "#a78bfa", margin: 0, fontStyle: "italic" }}>
                  🙏 Committed to pray
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <PrayCommitModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPrayed={handlePrayed}
        requestId={request.id}
        authorName={`${request.author.firstName} ${request.author.lastName}`}
        requestText={request.request}
      />
    </div>
  );
}
