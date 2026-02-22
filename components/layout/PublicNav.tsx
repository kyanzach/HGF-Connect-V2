"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const PRIMARY = "#4EB1CB";
const APP_VERSION = "2.0.1";

// SVG icons matching old PHP site style
const IconHome = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const IconPeople = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;
const IconCalendar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>;
const IconShop = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0023.44 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>;
const IconBook = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>;
const IconLogin = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg>;
const IconRegister = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;

const navLinks = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/directory", label: "Member Directory", Icon: IconPeople },
  { href: "/events", label: "Events", Icon: IconCalendar },
  { href: "/marketplace", label: "Marketplace", Icon: IconShop },
  { href: "/resources", label: "Resources", Icon: IconBook },
];

export default function PublicNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav
      style={{
        background: PRIMARY,
        color: "white",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          padding: "0 1rem",
          display: "flex",
          alignItems: "center",
          height: "56px",
        }}
      >
        {/* Brand — left */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "white",
            fontWeight: 700,
            fontSize: "1.0625rem",
            flexShrink: 0,
          }}
        >
          <Image
            src="/HGF-icon-v1.0.png"
            alt="HGF Logo"
            width={32}
            height={32}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
          HGF Connect
          <span
            style={{
              fontSize: "0.625rem",
              background: "rgba(255,255,255,0.2)",
              padding: "0.1rem 0.375rem",
              borderRadius: "999px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            v{APP_VERSION}
          </span>
        </Link>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right controls — floated right, always visible */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* User dropdown (logged in) */}
          {session && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "white",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: "2px solid rgba(255,255,255,0.5)",
                  }}
                >
                  {(session.user.firstName || session.user.name || "?")[0].toUpperCase()}
                </div>
                {session.user.firstName || session.user.name?.split(" ")[0]} ▾
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "white",
                    borderRadius: "10px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    minWidth: "190px",
                    zIndex: 200,
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <DropdownItem href="/feed" label="🏠 Community Feed" />
                  <DropdownItem href="/me" label="👤 My Profile" />
                  {["admin", "moderator", "usher"].includes(session.user.role) && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />
                      <DropdownItem href="/attendance" label="✅ Attendance App" />
                    </>
                  )}
                  {["admin", "moderator"].includes(session.user.role) && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />
                      <div style={{ padding: "0.25rem 0.875rem", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Management
                      </div>
                      <DropdownItem href="/admin" label="⚙️ Admin Dashboard" />
                    </>
                  )}
                  <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    style={{
                      width: "100%",
                      padding: "0.625rem 0.875rem",
                      background: "none",
                      border: "none",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "#ef4444",
                      fontWeight: 500,
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Guest: Login link */}
          {!session && (
            <Link
              href="/login"
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "999px",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: PRIMARY,
                background: "white",
              }}
            >
              Login
            </Link>
          )}

          {/* Hamburger — ALWAYS visible */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "1.125rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* ── Slide-down menu ── */}
      {menuOpen && (
        <div style={{ background: "#3A95AD", borderTop: "1px solid rgba(255,255,255,0.1)", maxWidth: "500px", margin: "0 auto" }}>
          {navLinks.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.875rem 1.25rem",
                color: "white",
                textDecoration: "none",
                fontWeight: isActive(href) ? 700 : 400,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                background: isActive(href) ? "rgba(255,255,255,0.1)" : "transparent",
                fontSize: "0.9rem",
              }}
            >
              <Icon />
              {label}
            </Link>
          ))}
          {!session && (
            <>
              <Link href="/login" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1.25rem", color: "white", textDecoration: "none", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "0.9rem" }}>
                <IconLogin /> Login
              </Link>
              <Link href="/register" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1.25rem", color: "rgba(255,255,255,0.85)", textDecoration: "none", fontSize: "0.9rem" }}>
                <IconRegister /> Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

function DropdownItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "0.625rem 0.875rem",
        color: "#334155",
        textDecoration: "none",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      {label}
    </Link>
  );
}
