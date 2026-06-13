import {
  SkeletonBox,
  SkeletonCircle,
} from "@/components/ui/SkeletonPulse";

/**
 * Profile / Me page loading skeleton.
 * Matches the real layout: cover + avatar + name + stats + tabs.
 */
export default function ProfileLoading() {
  return (
    <div>
      {/* Cover photo */}
      <SkeletonBox height={140} radius={0} />

      {/* Avatar + name */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: -40,
          padding: "0 1rem",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "4px solid white",
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          <SkeletonCircle size={80} />
        </div>
        <SkeletonBox height={16} width={140} style={{ marginBottom: 6 }} />
        <SkeletonBox height={10} width={100} style={{ marginBottom: 16 }} />

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: "2rem",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <SkeletonBox height={16} width={30} style={{ marginBottom: 4, margin: "0 auto 4px" }} />
              <SkeletonBox height={10} width={50} />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, width: "100%" }}>
          <SkeletonBox height={36} radius={10} />
          <SkeletonBox height={36} width={100} radius={10} />
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            width: "100%",
            borderBottom: "1px solid #e2e8f0",
            marginBottom: 16,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ flex: 1, padding: "0.75rem", display: "flex", justifyContent: "center" }}>
              <SkeletonBox width={60} height={12} />
            </div>
          ))}
        </div>

        {/* Content cards */}
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "100%",
              background: "white",
              borderRadius: 16,
              padding: "1rem",
              marginBottom: "0.75rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <SkeletonBox height={10} style={{ marginBottom: 6 }} />
            <SkeletonBox height={10} width="75%" style={{ marginBottom: 6 }} />
            <SkeletonBox height={10} width="50%" />
          </div>
        ))}
      </div>
    </div>
  );
}
