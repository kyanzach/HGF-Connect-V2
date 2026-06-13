import {
  SkeletonBox,
  SkeletonCircle,
} from "@/components/ui/SkeletonPulse";

const PRIMARY = "#4EB1CB";

/**
 * Quiz page loading skeleton.
 * Matches the real layout: brand header + week title card + progress + daily grid.
 */
export default function QuizLoading() {
  return (
    <div style={{ padding: "20px 16px 120px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Brand header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <SkeletonCircle size={44} />
        <div>
          <SkeletonBox height={14} width={160} style={{ marginBottom: 4 }} />
          <SkeletonBox height={10} width={180} />
        </div>
      </div>

      {/* Week title card */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f2d3d 0%, #1a5276 100%)",
          borderRadius: 20,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div
          className="hgf-skeleton-dark"
          style={{ width: 120, height: 22, borderRadius: 20, marginBottom: 10 }}
        />
        <div
          className="hgf-skeleton-dark"
          style={{ width: "80%", height: 18, borderRadius: 6, marginBottom: 8 }}
        />
        <div
          className="hgf-skeleton-dark"
          style={{ width: "55%", height: 12, borderRadius: 6 }}
        />
      </div>

      {/* Weekly progress card */}
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 18,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          marginBottom: 20,
        }}
      >
        <SkeletonBox height={12} width={160} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <SkeletonBox height={10} width={100} />
          <SkeletonBox height={10} width={80} />
        </div>
        <SkeletonBox height={8} radius={10} style={{ marginBottom: 16 }} />
        <SkeletonBox height={10} width="70%" style={{ margin: "0 auto" }} />
      </div>

      {/* Daily challenges grid */}
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: 18,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <SkeletonBox height={12} width={180} style={{ marginBottom: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid #f1f5f9",
              }}
            >
              <SkeletonBox width={44} height={44} radius={12} />
              <div style={{ flex: 1 }}>
                <SkeletonBox height={12} width="40%" style={{ marginBottom: 4 }} />
                <SkeletonBox height={10} width="60%" />
              </div>
              <SkeletonBox width={50} height={24} radius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
