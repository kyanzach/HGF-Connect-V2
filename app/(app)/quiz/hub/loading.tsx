import {
  SkeletonBox,
  SkeletonCircle,
} from "@/components/ui/SkeletonPulse";

export default function HubLoading() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* Cover banner skeleton */}
      <SkeletonBox height={240} radius={0} />

      {/* Profile info skeleton */}
      <div style={{ background: "white", padding: "0 16px 12px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginTop: -40 }}>
          <SkeletonCircle size={80} style={{ border: "4px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
          <div style={{ paddingBottom: "6px" }}>
            <SkeletonBox height={16} width={180} style={{ marginBottom: 6 }} />
            <SkeletonBox height={12} width={120} />
          </div>
        </div>
      </div>

      {/* Stats and text skeleton */}
      <div style={{ padding: "16px" }}>
        <SkeletonBox height={10} style={{ marginBottom: 6 }} />
        <SkeletonBox height={10} width="85%" style={{ marginBottom: 16 }} />

        {/* Stats strip */}
        <div style={{ display: "flex", background: "white", borderRadius: "16px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", gap: "12px" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <SkeletonBox height={16} width={40} style={{ marginBottom: 4 }} />
            <SkeletonBox height={10} width={60} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", borderLeft: "1px solid #f1f5f9", borderRight: "1px solid #f1f5f9" }}>
            <SkeletonBox height={16} width={40} style={{ marginBottom: 4 }} />
            <SkeletonBox height={10} width={60} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <SkeletonBox height={16} width={40} style={{ marginBottom: 4 }} />
            <SkeletonBox height={10} width={60} />
          </div>
        </div>
      </div>

      {/* Active week teaser skeleton */}
      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ background: "white", borderRadius: "20px", padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <SkeletonBox height={10} width={80} style={{ marginBottom: 10 }} />
          <SkeletonBox height={14} width="60%" style={{ marginBottom: 8 }} />
          <SkeletonBox height={10} style={{ marginBottom: 12 }} />
          <SkeletonBox height={36} radius={14} />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 16px", background: "white", marginBottom: "16px" }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "14px 0" }}>
          <SkeletonBox height={12} width={100} />
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "14px 0" }}>
          <SkeletonBox height={12} width={100} />
        </div>
      </div>

      {/* List items skeleton */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ background: "white", borderRadius: "20px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <SkeletonBox height={14} width={150} style={{ marginBottom: 14 }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 5 ? "1px solid #f1f5f9" : "none" }}>
              <SkeletonBox height={12} width={16} />
              <SkeletonCircle size={32} />
              <div style={{ flex: 1 }}>
                <SkeletonBox height={12} width="50%" />
              </div>
              <SkeletonBox height={12} width={30} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
