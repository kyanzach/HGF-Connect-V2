"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

const TYPE_COLORS: Record<string, string> = {
  FamilyMember: "#4EB1CB",
  GrowingFriend: "#a855f7",
  NewFriend: "#10b981",
};
const AGE_ICONS: Record<string, string> = { Adult: "👤", Youth: "🌱", Kids: "🧒" };

interface MemberMinistry { id: number; ministry: { name: string } }
interface Member {
  id: number; firstName: string; lastName: string;
  profilePicture: string | null; coverPhoto: string | null; type: string;
  ageGroup: string | null; joinDate: string | null;
  birthdate: string | null; baptismDate: string | null;
  invitedBy: string | null; familyMembers: string | null;
  phone: string | null; address: string | null;
  favoriteVerse: string | null; ministries: MemberMinistry[];
}

function since(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Asia/Manila" });
}

function completenessScore(m: Member): number {
  let s = 0;
  if (m.profilePicture) s += 2;
  if (m.coverPhoto)     s += 2;
  if (m.birthdate)      s += 1;
  if (m.baptismDate)    s += 1;
  if (m.invitedBy)      s += 1;
  if (m.familyMembers)  s += 1;
  if (m.phone)          s += 1;
  if (m.address)        s += 1;
  if (m.favoriteVerse)  s += 1;
  return s;
}

const profilePic  = (f: string | null) => f ? `/uploads/profile_pictures/${f}` : null;
const coverPicUrl = (f: string | null) => f ? `/uploads/cover_photos/${f}`     : null;

