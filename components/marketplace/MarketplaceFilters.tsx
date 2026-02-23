"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "sale", label: "For Sale" },
  { value: "free", label: "Free" },
  { value: "trade", label: "Trade" },
  { value: "service", label: "Service" },
  { value: "borrow", label: "Borrow" },
  { value: "official_store", label: "Official Store" },
];

const PRIMARY = "#4EB1CB";

interface Props {
  q: string;
  listingType: string;
  minPrice: string;
  maxPrice: string;
}

export default function MarketplaceFilters({ q, listingType, minPrice, maxPrice }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(q);
  const [type, setType] = useState(listingType);
  const [showPrice, setShowPrice] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debounceRef = useRef<any>(null);

  function buildUrl(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const s = overrides.q ?? search;
    const t = overrides.type ?? type;
    const mn = overrides.minPrice ?? minPrice;
    const mx = overrides.maxPrice ?? maxPrice;
    if (s) params.set("q", s);
    if (t) params.set("type", t);
    if (mn) params.set("minPrice", mn);
    if (mx) params.set("maxPrice", mx);
    return `/marketplace${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function handleSearch(value: string) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ q: value }));
    }, 500);
  }

  function handleType(value: string) {
    setType(value);
    router.push(buildUrl({ type: value }));
  }

  return (
    <div style={{ background: "white", borderBottom: "1px solid #f1f5f9", padding: "0.75rem 1rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {/* Search bar */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.85rem" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search listings…"
            style={{
              width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "999px",
              padding: "0.5rem 0.75rem 0.5rem 2.25rem", fontSize: "0.875rem",
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
          />
        </div>

        {/* Type filter pills */}
        <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", paddingBottom: "2px" }}>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleType(opt.value)}
              style={{
                flexShrink: 0,
                border: `1.5px solid ${type === opt.value ? PRIMARY : "#e2e8f0"}`,
                borderRadius: "999px",
                padding: "0.3rem 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                background: type === opt.value ? PRIMARY : "white",
                color: type === opt.value ? "white" : "#64748b",
                transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setShowPrice(!showPrice)}
            style={{
              flexShrink: 0,
              border: `1.5px solid ${(minPrice || maxPrice) ? PRIMARY : "#e2e8f0"}`,
              borderRadius: "999px",
              padding: "0.3rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              background: (minPrice || maxPrice) ? PRIMARY : "white",
              color: (minPrice || maxPrice) ? "white" : "#64748b",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            💰 Price {showPrice ? "▲" : "▼"}
          </button>
        </div>

        {/* Price range (expandable) */}
        {showPrice && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const mn = fd.get("minPrice") as string;
              const mx = fd.get("maxPrice") as string;
              router.push(buildUrl({ minPrice: mn, maxPrice: mx }));
            }}
            style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
          >
            <input
              name="minPrice"
              defaultValue={minPrice}
              type="number"
              min={0}
              placeholder="Min ₱"
              style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0.4rem 0.6rem", fontSize: "0.85rem", fontFamily: "inherit" }}
            />
            <span style={{ color: "#94a3b8", flexShrink: 0 }}>–</span>
            <input
              name="maxPrice"
              defaultValue={maxPrice}
              type="number"
              min={0}
              placeholder="Max ₱"
              style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "0.4rem 0.6rem", fontSize: "0.85rem", fontFamily: "inherit" }}
            />
            <button
              type="submit"
              style={{ background: PRIMARY, color: "white", border: "none", borderRadius: 8, padding: "0.4rem 0.875rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >
              Apply
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
