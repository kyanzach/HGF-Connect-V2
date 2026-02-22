"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function PublicNav() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      style={{
        background: "white",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #4eb1cb 0%, #3a95ad 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontWeight: 700, fontSize: "1.1rem" }}>
              H
            </span>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1.125rem",
              color: "#0f172a",
              letterSpacing: "-0.01em",
            }}
          >
            HGF <span style={{ color: "#4eb1cb" }}>Connect</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
          className="nav-desktop"
        >
          <NavLink href="/">Home</NavLink>
          <NavLink href="/events">Events</NavLink>
          <NavLink href="/directory">Directory</NavLink>
          <NavLink href="/resources">Resources</NavLink>
          <NavLink href="/marketplace">Marketplace</NavLink>

          {session ? (
            <>
              {["admin", "moderator"].includes(session.user.role) && (
                <NavLink href="/admin">Admin</NavLink>
              )}
              <Link
                href="/profile"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  textDecoration: "none",
                  color: "#0f172a",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#4eb1cb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    overflow: "hidden",
                  }}
                >
                  {session.user.profilePicture ? (
                    <Image
                      src={session.user.profilePicture}
                      alt={session.user.firstName}
                      width={28}
                      height={28}
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>
                      {session.user.firstName?.charAt(0)}
                    </span>
                  )}
                </div>
                {session.user.firstName}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  color: "#64748b",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #4eb1cb 0%, #3a95ad 100%)",
                color: "white",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: "0.375rem 0.75rem",
        borderRadius: "6px",
        textDecoration: "none",
        color: "#475569",
        fontSize: "0.875rem",
        fontWeight: 500,
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.background = "#f1f5f9";
        (e.target as HTMLElement).style.color = "#0f172a";
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.background = "transparent";
        (e.target as HTMLElement).style.color = "#475569";
      }}
    >
      {children}
    </Link>
  );
}
