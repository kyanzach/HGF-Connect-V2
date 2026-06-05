"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

const PRIMARY = "#4EB1CB";

const POST_TYPES = [
  { value: "DEVO", icon: "📖", label: "Devotional" },
  { value: "PRAISE", icon: "🙌", label: "Testimony" },
  { value: "VERSE_CARD", icon: "📜", label: "Bible Verse" },
  { value: "TEXT", icon: "✍️", label: "Reflection" },
  { value: "PRAYER", icon: "🙏", label: "Prayer" },
];

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export default function CreatePostPage() {
  const router = useRouter();
  const [type, setType] = useState("DEVO");
  const [content, setContent] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [verseText, setVerseText] = useState("");
  const [visibility, setVisibility] = useState("MEMBERS_ONLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  // Link metadata preview states
  const [linkMetadata, setLinkMetadata] = useState<{
    url: string;
    title: string;
    description: string;
    image: string;
  } | null>(null);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const lastCheckedUrl = useRef("");

  // AI improve state
  const [improvingText, setImprovingText] = useState(false);

  // Listen for links in content
  useEffect(() => {
    const match = content.match(URL_REGEX);
    if (match && match[0]) {
      const url = match[0];
      if (url !== lastCheckedUrl.current) {
        lastCheckedUrl.current = url;
        setFetchingMetadata(true);
        fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
          .then((r) => {
            if (!r.ok) throw new Error();
            return r.json();
          })
          .then((data) => {
            setLinkMetadata(data);
          })
          .catch((e) => {
            console.error("Failed to fetch metadata", e);
          })
          .finally(() => {
            setFetchingMetadata(false);
          });
      }
    } else if (!match) {
      lastCheckedUrl.current = "";
      setLinkMetadata(null);
    }
  }, [content]);

  const handleImproveText = async () => {
    if (!content.trim()) return;
    setImprovingText(true);
    setError("");
    try {
      const res = await fetch("/api/ai/improve-testimony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Improvement failed");
      const data = await res.json();
      if (data.improvedContent) {
        setContent(data.improvedContent);
      }
    } catch (err) {
      setError("AI was unable to rewrite at this moment. Please try again.");
    } finally {
      setImprovingText(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !verseText.trim() && !linkMetadata) {
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
        body: JSON.stringify({
          type,
          content,
          verseRef: verseRef || null,
          verseText: verseText || null,
          visibility,
          linkUrl: linkMetadata?.url || null,
          linkTitle: linkMetadata?.title || null,
          linkDesc: linkMetadata?.description || null,
          linkImage: linkMetadata?.image || null,
        }),
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
                ? "Share what God has done in your life! Feel free to write in Bisaya, Tagalog, English, or Taglish... 🙌"
                : type === "DEVO"
                ? "Share your devotional reflection or lesson learned today..."
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

          {/* AI Helper for Testimony */}
          {type === "PRAISE" && content.trim().length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={handleImproveText}
                disabled={improvingText}
                style={{
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #1a7a94 100%)`,
                  color: "white",
                  border: "none",
                  borderRadius: "20px",
                  padding: "0.35rem 0.875rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: improvingText ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  boxShadow: "0 2px 4px rgba(78,177,203,0.2)",
                }}
              >
                {improvingText ? "✨ Improving flow..." : "✨ Make it better with AI"}
              </button>
            </div>
          )}

          {/* Link scraper preview */}
          {fetchingMetadata && (
            <div
              style={{
                borderTop: "1px solid #f1f5f9",
                paddingTop: "0.75rem",
                marginTop: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#64748b",
                fontSize: "0.75rem",
              }}
            >
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
              Fetching link preview...
            </div>
          )}

          {linkMetadata && (
            <div
              style={{
                borderTop: "1px solid #f1f5f9",
                paddingTop: "0.75rem",
                marginTop: "0.75rem",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setLinkMetadata(null);
                  lastCheckedUrl.current = "";
                }}
                style={{
                  position: "absolute",
                  top: "1.25rem",
                  right: "0.5rem",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "22px",
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  zIndex: 10,
                }}
                title="Remove Link"
              >
                ✕
              </button>
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {linkMetadata.image && (
                  <img
                    src={linkMetadata.image}
                    alt={linkMetadata.title}
                    style={{ width: "100%", height: "150px", objectFit: "cover" }}
                  />
                )}
                <div style={{ padding: "0.75rem" }}>
                  <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                    {linkMetadata.title}
                  </h4>
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: "0.75rem",
                      color: "#64748b",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as any,
                      overflow: "hidden",
                      lineHeight: 1.4,
                    }}
                  >
                    {linkMetadata.description}
                  </p>
                  <span style={{ fontSize: "0.7rem", color: PRIMARY, fontWeight: 600 }}>
                    🔗 {new URL(linkMetadata.url).hostname}
                  </span>
                </div>
              </div>
            </div>
          )}

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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
