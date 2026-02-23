"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

const PRIMARY = "#4EB1CB";

const POST_TYPES = [
  { value: "TEXT", icon: "✍️", label: "Reflection" },
  { value: "DEVO", icon: "📖", label: "Devotional" },
  { value: "VERSE_CARD", icon: "📜", label: "Bible Verse" },
  { value: "PRAYER", icon: "🙏", label: "Prayer" },
  { value: "PRAISE", icon: "🙌", label: "Praise" },
];

export default function CreatePostPage() {
  const router = useRouter();
  const [type, setType] = useState("TEXT");
  const [content, setContent] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [verseText, setVerseText] = useState("");
  const [visibility, setVisibility] = useState("MEMBERS_ONLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !verseText.trim()) {
      setError("Write something to share first! ✍️");
      setShakeKey((k) => k + 1);
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, verseRef: verseRef || null, verseText: verseText || null, visibility }),
      });

      if (!res.ok) throw new Error("Failed to post");
      router.push("/feed");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedType = POST_TYPES.find((t) => t.value === type)!;

  return (
    <div style={{ padding: "1rem" }}>
      {/* Back button */}
      <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.125rem",
            cursor: "pointer",
            color: PRIMARY,
            padding: "0.25rem",
          }}
        >
          ← Back
        </button>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
          Share with the Community
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Post Type Selector */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            marginBottom: "1rem",
            paddingBottom: "0.25rem",
            scrollbarWidth: "none",
          }}
        >
          {POST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.45rem 0.875rem",
                borderRadius: "999px",
                border: `1.5px solid ${type === t.value ? PRIMARY : "#e2e8f0"}`,
                background: type === t.value ? "#e0f7fb" : "white",
                color: type === t.value ? PRIMARY : "#64748b",
                fontWeight: type === t.value ? 700 : 500,
                fontSize: "0.8125rem",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "1rem",
            marginBottom: "0.75rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === "PRAYER"
                ? "Share your prayer request with the community..."
                : type === "PRAISE"
                ? "Share what God has done! 🙌"
                : "What's on your heart today?"
            }
            rows={5}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "0.9375rem",
              color: "#1e293b",
              lineHeight: 1.65,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />

          {/* Bible Verse block */}
          {(type === "VERSE_CARD" || type === "DEVO") && (
            <div
              style={{
                borderTop: "1px solid #f1f5f9",
                marginTop: "0.75rem",
                paddingTop: "0.75rem",
              }}
            >
              <input
                value={verseRef}
                onChange={(e) => setVerseRef(e.target.value)}
                placeholder="Reference (e.g. Psalm 23:1)"
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <textarea
                value={verseText}
                onChange={(e) => setVerseText(e.target.value)}
                placeholder="Verse text..."
                rows={3}
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>

        {/* Visibility */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>
            🔒 Visible to
          </span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "0.3rem 0.625rem",
              fontSize: "0.8125rem",
              color: "#1e293b",
              outline: "none",
              background: "white",
            }}
          >
            <option value="MEMBERS_ONLY">Members Only</option>
            <option value="PUBLIC">Everyone (Public)</option>
            <option value="PRIVATE">Only Me</option>
          </select>
        </div>

        {error && (
          <div
            className="hgf-error-banner"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              padding: "0.625rem 0.875rem",
              color: "#ef4444",
              fontSize: "0.85rem",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <SubmitButton
          loading={submitting}
          shakeKey={shakeKey}
          color={PRIMARY}
        >
          {selectedType.icon} Post {selectedType.label}
        </SubmitButton>
      </form>
    </div>
  );
}
