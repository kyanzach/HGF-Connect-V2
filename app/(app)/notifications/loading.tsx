import {
  SkeletonBox,
  SkeletonCircle,
} from "@/components/ui/SkeletonPulse";

/**
 * Notifications page loading skeleton.
 * Shows a list of notification item placeholders.
 */
export default function NotificationsLoading() {
  return (
    <div style={{ padding: "1rem" }}>
      {/* Header */}
      <SkeletonBox height={18} width={140} style={{ marginBottom: 16 }} />

      {/* Notification items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            padding: "0.875rem 0",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <SkeletonCircle size={40} />
          <div style={{ flex: 1 }}>
            <SkeletonBox height={12} width={i % 2 === 0 ? "75%" : "60%"} style={{ marginBottom: 6 }} />
            <SkeletonBox height={10} width={i % 3 === 0 ? "90%" : "50%"} style={{ marginBottom: 4 }} />
            <SkeletonBox height={8} width={60} />
          </div>
          <SkeletonBox width={8} height={8} radius={4} />
        </div>
      ))}
    </div>
  );
}
