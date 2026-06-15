import {
  SkeletonBox,
  SkeletonCircle,
} from "@/components/ui/SkeletonPulse";

export default function ListingDetailLoading() {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Back nav bar skeleton */}
      <div style={{ padding: "0.75rem 1rem", background: "white", borderBottom: "1px solid #f1f5f9" }}>
        <SkeletonBox height={16} width={110} />
      </div>

      {/* Carousel block skeleton */}
      <SkeletonBox height={260} radius={0} />

      <div style={{ padding: "1rem" }}>
        {/* Title + Price card skeleton */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <SkeletonBox height={20} width="70%" style={{ marginBottom: "0.5rem" }} />
          <SkeletonBox height={28} width="40%" style={{ marginBottom: "0.75rem" }} />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <SkeletonBox height={20} width={80} radius={999} />
            <SkeletonBox height={20} width={100} radius={999} />
            <SkeletonBox height={14} width={70} />
          </div>
        </div>

        {/* Description card skeleton */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <SkeletonBox height={12} width={100} style={{ marginBottom: "0.75rem" }} />
          <SkeletonBox height={10} width="100%" style={{ marginBottom: "0.5rem" }} />
          <SkeletonBox height={10} width="95%" style={{ marginBottom: "0.5rem" }} />
          <SkeletonBox height={10} width="85%" />
        </div>

        {/* CTA box skeleton */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 2px 12px rgba(78,177,203,0.12)", border: "1.5px solid #bae6fd" }}>
          <SkeletonBox height={10} width="80%" style={{ margin: "0 auto 1rem", display: "block" }} />
          <SkeletonBox height={44} radius={999} style={{ marginBottom: "0.625rem" }} />
          <SkeletonBox height={12} width="50%" style={{ margin: "0 auto", display: "block" }} />
        </div>

        {/* Seller card skeleton */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <SkeletonCircle size={46} />
          <div style={{ flex: 1 }}>
            <SkeletonBox height={14} width="40%" style={{ marginBottom: "0.5rem" }} />
            <SkeletonBox height={10} width="30%" />
          </div>
        </div>
      </div>
    </div>
  );
}
