import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalActive,
    totalPending,
    totalMembers,
    eventsThisMonth,
    recentLogs,
    smsPending,
  ] = await Promise.all([
    db.member.count({ where: { status: "active" } }),
    db.member.count({ where: { status: "pending" } }),
    db.member.count(),
    db.event.count({
      where: { eventDate: { gte: startOfMonth }, status: "scheduled" },
    }),
    db.appLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.customSmsBatch.count({ where: { status: "pending" } }),
  ]);

  return { totalActive, totalPending, totalMembers, eventsThisMonth, recentLogs, smsPending };
}

export default async function AdminDashboardPage() {
  const [session, stats] = await Promise.all([auth(), getDashboardStats()]);

  return (
    <div style={{ padding: "2rem 2.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
          Dashboard
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Welcome back, {(session?.user as any)?.firstName}! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}
      >
        <StatCard label="Active Members" value={stats.totalActive} icon="👥" color="#4eb1cb" />
        <StatCard label="Pending Approval" value={stats.totalPending} icon="⏳" color="#f59e0b" href="/admin/review" />
        <StatCard label="Total Members" value={stats.totalMembers} icon="📋" color="#8b5cf6" href="/admin/members" />
        <StatCard label="Events This Month" value={stats.eventsThisMonth} icon="📅" color="#10b981" href="/admin/events" />
        <StatCard label="Pending SMS" value={stats.smsPending} icon="📱" color="#3b82f6" href="/admin/sms" />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginBottom: "1rem" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <ActionButton href="/admin/members" icon="➕" label="Add Member" color="#4eb1cb" />
          <ActionButton href="/admin/events" icon="📅" label="Create Event" color="#8b5cf6" />
          <ActionButton href="/admin/send-sms" icon="📱" label="Send SMS" color="#10b981" />
          <ActionButton href="/admin/review" icon="✅" label="Review Pending" color="#f59e0b" />
          <ActionButton href="/attendance" icon="📟" label="Attendance Kiosk" color="#3b82f6" />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>Recent Activity</h2>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}
        >
          {stats.recentLogs.length === 0 ? (
            <p style={{ padding: "2rem", color: "#94a3b8", textAlign: "center" }}>No activity yet</p>
          ) : (
            stats.recentLogs.map((log, i) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "0.875rem 1.25rem",
                  alignItems: "flex-start",
                  borderBottom: i < stats.recentLogs.length - 1 ? "1px solid #f1f5f9" : "none",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#4eb1cb",
                    marginTop: "6px",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "0.125rem" }}>
                    <strong>{log.performedByName}</strong> · {log.description}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {log.pageTitle} · {formatDate(log.createdAt)}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    background: "#f1f5f9",
                    color: "#64748b",
                    flexShrink: 0,
                  }}
                >
                  {log.actionType}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  href?: string;
}) {
  const content = (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "1.5rem",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
        cursor: href ? "pointer" : "default",
        transition: href ? "box-shadow 0.15s" : undefined,
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          background: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>
          {label}
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  ) : (
    content
  );
}

function ActionButton({
  href,
  icon,
  label,
  color,
}: {
  href: string;
  icon: string;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.625rem 1.125rem",
        borderRadius: "8px",
        border: `1px solid ${color}33`,
        background: `${color}0f`,
        textDecoration: "none",
        color: "#0f172a",
        fontSize: "0.875rem",
        fontWeight: 600,
      }}
    >
      {icon} {label}
    </Link>
  );
}
