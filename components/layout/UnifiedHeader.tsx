"use client";

/**
 * UnifiedHeader — single header used on every page (app + public).
 *
 * Logged-in:  [Logo] HGF Connect v2.x  ···  [🔔] [Avatar ▾] [☰]
 * Guest:      [Logo] HGF Connect v2.x  ···  [Login] [☰]
 *
 * Avatar dropdown:  Community Feed | My Profile | My Journal |
 *                   My Prayer Request | 🤝 My Listings |
 *                   ✅ Attendance App (admin/usher) |
 *                   ⚙️ Settings |
 *                   — Admin Dashboard (admin) —
 *                   🚪 Logout
 *
 * Hamburger nav:    Home | Member Directory | Events |
 *                   🤝 StewardShop | Resources
 *                   (guest only) Login | Register
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";
import { APP_VERSION } from "@/lib/version";

const PRIMARY   = "#4EB1CB";
const DARK_NAV  = "#3A95AD";

// ── SVG icons ─────────────────────────────────────────────────────────────────
const Ic = {
  Home:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  People:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  Cal:     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>,
  Shop:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.44 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>,
  Book:    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>,
  Login:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg>,
  Reg:     <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  // White handshake: emoji filtered to white (brightness(0) = black, invert(1) = white)
  Handshake: <span style={{ filter: "brightness(0) invert(1)", fontSize: 14, lineHeight: 1, display: "inline-flex" }}>🤝</span>,
};

const NAV_LINKS = [
  { href: "/feed",        label: "Home",             icon: Ic.Home   },
  { href: "/directory",   label: "Member Directory", icon: Ic.People },
  { href: "/events",      label: "Events",           icon: Ic.Cal    },
  { href: "/stewardshop", label: "StewardShop",      icon: Ic.Handshake },
  { href: "/resources",   label: "Resources",        icon: Ic.Book   },
];

// ── Notification popup (Facebook-style) ────────────────────────────────────────
interface NotifToast { id: number; title: string; body: string | null; type: string; }

function typeIcon(type: string) {
  const m: Record<string, string> = {
    new_post: "✍️", new_comment: "💬", comment_reply: "↩️",
    mention: "📣", new_like: "❤️", new_member: "👋",
    new_marketplace: "🤝", prayer_response: "🙏",
  };
  return m[type] ?? "🔔";
}

function NotificationToast({ toast, onClose }: { toast: NotifToast; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(56px + env(safe-area-inset-top) + 8px)",
        right: 12,
        maxWidth: 320,
        background: "white",
        borderRadius: 14,
        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        padding: "0.75rem 1rem",
        zIndex: 9999,
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
        animation: "slideInRight 0.3s ease",
        border: "1px solid #e2e8f0",
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      <span style={{ fontSize: "1.4rem", flexShrink: 0, lineHeight: 1.3 }}>{typeIcon(toast.type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#111", marginBottom: 2 }}>
          {toast.title}
        </div>
        {toast.body && (
          <div style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {toast.body}
          </div>
        )}
        <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: 3 }}>just now</div>
      </div>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", fontSize: "0.9rem", padding: 0, flexShrink: 0 }}
        aria-label="Close"
      >✕</button>
    </div>
  );
}

// ── Poll hook: fires onNew when unread count jumps ─────────────────────────────
function useNewNotifToast(onNew: (n: NotifToast) => void) {
  const prevCount = useRef<number | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;
    const poll = async () => {
      try {
        const d = await fetch("/api/notifications").then((r) => r.json());
        const count: number = d.unreadCount ?? 0;
        const notifs: any[] = d.notifications ?? [];
        if (prevCount.current !== null && count > prevCount.current) {
          // New notification arrived — show the newest unread one
          const newest = notifs.find((n) => !n.isRead);
          if (newest) onNew({ id: newest.id, title: newest.title, body: newest.body, type: newest.type });
        }
        prevCount.current = count;
      } catch { /* silent */ }
    };
    poll(); // initial
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [session, onNew]);
}

