import {
  SkeletonBox,
} from "@/components/ui/SkeletonPulse";

export default function EventDetailLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Compact Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)",
          color: "white",
          padding: "1.25rem 1.25rem 1rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <SkeletonBox height={14} width={100} style={{ marginBottom: "0.75rem", opacity: 0.5 }} />
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <SkeletonBox height={20} width={80} radius={999} style={{ opacity: 0.3 }} />
            <SkeletonBox height={20} width={60} radius={999} style={{ opacity: 0.3 }} />
          </div>
          <SkeletonBox height={24} width="50%" style={{ opacity: 0.8 }} />
        </div>
      </div>

      {/* Details Card */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1.5rem 1.25rem" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
            marginBottom: "1.25rem",
          }}
        >
          {/* Grid fields */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1.25rem",
              marginBottom: "1.5rem",
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#f1f5f9" }} />
                <div style={{ flex: 1 }}>
                  <SkeletonBox height={10} width="40%" style={{ marginBottom: "0.25rem" }} />
                  <SkeletonBox height={14} width="70%" />
                </div>
              </div>
            ))}
          </div>

          {/* Description box skeleton */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.25rem" }}>
            <SkeletonBox height={16} width={120} style={{ marginBottom: "0.75rem" }} />
            <SkeletonBox height={10} width="100%" style={{ marginBottom: "0.5rem" }} />
            <SkeletonBox height={10} width="95%" style={{ marginBottom: "0.5rem" }} />
            <SkeletonBox height={10} width="85%" />
          </div>
        </div>

        {/* Back Link Mockup */}
        <div style={{ textAlign: "center" }}>
          <SkeletonBox height={34} width={130} radius={10} style={{ margin: "0 auto" }} />
        </div>
      </div>
    </div>
  );
}
