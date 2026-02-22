"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

function memberSince(joinDate: string | null): string {
  if (!joinDate) return "";
  return new Date(joinDate).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  });
}

interface MemberData {
  joinDate: string | null;
  favoriteVerse: string | null;
  ministries: { id: number; ministry: { name: string } }[];
}

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

  const [member, setMember] = useState<MemberData | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/members/${user.id}`)
      .then((r) => r.json())
      .then((data) => setMember(data))
      .catch(() => {});
  }, [user?.id]);

  const since = memberSince(member?.joinDate ?? null);

  return (
    <div style={{ paddingBottom: "1rem" }}>
      {/* Cover + Avatar */}
      <div style={{ background: `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`, padding: "1.5rem 1rem 3rem", position: "relative" }} />
      <div style={{ margin: "-2.5rem 1rem 0", position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", background: `${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {profilePic ? (
            <Image src={profilePic} alt={fullName} width={72} height={72} style={{ objectFit: "cover" }} />
          ) : (
            <span style={{ color: PRIMARY, fontSize: "1.5rem", fontWeight: 800 }}>{initials}</span>
          )}
        </div>
        <div style={{ paddingBottom: "0.375rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.125rem" }}>{fullName}</h2>
          <span style={{ display: "inline-block", background: "#e0f7fb", color: PRIMARY, fontSize: "0.7rem", fontWeight: 700, padding: "0.175rem 0.625rem", borderRadius: "999px", textTransform: "capitalize" }}>
            {user?.role ?? "member"}
          </span>
        </div>
      </div>

      {/* Member since + verse */}
      {(since || member?.favoriteVerse) && (
        <div style={{ margin: "0 1rem 0.875rem", padding: "0.875rem 1rem", background: "white", borderRadius: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {since && (
            <p style={{ margin: "0 0 0.375rem", fontSize: "0.775rem", fontWeight: 700, color: "#64748b" }}>
              📅 Member since {since}
            </p>
          )}
          {member?.favoriteVerse && (
            <p style={{ margin: 0, fontSize: "0.8rem", fontStyle: "italic", color: "#475569", lineHeight: 1.6 }}>
              &ldquo;{member.favoriteVerse.length > 150 ? member.favoriteVerse.slice(0, 150) + "…" : member.favoriteVerse}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Ministry tags */}
      {(member?.ministries?.length ?? 0) > 0 && (
        <div style={{ margin: "0 1rem 0.875rem", padding: "0.875rem 1rem", background: "white", borderRadius: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.5rem" }}>🤲 My Ministries</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {member!.ministries.slice(0, 5).map((mm) => (
              <span key={mm.id} style={{ fontSize: "0.75rem", fontWeight: 700, background: PRIMARY, color: "white", padding: "0.25rem 0.625rem", borderRadius: "6px" }}>
                {mm.ministry.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View Full Profile link */}
      {user?.id && (
        <div style={{ margin: "0 1rem 0.875rem" }}>
          <Link href={`/member/${user.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", background: "white", border: `1.5px solid ${PRIMARY}`, color: PRIMARY, textDecoration: "none", padding: "0.625rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            👁 View My Full Profile
          </Link>
        </div>
      )}

      {/* Menu items */}
      <div style={{ margin: "0 1rem", background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        {MENU_ITEMS.map((item, i) => (
          <Link key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1rem", textDecoration: "none", borderBottom: i < MENU_ITEMS.length - 1 ? "1px solid #f8fafc" : "none" }}>
            <span style={{ fontSize: "1.125rem", width: 28, textAlign: "center" }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{item.label}</span>
            <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>›</span>
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div style={{ margin: "0.875rem 1rem 0" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{ width: "100%", padding: "0.875rem", background: "white", border: "1.5px solid #fecaca", borderRadius: "14px", color: "#ef4444", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}
        >
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
