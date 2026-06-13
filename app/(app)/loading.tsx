import {
  SkeletonBox,
  SkeletonCircle,
  SkeletonPostCard,
} from "@/components/ui/SkeletonPulse";

/**
 * Default loading skeleton for all (app) routes.
 * Shows a generic page structure while the actual page loads.
 */
export default function AppLoading() {
  return (
    <div style={{ padding: "1rem" }}>
      {/* Page title area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <SkeletonCircle size={44} />
        <div style={{ flex: 1 }}>
          <SkeletonBox height={14} width="55%" style={{ marginBottom: 6 }} />
          <SkeletonBox height={10} width="35%" />
        </div>
      </div>

      {/* Content cards */}
      <SkeletonPostCard />
      <SkeletonPostCard />
      <SkeletonPostCard />
    </div>
  );
}
