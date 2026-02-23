"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SubmitButton from "@/components/SubmitButton";

const PRIMARY = "#4EB1CB";

type Step = "capture" | "preview" | "compose" | "done";

export default function DeVoNewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("capture");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiCaption, setAiCaption] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [verseText, setVerseText] = useState("");
  const [userCaption, setUserCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep("preview");
  }

  async function generateCaption() {
    setGeneratingCaption(true);
    setError("");
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedText: userCaption || null }),
      });
      const data = await res.json();
      setAiCaption(data.caption || "");
      setVerseText(data.suggestedVerse || "");
      setVerseRef(data.verseRef || "");
      setStep("compose");
    } catch {
      setError("Could not generate caption. You can write your own below.");
      setStep("compose");
    } finally {
      setGeneratingCaption(false);
    }
  }

  async function handlePost() {
    if (!userCaption.trim() && !aiCaption.trim()) {
      setError("Add a caption or reflection before posting.");
      setShakeKey((k) => k + 1);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DEVO",
          content: userCaption || aiCaption,
          aiCaption: aiCaption !== userCaption ? aiCaption : null,
          verseRef: verseRef || null,
          verseText: verseText || null,
          visibility: "MEMBERS_ONLY",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to post");
      }
      setStep("done");
      // Delay redirect so iOS Safari can settle before navigation
      setTimeout(() => router.push("/feed"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post. Please try again.");
      setSubmitting(false);
    }
    // Note: don't setSubmitting(false) on success — page will navigate away
  }

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* iOS Safari: block all touch input during submission to prevent dock freeze */}
      {submitting && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "all" }} />
      )}
      {/* Header */}
      <div
        style={{
          background: PRIMARY,
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "white",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", color: "white", fontSize: "1.125rem", cursor: "pointer" }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Share Your Devo 📖</h1>
          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.85 }}>
            Capture your devotional and share with the community
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* ── STEP 1: Capture ── */}
        {step === "capture" && (
          <>
            {/* Upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${PRIMARY}`,
                borderRadius: "20px",
                padding: "3rem 1rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                background: "#f0f9ff",
              }}
            >
              <span style={{ fontSize: "3.5rem" }}>📷</span>
              <p style={{ textAlign: "center", color: "#475569", fontSize: "0.9rem", margin: 0 }}>
                <strong style={{ color: PRIMARY }}>Tap to add a photo</strong>
                <br />
                of your handwritten devotional
              </p>
            </div>

            <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
              ✨ Our AI will read your devotional and generate a caption
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {/* Skip to text-only option */}
            <button
              onClick={() => setStep("compose")}
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "0.75rem",
                color: "#64748b",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              ✍️ Write text-only devotional instead
            </button>
          </>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === "preview" && previewUrl && (
          <>
            <div style={{ borderRadius: "16px", overflow: "hidden", position: "relative" }}>
              <img
                src={previewUrl}
                alt="Devotional preview"
                style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }}
              />
            </div>

            {/* Optional: hint text before AI runs */}
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "0.5rem" }}>
                💡 What's the key thought from your devotional? (optional)
              </label>
              <textarea
                value={userCaption}
                onChange={(e) => setUserCaption(e.target.value)}
                placeholder="e.g. God's grace is sufficient..."
                rows={3}
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "0.625rem 0.75rem",
                  fontSize: "0.9rem",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={generateCaption}
              disabled={generatingCaption}
              style={{
                padding: "0.875rem",
                background: generatingCaption ? "#94a3b8" : PRIMARY,
                color: "white",
                border: "none",
                borderRadius: "14px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: generatingCaption ? "not-allowed" : "pointer",
              }}
            >
              {generatingCaption ? "✨ Generating AI caption..." : "✨ Generate Caption with AI"}
            </button>

            <button
              onClick={() => setStep("compose")}
              style={{
                background: "none",
                border: "1px solid #e2e8f0",
                padding: "0.75rem",
                borderRadius: "12px",
                color: "#64748b",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Skip AI — write caption manually
            </button>
          </>
        )}

        {/* ── STEP 3: Compose ── */}
        {step === "compose" && (
          <>
            {previewUrl && (
              <div style={{ borderRadius: "16px", overflow: "hidden" }}>
                <img
                  src={previewUrl}
                  alt="Devotional"
                  style={{ width: "100%", maxHeight: "200px", objectFit: "cover", display: "block" }}
                />
              </div>
            )}

            {/* AI Caption (editable) */}
            {aiCaption && (
              <div
                style={{
                  background: "#f0f9ff",
                  borderLeft: `3px solid ${PRIMARY}`,
                  borderRadius: "0 12px 12px 0",
                  padding: "0.75rem",
                  fontSize: "0.8125rem",
                  color: "#0c4a6e",
                }}
              >
                <span style={{ fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                  ✨ AI Caption
                </span>
                {aiCaption}
              </div>
            )}

            {/* User's own caption */}
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1rem",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "0.5rem" }}>
                Your Caption / Reflection
              </label>
              <textarea
                value={userCaption}
                onChange={(e) => setUserCaption(e.target.value)}
                placeholder="Write your own reflection here..."
                rows={4}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Suggested Bible verse */}
            {verseText && (
              <div
                style={{
                  background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
                  borderRadius: "14px",
                  padding: "1rem",
                  color: "white",
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.8, marginBottom: "0.25rem" }}>
                  📜 Suggested Verse
                </div>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontStyle: "italic", lineHeight: 1.6 }}>
                  &ldquo;{verseText}&rdquo;
                </p>
                <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.2)", padding: "0.175rem 0.5rem", borderRadius: "999px" }}>
                  — {verseRef}
                </span>
              </div>
            )}

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
              onClick={handlePost}
              type="button"
              color={PRIMARY}
            >
              📖 Share Devotional
            </SubmitButton>
          </>
        )}

        {/* ── STEP 4: Done ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🙌</div>
            <h2 style={{ color: PRIMARY, fontSize: "1.25rem", margin: "0 0 0.5rem" }}>
              Devotional Shared!
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Your devo is now in the community feed. Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
