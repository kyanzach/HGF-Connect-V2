import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonPostCard,
} from "@/components/ui/SkeletonPulse";

/**
 * Feed page loading skeleton.
 * Mirrors the real Feed layout: hero carousel + shortcuts + post cards.
 */
export default function FeedLoading() {
  return (
    <div>
      {/* Hero Carousel placeholder */}
      <div style={{ padding: "1rem 1rem 0" }}>
        <div
          className="hgf-skeleton"
          style={{
            width: "100%",
            height: 220,
            borderRadius: "12px",
          }}
        />
      </div>

      {/* Shortcuts row */}
      <div
        style={{
          background: "white",
          padding: "1rem",
          display: "flex",
          gap: "0.75rem",
          overflowX: "hidden",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              minWidth: 60,
            }}
          >
            <SkeletonBox width={52} height={52} radius={16} />
            <SkeletonBox width={44} height={8} />
          </div>
        ))}
      </div>

      {/* Feed header */}
      <div
        style={{
          padding: "0.875rem 1rem 0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <SkeletonBox width={130} height={14} />
          <SkeletonBox width={64} height={28} radius={999} />
        </div>

        {/* Post skeletons */}
        <SkeletonPostCard />
        <SkeletonPostCard />
        <SkeletonPostCard />
      </div>
    </div>
  );
}
