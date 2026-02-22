"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MOOD_EMOJIS: Record<string, string> = {
  grateful: "🙏",
  peaceful: "☮️",
  hopeful: "🌅",
  struggling: "😔",
  joyful: "😊",
  anxious: "😟",
  reflective: "🤔",
};

interface JournalEntry {
  id: number;
  title?: string | null;
  content: string;
  mood?: string | null;
  verseRef?: string | null;
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

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          padding: "1.25rem 1rem",
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📚 My Journal</h1>
            <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", opacity: 0.85 }}>
              Your private spiritual diary
            </p>
          </div>
          <Link
            href="/journal/new"
            style={{
              background: "white",
              color: "#6366f1",
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            + Write
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
              Your journal is empty
            </p>
            <p style={{ fontSize: "0.8rem", margin: "0 0 1.25rem" }}>
              Start writing your spiritual journey today.
            </p>
            <Link
              href="/journal/new"
              style={{
                display: "inline-block",
                background: "#6366f1",
                color: "white",
                padding: "0.625rem 1.5rem",
                borderRadius: "999px",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Write First Entry ✍️
            </Link>
          </div>
        ) : (
          entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/journal/${entry.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                  borderLeft: "3px solid #6366f1",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.375rem",
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
                  {entry.verseRef && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        background: "#ede9fe",
                        color: "#6366f1",
                        padding: "0.175rem 0.5rem",
                        borderRadius: "999px",
                        fontWeight: 600,
                      }}
                    >
                      📜 {entry.verseRef}
                    </span>
                  )}
                </div>

                {entry.title && (
                  <h3
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "#1e293b",
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {entry.title}
                  </h3>
                )}

                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#64748b",
                    margin: 0,
                    lineHeight: 1.55,
                    // Show only 2 lines
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                >
                  {entry.content}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
