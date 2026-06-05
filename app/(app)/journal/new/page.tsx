"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

const PRIMARY = "#4EB1CB";

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
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [verseRef, setVerseRef] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  
  // Editor states
  const editorRef = useRef<HTMLDivElement>(null);
  const [htmlMode, setHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState("<p><br></p>");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  // Load existing entry for editing
  useEffect(() => {
    if (!editId) return;

    fetch(`/api/journal/${editId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setTitle(data.title || "");
        setMood(data.mood || "");
        setVerseRef(data.verseRef || "");
        setVisibility(data.visibility || "PRIVATE");
        setRawHtml(data.content || "<p><br></p>");
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || "<p><br></p>";
        }
      })
      .catch(() => {
        setError("Failed to load Grace Note for editing.");
      });
  }, [editId]);

  // Sync state between visual div and htmlMode textarea
  const handleEditorInput = () => {
    if (editorRef.current) {
      setRawHtml(editorRef.current.innerHTML);
    }
  };

  const toggleHtmlMode = () => {
    if (htmlMode) {
      // Switching from HTML textarea back to Visual contentEditable
      if (editorRef.current) {
        editorRef.current.innerHTML = rawHtml;
      }
      setHtmlMode(false);
    } else {
      // Switching from Visual to HTML
      if (editorRef.current) {
        setRawHtml(editorRef.current.innerHTML);
      }
      setHtmlMode(true);
    }
  };

  // execCommand tool helpers
  const format = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    handleEditorInput();
    if (editorRef.current) editorRef.current.focus();
  };

  const insertLink = () => {
    const url = prompt("Enter the URL:");
    if (url) format("createLink", url);
  };

  const insertImage = () => {
    const url = prompt("Enter image URL:");
    if (url) format("insertImage", url);
  };

  const getYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
  };

  const insertVideoEmbed = () => {
    const url = prompt("Enter video link (YouTube, Facebook, or Instagram):");
    if (!url) return;

    let embedHtml = "";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = getYoutubeId(url);
      if (videoId) {
        embedHtml = `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius:12px; margin:0.5rem 0;"></iframe>`;
      }
    } else if (url.includes("facebook.com")) {
      embedHtml = `<iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false" width="100%" height="315" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" style="border-radius:12px; border:none; margin:0.5rem 0;"></iframe>`;
    } else if (url.includes("instagram.com")) {
      const cleanUrl = url.split("?")[0].replace(/\/$/, "");
      embedHtml = `<iframe src="${cleanUrl}/embed/" width="100%" height="450" frameborder="0" scrolling="no" allowtransparency="true" style="border-radius:12px; border:1px solid #e2e8f0; margin:0.5rem 0;"></iframe>`;
    }

    if (embedHtml) {
      // Visual mode focus insertion
      if (htmlMode) {
        setRawHtml((prev) => prev + `\n<div class="grace-note-video">${embedHtml}</div>\n`);
      } else {
        if (editorRef.current) {
          editorRef.current.focus();
          document.execCommand("insertHTML", false, `<div class="grace-note-video" style="margin:1rem 0;">${embedHtml}</div><p><br></p>`);
          handleEditorInput();
        }
      }
    } else {
      setError("Invalid or unsupported video URL. Please paste a valid YouTube, Facebook, or Instagram link.");
    }
  };

  async function handleSave() {
    const finalContent = htmlMode ? rawHtml : (editorRef.current?.innerHTML ?? "");
    if (!finalContent.replace(/<[^>]*>/g, "").trim()) {
      setError("Please write some content first. ✍️");
      setShakeKey((k) => k + 1);
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      title: title.trim() || null,
      content: finalContent,
      mood: mood || null,
      verseRef: verseRef.trim() || null,
      visibility,
    };

    try {
      const url = editId ? `/api/journal/${editId}` : "/api/journal";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      router.push("/journal");
      router.refresh();
    } catch {
      setError("Failed to save Grace Note. Please check connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`,
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
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            {editId ? "Edit Grace Note" : "New Grace Note 📝"}
          </h1>
          <p style={{ margin: 0, fontSize: "0.65rem", opacity: 0.85 }}>
            {editId ? "Update your published article" : "Write your walk of faith story"}
          </p>
        </div>
        <SubmitButton
          loading={submitting}
          shakeKey={shakeKey}
          color="rgba(255,255,255,0.25)"
          disabledColor="rgba(255,255,255,0.12)"
          type="button"
          onClick={handleSave}
          style={{
            width: "auto",
            padding: "0.375rem 0.875rem",
            borderRadius: "999px",
            fontSize: "0.8125rem",
            border: "1px solid rgba(255,255,255,0.4)",
            gap: "0.375rem",
          }}
        >
          {!submitting && <>{editId ? "Update" : "Publish"} ✓</>}
        </SubmitButton>
      </div>

      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem", flex: 1 }}>
        {/* Mood Selector */}
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.375rem" }}>
            How are you feeling today?
          </p>
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", scrollbarWidth: "none" }}>
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(mood === m.value ? "" : m.value)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.5rem 0.625rem",
                  background: mood === m.value ? "#e0f7fb" : "white",
                  border: `1.5px solid ${mood === m.value ? PRIMARY : "#e2e8f0"}`,
                  borderRadius: "12px",
                  cursor: "pointer",
                  flexShrink: 0,
                  minWidth: "56px",
                }}
              >
                <span style={{ fontSize: "1.375rem" }}>{m.emoji}</span>
                <span style={{ fontSize: "0.6rem", fontWeight: 600, color: mood === m.value ? PRIMARY : "#94a3b8" }}>
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
          placeholder="Grace Note Title..."
          style={{
            border: "none",
            borderBottom: "1.5px solid #e2e8f0",
            padding: "0.5rem 0",
            fontSize: "1.125rem",
            fontWeight: 800,
            color: "#1e293b",
            outline: "none",
            fontFamily: "inherit",
            background: "transparent",
            width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* ── WordPress-style WYSIWYG Toolbar ── */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            padding: "0.375rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.25rem",
            alignItems: "center",
          }}
        >
          {/* Bold, Italic, Underline, Strike */}
          <button type="button" onClick={() => format("bold")} style={btnStyle} title="Bold"><b>B</b></button>
          <button type="button" onClick={() => format("italic")} style={btnStyle} title="Italic"><i>I</i></button>
          <button type="button" onClick={() => format("underline")} style={btnStyle} title="Underline"><u>U</u></button>
          <button type="button" onClick={() => format("strikeThrough")} style={btnStyle} title="Strikethrough"><s>S</s></button>
          
          <div style={dividerStyle} />

          {/* Heading buttons */}
          <button type="button" onClick={() => format("formatBlock", "<h1>")} style={btnStyle} title="Header 1">H1</button>
          <button type="button" onClick={() => format("formatBlock", "<h2>")} style={btnStyle} title="Header 2">H2</button>
          <button type="button" onClick={() => format("formatBlock", "<p>")} style={btnStyle} title="Normal text">P</button>

          <div style={dividerStyle} />

          {/* Lists */}
          <button type="button" onClick={() => format("insertUnorderedList")} style={btnStyle} title="Bullet List">•📖</button>
          <button type="button" onClick={() => format("insertOrderedList")} style={btnStyle} title="Number List">1.📖</button>

          <div style={dividerStyle} />

          {/* Alignment */}
          <button type="button" onClick={() => format("justifyLeft")} style={btnStyle} title="Align Left">←</button>
          <button type="button" onClick={() => format("justifyCenter")} style={btnStyle} title="Align Center">↔</button>
          <button type="button" onClick={() => format("justifyRight")} style={btnStyle} title="Align Right">→</button>

          <div style={dividerStyle} />

          {/* Insert Tools */}
          <button type="button" onClick={insertLink} style={btnStyle} title="Insert Link">🔗</button>
          <button type="button" onClick={insertImage} style={btnStyle} title="Insert Image">📷</button>
          <button type="button" onClick={insertVideoEmbed} style={btnStyle} title="Embed Video (YouTube, Facebook, Instagram)">📹</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem" }} />

          {/* HTML Code View Toggle */}
          <button
            type="button"
            onClick={toggleHtmlMode}
            style={{
              ...btnStyle,
              background: htmlMode ? "#cbd5e1" : "none",
              fontWeight: 700,
              fontSize: "0.75rem",
              width: "auto",
              padding: "0 0.5rem",
              borderRadius: "4px",
            }}
            title="Toggle Raw HTML Code"
          >
            {htmlMode ? "👁 Visual" : "‹/› HTML"}
          </button>
        </div>

        {/* Editor Area */}
        <div style={{ flex: 1, position: "relative", minHeight: "260px" }}>
          {htmlMode ? (
            <textarea
              value={rawHtml}
              onChange={(e) => setRawHtml(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "260px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "0.75rem",
                fontSize: "0.875rem",
                fontFamily: "monospace",
                color: "#0f172a",
                outline: "none",
                background: "#fafafa",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              onInput={handleEditorInput}
              style={{
                width: "100%",
                height: "100%",
                minHeight: "260px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "12px",
                padding: "0.875rem",
                fontSize: "0.9375rem",
                color: "#1e293b",
                lineHeight: 1.7,
                outline: "none",
                background: "white",
                overflowY: "auto",
                boxSizing: "border-box",
              }}
              data-placeholder="Start writing your walk of faith story..."
            />
          )}
        </div>

        {/* Bible Verse Reference */}
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.875rem" }}>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#64748b", marginBottom: "0.375rem" }}>
            📜 Bible Verse Reference (Optional)
          </label>
          <input
            value={verseRef}
            onChange={(e) => setVerseRef(e.target.value)}
            placeholder="e.g. John 3:16"
            style={{
              width: "100%",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Visibility Setting */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1px solid #cbd5e1",
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#475569" }}>
            🔒 Visibility Setting
          </span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            style={{
              border: "1.5px solid #cbd5e1",
              borderRadius: "8px",
              padding: "0.3rem 0.625rem",
              fontSize: "0.8125rem",
              color: "#1e293b",
              outline: "none",
              background: "white",
              fontWeight: 600,
            }}
          >
            <option value="PRIVATE">🔒 Only Me (Private)</option>
            <option value="MEMBERS_ONLY">👥 Members Only</option>
            <option value="PUBLIC">🌐 Public (SEO Indexable)</option>
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
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        <style>{`
          div[contentEditable="true"]:empty:before {
            content: attr(data-placeholder);
            color: #94a3b8;
          }
        `}</style>
      </div>
    </div>
  );
}

// Styling components
const btnStyle = {
  background: "none",
  border: "none",
  borderRadius: "4px",
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.875rem",
  color: "#475569",
  cursor: "pointer",
  transition: "background 0.15s",
  outline: "none",
  fontFamily: "inherit",
} as any;

const dividerStyle = {
  width: "1px",
  height: "20px",
  background: "#cbd5e1",
  margin: "0 0.25rem",
};
