"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function AppHeader() {
  const { data: session } = useSession();
  const firstName = session?.user?.firstName || session?.user?.name?.split(" ")[0] || "Friend";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "56px",
        background: "#4EB1CB",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Left: Logo + Greeting */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <Image
          src="/HGF-icon-v1.0.png"
          alt="HGF"
          width={32}
          height={32}
          style={{ borderRadius: "50%", objectFit: "cover" }}
        />
        <div>
          <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>
            {getGreeting()},
          </div>
          <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", lineHeight: 1.2 }}>
            {firstName} 👋
          </div>
        </div>
      </div>

      {/* Right: Version + Notification Bell */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span
          style={{
            fontSize: "0.625rem",
            background: "rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.85)",
            padding: "0.1rem 0.4rem",
            borderRadius: "999px",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          v2.0.1
        </span>
        <Link
          href="/notifications"
          style={{
            position: "relative",
            color: "white",
            textDecoration: "none",
            fontSize: "1.25rem",
            lineHeight: 1,
          }}
          aria-label="Notifications"
        >
          🔔
          {/* Notification badge — will be dynamic later */}
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              width: "8px",
              height: "8px",
              background: "#ef4444",
              borderRadius: "50%",
              border: "1.5px solid #4EB1CB",
            }}
          />
        </Link>
      </div>
    </header>
  );
}
