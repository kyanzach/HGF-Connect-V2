import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonText,
} from "@/components/ui/SkeletonPulse";

/**
 * Prayer Wall loading skeleton.
 * Matches the real layout: purple gradient hero + tabs + prayer card list.
 */
export default function PrayerLoading() {
  return (
    <div>
      {/* Hero banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          padding: "1.25rem 1rem",
          textAlign: "center",
        }}
      >
        <div
          className="hgf-skeleton-dark"
          style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 8px" }}
        />
        <div
          className="hgf-skeleton-dark"
          style={{ width: "45%", height: 16, margin: "0 auto 6px", borderRadius: 6 }}
        />
        <div
          className="hgf-skeleton-dark"
          style={{ width: "65%", height: 10, margin: "0 auto 12px", borderRadius: 6 }}
        />
        <div
          className="hgf-skeleton-dark"
          style={{ width: 180, height: 32, margin: "0 auto", borderRadius: 999 }}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ flex: 1, padding: "0.75rem", display: "flex", justifyContent: "center" }}>
          <SkeletonBox width={80} height={12} />
        </div>
        <div style={{ flex: 1, padding: "0.75rem", display: "flex", justifyContent: "center" }}>
          <SkeletonBox width={90} height={12} />
        </div>
      </div>

      {/* Prayer cards */}
      <div style={{ padding: "0.875rem 1rem 0" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: "white",
              borderRadius: 16,
              padding: "1rem",
              marginBottom: "0.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.625rem" }}>
              <SkeletonCircle size={32} />
              <div style={{ flex: 1 }}>
                <SkeletonBox height={12} width="35%" style={{ marginBottom: 4 }} />
                <SkeletonBox height={8} width="20%" />
              </div>
            </div>
            <SkeletonText lines={2} height={10} gap={6} lastWidth="70%" />
            <div style={{ display: "flex", gap: "0.625rem", marginTop: 12 }}>
              <SkeletonBox width={90} height={28} radius={999} />
              <SkeletonBox width={110} height={28} radius={999} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
