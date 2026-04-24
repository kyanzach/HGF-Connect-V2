"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";

const PRIMARY = "#4EB1CB";

export default function CreateTestimonyPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  
  // AI Results
  const [translatedContent, setTranslatedContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  const [aiProcessing, setAiProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...selectedFiles]);
      
      const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const processWithAI = async () => {
    if (!content.trim()) {
      setError("Please write your testimony first before translating. ✍️");
      return;
    }

    setAiProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/ai/process-testimony", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed to process with AI");

      const data = await res.json();
      setTranslatedContent(data.translatedContent);
      setCategory(data.category);
      setTags(data.tags || []);
    } catch (err) {
      setError("AI Processing failed. Please try again or submit without AI translation.");
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please write your testimony. ✍️");
      setShakeKey((k) => k + 1);
      return;
    }
    setSubmitting(true);
    setError("");

    try {
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
          translatedContent,
          category,
          tags,
          photos: uploadedPhotoPaths,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit testimony");
      router.push("/feed"); // Redirect to community feed
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
          Share Your Testimony
        </h2>
      </div>

      <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", marginBottom: "1rem", fontSize: "0.875rem", color: "#475569" }}>
        Share what God has done in your life! You can write in Bisaya or English. Tap the ✨ AI button to automatically translate it and help us categorize your story.
      </div>

      <form onSubmit={handleSubmit}>
        {/* Bisaya / Original Content */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
            Your Story (Bisaya / English)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Salamat sa Ginoo kay..."
            rows={6}
            style={{
              width: "100%",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "0.75rem",
              fontSize: "0.9375rem",
              color: "#1e293b",
              lineHeight: 1.65,
              fontFamily: "inherit",
              boxSizing: "border-box",
              resize: "none",
            }}
          />
          
          <button
            type="button"
            onClick={processWithAI}
            disabled={aiProcessing || !content.trim()}
            style={{
              marginTop: "0.75rem",
              background: aiProcessing ? "#e2e8f0" : "#fffbeb",
              color: aiProcessing ? "#94a3b8" : "#d97706",
              border: `1px solid ${aiProcessing ? "#e2e8f0" : "#fde68a"}`,
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: aiProcessing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            {aiProcessing ? "Processing..." : "✨ Process with AI (Translate & Tag)"}
          </button>
        </div>

        {/* AI Results Preview */}
        {(translatedContent || category) && (
          <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e0f7fb" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: PRIMARY, textTransform: "uppercase", letterSpacing: "0.05em" }}>AI Translation</span>
              {category && (
                <span style={{ background: PRIMARY, color: "white", padding: "0.15rem 0.5rem", borderRadius: "99px", fontSize: "0.7rem", fontWeight: 600 }}>
                  {category}
                </span>
              )}
            </div>
            
            <textarea
              value={translatedContent}
              onChange={(e) => setTranslatedContent(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                border: "none",
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "0.75rem",
                fontSize: "0.9375rem",
                color: "#1e293b",
                lineHeight: 1.65,
                fontFamily: "inherit",
                boxSizing: "border-box",
                resize: "none",
              }}
            />
            
            {tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.75rem" }}>
                {tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: "0.7rem", color: "#64748b", background: "#f1f5f9", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photo Upload */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
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
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "0.625rem", color: "#ef4444", fontSize: "0.85rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            ⚠️ {error}
          </div>
        )}

        <SubmitButton
          loading={submitting}
          shakeKey={shakeKey}
          color={PRIMARY}
        >
          Share Testimony 🙌
        </SubmitButton>
      </form>
    </div>
  );
}
