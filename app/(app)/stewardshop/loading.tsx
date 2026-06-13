import {
  SkeletonBox,
  SkeletonProductCard,
} from "@/components/ui/SkeletonPulse";

const PRIMARY = "#4EB1CB";

/**
 * StewardShop loading skeleton.
 * Matches the real layout: hero header + search bar + product grid.
 */
export default function StewardShopLoading() {
  return (
    <div>
      {/* Hero header */}
      <div
        style={{
          background: PRIMARY,
          padding: "1rem",
          color: "white",
        }}
      >
        <div
          className="hgf-skeleton-dark"
          style={{ width: "50%", height: 18, borderRadius: 6, marginBottom: 6 }}
        />
        <div
          className="hgf-skeleton-dark"
          style={{ width: "75%", height: 10, borderRadius: 6 }}
        />
      </div>

      {/* Search bar */}
      <div style={{ padding: "1rem" }}>
        <SkeletonBox height={42} radius={12} style={{ marginBottom: "1rem" }} />

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1rem", overflowX: "hidden" }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} width={80} height={30} radius={999} />
          ))}
        </div>

        {/* Product grid (2 columns) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          <SkeletonProductCard />
          <SkeletonProductCard />
          <SkeletonProductCard />
          <SkeletonProductCard />
        </div>
      </div>
    </div>
  );
}
