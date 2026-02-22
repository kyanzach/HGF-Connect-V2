"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const PRIMARY = "#4EB1CB";

const CATEGORIES = ["Electronics", "Clothing", "Furniture", "Books", "Food", "Services", "Vehicles", "Home & Garden", "Toys", "Pets", "Other"];
const CONDITIONS = ["new", "like_new", "good", "fair", "poor"];
const CONDITION_LABELS: Record<string, string> = { new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", poor: "For Parts" };

export default function SellPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [form, setForm] = useState({
    title: "",
    description: "",
    listingType: "sell",
    category: "Other",
    price: "",
    priceLabel: "",
    conditionType: "good",
    locationArea: "",
    loveGiftPercent: "0",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: form.price ? parseFloat(form.price) : null,
          loveGiftPercent: parseFloat(form.loveGiftPercent) || 0,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { listing } = await res.json();
      router.push(`/marketplace/${listing.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  const loveGiftPct = parseFloat(form.loveGiftPercent) || 0;
  const examplePrice = parseFloat(form.price) || 500;
  const loveGiftAmount = (examplePrice * loveGiftPct) / 100;

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>📦 Post a Listing</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Type */}
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: "0.5rem" }}>Listing Type</legend>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[["sell","For Sale"],["donate","Free/Donate"],["service","Service"],["buy","Wanted"],["rent","Rent"]].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => set("listingType", v)}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: "999px",
                  border: `2px solid ${form.listingType === v ? PRIMARY : "#e2e8f0"}`,
                  background: form.listingType === v ? PRIMARY : "white",
                  color: form.listingType === v ? "white" : "#64748b",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Title */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Title *</label>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="What are you listing?"
            style={{ width: "100%", border: "none", outline: "none", fontSize: "1rem", fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box" }}
          />
        </div>

        {/* Description */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe your item — condition, size, age, reason for selling..."
            rows={5}
            style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: "0.9rem", fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box" }}
          />
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

        {/* Price + Location */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Price (₱)</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{ width: "100%", border: "none", outline: "none", fontSize: "1rem", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Location</label>
            <input
              value={form.locationArea}
              onChange={(e) => set("locationArea", e.target.value)}
              placeholder="Buhangin, Davao"
              style={{ width: "100%", border: "none", outline: "none", fontSize: "0.875rem", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Love Gift */}
        <div style={{ background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)", borderRadius: "16px", padding: "1rem", border: "1px solid #fecdd3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#be123c" }}>❤️ Love Gift %</span>
            <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "#be123c" }}>{loveGiftPct}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={form.loveGiftPercent}
            onChange={(e) => set("loveGiftPercent", e.target.value)}
            style={{ width: "100%", accentColor: "#ef4444" }}
          />
          <p style={{ fontSize: "0.75rem", color: "#9f1239", margin: "0.5rem 0 0" }}>
            When someone shares your listing and the buyer mentions them, they receive{" "}
            <strong>{loveGiftPct}% of ₱{examplePrice.toLocaleString()} = ₱{loveGiftAmount.toLocaleString()}</strong> as a love gift. 🎁
          </p>
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || !form.title.trim()}
          style={{
            padding: "0.875rem",
            background: submitting || !form.title.trim() ? "#94a3b8" : PRIMARY,
            color: "white",
            border: "none",
            borderRadius: "14px",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: submitting || !form.title.trim() ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Posting..." : "📦 Post Listing"}
        </button>
      </form>
    </div>
  );
}