// ── DropdownItem ───────────────────────────────────────────────────────────────
function DropItem({ href, label, onClick }: { href?: string; label: string; onClick?: () => void }) {
  const style: React.CSSProperties = {
    display: "block", padding: "0.625rem 0.875rem", color: "#334155",
    textDecoration: "none", fontSize: "0.875rem", fontWeight: 500,
    background: "none", border: "none", width: "100%", textAlign: "left",
    cursor: "pointer", fontFamily: "inherit",
  };
  if (href) return <Link href={href} style={style} onClick={onClick}>{label}</Link>;
  return <button style={{ ...style, color: "#ef4444" }} onClick={onClick}>{label}</button>;
}

const HR = () => <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />;

// ── Main component ─────────────────────────────────────────────────────────────
export default function UnifiedHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const [dropOpen, setDropOpen] = useState(false);
  const [navOpen, setNavOpen]   = useState(false);
  const [toast, setToast]       = useState<NotifToast | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);
  // navRef not needed — nav links have onClick close + route-change closes it

  // Close menus on route change
  useEffect(() => { setDropOpen(false); setNavOpen(false); }, [pathname]);

  // Close dropdown on outside click only (nav closes via onClick + route-change)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropOpen && dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dropOpen]);

  const handleToast = useCallback((n: NotifToast) => setToast(n), []);
  useNewNotifToast(handleToast);

  const user = session?.user as any;
  const firstName   = user?.firstName || user?.name?.split(" ")[0] || "Guest";
  const lastName    = user?.lastName  || "";
  const fullName    = `${firstName} ${lastName}`.trim();
  const profilePic  = user?.profilePicture
    ? `/uploads/profile_pictures/${user.profilePicture}`
    : null;
  const role        = user?.role ?? "";
  const isAdmin     = ["admin", "moderator"].includes(role);
  const canAttend   = ["admin", "moderator", "usher"].includes(role);
  const initials    = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  const isActive = (href: string) =>
    href === "/feed" ? pathname === "/feed" : pathname?.startsWith(href);

  return (
    <>
      {/* ── Notification toast popup ── */}
      {toast && <NotificationToast toast={toast} onClose={() => setToast(null)} />}

      <nav
        style={{
          background: PRIMARY,
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* ── Top bar ────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 500,
            margin: "0 auto",
            padding: "0 0.875rem",
            display: "flex",
            alignItems: "center",
            height: 56,
            gap: "0.5rem",
          }}
        >
          {/* Brand */}
          <Link
            href={session ? "/feed" : "/"}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem",
              textDecoration: "none", color: "white", fontWeight: 700,
              fontSize: "1rem", flexShrink: 0 }}
          >
            <Image src="/HGF-icon-v1.0.png" alt="HGF" width={32} height={32}
              style={{ borderRadius: "50%", objectFit: "cover" }} />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontWeight: 800, fontSize: "0.9375rem" }}>HGF Connect</span>
            </span>
            <span style={{ fontSize: "0.58rem", background: "rgba(255,255,255,0.2)",
              padding: "0.1rem 0.35rem", borderRadius: 999, fontWeight: 600,
              letterSpacing: "0.04em", color: "rgba(255,255,255,0.85)", flexShrink: 0 }}>
              v{APP_VERSION}
            </span>
          </Link>

          <div style={{ flex: 1 }} />

          {/* ── Right controls ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>

            {/* Notification bell (logged in only) */}
            {session && <NotificationBell />}

            {/* Avatar dropdown pill (logged in) */}
            {session && (
              <div ref={dropRef} style={{ position: "relative" }}>
                <button
                  onClick={() => { setDropOpen((o) => !o); setNavOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    background: "rgba(255,255,255,0.15)", border: "none",
                    color: "white", padding: "0.3rem 0.55rem 0.3rem 0.3rem",
                    borderRadius: 8, cursor: "pointer", fontWeight: 600,
                    fontSize: "0.8rem", fontFamily: "inherit",
                  }}
                  aria-label="Account menu"
                >
                  {/* Profile picture or initials */}
                  <div style={{ width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(255,255,255,0.3)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, border: "2px solid rgba(255,255,255,0.5)" }}>
                    {profilePic
                      ? <Image src={profilePic} alt={fullName} width={28} height={28}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "white" }}>{initials}</span>
                    }
                  </div>
                  <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {firstName}
                  </span>
                  <span style={{ fontSize: "0.6rem", opacity: 0.75 }}>▾</span>
                </button>

                {/* Dropdown */}
                {dropOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: "white", borderRadius: 12,
                    boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
                    minWidth: 210, zIndex: 200,
                    overflow: "hidden", border: "1px solid #e2e8f0",
                  }}>
                    {/* User header — clickable → full public profile */}
                    <Link href={`/member/${user?.id}`} onClick={() => setDropOpen(false)} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "0.75rem 0.875rem 0.5rem", display: "flex",
                      alignItems: "center", gap: "0.5rem", borderBottom: "1px solid #f1f5f9",
                      background: "transparent" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden",
                        background: PRIMARY, display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0 }}>
                        {profilePic
                          ? <Image src={profilePic} alt={fullName} width={36} height={36}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "white" }}>{initials}</span>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fullName}</div>
                        <div style={{ fontSize: "0.7rem", color: PRIMARY, fontWeight: 600 }}>View Profile →</div>
                      </div>
                    </div>
                    </Link>

                    <DropItem href="/feed"  label="🏠 Community Feed"  onClick={() => setDropOpen(false)} />
                    <DropItem href="/me"    label="👤 My Profile"       onClick={() => setDropOpen(false)} />
                    <HR />
                    <DropItem href="/journal"          label="📓 My Journal"          onClick={() => setDropOpen(false)} />
                    <DropItem href="/prayer"            label="🙏 My Prayer Request"   onClick={() => setDropOpen(false)} />
                    <DropItem href="/stewardshop/my-listings" label="🤝 My Listings"  onClick={() => setDropOpen(false)} />
                    <HR />
                    <DropItem href="/profile/edit"     label="⚙️ Settings"            onClick={() => setDropOpen(false)} />

                    {canAttend && (
                      <>
                        <HR />
                        <DropItem href="/attendance" label="✅ Attendance App" onClick={() => setDropOpen(false)} />
                      </>
                    )}

                    {isAdmin && (
                      <>
                        <HR />
                        <div style={{ padding: "0.25rem 0.875rem", fontSize: "0.68rem",
                          color: "#94a3b8", fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.06em" }}>
                          Management
                        </div>
                        <DropItem href="/admin" label="🎛️ Admin Dashboard" onClick={() => setDropOpen(false)} />
                      </>
                    )}

                    <HR />
                    <DropItem label="🚪 Logout" onClick={() => { setDropOpen(false); signOut({ callbackUrl: "/" }); }} />
                  </div>
                )}
              </div>
            )}

            {/* Guest: Login */}
            {!session && (
              <Link href="/login" style={{
                padding: "0.35rem 0.875rem", borderRadius: 999,
                textDecoration: "none", fontSize: "0.875rem",
                fontWeight: 700, color: PRIMARY, background: "white",
              }}>
                Login
              </Link>
            )}

            {/* Hamburger */}
            <button
              onClick={() => { setNavOpen((o) => !o); setDropOpen(false); }}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", color: "white",
                  width: 36, height: 36, borderRadius: 8, cursor: "pointer",
                  fontSize: "1.1rem", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
                aria-label="Navigation menu"
            >
              {navOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* ── Slide-down nav menu ── */}
        {navOpen && (
          <div style={{
            background: DARK_NAV, borderTop: "1px solid rgba(255,255,255,0.1)",
            maxWidth: 500, margin: "0 auto",
          }}>
            {NAV_LINKS.map(({ href, label, icon }) => (
              <Link key={href} href={href} onClick={() => setNavOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  padding: "0.875rem 1.25rem",
                  color: "white", textDecoration: "none",
                  fontWeight: isActive(href) ? 700 : 400,
                  borderBottom: "1px solid rgba(255,255,255,0.09)",
                  background: isActive(href) ? "rgba(255,255,255,0.1)" : "transparent",
                  fontSize: "0.9rem",
                }}
              >
                {icon && <span style={{ display: "flex", alignItems: "center", opacity: 0.9 }}>{icon}</span>}
                {label}
              </Link>
            ))}

            {!session && (
              <>
                <Link href="/login" onClick={() => setNavOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.875rem 1.25rem", color: "white", textDecoration: "none",
                    fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.09)",
                    fontSize: "0.9rem" }}>
                  {Ic.Login} Login
                </Link>
                <Link href="/register" onClick={() => setNavOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.875rem 1.25rem", color: "rgba(255,255,255,0.8)",
                    textDecoration: "none", fontSize: "0.9rem" }}>
                  {Ic.Reg} Register
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
