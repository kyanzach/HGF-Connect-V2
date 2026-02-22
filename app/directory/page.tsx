"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";

const PRIMARY = "#4EB1CB";

const TYPE_LABELS: Record<string, string> = {
  FamilyMember: "Family Member",
  GrowingFriend: "Growing Friend",
  NewFriend: "New Friend",
};
const TYPE_COLORS: Record<string, string> = {
  FamilyMember: "#4EB1CB",
  GrowingFriend: "#ec4899",
  NewFriend: "#10b981",
};
const AGE_LABELS: Record<string, string> = {
  Adult: "Adult", Youth: "Youth", Kids: "Kids",
};
const AGE_ICONS: Record<string, string> = {
  Adult: "👤", Youth: "🌱", Kids: "🧒",
};

interface Ministry { name: string }
interface MemberMinistry { id: number; ministry: Ministry }
interface Member {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  coverPhoto: string | null;
  type: string;
  ageGroup: string | null;
  joinDate: string | null;
  favoriteVerse: string | null;
  ministries: MemberMinistry[];
}

function memberSince(joinDate: string | null): string {
  if (!joinDate) return "";
  const d = new Date(joinDate);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

function MemberCard({ member }: { member: Member }) {
  const typeColor = TYPE_COLORS[member.type] ?? PRIMARY;
  const initials = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`;
  const verse = member.favoriteVerse;
  const since = memberSince(member.joinDate);

  return (
    <div style={{ background: "white", border: "1px solid #e8edf3", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "transform 0.15s, box-shadow 0.15s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 28px rgba(0,0,0,0.1)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
    >
      {/* Avatar + header */}
      <div style={{ padding: "1.25rem 1.25rem 0.75rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", background: `${typeColor}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {member.profilePicture ? (
            <Image src={`/uploads/profile_pictures/${member.profilePicture}`} alt={`${member.firstName} ${member.lastName}`} width={56} height={56} style={{ objectFit: "cover", width: 56, height: 56 }} />
          ) : (
            <span style={{ color: typeColor, fontWeight: 800, fontSize: "1.25rem" }}>{initials}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.25rem", lineHeight: 1.2 }}>
            {member.firstName} {member.lastName}
          </h3>
          {/* Type badge */}
          <span style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: typeColor, background: `${typeColor}15`, padding: "0.15rem 0.55rem", borderRadius: "999px", marginRight: "0.375rem" }}>
            {member.ageGroup ? `${AGE_ICONS[member.ageGroup] ?? ""} ${AGE_LABELS[member.ageGroup] ?? member.ageGroup}` : TYPE_LABELS[member.type] ?? member.type}
          </span>
          {/* Member since badge */}
          {since && (
            <span style={{ display: "inline-block", fontSize: "0.65rem", fontWeight: 600, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>
              📅 Member since {since}
            </span>
          )}
        </div>
      </div>

      {/* Ministry tags */}
      {member.ministries.length > 0 && (
        <div style={{ padding: "0 1.25rem 0.875rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>🤲 Ministry Involvement</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {member.ministries.slice(0, 5).map((mm) => (
              <span key={mm.id} style={{ fontSize: "0.7rem", fontWeight: 600, background: PRIMARY, color: "white", padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
                {mm.ministry.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bible verse */}
      {verse && (
        <div style={{ padding: "0 1.25rem 0.875rem", borderTop: member.ministries.length > 0 ? "1px solid #f8fafc" : "none" }}>
          {member.ministries.length > 0 && <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem", marginTop: "0.625rem" }}>✝️ Favorite Verse</p>}
          {member.ministries.length === 0 && <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>✝️ Favorite Verse</p>}
          <p style={{ fontSize: "0.8rem", color: "#475569", fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>
            &ldquo;{verse.length > 120 ? verse.slice(0, 120) + "…" : verse}&rdquo;
          </p>
        </div>
      )}

      {/* View Profile CTA */}
      <div style={{ marginTop: "auto", padding: "0.75rem 1.25rem", borderTop: "1px solid #f1f5f9" }}>
        <Link href={`/member/${member.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", color: PRIMARY, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
          👁 View Profile
        </Link>
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [ministryList, setMinistryList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [ministryFilter, setMinistryFilter] = useState("all");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    Promise.all([
      fetch("/api/members?status=active&limit=500").then((r) => r.json()),
      fetch("/api/ministries").then((r) => r.json()),
    ]).then(([membersData, ministriesData]) => {
      setMembers(membersData.members ?? membersData ?? []);
      setMinistryList(ministriesData.ministries ?? ministriesData ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter((m) => m.type === typeFilter);
    if (ageFilter !== "all") list = list.filter((m) => m.ageGroup === ageFilter);
    if (ministryFilter !== "all") list = list.filter((m) => m.ministries.some((mm) => mm.ministry.name === ministryFilter));
    list = [...list].sort((a, b) => {
      if (sort === "name") return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      if (sort === "newest") return (b.joinDate ?? "").localeCompare(a.joinDate ?? "");
      return 0;
    });
    return list;
  }, [members, search, typeFilter, ageFilter, ministryFilter, sort]);

  const filterSelect = (value: string, onChange: (v: string) => void, options: { value: string; label: string }[]) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.825rem", color: "#374151", background: "white", outline: "none", cursor: "pointer" }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <>
      {/* Public nav */}
      <PublicNav />

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)", color: "white", padding: "3rem 1.5rem 2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
          👥 Member Directory
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem" }}>
          Connect with fellow members of our community
        </p>
      </div>

      {/* Search + Filters */}
      <div style={{ background: "white", borderBottom: "1px solid #e8edf3", padding: "1rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Search row */}
          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
            <span style={{ position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "1rem" }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              style={{ width: "100%", paddingLeft: "2.5rem", paddingRight: "1rem", paddingTop: "0.625rem", paddingBottom: "0.625rem", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {/* Filter row */}
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
            {filterSelect(typeFilter, setTypeFilter, [
              { value: "all", label: "All Types" },
              { value: "FamilyMember", label: "Family Member" },
              { value: "GrowingFriend", label: "Growing Friend" },
              { value: "NewFriend", label: "New Friend" },
            ])}
            {filterSelect(ageFilter, setAgeFilter, [
              { value: "all", label: "All Ages" },
              { value: "Adult", label: "👤 Adult" },
              { value: "Youth", label: "🌱 Youth" },
              { value: "Kids", label: "🧒 Kids" },
            ])}
            {filterSelect(ministryFilter, setMinistryFilter, [
              { value: "all", label: "All Ministries" },
              ...ministryList.map((m) => ({ value: m.name, label: m.name })),
            ])}
            {filterSelect(sort, setSort, [
              { value: "name", label: "Sort: Name" },
              { value: "newest", label: "Sort: Newest" },
            ])}
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#94a3b8", fontWeight: 600 }}>
              {loading ? "Loading..." : `${filtered.length} member${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "white", borderRadius: "16px", height: 200, animation: "pulse 1.5s ease infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#475569" }}>No members found</p>
            <p style={{ fontSize: "0.875rem" }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
            {filtered.map((m) => <MemberCard key={m.id} member={m} />)}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </>
  );
}
