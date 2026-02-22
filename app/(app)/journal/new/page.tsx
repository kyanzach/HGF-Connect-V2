"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MOODS = [
  { value: "grateful", emoji: "🙏", label: "Grateful" },
  { value: "peaceful", emoji: "☮️", label: "Peaceful" },
  { value: "hopeful", emoji: "🌅", label: "Hopeful" },
  { value: "joyful", emoji: "😊", label: "Joyful" },
  { value: "reflective", emoji: "🤔", label: "Reflective" },
  { value: "struggling", emoji: "😔", label: "Struggling" },
  { value: "anxious", emoji: "😟", label: "Anxious" },
];

export default function NewJournalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingVerse, setLoadingVerse] = useState(false);
  const [suggestedVerse, setSuggestedVerse] = useState<{ verse: string; reference: string } | null>(null);

  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  async function getSuggestedVerse() {
    if (!content.trim()) return;
    setLoadingVerse(true);
    try {
      const res = await fetch("/api/ai/verse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = await res.json();
      setSuggestedVerse({ verse: data.verse, reference: data.reference });
      setVerseRef(data.reference || "");
    } catch {
      // silently fail
    } finally {
      setLoadingVerse(false);
    }
  }

  async function handleSave() {
    if (!content.trim()) {
      setError("Write something in your journal first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          content,
          mood: mood || null,
          verseRef: verseRef || null,
          verseText: suggestedVerse?.verse || null,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/journal");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
          padding: "0.875rem 1rem",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "white", fontSize: "1.125rem", cursor: "pointer" }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>New Journal Entry</h1>
          <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.8 }}>{today}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={submitting}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "999px",
            padding: "0.375rem 0.875rem",
            color: "white",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving..." : "Save ✓"}
        </button>
      </div>

      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem", flex: 1 }}>
        {/* Mood selector */}
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", margin: "0 0 0.5rem" }}>
            How are you feeling today?
          </p>
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", scrollbarWidth: "none" }}>
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? "" : m.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.5rem 0.625rem",
                  background: mood === m.value ? "#ede9fe" : "white",
                  border: `1.5px solid ${mood === m.value ? "#6366f1" : "#e2e8f0"}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  flexShrink: 0,
                  minWidth: "56px",
                }}
              >
                <span style={{ fontSize: "1.375rem" }}>{m.emoji}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: 600, color: mood === m.value ? "#6366f1" : "#94a3b8" }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title (optional)..."
          style={{
            border: "none",
            borderBottom: "1.5px solid #e2e8f0",
            padding: "0.5rem 0",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#1e293b",
            outline: "none",
            fontFamily: "inherit",
            background: "transparent",
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your heart today? Write your thoughts, prayers, and reflections here..."
          rows={10}
          style={{
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: "0.9375rem",
            color: "#334155",
            lineHeight: 1.75,
            fontFamily: "inherit",
            background: "transparent",
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* AI Verse suggestion */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", margin: 0 }}>
              📜 Bible Verse
            </p>
            {content.trim() && (
              <button
                onClick={getSuggestedVerse}
                disabled={loadingVerse}
                style={{
                  background: "none",
                  border: "1px solid #6366f1",
                  borderRadius: "999px",
                  padding: "0.25rem 0.625rem",
                  fontSize: "0.7rem",
                  color: "#6366f1",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {loadingVerse ? "✨ Finding..." : "✨ Suggest verse"}
              </button>
            )}
          </div>

          {suggestedVerse && (
            <div
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                borderRadius: "12px",
                padding: "0.875rem",
                color: "white",
                marginBottom: "0.5rem",
                fontSize: "0.8rem",
                lineHeight: 1.65,
                fontStyle: "italic",
              }}
            >
              &ldquo;{suggestedVerse.verse}&rdquo;
              <div style={{ marginTop: "0.375rem", fontSize: "0.725rem", opacity: 0.8, fontStyle: "normal", fontWeight: 600 }}>
                — {suggestedVerse.reference}
              </div>
            </div>
          )}

          <input
            value={verseRef}
            onChange={(e) => setVerseRef(e.target.value)}
            placeholder="Or type a verse reference (e.g. John 3:16)"
            style={{
              width: "100%",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{error}</p>}
      </div>
    </div>
  );
}
