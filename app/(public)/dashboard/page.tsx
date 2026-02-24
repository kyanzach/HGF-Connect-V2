import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Dashboard" };

export default async function UserDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Admin/mod/usher go to their sections
  if (["admin", "moderator"].includes(session.user.role)) redirect("/admin");
  if (session.user.role === "usher") redirect("/attendance");

  const member = await db.member.findUnique({
    where: { id: parseInt(session.user.id) },
    include: {
      ministries: {
        where: { status: { in: ["active", "pending"] } },
        include: { ministry: { select: { name: true } } },
      },
    },
  });

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          {/* Status Banner */}
          {session.user.status === "pending" && (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                marginBottom: "1.5rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>⏳</span>
              <div>
                <p style={{ fontWeight: 700, color: "#92400e", marginBottom: "0.25rem" }}>
                  Account Pending Approval
                </p>
                <p style={{ color: "#b45309", fontSize: "0.875rem" }}>
                  Your account has been created and is waiting for an administrator to approve it.
                  You&apos;ll receive full access once approved.
                </p>
              </div>
            </div>
          )}

          {/* Welcome Card */}
          <div
            style={{
              background: "linear-gradient(135deg, #0f2d3d 0%, #1f6477 100%)",
              borderRadius: "16px",
              padding: "2rem",
              color: "white",
              marginBottom: "1.5rem",
            }}
          >
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.375rem" }}>
              Welcome, {(session.user as any).firstName}! 👋
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.9375rem" }}>
              {session.user.status === "active"
                ? "You're an active HGF Connect member."
                : "Your account is pending admin approval."}
            </p>
          </div>

          {/* Member info */}
          {member && (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
                Your Profile
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <InfoRow label="Name" value={`${member.firstName} ${member.lastName}`} />
                <InfoRow label="Email" value={member.email || "—"} />
                <InfoRow label="Phone" value={member.phone || "—"} />
                <InfoRow label="Age Group" value={member.ageGroup || "—"} />
                <InfoRow label="Type" value={member.type.replace(/([A-Z])/g, " $1").trim()} />
                <InfoRow label="Username" value={`@${member.username || "—"}`} />
              </div>
              <Link
                href="/profile"
                style={{
                  display: "inline-block",
                  marginTop: "1.25rem",
                  padding: "0.625rem 1.25rem",
                  background: "linear-gradient(135deg, #4eb1cb, #3a95ad)",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                Edit Profile
              </Link>
            </div>
          )}

          {/* Quick links */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {[
              { href: "/events", icon: "📅", label: "View Events" },
              { href: "/directory", icon: "👥", label: "Member Directory" },
              { href: "/resources", icon: "📖", label: "Resources" },
              { href: "/marketplace", icon: "🏪", label: "Marketplace" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  textDecoration: "none",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem" }}>
      <span style={{ color: "#94a3b8", fontSize: "0.875rem", minWidth: "80px", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ color: "#374151", fontSize: "0.875rem", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
