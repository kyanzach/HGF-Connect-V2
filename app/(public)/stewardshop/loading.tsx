import {
  SkeletonBox,
  SkeletonProductCard,
} from "@/components/ui/SkeletonPulse";

const PRIMARY = "#4EB1CB";

export default function StewardShopPublicLoading() {
  return (
    <>
      {/* Hero Header */}
      <div style={{ background: PRIMARY, padding: "2rem 1rem 1.5rem", textAlign: "center", color: "white" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.375rem" }}>🤝 StewardShop</h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.85, margin: "0 0 1.25rem" }}>
          Trade well. Give well. Serve well.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ width: 120, height: 34, background: "rgba(255, 255, 255, 0.4)", borderRadius: "999px" }} className="hgf-skeleton-dark" />
          <div style={{ width: 110, height: 34, background: "rgba(255, 255, 255, 0.2)", borderRadius: "999px" }} className="hgf-skeleton-dark" />
        </div>
      </div>

      {/* Filter / Search Mockup */}
      <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid #edf2f7", background: "white" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
          {/* Search box skeleton */}
          <SkeletonBox height={42} radius={12} style={{ marginBottom: "0.25rem" }} />
          {/* Filter selectors row */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <SkeletonBox height={34} radius={10} style={{ flex: 1 }} />
            <SkeletonBox height={34} radius={10} style={{ flex: 1 }} />
            <SkeletonBox height={34} radius={10} style={{ flex: 1 }} />
          </div>
        </div>
      </div>

      {/* Product Grid (2 columns) */}
      <div style={{ width: "100%", boxSizing: "border-box", padding: "1rem 0.75rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "0.625rem", width: "100%" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProductCard key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
