import {
  SkeletonBox,
} from "@/components/ui/SkeletonPulse";

export default function EventsLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)", color: "white", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Events</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem", margin: 0 }}>Join us for worship, fellowship, and growth</p>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        {/* Upcoming events section */}
        <section style={{ marginBottom: "3.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>📅 Upcoming Events</h2>
            <SkeletonBox width={34} height={20} radius={999} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "white", border: "1px solid #e2e8f0", borderRadius: "12px",
                  padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", alignItems: "center",
                  borderLeft: "4px solid #4EB1CB",
                }}
              >
                <SkeletonBox width={52} height={52} radius={10} />
                <div style={{ flex: 1 }}>
                  <SkeletonBox height={10} width={80} style={{ marginBottom: "0.375rem" }} />
                  <SkeletonBox height={16} width="60%" style={{ marginBottom: "0.5rem" }} />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <SkeletonBox height={12} width={100} />
                    <SkeletonBox height={12} width={80} />
                  </div>
                </div>
                <div style={{ width: 10, height: 16, color: "#cbd5e1" }}>›</div>
              </div>
            ))}
          </div>
        </section>

        {/* Past events section */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>📁 Past Events</h2>
            <SkeletonBox width={150} height={32} radius={999} />
          </div>

          {/* Chips placeholder */}
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {[100, 110, 95, 120, 80].map((w, idx) => (
              <SkeletonBox key={idx} width={w} height={28} radius={999} />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  background: "white", border: "1px solid #e2e8f0", borderRadius: "12px",
                  padding: "1rem 1.25rem", display: "flex", gap: "1rem", alignItems: "center",
                  opacity: 0.8
                }}
              >
                <SkeletonBox width={40} height={40} radius={10} />
                <div style={{ flex: 1 }}>
                  <SkeletonBox height={10} width={60} style={{ marginBottom: "0.375rem" }} />
                  <SkeletonBox height={14} width="50%" style={{ marginBottom: "0.5rem" }} />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <SkeletonBox height={12} width={100} />
                    <SkeletonBox height={12} width={70} />
                  </div>
                </div>
                <div style={{ width: 10, height: 16, color: "#cbd5e1" }}>›</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