function MemberCard({ m }: { m: Member }) {
  const color = TYPE_COLORS[m.type] ?? PRIMARY;
  const initials = `${m.firstName?.[0] ?? ""}${m.lastName?.[0] ?? ""}`;
  const avatarSrc = profilePic(m.profilePicture);
  const coverSrc  = coverPicUrl(m.coverPhoto);
  const sinceLabel = since(m.joinDate);

  return (
    <Link href={`/member/${m.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        position: "relative", borderRadius: "18px", overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: "0.75rem",
        border: "1px solid #e8edf3", transition: "transform 0.15s, box-shadow 0.15s",
        cursor: "pointer", minHeight: 88,
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"; }}
      >
        {/* Cover photo background */}
        {coverSrc && (
          <img src={coverSrc} alt="" aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
        )}
        {/* White gradient overlay: opaque left → transparent right */}
        <div style={{ position: "absolute", inset: 0,
          background: coverSrc
            ? "linear-gradient(to right, rgba(255,255,255,0.97) 38%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,0) 100%)"
            : "white",
          zIndex: 1 }} />

        {/* Card content */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Header: avatar + info */}
          <div style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
            {/* Avatar */}
            <div style={{ width: 60, height: 60, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", border: `2.5px solid ${color}30`, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
              {avatarSrc ? (
                <Image src={avatarSrc} alt={`${m.firstName} ${m.lastName}`} width={60} height={60} style={{ objectFit: "cover", width: 60, height: 60 }} />
              ) : (
                <span style={{ fontSize: "1.375rem", fontWeight: 900, color }}>{initials}</span>
              )}
            </div>
            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.3rem", letterSpacing: "-0.01em" }}>
                {m.firstName} {m.lastName}
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color, background: `${color}14`, padding: "0.15rem 0.55rem", borderRadius: "999px", border: `1px solid ${color}25` }}>
                  {m.ageGroup ? `${AGE_ICONS[m.ageGroup] ?? ""} ${m.ageGroup}` : m.type.replace(/([A-Z])/g, " $1").trim()}
                </span>
                {sinceLabel && (
                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#64748b", background: "rgba(241,245,249,0.9)", border: "1px solid #e2e8f0", padding: "0.15rem 0.55rem", borderRadius: "999px" }}>
                    📅 {sinceLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ministry strip */}
          {m.ministries.length > 0 && (
            <div style={{ padding: "0 1rem 0.875rem", borderTop: "1px solid rgba(248,250,252,0.8)", paddingTop: "0.75rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {m.ministries.slice(0, 4).map((mm) => (
                  <span key={mm.id} style={{ fontSize: "0.7rem", fontWeight: 700, background: PRIMARY, color: "white", padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
                    {mm.ministry.name}
                  </span>
                ))}
                {m.ministries.length > 4 && (
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "rgba(241,245,249,0.9)", color: "#64748b", padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
                    +{m.ministries.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bible verse */}
          {m.favoriteVerse && (
            <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(248,250,252,0.8)", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              <span style={{ color: PRIMARY, fontSize: "1rem", flexShrink: 0, lineHeight: 1.4 }}>✝️</span>
              <p style={{ fontSize: "0.8rem", fontStyle: "italic", color: "#64748b", lineHeight: 1.55, margin: 0 }}>
                &ldquo;{m.favoriteVerse.length > 100 ? m.favoriteVerse.slice(0, 100) + "…" : m.favoriteVerse}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function DirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [ministryList, setMinistryList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [age, setAge] = useState("all");
  const [ministry, setMinistry] = useState("all");
  const [sort, setSort] = useState("complete");

  useEffect(() => {
    Promise.all([
      fetch("/api/members?status=active&limit=500").then((r) => r.json()),
      fetch("/api/ministries").then((r) => r.json()),
    ]).then(([md, mins]) => {
      setMembers(md.members ?? md ?? []);
      setMinistryList(mins.ministries ?? mins ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
    }
    if (type !== "all") list = list.filter((m) => m.type === type);
    if (age !== "all") list = list.filter((m) => m.ageGroup === age);
    if (ministry !== "all") list = list.filter((m) => m.ministries.some((mm) => mm.ministry.name === ministry));
    return [...list].sort((a, b) => {
      if (sort === "newest") return (b.joinDate ?? "").localeCompare(a.joinDate ?? "");
      if (sort === "name")   return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      // Default ("complete"): sort by completeness score descending, then name
      const diff = completenessScore(b) - completenessScore(a);
      return diff !== 0 ? diff : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  }, [members, search, type, age, ministry, sort]);

  const sel = (val: string, set: (v: string) => void, opts: { v: string; l: string }[]) => (
    <select
      value={val}
      onChange={(e) => set(e.target.value)}
      style={{ flex: "1 1 0", minWidth: 0, border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "0.5rem 0.625rem", fontSize: "0.8rem", color: "#374151", background: "white", outline: "none" }}
    >
      {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
        {/* Hero */}
        <div style={{ background: `linear-gradient(160deg, #0f2d3d 0%, ${PRIMARY} 100%)`, padding: "2rem 1rem 2.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 900, color: "white", margin: "0 0 0.375rem", letterSpacing: "-0.02em" }}>👥 Community</h1>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.875rem", margin: 0 }}>
            {loading ? "Loading members…" : `${filtered.length} active member${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Search + Filters — sticky */}
        <div style={{ background: "white", padding: "0.875rem 1rem", borderBottom: "1px solid #e8edf3", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: "0.625rem" }}>
            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.9rem" }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members…"
              style={{ width: "100%", paddingLeft: "2.25rem", paddingRight: "1rem", paddingTop: "0.6rem", paddingBottom: "0.6rem", border: "1.5px solid #e2e8f0", borderRadius: "12px", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
            />
          </div>
          {/* Filters row */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {sel(type, setType, [
              { v: "all", l: "All types" },
              { v: "FamilyMember", l: "Family" },
              { v: "GrowingFriend", l: "Growing" },
              { v: "NewFriend", l: "New Friend" },
            ])}
            {sel(age, setAge, [
              { v: "all", l: "All ages" },
              { v: "Adult", l: "👤 Adult" },
              { v: "Youth", l: "🌱 Youth" },
              { v: "Kids", l: "🧒 Kids" },
            ])}
            {sel(sort, setSort, [
              { v: "complete", l: "⭐ Complete" },
              { v: "name", l: "A → Z" },
              { v: "newest", l: "Newest" },
            ])}
          </div>
          {/* Ministry filter — horizontal scroll chips */}
          {ministryList.length > 0 && (
            <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", marginTop: "0.625rem", scrollbarWidth: "none", paddingBottom: 2 }}>
              {[{ id: 0, name: "All" }, ...ministryList].map((min) => (
                <button
                  key={min.id}
                  onClick={() => setMinistry(min.id === 0 ? "all" : min.name)}
                  style={{ flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "999px", border: "1.5px solid", borderColor: ministry === (min.id === 0 ? "all" : min.name) ? PRIMARY : "#e2e8f0", background: ministry === (min.id === 0 ? "all" : min.name) ? PRIMARY : "white", color: ministry === (min.id === 0 ? "all" : min.name) ? "white" : "#64748b", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {min.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feed */}
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "1rem 0.875rem 4rem" }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: "white", borderRadius: "18px", height: 120, marginBottom: "0.75rem", animation: "pulse 1.5s ease infinite", opacity: 0.7 }} />
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🔍</div>
              <p style={{ fontWeight: 700, color: "#475569" }}>No members found</p>
              <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>Try adjusting your search or filters.</p>
            </div>
          ) : (
            filtered.map((m) => <MemberCard key={m.id} m={m} />)
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.7}50%{opacity:.35}}`}</style>
    </>
  );
}
