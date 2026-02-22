"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

const PRIMARY = "#4EB1CB";
const APP_VERSION = "2.0.0";

export default function PublicNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "🏠 Home" },
    { href: "/directory", label: "👥 Member Directory" },
    { href: "/events", label: "📅 Events" },
    { href: "/marketplace", label: "🛍️ Marketplace" },
    { href: "/resources", label: "📚 Resources" },
  ];

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
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 1rem",
          display: "flex",
          alignItems: "center",
          height: "56px",
          gap: "1rem",
        }}
      >
        {/* Brand */}
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
              alignSelf: "center",
            }}
          >
            v{APP_VERSION}
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.125rem",
            flex: 1,
            // Hide on small screens via CSS class is not available; use JS-driven logic
          }}
          className="hgf-desktop-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: isActive(link.href) ? 700 : 500,
                color: isActive(link.href) ? "white" : "rgba(255,255,255,0.85)",
                background: isActive(link.href)
                  ? "rgba(255,255,255,0.18)"
                  : "transparent",
                transition: "background 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {session ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
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
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    minWidth: "180px",
                    zIndex: 200,
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <DropdownItem href="/dashboard" label="🏠 My Dashboard" />
                  <DropdownItem href="/profile" label="✏️ Edit Profile" />
                  {["admin", "moderator", "usher"].includes(session.user.role) && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />
                      <DropdownItem href="/attendance" label="✅ Attendance App" />
                    </>
                  )}
                  {["admin", "moderator"].includes(session.user.role) && (
                    <>
                      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: 0 }} />
                      <div style={{ padding: "0.25rem 0.75rem", fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: "0.375rem 0.75rem",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: isActive("/login") ? 700 : 500,
                  color: "rgba(255,255,255,0.9)",
                  background: isActive("/login") ? "rgba(255,255,255,0.18)" : "transparent",
                }}
              >
                🔑 Login
              </Link>
              <Link
                href="/register"
                style={{
                  padding: "0.375rem 0.75rem",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                📝 Register
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="hgf-mobile-menu-btn"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "white",
              width: "36px",
              height: "36px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1.125rem",
              display: "none", // shown via CSS
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          style={{
            background: "#3A95AD",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
          className="hgf-mobile-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                padding: "0.75rem 1.25rem",
                color: "white",
                textDecoration: "none",
                fontWeight: isActive(link.href) ? 700 : 400,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                background: isActive(link.href) ? "rgba(255,255,255,0.1)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .hgf-desktop-nav { display: none !important; }
          .hgf-mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hgf-mobile-nav { display: none !important; }
        }
      `}</style>
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
