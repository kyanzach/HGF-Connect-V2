"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const PRIMARY = "#4EB1CB";

const CATEGORIES = [
  "Electronics", "Clothing", "Furniture", "Books", "Food",
  "Services", "Vehicles", "Home & Garden", "Toys", "Pets", "Other",
];
const CONDITIONS = ["new", "like_new", "good", "fair", "na"];
const CONDITION_LABELS: Record<string, string> = {
  new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", na: "N/A",
};
const LISTING_TYPES = [
  { value: "sale",    label: "For Sale",     emoji: "🏷️" },
  { value: "free",    label: "Free / Donate",emoji: "🎁" },
  { value: "service", label: "Service",      emoji: "🛠️" },
  { value: "rent",   label: "Rent / Lend", emoji: "🔄" },
  { value: "trade",   label: "Trade / Swap", emoji: "🔃" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.5rem" }}>{label}</label>
      {children}
    </div>
  );
}

const INPUT_STYLE = {
  width: "100%", border: "none", outline: "none",
  fontSize: "0.95rem", fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box" as const,
};

export default function SellPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [form, setForm] = useState({
    title: "", description: "", listingType: "sale", category: "Other",
    ogPrice: "", discountedPrice: "", priceLabel: "",
    conditionType: "good", locationArea: "", loveGiftAmount: "0",
    videoUrl: "",
  });
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [enhancingTitle, setEnhancingTitle] = useState(false);
  const [enhancingDesc, setEnhancingDesc] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/marketplace/listings/mine")
        .then((res) => res.json())
        .then((data) => {
          if (data.listings && data.listings.length > 0) {
            const lastLocation = data.listings[0].locationArea;
            if (lastLocation) {
              setForm((f) => ({ ...f, locationArea: lastLocation }));
            }
          }
        })
        .catch((err) => console.error("Failed to load last listing location:", err));
    }
  }, [session]);

  async function enhanceTitle() {
    if (!form.title.trim()) return;
    setEnhancingTitle(true);
    try {
      const res = await fetch("/api/ai/enhance-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          listingType: form.listingType,
          category: form.category,
          conditionType: form.conditionType,
          target: "title",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setForm((f) => ({ ...f, title: data.result }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnhancingTitle(false);
    }
  }

  async function enhanceDescription() {
    if (!form.title.trim()) return;
    setEnhancingDesc(true);
    try {
      const res = await fetch("/api/ai/enhance-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          listingType: form.listingType,
          category: form.category,
          conditionType: form.conditionType,
          target: "description",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          setForm((f) => ({ ...f, description: data.result }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEnhancingDesc(false);
    }
  }

  if (!session) {
    return (
      <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#94a3b8" }}>
        <p>Please log in to create a listing.</p>
      </div>
    );
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (photoPaths.length + files.length > 5) { setError("Max 5 photos"); return; }
    setUploading(true); setError("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/marketplace/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
        const data = await res.json();
        uploaded.push(data.photoPath);
      }
      setPhotoPaths((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const isFreeType = form.listingType === "free";
  const isRentOrTrade = form.listingType === "rent" || form.listingType === "trade";
  const showPrice = !isFreeType;
  const showDiscount = form.listingType === "sale";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSubmitting(true); setError("");
    try {
      const finalDescription = form.videoUrl.trim()
        ? `${form.description.trim()}\n\n[video:${form.videoUrl.trim()}]`
        : form.description.trim();

      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: finalDescription || null,
          listingType: form.listingType,
          category: form.category,
          ogPrice: form.ogPrice ? parseFloat(form.ogPrice) : null,
          discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
          priceLabel: form.priceLabel || null,
          conditionType: form.conditionType === "na" ? null : form.conditionType,
          locationArea: form.locationArea,
          loveGiftAmount: parseInt(form.loveGiftAmount) || 0,
          photoPaths,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { listing } = await res.json();
      router.push(`/stewardshop/${listing.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  const loveGiftAmt = parseInt(form.loveGiftAmount) || 0;
  const ogNum = parseFloat(form.ogPrice) || 0;
  const discNum = parseFloat(form.discountedPrice) || 0;

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📦 Post a Listing</h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", opacity: 0.85 }}>
          List items, services, or free giveaways for your church community
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Listing Type */}
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.5rem" }}>Listing Type</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {LISTING_TYPES.map(({ value, label, emoji }) => (
              <button
                key={value} type="button" onClick={() => {
                  setForm(f => ({
                    ...f,
                    listingType: value,
                    ...(value === "service" ? { category: "Services", conditionType: "na" } : {})
                  }));
                }}
                style={{
                  padding: "0.375rem 0.875rem", borderRadius: "999px",
                  border: `2px solid ${form.listingType === value ? PRIMARY : "#e2e8f0"}`,
                  background: form.listingType === value ? PRIMARY : "white",
                  color: form.listingType === value ? "white" : "#64748b",
                  fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.5rem" }}>
            Photos {uploading ? "(Uploading…)" : `(${photoPaths.length}/5)`}
          </label>
          {photoPaths.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {photoPaths.map((path) => (
                <div key={path} style={{ position: "relative", width: 72, height: 72 }}>
                  <img src={`/uploads/marketplace/${path}`} alt="photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                  <button
                    type="button"
                    onClick={() => setPhotoPaths((prev) => prev.filter((p) => p !== path))}
                    style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: "0.65rem", cursor: "pointer", lineHeight: "20px", padding: 0 }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          {photoPaths.length < 5 && (
            <>
              <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
              <button
                type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ width: "100%", border: "2px dashed #bae6fd", borderRadius: "10px", padding: "0.875rem", background: "#f0f9ff", color: "#0369a1", fontSize: "0.875rem", fontWeight: 600, cursor: uploading ? "wait" : "pointer", fontFamily: "inherit" }}
              >
                {uploading ? "Uploading…" : "📷 Add Photos (up to 5)"}
              </button>
            </>
          )}
        </div>

        {/* Title */}
        <Field label="Title *">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              value={form.title} onChange={(e) => set("title", e.target.value)}
              placeholder="What are you listing?" style={INPUT_STYLE}
            />
            {form.title.trim() && (
              <button
                type="button"
                onClick={enhanceTitle}
                disabled={enhancingTitle}
                style={{
                  background: "#e0f7fb",
                  color: PRIMARY,
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: enhancingTitle ? "wait" : "pointer",
                  flexShrink: 0,
                }}
              >
                {enhancingTitle ? "Enhancing..." : "✨ AI Enhance"}
              </button>
            )}
          </div>
        </Field>

        {/* Description */}
        <Field label="Description">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <textarea
              value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="Describe your item — condition, size, reason for selling…"
              rows={4} style={{ ...INPUT_STYLE, resize: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={enhanceDescription}
                disabled={enhancingDesc || !form.title.trim()}
                style={{
                  background: "#e0f7fb",
                  color: PRIMARY,
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: (enhancingDesc || !form.title.trim()) ? "not-allowed" : "pointer",
                }}
              >
                {enhancingDesc ? "Enhancing..." : "✨ Enhance with AI"}
              </button>
            </div>
          </div>
        </Field>

        {/* Video URL */}
        <Field label="Video URL (optional)">
          <input
            value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)}
            placeholder="Copy link from Facebook videos/reels..." style={INPUT_STYLE}
          />
          <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0.25rem 0 0" }}>
            Paste the link to your Facebook video or reel to feature it first in the media carousel
          </p>
        </Field>

        {/* Category + Condition */}
        <div style={{ display: "grid", gridTemplateColumns: form.category === "Services" || form.listingType === "service" || form.conditionType === "na" ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Category</label>
            <select value={form.category} onChange={(e) => {
              const cat = e.target.value;
              setForm(f => ({ ...f, category: cat, ...(cat === "Services" ? { conditionType: "na" } : {}) }));
            }} style={{ width: "100%", border: "none", outline: "none", fontSize: "0.875rem", fontFamily: "inherit" }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {form.category !== "Services" && form.listingType !== "service" && form.conditionType !== "na" && (
            <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Condition</label>
              <select value={form.conditionType} onChange={(e) => set("conditionType", e.target.value)} style={{ width: "100%", border: "none", outline: "none", fontSize: "0.875rem", fontFamily: "inherit" }}>
                {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Pricing */}
        {showPrice && (
          <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "grid", gridTemplateColumns: showDiscount ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>
                  {showDiscount ? "Original Price (₱) *" : "Price (₱)"}
                </label>
                <input
                  type="number" value={form.ogPrice} onChange={(e) => set("ogPrice", e.target.value)}
                  placeholder="e.g. 1200" min="0" step="1"
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
                {showDiscount && <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: "0.25rem 0 0" }}>Visible to everyone</p>}
              </div>
              {showDiscount && (
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: PRIMARY, display: "block", marginBottom: "0.375rem" }}>
                    🔒 Discounted Price (₱)
                  </label>
                  <input
                    type="number" value={form.discountedPrice} onChange={(e) => set("discountedPrice", e.target.value)}
                    placeholder="e.g. 900" min="0" step="1"
                    style={{ width: "100%", border: "1px solid #bae6fd", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#f0f9ff" }}
                  />
                  <p style={{ fontSize: "0.7rem", color: "#0369a1", margin: "0.25rem 0 0" }}>Revealed only after prospect submits info</p>
                </div>
              )}
            </div>
            {showDiscount && ogNum > 0 && discNum > 0 && discNum < ogNum && (
              <div style={{ marginTop: "0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.625rem 0.875rem" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#166534", fontWeight: 600 }}>
                  ₱{ogNum.toLocaleString()} → ₱{discNum.toLocaleString()} — saving ₱{(ogNum - discNum).toLocaleString()} ({Math.round(((ogNum - discNum) / ogNum) * 100)}% off)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Price Label (for non-cash listing types) */}
        {(isRentOrTrade || isFreeType) && (
          <Field label="Price Label (optional)">
            <input
              value={form.priceLabel} onChange={(e) => set("priceLabel", e.target.value)}
              placeholder={isFreeType ? "e.g. Free to pickup" : "e.g. For rent, 1 week"}
              style={INPUT_STYLE}
            />
          </Field>
        )}

        {/* Location */}
        <Field label="Location Area">
          <input
            value={form.locationArea} onChange={(e) => set("locationArea", e.target.value)}
            placeholder="e.g. Buhangin, Davao City" style={INPUT_STYLE}
          />
        </Field>

        {/* Love Gift */}
        <div style={{ background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", borderRadius: "16px", padding: "1rem", border: "1px solid #fecdd3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#be123c" }}>❤️ Share &amp; Bless — Love Gift</span>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.7rem", color: "#9f1239", lineHeight: 1.4 }}>
                A fixed thank-you for whoever helps share your listing and leads to a confirmed sale.
              </p>
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#be123c", flexShrink: 0, marginLeft: "0.5rem" }}>
              {loveGiftAmt > 0 ? `₱${loveGiftAmt.toLocaleString()}` : "None"}
            </span>
          </div>
          <input
            type="number" min="0" step="10"
            value={form.loveGiftAmount === "0" ? "" : form.loveGiftAmount}
            onChange={(e) => set("loveGiftAmount", e.target.value || "0")}
            placeholder="e.g. 100"
            style={{ width: "100%", border: "1px solid #fecdd3", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "1rem", fontFamily: "inherit", background: "white", color: "#9f1239", outline: "none", boxSizing: "border-box" }}
          />
          <p style={{ fontSize: "0.75rem", color: "#9f1239", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
            {loveGiftAmt > 0
              ? `Sharers earn ₱${loveGiftAmt.toLocaleString()} per confirmed sale via their link. 🎁`
              : "No Love Gift set. Add one to motivate members to share your listing!"}
          </p>
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.title.trim() || uploading}
          style={{
            padding: "0.875rem",
            background: (submitting || !form.title.trim() || uploading) ? "#94a3b8" : PRIMARY,
            color: "white", border: "none", borderRadius: "14px",
            fontSize: "1rem", fontWeight: 700,
            cursor: (submitting || !form.title.trim() || uploading) ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Posting…" : "📦 Post Listing"}
        </button>
      </form>
    </div>
  );
}
