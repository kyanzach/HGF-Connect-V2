"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { type Session } from "next-auth";
import { useState } from "react";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Members", href: "/admin/members", icon: "👥" },
  { label: "Events", href: "/admin/events", icon: "📅" },
  { label: "Ministries", href: "/admin/ministries", icon: "🙌" },
  { label: "Custom SMS", href: "/admin/send-sms", icon: "📱" },
  { label: "SMS Logs", href: "/admin/sms", icon: "📋" },
  { label: "Review", href: "/admin/review", icon: "✅" },
  { label: "Users", href: "/admin/users", icon: "🔑", adminOnly: true },
];

export default function AdminSidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = session.user.role === "admin";

  return (
    <aside
      style={{
        width: collapsed ? "64px" : "240px",
        background: "#0f172a",
        color: "white",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "1.25rem 0" : "1.25rem 1.25rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {!collapsed && (
          <Link href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontWeight: 800, fontSize: "1.0625rem", color: "white" }}>
              HGF <span style={{ color: "#4eb1cb" }}>Connect</span>
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "1.1rem",
            padding: "0.25rem",
            borderRadius: "6px",
            flexShrink: 0,
          }}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      {/* User info */}
      {!collapsed && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ fontSize: "0.8125rem", color: "#94a3b8", marginBottom: "0.25rem" }}>
            Logged in as
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "white" }}>
            {(session.user as any).firstName} {(session.user as any).lastName}
          </div>
          <div
            style={{
              display: "inline-block",
              background: "#4eb1cb22",
              color: "#4eb1cb",
              padding: "0.125rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: 600,
              marginTop: "0.25rem",
              textTransform: "capitalize",
            }}
          >
            {session.user.role}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto" }}>
        {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: collapsed ? "0.75rem 0" : "0.75rem 1.25rem",
                textDecoration: "none",
                color: isActive ? "white" : "#94a3b8",
                background: isActive ? "rgba(78,177,203,0.15)" : "transparent",
                borderLeft: isActive ? "3px solid #4eb1cb" : "3px solid transparent",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 400,
                justifyContent: collapsed ? "center" : "flex-start",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer links */}
      <div
        style={{
          padding: collapsed ? "1rem 0" : "1rem 1.25rem",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <Link
          href="/attendance"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
            color: "#94a3b8",
            fontSize: "0.875rem",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <span>📟</span>
          {!collapsed && "Attendance Kiosk"}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            background: "transparent",
            border: "none",
            color: "#f87171",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            fontSize: "0.875rem",
            justifyContent: collapsed ? "center" : "flex-start",
            padding: "0.25rem 0",
            width: "100%",
          }}
        >
          <span>🚪</span>
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
