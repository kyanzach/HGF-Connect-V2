"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

const CATEGORIES = [
  "Electronics", "Clothing", "Furniture", "Books", "Food",
  "Services", "Vehicles", "Home & Garden", "Toys", "Pets", "Other",
];
const CONDITIONS = ["new", "like_new", "good", "fair", "poor"];
const CONDITION_LABELS: Record<string, string> = {
  new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", poor: "For Parts",
};
const LISTING_TYPES = [
  { value: "sale", label: "For Sale", emoji: "🏷️" },
  { value: "free", label: "Free / Donate", emoji: "🎁" },
  { value: "service", label: "Service", emoji: "🛠️" },
  { value: "rent", label: "Rent / Lend", emoji: "🔄" },
  { value: "trade", label: "Trade / Swap", emoji: "🔃" },
];

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "", description: "", listingType: "sale", category: "Other",
    ogPrice: "", discountedPrice: "", priceLabel: "",
    conditionType: "good", locationArea: "", loveGiftAmount: "0",
  });
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing listing data
  useEffect(() => {
    fetch(`/api/marketplace/listings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.listing) return;
        const l = d.listing;
        setForm({
          title: l.title ?? "",
          description: l.description ?? "",
          listingType: l.listingType ?? "sale",
          category: l.category ?? "Other",
          ogPrice: l.ogPrice != null ? String(l.ogPrice) : "",
          discountedPrice: l.discountedPrice != null ? String(l.discountedPrice) : "",
          priceLabel: l.priceLabel ?? "",
          conditionType: l.conditionType ?? "good",
          locationArea: l.locationArea ?? "",
          loveGiftAmount: String(l.loveGiftAmount ?? 0),
        });
        setPhotoPaths(l.photos?.map((p: { photoPath: string }) => p.photoPath) ?? []);
      })
      .catch(() => setError("Failed to load listing"))
      .finally(() => setLoading(false));
  }, [id]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const showDiscount = form.listingType === "sale";
  const loveGiftAmt = parseInt(form.loveGiftAmount) || 0;
  const ogNum = parseFloat(form.ogPrice) || 0;
  const discNum = parseFloat(form.discountedPrice) || 0;

  // Photo delete
  function removePhoto(idx: number) {
    setPhotoPaths((prev) => prev.filter((_, i) => i !== idx));
  }

  // Photo upload
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/marketplace/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, description: form.description,
          listingType: form.listingType, category: form.category,
          ogPrice: form.ogPrice ? parseFloat(form.ogPrice) : null,
          discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
          priceLabel: form.priceLabel || null,
          conditionType: form.conditionType, locationArea: form.locationArea,
          loveGiftAmount: loveGiftAmt,
          photoPaths,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.push(`/marketplace/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Loading…</div>;

  const INPUT_STYLE = {
    width: "100%", border: "none", outline: "none",
    fontSize: "0.95rem", fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box" as const,
  };

  return (
    <div style={{ paddingBottom: "2rem" }}>
      <div style={{ background: PRIMARY, padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>✏️ Edit Listing</h1>
      </div>

      <form onSubmit={handleSave} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Listing Type */}
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.5rem" }}>Listing Type</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {LISTING_TYPES.map(({ value, label, emoji }) => (
              <button key={value} type="button" onClick={() => set("listingType", value)}
                style={{ padding: "0.375rem 0.875rem", borderRadius: "999px", border: `2px solid ${form.listingType === value ? PRIMARY : "#e2e8f0"}`, background: form.listingType === value ? PRIMARY : "white", color: form.listingType === value ? "white" : "#64748b", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Photos — delete + add */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.5rem" }}>Photos (max 5)</label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            {photoPaths.map((path, idx) => (
              <div key={path} style={{ position: "relative", width: 72, height: 72 }}>
                <img src={`/uploads/marketplace/${path}`} alt="photo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ef4444", color: "white", border: "none", fontSize: "0.65rem", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          {photoPaths.length < 5 && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: "none" }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ background: "#f1f5f9", border: `1.5px dashed ${PRIMARY}`, borderRadius: "10px", padding: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600, color: PRIMARY, cursor: uploading ? "wait" : "pointer", fontFamily: "inherit" }}
              >
                {uploading ? "Uploading…" : "+ Add Photos"}
              </button>
            </>
          )}
        </div>

        {/* Title */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.5rem" }}>Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Listing title" style={INPUT_STYLE} />
        </div>

        {/* Description */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.5rem" }}>Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} style={{ ...INPUT_STYLE, resize: "none" }} />
        </div>

        {/* Category + Condition */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} style={{ width: "100%", border: "none", outline: "none", fontSize: "0.875rem", fontFamily: "inherit" }}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Condition</label>
            <select value={form.conditionType} onChange={(e) => set("conditionType", e.target.value)} style={{ width: "100%", border: "none", outline: "none", fontSize: "0.875rem", fontFamily: "inherit" }}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABELS[c]}</option>)}
            </select>
          </div>
        </div>

        {/* Pricing */}
        {form.listingType !== "free" && (
          <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "grid", gridTemplateColumns: showDiscount ? "1fr 1fr" : "1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Original Price (₱)</label>
                <input type="number" value={form.ogPrice} onChange={(e) => set("ogPrice", e.target.value)} placeholder="e.g. 1200" min="0" style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
              {showDiscount && (
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: PRIMARY, display: "block", marginBottom: "0.375rem" }}>🔒 Discounted Price (₱)</label>
                  <input type="number" value={form.discountedPrice} onChange={(e) => set("discountedPrice", e.target.value)} placeholder="e.g. 900" min="0" style={{ width: "100%", border: "1px solid #bae6fd", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#f0f9ff" }} />
                </div>
              )}
            </div>
            {showDiscount && ogNum > 0 && discNum > 0 && discNum < ogNum && (
              <div style={{ marginTop: "0.75rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.625rem 0.875rem" }}>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#166534", fontWeight: 600 }}>
                  ₱{ogNum.toLocaleString()} → ₱{discNum.toLocaleString()} — {Math.round(((ogNum - discNum) / ogNum) * 100)}% off
                </p>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.5rem" }}>Location Area</label>
          <input value={form.locationArea} onChange={(e) => set("locationArea", e.target.value)} placeholder="e.g. Buhangin, Davao City" style={INPUT_STYLE} />
        </div>

        {/* Love Gift */}
        <div style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderRadius: "16px", padding: "1rem", border: "1px solid #fecdd3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#be123c" }}>❤️ Love Gift Amount</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#be123c" }}>{loveGiftAmt > 0 ? `₱${loveGiftAmt}` : "None"}</span>
          </div>
          <input type="number" min="0" step="10" value={form.loveGiftAmount === "0" ? "" : form.loveGiftAmount} onChange={(e) => set("loveGiftAmount", e.target.value || "0")} placeholder="e.g. 100" style={{ width: "100%", border: "1px solid #fecdd3", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "1rem", fontFamily: "inherit", background: "white", color: "#9f1239", outline: "none", boxSizing: "border-box" }} />
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{error}</p>}

        <button type="submit" disabled={submitting} style={{ padding: "0.875rem", background: submitting ? "#94a3b8" : PRIMARY, color: "white", border: "none", borderRadius: "14px", fontSize: "1rem", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>
          {submitting ? "Saving…" : "💾 Save Changes"}
        </button>
      </form>
    </div>
  );
}
