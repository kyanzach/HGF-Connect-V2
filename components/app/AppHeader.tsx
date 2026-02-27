"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import NotificationBell from "@/components/NotificationBell";
import { APP_VERSION } from "@/lib/version";

const PRIMARY = "#4EB1CB";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Simple SVG Bell (Facebook-style silhouette)
function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="white"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
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
        background: PRIMARY,
        // ↓ Grows to include the status bar height on notched iPhones
        paddingTop: "env(safe-area-inset-top)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* Inner row — always 56px tall, sits below the safe area */}
      <div style={{
        height: "56px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1rem",
      }}>

      {/* Left: Logo + Greeting */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
          <Image
            src="/HGF-icon-v1.0.png"
            alt="HGF"
            width={28}
            height={28}
            style={{ objectFit: "contain" }}
          />
        </div>
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
          v{APP_VERSION}
        </span>

        {/* Live Notification Bell */}
        <NotificationBell />
      </div>
      </div>{/* end inner row */}
    </header>
  );
}
