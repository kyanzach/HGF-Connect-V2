"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

const PRIMARY = "#4EB1CB";
const PURPLE = "#7c3aed";

const PRIMARY_TABS = [
  { value: "thoughts", icon: "✍️", label: "Thoughts" },
  { value: "testimony", icon: "🙌", label: "Testimony" },
  { value: "prayer", icon: "🙏", label: "Prayer" },
];

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const EMOJIS = ["🙏", "🙌", "❤️", "✨", "📖", "📜", "🕊️", "⛪", "😊", "👍", "🎉", "🔥", "🌟", "💡", "👏"];

function getPostBgStyle(bgName: string | null | undefined): React.CSSProperties | undefined {
  if (!bgName) return undefined;
  switch (bgName) {
    case "bg:teal":
      return {
        background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
        color: "#ffffff",
      };
    case "bg:red":
      return {
        background: "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)",
        color: "#ffffff",
      };
    case "bg:mountain":
      return {
        background: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/backgrounds/mountain.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#ffffff",
      };
    case "bg:ocean":
      return {
        background: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/backgrounds/ocean.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#ffffff",
      };
    default:
      return undefined;
  }
}

export default function CreatePostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");

  const [activeTab, setActiveTab] = useState(
    tabParam === "prayer" ? "prayer" : (tabParam === "testimony" ? "testimony" : "thoughts")
  );
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("MEMBERS_ONLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  // Background and Emoji UI States
  const [selectedBg, setSelectedBg] = useState("");
  const [showBgOptions, setShowBgOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Testimony and Prayer photo states
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      if (photos.length + selectedFiles.length > 21) {
        setError("You can upload a maximum of 21 photos. 📸");
        const allowedSlots = 21 - photos.length;
        if (allowedSlots <= 0) return;
        const slicedFiles = selectedFiles.slice(0, allowedSlots);
        setPhotos((prev) => [...prev, ...slicedFiles]);
        const newPreviews = slicedFiles.map((file) => URL.createObjectURL(file));
        setPhotoPreviews((prev) => [...prev, ...newPreviews]);
      } else {
        setError("");
        setPhotos((prev) => [...prev, ...selectedFiles]);
        const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
        setPhotoPreviews((prev) => [...prev, ...newPreviews]);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Textarea Ref for size auto-adjust and emoji focus insertion
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Link metadata preview states
  const [linkMetadata, setLinkMetadata] = useState<{
    url: string;
    title: string;
    description: string;
    image: string;
  } | null>(null);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const lastCheckedUrl = useRef("");
  const closedUrl = useRef("");

  // Auto-resize textarea depending on content & selected background
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content, selectedBg]);

  // Listen for links in content
  useEffect(() => {
    const match = content.match(URL_REGEX);
    if (match && match[0]) {
      const url = match[0];
      if (url !== lastCheckedUrl.current && url !== closedUrl.current) {
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
      if (!content.trim()) {
        setLinkMetadata(null);
        lastCheckedUrl.current = "";
        closedUrl.current = "";
      } else {
        lastCheckedUrl.current = "";
        closedUrl.current = "";
      }
    }
  }, [content]);

  // AI improve state
  const [improvingText, setImprovingText] = useState(false);
  const [showLangSelector, setShowLangSelector] = useState(false);
  const [improvingLang, setImprovingLang] = useState<string | null>(null);

  const handleImproveText = async (lang: string) => {
    if (!content.trim()) return;
    setImprovingText(true);
    setImprovingLang(lang);
    setShowLangSelector(false);
    setError("");
    try {
      const res = await fetch("/api/ai/improve-testimony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language: lang }),
      });
      if (!res.ok) throw new Error("Improvement failed");
      const data = await res.json();
      if (data.improvedContent) {
        let cleaned = data.improvedContent.trim();
        const quoteChars = ["\"", "'", "“", "”", "‘", "’"];
        while (
          cleaned.length >= 2 &&
          quoteChars.includes(cleaned[0]) &&
          quoteChars.includes(cleaned[cleaned.length - 1])
        ) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        setContent(cleaned);
      }
    } catch (err) {
      setError("AI was unable to rewrite at this moment. Please try again.");
    } finally {
      setImprovingText(false);
      setImprovingLang(null);
    }
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((c) => c + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newContent = text.substring(0, start) + emoji + text.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !linkMetadata && photos.length === 0) {
      setError("Write something to share first! ✍️");
      setShakeKey((k) => k + 1);
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      if (activeTab === "testimony") {
        // 1. Upload Photos first
        const uploadedPhotoPaths: string[] = [];
        for (const photo of photos) {
          const formData = new FormData();
          formData.append("file", photo);

          const uploadRes = await fetch("/api/testimonies/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) throw new Error("Failed to upload photo");
          const uploadData = await uploadRes.json();
          uploadedPhotoPaths.push(uploadData.photoPath);
        }

        // 2. Submit Testimony
        const res = await fetch("/api/testimonies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            photos: uploadedPhotoPaths,
          }),
        });

        if (!res.ok) throw new Error("Failed to submit testimony");
      } else {
        // 1. Upload post/prayer photos if activeTab is prayer
        const uploadedPhotoPaths: string[] = [];
        if (activeTab === "prayer") {
          for (const photo of photos) {
            const formData = new FormData();
            formData.append("file", photo);

            const uploadRes = await fetch("/api/posts/upload", {
              method: "POST",
              body: formData,
            });

            if (!uploadRes.ok) throw new Error("Failed to upload photo");
            const uploadData = await uploadRes.json();
            uploadedPhotoPaths.push(uploadData.photoPath);
          }
        }

        // 2. Submit post
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: activeTab === "thoughts" ? "TEXT" : "PRAYER",
            content: content || null,
            imageUrl: (activeTab === "thoughts" ? selectedBg : null) || null,
            verseRef: null,
            verseText: null,
            visibility,
            linkUrl: linkMetadata?.url || null,
            linkTitle: linkMetadata?.title || null,
            linkDesc: linkMetadata?.description || null,
            linkImage: linkMetadata?.image || null,
            photos: uploadedPhotoPaths,
          }),
        });

        if (!res.ok) throw new Error("Failed to post");
      }

      router.push("/feed");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {activeTab === "prayer" ? "Submit Prayer Request" : "Share with the Community"}
          </h2>
        </div>
        {activeTab === "prayer" && (
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem", paddingLeft: "1.85rem" }}>
            The community will pray with you
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Streamlined Primary Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1rem",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "0.5rem",
          }}
        >
          {PRIMARY_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                setActiveTab(t.value);
                setError("");
                if (t.value !== "thoughts") {
                  setSelectedBg("");
                  setShowBgOptions(false);
                } else {
                  setPhotos([]);
                  setPhotoPreviews([]);
                }
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.375rem",
                padding: "0.6rem 0.5rem",
                borderRadius: "10px",
                border: "none",
                background: activeTab === t.value ? (activeTab === "prayer" ? "#f3e8ff" : "#e0f7fb") : "transparent",
                color: activeTab === t.value ? (activeTab === "prayer" ? PURPLE : PRIMARY) : "#64748b",
                fontWeight: activeTab === t.value ? 700 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === "testimony" && (
          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", marginBottom: "1rem", fontSize: "0.875rem", color: "#475569" }}>
            Share what God has done in your life! Feel free to write in Cebuano, Taglish, or English in your own words.
          </div>
        )}

        {/* Content Card container with custom background option */}
        <div
          style={{
            borderRadius: "16px",
            padding: "1.25rem",
            marginBottom: "0.75rem",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            transition: "all 0.3s ease",
            position: "relative",
            ...(activeTab === "thoughts" && selectedBg ? {
              minHeight: "280px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              ...getPostBgStyle(selectedBg)
            } : {
              background: "white",
              border: "1px solid #e2e8f0",
            })
          }}
        >
          {/* Label inside card for Testimonies */}
          {activeTab === "testimony" && (
            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
              Your Testimony
            </div>
          )}

          {/* Label inside card for Prayer Requests */}
          {activeTab === "prayer" && (
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem" }}>
              Your Prayer Request
            </div>
          )}

          {/* Text Area */}
          <div style={activeTab === "thoughts" && selectedBg ? { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" } : undefined}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                activeTab === "prayer"
                  ? "Share your prayer request with the community..."
                  : activeTab === "testimony"
                  ? "Salamat sa Ginoo kay..."
                  : "What are your thoughts?"
              }
              rows={activeTab === "thoughts" && selectedBg ? 3 : 5}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                resize: "none",
                fontSize: activeTab === "thoughts" && selectedBg ? "1.35rem" : "0.9375rem",
                fontWeight: activeTab === "thoughts" && selectedBg ? 800 : 500,
                color: activeTab === "thoughts" && selectedBg ? "white" : "#1e293b",
                textAlign: activeTab === "thoughts" && selectedBg ? "center" : "left",
                textShadow: activeTab === "thoughts" && selectedBg ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                lineHeight: 1.65,
                fontFamily: "inherit",
                boxSizing: "border-box",
                background: "transparent",
              }}
            />
          </div>

          {/* AI Helper rewrite (All tabs thoughts, prayer, testimony) */}
          {content.trim().length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              {showLangSelector ? (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", marginRight: "0.25rem", fontWeight: 600 }}>Rewrite in:</span>
                  {["Cebuano", "Taglish", "English"].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleImproveText(lang)}
                      disabled={improvingText}
                      style={{
                        background: activeTab === "prayer" ? PURPLE : PRIMARY,
                        color: "white",
                        border: "none",
                        borderRadius: "16px",
                        padding: "0.3rem 0.8rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: improvingText ? "not-allowed" : "pointer",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        transition: "transform 0.1s",
                      }}
                    >
                      {lang}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowLangSelector(false)}
                    disabled={improvingText}
                    style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      border: "none",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: improvingText ? "not-allowed" : "pointer",
                      marginLeft: "0.25rem",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLangSelector(true)}
                  disabled={improvingText}
                  style={{
                    background: activeTab === "prayer"
                      ? `linear-gradient(135deg, ${PURPLE} 0%, #5b21b6 100%)`
                      : `linear-gradient(135deg, ${PRIMARY} 0%, #1a7a94 100%)`,
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
                    boxShadow: activeTab === "prayer"
                      ? "0 2px 4px rgba(124,58,237,0.2)"
                      : "0 2px 4px rgba(78,177,203,0.2)",
                  }}
                >
                  {improvingText ? `✨ Improving flow in ${improvingLang}...` : "✨ Make it better with AI"}
                </button>
              )}
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
                  closedUrl.current = lastCheckedUrl.current || (linkMetadata ? linkMetadata.url : "");
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
                  <span style={{ fontSize: "0.7rem", color: activeTab === "prayer" ? PURPLE : PRIMARY, fontWeight: 600 }}>
                    🔗 {new URL(linkMetadata.url).hostname}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom control row: "Aa" backgrounds selector and Smiley Emoji button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              borderTop: `1px solid ${selectedBg ? "rgba(255,255,255,0.15)" : "#f1f5f9"}`,
              paddingTop: "0.75rem",
            }}
          >
            {/* Left: Aa color toggler and circular buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {activeTab === "thoughts" && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowBgOptions(!showBgOptions)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      background: "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)",
                      cursor: "pointer",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                    title="Toggle backgrounds"
                  >
                    Aa
                  </button>

                  {showBgOptions && (
                    <div style={{ display: "flex", gap: "0.375rem", alignItems: "center", animation: "fadeIn 0.2s" }}>
                      {/* Clear Bg Circle */}
                      <button
                        type="button"
                        onClick={() => setSelectedBg("")}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: `2px solid ${selectedBg === "" ? PRIMARY : "#cbd5e1"}`,
                          background: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "#64748b"
                        }}
                        title="Plain Background"
                      >
                        ✕
                      </button>

                      {/* Teal Circle */}
                      <button
                        type="button"
                        onClick={() => setSelectedBg("bg:teal")}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: `2px solid ${selectedBg === "bg:teal" ? "#ffffff" : "transparent"}`,
                          background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}
                        title="Teal Theme"
                      />

                      {/* Red Circle */}
                      <button
                        type="button"
                        onClick={() => setSelectedBg("bg:red")}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: `2px solid ${selectedBg === "bg:red" ? "#ffffff" : "transparent"}`,
                          background: "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}
                        title="Red Theme"
                      />

                      {/* Mountain Image Circle */}
                      <button
                        type="button"
                        onClick={() => setSelectedBg("bg:mountain")}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: `2px solid ${selectedBg === "bg:mountain" ? "#ffffff" : "transparent"}`,
                          background: "url('/backgrounds/mountain.png') center/cover no-repeat",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}
                        title="Mountain Theme"
                      />

                      {/* Ocean Image Circle */}
                      <button
                        type="button"
                        onClick={() => setSelectedBg("bg:ocean")}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "50%",
                          border: `2px solid ${selectedBg === "bg:ocean" ? "#ffffff" : "transparent"}`,
                          background: "url('/backgrounds/ocean.png') center/cover no-repeat",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}
                        title="Ocean Theme"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Emoji Picker Toggler Button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.25rem",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  transition: "background 0.2s",
                }}
                title="Add Emoji"
              >
                😊
              </button>

              {/* Emoji Picker absolute menu */}
              {showEmojiPicker && (
                <>
                  <div
                    onClick={() => setShowEmojiPicker(false)}
                    style={{ position: "fixed", inset: 0, zIndex: 99 }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "2.75rem",
                      right: 0,
                      background: "white",
                      borderRadius: "12px",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                      padding: "0.5rem",
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: "0.375rem",
                      zIndex: 100,
                      border: "1px solid #cbd5e1",
                      width: "180px",
                    }}
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "1.25rem",
                          cursor: "pointer",
                          padding: "0.25rem",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.1s",
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Photo Upload (Testimony and Prayer Tabs) */}
        {(activeTab === "testimony" || activeTab === "prayer") && (
          <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
              Add Photos (Optional)
            </label>
            
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp"
              multiple
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
            />
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {photoPreviews.map((preview, i) => (
                <div key={i} style={{ position: "relative", width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  <img src={preview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    style={{
                      position: "absolute", top: 4, right: 4,
                      background: "rgba(0,0,0,0.5)", color: "white", border: "none",
                      borderRadius: "50%", width: "20px", height: "20px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", cursor: "pointer"
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              {photos.length < 21 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "80px", height: "80px", borderRadius: "8px",
                    border: "2px dashed #cbd5e1", background: "#f8fafc",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    color: "#64748b", cursor: "pointer", gap: "0.25rem"
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>+</span>
                  <span style={{ fontSize: "0.65rem", fontWeight: 600 }}>Add</span>
                </button>
              )}
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b", marginTop: "0.5rem" }}>
              <span>Max 21 photos</span>
              <span>{photos.length} / 21 selected</span>
            </div>
          </div>
        )}

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
            border: "1px solid #e2e8f0",
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
          color={activeTab === "prayer" ? PURPLE : PRIMARY}
        >
          {activeTab === "prayer" ? "🙏 Submit Prayer Request" : (activeTab === "testimony" ? "🙌 Post Testimony" : "✍️ Post Thoughts")}
        </SubmitButton>

        {activeTab === "prayer" && (
          <span
            style={{
              display: "block",
              fontSize: "0.75rem",
              color: "#64748b",
              textAlign: "center",
              marginTop: "0.75rem",
              lineHeight: 1.45,
            }}
          >
            Your request will be visible on the Prayer Wall for the community to pray over.
          </span>
        )}
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
