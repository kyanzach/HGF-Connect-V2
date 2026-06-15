import {
  SkeletonBox,
} from "@/components/ui/SkeletonPulse";

export default function ResourcesLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)",
          color: "white",
          padding: "3.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          Sermon Resources
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem", margin: 0 }}>
          Study slides, reflection takeaway commentaries, and sermon downloads
        </p>
      </header>

      {/* Main content list */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px 120px" }}>
        {/* Sticky search bar mockup */}
        <div style={{ padding: "12px 0", marginBottom: "24px", borderBottom: "1px solid #e2e8f0" }}>
          <SkeletonBox height={48} radius={14} />
        </div>

        {/* Count indicator */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <SkeletonBox height={14} width={150} />
        </div>

        {/* Resource Cards list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <article
              key={idx}
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                border: "1px solid #edf2f7",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Header Info */}
              <div>
                <SkeletonBox height={20} width="60%" style={{ marginBottom: "6px" }} />
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <SkeletonBox height={12} width={120} />
                  <SkeletonBox height={12} width={100} />
                </div>
              </div>

              {/* Commentary box */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "14px",
                  padding: "16px",
                  border: "1px solid #edf2f7",
                  height: 120,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <SkeletonBox height={10} width="40%" style={{ marginBottom: "4px" }} />
                <SkeletonBox height={8} width="100%" />
                <SkeletonBox height={8} width="95%" />
                <SkeletonBox height={8} width="90%" />
              </div>

              {/* Slide Carousel widescreen block */}
              <div>
                <SkeletonBox height={10} width="30%" style={{ marginBottom: "8px" }} />
                <div style={{ width: "100%", paddingBottom: "56.25%", background: "#f1f5f9", borderRadius: "12px", position: "relative", overflow: "hidden" }}>
                  <div className="hgf-skeleton" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                </div>
              </div>

              {/* Action Download button mockup */}
              <SkeletonBox height={45} radius={10} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
