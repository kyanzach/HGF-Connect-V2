"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

const MENU_ITEMS = [
  { icon: "👤", label: "Edit Profile", href: "/profile/edit" },
  { icon: "🔔", label: "Notifications", href: "/notifications" },
  { icon: "📖", label: "My Journal", href: "/journal" },
  { icon: "🙏", label: "My Prayers", href: "/prayer" },
  { icon: "🛍️", label: "My Listings", href: "/marketplace/my-listings" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

export default function MePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Member";
  const initials = fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const profilePic = user?.profilePicture
    ? `/uploads/profile_pictures/${user.profilePicture}`
    : null;

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* Cover + Avatar */}
      <div
        style={{
          background: `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`,
          padding: "1.5rem 1rem 3rem",
          position: "relative",
        }}
      />
      <div
        style={{
          margin: "-2.5rem 1rem 0",
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "flex-end",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        {profilePic ? (
          <Image
            src={profilePic}
            alt={fullName}
            width={72}
            height={72}
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: PRIMARY,
              border: "3px solid white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "1.5rem",
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Name + role */}
      <div style={{ padding: "0 1rem 1rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.125rem" }}>
          {fullName}
        </h2>
        <span
          style={{
            display: "inline-block",
            background: "#e0f7fb",
            color: PRIMARY,
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.175rem 0.625rem",
            borderRadius: "999px",
            textTransform: "capitalize",
          }}
        >
          {user?.role ?? "member"}
        </span>
      </div>

      {/* Quick stats */}
      <div
        style={{
          display: "flex",
          margin: "0 1rem 1rem",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}
      >
        {[
          { label: "Posts", val: "0" },
          { label: "Prayers", val: "0" },
          { label: "Events", val: "0" },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "0.875rem 0",
              borderRight: i < 2 ? "1px solid #f1f5f9" : "none",
            }}
          >
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>{s.val}</div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu items */}
      <div
        style={{
          margin: "0 1rem",
          background: "white",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}
      >
        {MENU_ITEMS.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              padding: "0.875rem 1rem",
              textDecoration: "none",
              borderBottom: i < MENU_ITEMS.length - 1 ? "1px solid #f8fafc" : "none",
            }}
          >
            <span style={{ fontSize: "1.125rem", width: 28, textAlign: "center" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>
              {item.label}
            </span>
            <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>›</span>
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div style={{ margin: "0.875rem 1rem 0" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{
            width: "100%",
            padding: "0.875rem",
            background: "white",
            border: "1.5px solid #fecaca",
            borderRadius: "14px",
            color: "#ef4444",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
