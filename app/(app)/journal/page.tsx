"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

const PRIMARY = "#4EB1CB";

const MOOD_EMOJIS: Record<string, string> = {
  grateful: "🙏",
  peaceful: "☮️",
  hopeful: "🌅",
  struggling: "😔",
  joyful: "😊",
  anxious: "😟",
  reflective: "🤔",
};

const VISIBILITY_LABELS: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  PRIVATE: { label: "Private", bg: "#f1f5f9", color: "#475569", icon: "🔒" },
  MEMBERS_ONLY: { label: "Members Only", bg: "#e0f2fe", color: "#0369a1", icon: "👥" },
  PUBLIC: { label: "Public (SEO)", bg: "#e0fdf4", color: "#047857", icon: "🌐" },
};

interface JournalEntry {
  id: number;
  title?: string | null;
  content: string;
  mood?: string | null;
  verseRef?: string | null;
  visibility: string;
  createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const loadEntries = () => {
    setLoading(true);
    fetch("/api/journal")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`,
          padding: "1.25rem 1rem",
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📝 My Grace Blog</h1>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", opacity: 0.85 }}>
              Your private reflection diary and public faith blog — sharing your personal walk of faith with the community.
            </p>
          </div>
          <Link
            href="/journal/new"
            style={{
              background: "white",
              color: PRIMARY,
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
          >
            + Write Blog
          </Link>
        </div>
      </div>

      {/* Entries */}
      <div style={{ padding: "0.875rem 1rem" }}>
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
              <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, marginBottom: 8, width: "50%" }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "80%" }} />
            </div>
          ))
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>📔</div>
            <p style={{ fontWeight: 600, color: "#64748b", margin: "0 0 0.25rem" }}>
              No Grace Blog posts yet
            </p>
            <p style={{ fontSize: "0.8rem", margin: "0 0 1.25rem" }}>
              Start writing your Grace Journey or sharing your spiritual Walk of Faith on your blog today.
            </p>
            <Link
              href="/journal/new"
              style={{
                display: "inline-block",
                background: PRIMARY,
                color: "white",
                padding: "0.625rem 1.5rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(78,177,203,0.3)",
              }}
            >
              Write First Blog Post ✍️
            </Link>
          </div>
        ) : (
          entries.map((entry) => {
            const vis = VISIBILITY_LABELS[entry.visibility] ?? VISIBILITY_LABELS.PRIVATE;

            return (
              <div
                key={entry.id}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  borderLeft: `3.5px solid ${PRIMARY}`,
                  position: "relative",
                }}
              >
                {/* Header row: mood, date, visibility */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    {entry.mood && (
                      <span style={{ fontSize: "1rem" }}>{MOOD_EMOJIS[entry.mood] ?? "📝"}</span>
                    )}
                    <span style={{ fontSize: "0.725rem", color: "#94a3b8" }}>
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                    {entry.verseRef && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          background: "#e0f7fb",
                          color: PRIMARY,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "999px",
                          fontWeight: 600,
                        }}
                      >
                        📜 {entry.verseRef}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: "0.65rem",
                        background: vis.bg,
                        color: vis.color,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "999px",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                      }}
                    >
                      {vis.icon} {vis.label}
                    </span>
                  </div>
                </div>

                {entry.title && (
                  <h3
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      margin: "0 0 0.375rem",
                    }}
                  >
                    {entry.title}
                  </h3>
                )}

                {/* Strip HTML tags for list snippet */}
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#64748b",
                    margin: "0 0 0.75rem",
                    lineHeight: 1.55,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                >
                  {entry.content.replace(/<[^>]*>/g, " ")}
                </p>

                {/* Footer action buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "0.5rem",
                    borderTop: "1px solid #f8fafc",
                    paddingTop: "0.625rem",
                  }}
                >
                  {entry.visibility === "PUBLIC" && (
                    <Link
                      href={`/grace-notes/${entry.id}`}
                      target="_blank"
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: PRIMARY,
                        textDecoration: "none",
                        padding: "0.25rem 0.625rem",
                        background: "#e0f7fb",
                        borderRadius: "6px",
                      }}
                    >
                      👁 View Article
                    </Link>
                  )}
                  <Link
                    href={`/journal/new?edit=${entry.id}`}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#6366f1",
                      textDecoration: "none",
                      padding: "0.25rem 0.625rem",
                      background: "#eef2ff",
                      borderRadius: "6px",
                    }}
                  >
                    ✏️ Edit
                  </Link>
                  <button
                    onClick={(e) => handleDelete(e, entry.id)}
                    disabled={deletingId === entry.id}
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#ef4444",
                      border: "none",
                      background: "#fef2f2",
                      borderRadius: "6px",
                      padding: "0.25rem 0.625rem",
                      cursor: "pointer",
                    }}
                  >
                    {deletingId === entry.id ? "Deleting..." : "🗑 Delete"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmId !== null}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This will permanently remove it."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const targetId = deleteConfirmId;
          setDeleteConfirmId(null);
          setDeletingId(targetId);
          try {
            const res = await fetch(`/api/journal/${targetId}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setEntries((prev) => prev.filter((entry) => entry.id !== targetId));
          } catch {
            setAlertMessage("Failed to delete. Please try again.");
          } finally {
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Info Alert Modal */}
      <ConfirmModal
        open={alertMessage !== null}
        title="Notice"
        message={alertMessage || ""}
        confirmLabel="OK"
        cancelLabel={null}
        confirmColor={PRIMARY}
        onConfirm={() => setAlertMessage(null)}
        onCancel={() => setAlertMessage(null)}
      />

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
