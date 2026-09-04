"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Session } from "next-auth";
import { useState, useEffect, useRef } from "react";
import { triggerLogout } from "@/lib/logout";

const NAV = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Members", href: "/admin/members", icon: "👥", usherAllowed: true },
  { label: "Life Group", href: "/admin/lifegroup", icon: "👥", usherAllowed: true },
  { label: "Review", href: "/admin/review", icon: "✅", usherAllowed: true },
  { label: "Events", href: "/admin/events", icon: "📅", usherAllowed: true },
  { label: "Testimonies", href: "/admin/testimonies", icon: "🙌", usherAllowed: true },
  { label: "Ministries", href: "/admin/ministries", icon: "⛪", usherAllowed: true },
  { label: "Custom SMS", href: "/admin/send-sms", icon: "📱" },
  { label: "SMS Logs", href: "/admin/sms", icon: "📋" },
  { label: "StewardShop", href: "/admin/stewardshop", icon: "🤝", usherAllowed: true },
  { label: "AI Settings", href: "/admin/church-settings", icon: "⚙️" },
  { label: "Users", href: "/admin/users", icon: "🔑", adminOnly: true },
  { label: "Birthdays", href: "/admin/birthdays", icon: "🎂", usherAllowed: true },
  { label: "Multimedia", href: "/admin/multimedia", icon: "📽️", multimediaAllowed: true },
];

export default function AdminSidebar({ session }: { session: Session }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = session.user.role === "admin";

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Screen size detection & auto-collapse
  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Auto-close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Global edge-swipe gesture to open sidebar on mobile
  useEffect(() => {
    if (!isMobile) return;

    let edgeStartX: number | null = null;
    let edgeStartY: number | null = null;

    const handleGlobalTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger if starting near the left edge of the viewport (within 35px)
      if (touch.clientX < 35 && !mobileOpen) {
        edgeStartX = touch.clientX;
        edgeStartY = touch.clientY;
      } else {
        edgeStartX = null;
        edgeStartY = null;
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (edgeStartX === null || edgeStartY === null) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - edgeStartX;
      const deltaY = Math.abs(touch.clientY - edgeStartY);

      // If swiped right by at least 40px and not mostly vertical scroll
      if (deltaX > 40 && deltaY < deltaX * 1.5) {
        setMobileOpen(true);
      }
      edgeStartX = null;
      edgeStartY = null;
    };

    window.addEventListener("touchstart", handleGlobalTouchStart, { passive: true });
    window.addEventListener("touchend", handleGlobalTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleGlobalTouchStart);
      window.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [isMobile, mobileOpen]);

  // Drawer swipe-to-close gesture handlers
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleDrawerTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = touchStartXRef.current - e.changedTouches[0].clientX;
    const deltaY = Math.abs(touchStartYRef.current - e.changedTouches[0].clientY);

    // Swiped left by at least 40px -> close drawer
    if (deltaX > 40 && deltaY < deltaX * 1.5) {
      setMobileOpen(false);
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Nav list filtering
  const filteredNav = NAV.filter((item) => {
    const isMultimedia = session.user.role === "multimedia";
    if (isMultimedia) return (item as any).multimediaAllowed;
    const isUsher = session.user.role === "usher";
    if (isUsher) return (item as any).usherAllowed;
    return !item.adminOnly || isAdmin;
  });

  return (
    <>
      {/* Floating edge toggle tab on mobile when sidebar is hidden */}
      {isMobile && !mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open Admin Menu"
          style={{
            position: "fixed",
            left: "0.625rem",
            top: "max(0.625rem, env(safe-area-inset-top))",
            zIndex: 90,
            background: "#0f172a",
            color: "#4eb1cb",
            border: "1px solid rgba(78, 177, 203, 0.4)",
            borderRadius: "10px",
            padding: "0.45rem 0.75rem",
            fontSize: "0.8125rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.25)",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          <span>☰</span>
          <span>Menu</span>
        </button>
      )}

      {/* Backdrop overlay for mobile drawer */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(2px)",
            zIndex: 9998,
            transition: "opacity 0.2s ease",
          }}
        />
      )}

      {/* Sidebar Aside element */}
      <aside
        onTouchStart={isMobile ? handleDrawerTouchStart : undefined}
        onTouchEnd={isMobile ? handleDrawerTouchEnd : undefined}
        style={{
          width: isMobile ? "min(280px, 84vw)" : collapsed ? "64px" : "240px",
          background: "#0f172a",
          color: "white",
          display: "flex",
          flexDirection: "column",
          transition: isMobile ? "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)" : "width 0.2s ease",
          flexShrink: 0,
          height: isMobile ? "100dvh" : "100vh",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: isMobile ? 9999 : 50,
          transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
          overflow: "hidden",
          paddingTop: "env(safe-area-inset-top, 0px)",
          boxShadow: isMobile && mobileOpen ? "4px 0 24px rgba(0,0,0,0.5)" : "none",
          touchAction: isMobile ? "pan-y" : "auto",
        }}
      >
        {/* Header / Logo */}
        <div
          style={{
            padding: isMobile || !collapsed ? "1.25rem 1.25rem" : "1.25rem 0",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            justifyContent: isMobile || !collapsed ? "space-between" : "center",
          }}
        >
          {(isMobile || !collapsed) && (
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontWeight: 800, fontSize: "1.0625rem", color: "white" }}>
                HGF <span style={{ color: "#4eb1cb" }}>Connect</span>
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                setMobileOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            title={isMobile ? "Slide left to close" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "1.1rem",
              padding: "0.35rem 0.5rem",
              borderRadius: "8px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isMobile ? "✕" : collapsed ? "→" : "←"}
          </button>
        </div>

        {/* User info */}
        {(isMobile || !collapsed) && (
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

        {/* Navigation list */}
        <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {filteredNav.map((item) => {
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
                  padding: isMobile || !collapsed ? "0.75rem 1.25rem" : "0.75rem 0",
                  textDecoration: "none",
                  color: isActive ? "white" : "#94a3b8",
                  background: isActive ? "rgba(78,177,203,0.15)" : "transparent",
                  borderLeft: isActive ? "3px solid #4eb1cb" : "3px solid transparent",
                  fontSize: "0.9rem",
                  fontWeight: isActive ? 600 : 400,
                  justifyContent: isMobile || !collapsed ? "flex-start" : "center",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{item.icon}</span>
                {(isMobile || !collapsed) && item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer links */}
        <div
          style={{
            padding: isMobile || !collapsed ? "1rem 1.25rem" : "1rem 0",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {isMobile && (
            <div style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "center", marginBottom: "0.25rem" }}>
              👈 Slide left to hide
            </div>
          )}

          {session.user.role !== "multimedia" && (
            <Link
              href="/api/auth/sso/attendance"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                textDecoration: "none",
                color: "#94a3b8",
                fontSize: "0.875rem",
                justifyContent: isMobile || !collapsed ? "flex-start" : "center",
              }}
            >
              <span>📟</span>
              {(isMobile || !collapsed) && "Attendance Kiosk"}
            </Link>
          )}

          <button
            type="button"
            onClick={() => triggerLogout()}
            style={{
              background: "transparent",
              border: "none",
              color: "#f87171",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.875rem",
              justifyContent: isMobile || !collapsed ? "flex-start" : "center",
              padding: "0.25rem 0",
              width: "100%",
            }}
          >
            <span>🚪</span>
            {(isMobile || !collapsed) && "Sign Out"}
          </button>
        </div>
      </aside>
    </>
  );
}

