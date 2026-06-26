"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PostCard from "@/components/feed/PostCard";
import PhotoPostViewer, { PhotoEntry } from "@/components/PhotoPostViewer";

const PRIMARY = "#4EB1CB";

interface Post {
  id: number; type: string; content?: string | null; imageUrl?: string | null;
  aiCaption?: string | null; verseRef?: string | null; verseText?: string | null;
  createdAt: string;
  author: { id: number; firstName: string; lastName: string; profilePicture?: string | null; username?: string | null };
  _count?: { likes: number; comments: number };
  isLiked?: boolean;
}

interface Ministry { id: number; ministry: { id: number; name: string }; joinedDate?: string | null }

interface ProfileData {
  id: number;
  firstName: string; lastName: string;
  profilePicture: string | null; coverPhoto: string | null;
  coverPhotoPositionX: number | null; coverPhotoPositionY: number | null;
  favoriteVerse: string | null; joinDate: string | null;
  birthdate: string | null; baptismDate: string | null;
  invitedBy: string | null; address: string | null;
  gender: string | null;
  email: string | null; phone: string | null;
  showEmail: boolean; showPhone: boolean; showAddress: boolean;
  familyMembers: string | null;
  ministries: Ministry[];
  isOwn: boolean; isAdmin: boolean;
}

function timeAgo(date: string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function fmt(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function duration(joinDate: string | null): string {
  if (!joinDate) return "";
  const start = new Date(joinDate);
  const now = new Date();
  let m = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (m <= 0) return "New member";
  return `${m} month${m !== 1 ? "s" : ""}`;
}

const TABS = [
  { key: "wall",       icon: "📝", label: "Wall"      },
  { key: "about",      icon: "ℹ️",  label: "About"     },
  { key: "ministries", icon: "🤲", label: "Ministries" },
];

// ── Wall Tab ───────────────────────────────────────────────────────────────────
function WallTab({ memberId, isOwn }: { memberId: number; isOwn: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts?member=${memberId}&page=1`)
      .then((r) => r.json())
      .then((d) => { setPosts(d.posts ?? []); setHasMore(d.page < d.totalPages); setPage(1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [memberId]);

  async function loadMore() {
    setLoadingMore(true);
    const next = page + 1;
    try {
      const d = await fetch(`/api/posts?member=${memberId}&page=${next}`).then((r) => r.json());
      setPosts((prev) => [...prev, ...(d.posts ?? [])]);
      setHasMore(next < d.totalPages);
      setPage(next);
    } catch { /* silent */ } finally { setLoadingMore(false); }
  }

  if (loading) return (
    <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
      <div style={{ display: "inline-block", width: 32, height: 32, borderRadius: "50%", border: `3px solid ${PRIMARY}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (posts.length === 0) return (
    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
      <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
        {isOwn ? "You haven't posted anything yet." : "No posts yet."}
      </p>
      {isOwn && (
        <Link href="/feed/create" style={{ display: "inline-block", marginTop: "1rem", background: PRIMARY, color: "white", padding: "0.625rem 1.5rem", borderRadius: "999px", textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}>
          ✍️ Write Your First Post
        </Link>
      )}
    </div>
  );

  return (
    <div style={{ padding: "0.75rem" }}>
      {isOwn && (
        <Link href="/feed/create" style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "white", borderRadius: "14px", padding: "0.75rem 1rem", marginBottom: "0.75rem", textDecoration: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", border: "1.5px solid #e2e8f0" }}>
          <span style={{ fontSize: "1.25rem" }}>✍️</span>
          <span style={{ flex: 1, color: "#94a3b8", fontSize: "0.9rem" }}>Share something with the community…</span>
        </Link>
      )}
      {posts.map((post) => <PostCard key={post.id} post={post} />)}
      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore}
          style={{ display: "block", width: "100%", margin: "0.75rem 0 0", padding: "0.75rem", background: "white", border: `1.5px solid ${PRIMARY}`, color: PRIMARY, borderRadius: "12px", fontWeight: 700, fontSize: "0.875rem", cursor: loadingMore ? "wait" : "pointer" }}>
          {loadingMore ? "Loading…" : "Load more posts"}
        </button>
      )}
    </div>
  );
}

// ── About Tab ──────────────────────────────────────────────────────────────────
function AboutTab({ m }: { m: ProfileData }) {
  const familyArr = m.familyMembers ? m.familyMembers.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const dur = duration(m.joinDate);
  const hasContactInfo = (m.email && m.showEmail) || (m.phone && m.showPhone) || (m.address && m.showAddress) || m.isAdmin || m.isOwn;

  const Row = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", padding: "0.75rem 0", borderBottom: "1px solid #f8fafc" }}>
      <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center", flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", marginTop: "0.125rem" }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0.75rem" }}>
      {m.favoriteVerse && (
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>📖 Favorite Verse</div>
          <p style={{ fontSize: "0.9rem", fontStyle: "italic", color: "#475569", lineHeight: 1.65, margin: 0, borderLeft: `3px solid ${PRIMARY}`, paddingLeft: "0.75rem" }}>
            &ldquo;{m.favoriteVerse}&rdquo;
          </p>
        </div>
      )}
      {(dur || m.joinDate) && (
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>📅 Church Membership</div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ flex: 1, background: `${PRIMARY}12`, borderRadius: "12px", padding: "0.75rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, color: PRIMARY }}>{dur || "New"}</div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "0.125rem" }}>Duration</div>
            </div>
            {m.joinDate && (
              <div style={{ flex: 2, display: "flex", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Member Since</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", marginTop: "0.125rem" }}>{fmt(m.joinDate)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {(m.birthdate || m.baptismDate || m.invitedBy || m.gender) && (
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>ℹ️ Personal Details</div>
          {m.gender && <Row icon="🚻" label="Gender" value={m.gender} />}
          {m.birthdate && <Row icon="🎂" label="Birthday" value={fmt(m.birthdate)} />}
          {m.baptismDate && <Row icon="🌊" label="Baptism Date" value={fmt(m.baptismDate)} />}
          {m.invitedBy && <Row icon="👥" label="Invited By" value={m.invitedBy} />}
        </div>
      )}
      {hasContactInfo && (
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>📋 Contact</div>
          {(m.showEmail || m.isAdmin || m.isOwn) && m.email && <Row icon="✉️" label="Email" value={m.email} />}
          {(m.showPhone || m.isAdmin || m.isOwn) && m.phone && <Row icon="📞" label="Phone" value={m.phone} />}
          {(m.showAddress || m.isAdmin || m.isOwn) && m.address && <Row icon="📍" label="Address" value={m.address} />}
        </div>
      )}
      {familyArr.length > 0 && (
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>🏠 Family Members</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {familyArr.map((name, i) => (
              <span key={i} style={{ background: "#f1f5f9", color: "#475569", padding: "0.35rem 0.75rem", borderRadius: "999px", fontSize: "0.825rem", fontWeight: 600 }}>{name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ministries Tab ─────────────────────────────────────────────────────────────
function MinistriesTab({ ministries }: { ministries: Ministry[] }) {
  if (ministries.length === 0) return (
    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
      <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🤲</div>
      <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>Not serving in any ministry yet.</p>
    </div>
  );
  return (
    <div style={{ padding: "0.75rem" }}>
      <div style={{ background: "white", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        {ministries.map((mm, i) => (
          <div key={mm.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1rem", borderBottom: i < ministries.length - 1 ? "1px solid #f8fafc" : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: "10px", background: `${PRIMARY}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>🤲</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{mm.ministry.name}</div>
              {mm.joinedDate && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.125rem" }}>Since {fmt(mm.joinedDate)}</div>}
            </div>
            <span style={{ background: PRIMARY, color: "white", fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px" }}>Active</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ProfileClient ─────────────────────────────────────────────────────────
export default function ProfileClient({ member }: { member: ProfileData }) {
  const { update } = useSession();
  const [activeTab, setActiveTab] = useState<"wall" | "about" | "ministries">("wall");
  // Photo viewer
  const [viewerPhotos, setViewerPhotos] = useState<PhotoEntry[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"profile" | "cover" | null>(null);
  const [activeUploadType, setActiveUploadType] = useState<"profile" | "cover">("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);

  const coverSrc  = member.coverPhoto    ? `/uploads/cover_photos/${member.coverPhoto}`        : null;
  const avatarSrc = member.profilePicture ? `/uploads/profile_pictures/${member.profilePicture}` : null;
  const fullName  = `${member.firstName} ${member.lastName}`;
  const initials  = `${member.firstName?.[0] ?? ""}${member.lastName?.[0] ?? ""}`;
  const dur = duration(member.joinDate);

  // Load profile or cover history for viewer
  function openViewer(type: "profile" | "cover") {
    fetch(`/api/members/${member.id}/photo-history?type=${type}`)
      .then(r => r.json())
      .then((data: PhotoEntry[]) => {
        const history = Array.isArray(data) ? data : [];
        if (history.length > 0) {
          setViewerPhotos(history);
        } else {
          // Fallback if no history exists yet
          const src = type === "cover" ? coverSrc : avatarSrc;
          const fileName = type === "cover" ? member.coverPhoto : member.profilePicture;
          if (src && fileName) {
            setViewerPhotos([{
              id: -1, type: type, fileName: fileName, thumbName: null,
              url: src, thumbUrl: src, postId: null, caption: null,
              createdAt: member.joinDate ?? new Date().toISOString(),
            }]);
          }
        }
        setViewerOpen(true);
      })
      .catch(() => {
        const src = type === "cover" ? coverSrc : avatarSrc;
        const fileName = type === "cover" ? member.coverPhoto : member.profilePicture;
        if (src && fileName) {
          setViewerPhotos([{
            id: -1, type: type, fileName: fileName, thumbName: null,
            url: src, thumbUrl: src, postId: null, caption: null,
            createdAt: member.joinDate ?? new Date().toISOString(),
          }]);
          setViewerOpen(true);
        }
      });
  }

  function handleAvatarTap() {
    if (member.isOwn) {
      setSheetType("profile");
    } else {
      openViewer("profile");
    }
  }

  function handleCoverTap() {
    if (member.isOwn) {
      setSheetType("cover");
    } else {
      openViewer("cover");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, uploadType: "profile" | "cover") {
    const file = e.target.files?.[0];
    if (!file) return;
    setSheetType(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", uploadType);
    try {
      const res = await fetch(`/api/members/${member.id}/photo`, { method: "POST", body: fd });
      if (res.ok) {
        // Refresh JWT session so header avatar updates immediately
        await update();
        window.location.reload();
      }
    } catch { /* silent */ }
    e.target.value = "";
  }

  return (
    <>
    <div style={{ minHeight: "100vh", background: "#f1f5f9", maxWidth: 480, margin: "0 auto", position: "relative" }}>

      {/* ── Cover photo ──────────────────────────────────────────────────── */}
      <div 
        onClick={handleCoverTap}
        style={{ position: "relative", height: 220, background: `linear-gradient(160deg, #0f2d3d 0%, ${PRIMARY} 100%)`, overflow: "hidden", cursor: "pointer" }}
      >
        {coverSrc && (
          <img
            src={coverSrc}
            alt="Cover"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
              objectPosition: `${member.coverPhotoPositionX ?? 50}% ${member.coverPhotoPositionY ?? 50}%` }}
          />
        )}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)", pointerEvents: "none" }} />

        <Link href="/directory"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: "0.875rem", left: "0.875rem", width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.38)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none", fontSize: "1rem", fontWeight: 700 }}>←</Link>

        {member.isOwn && (
          <Link href="/profile/edit"
            onClick={(e) => e.stopPropagation()}
            style={{ position: "absolute", top: "0.875rem", right: "0.875rem", width: 36, height: 36, borderRadius: "50%", background: PRIMARY, border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none", fontSize: "1rem" }}>✏️</Link>
        )}
      </div>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div style={{ background: "white", padding: "0 1rem 1rem", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.875rem", marginTop: -44 }}>

          {/* Clickable avatar — NO "VIEW" text */}
          <button
            onClick={handleAvatarTap}
            style={{ width: 88, height: 88, borderRadius: "50%", border: "4px solid white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.18)", overflow: "hidden", background: `${PRIMARY}20`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              padding: 0, cursor: "pointer" }}
            aria-label="View profile photo"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={fullName} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            ) : (
              <span style={{ fontSize: "2rem", fontWeight: 900, color: PRIMARY }}>{initials}</span>
            )}
          </button>

          {/* Name + badges inline */}
          <div style={{ flex: 1, paddingBottom: "0.5rem", minWidth: 0 }}>
            <h1 style={{ fontSize: "1.125rem", fontWeight: 900, color: "#0f172a", margin: "0 0 0.25rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {fullName}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {dur && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: `${PRIMARY}12`, color: PRIMARY, fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
                  📅 {dur} in HGF
                </span>
              )}
              {member.ministries.length > 0 && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "#f1f5f9", color: "#64748b", fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "999px" }}>
                  🤲 {member.ministries.length} {member.ministries.length === 1 ? "Ministry" : "Ministries"}
                </span>
              )}
            </div>
          </div>

          {/* Post / Member badge */}
          {member.isOwn ? (
            <Link href="/feed/create"
              style={{ marginBottom: "0.5rem", background: PRIMARY, color: "white", textDecoration: "none", padding: "0.45rem 1rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>✍️ Post</Link>
          ) : (
            <div style={{ marginBottom: "0.5rem", background: `${PRIMARY}15`, color: PRIMARY, padding: "0.45rem 1rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, flexShrink: 0 }}>
              👤 Member
            </div>
          )}
        </div>

        {member.favoriteVerse && (
          <p style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", lineHeight: 1.55, margin: "0.5rem 0 0" }}>
            &ldquo;{member.favoriteVerse.slice(0, 100)}{member.favoriteVerse.length > 100 ? "…" : ""}&rdquo;
          </p>
        )}
      </div>

      {/* ── Sticky Tab Bar ───────────────────────────────────────────────── */}
      <div ref={tabBarRef} style={{ position: "sticky", top: 0, zIndex: 50, background: "white", borderBottom: "1.5px solid #e2e8f0", display: "flex", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem", padding: "0.625rem 0", background: "none", border: "none", cursor: "pointer", borderBottom: isActive ? `2.5px solid ${PRIMARY}` : "2.5px solid transparent", color: isActive ? PRIMARY : "#94a3b8", fontWeight: isActive ? 700 : 500, fontSize: "0.72rem", transition: "all 0.15s" }}>
              <span style={{ fontSize: "1.05rem" }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "wall"       && <WallTab       memberId={member.id} isOwn={member.isOwn} />}
      {activeTab === "about"      && <AboutTab       m={member} />}
      {activeTab === "ministries" && <MinistriesTab  ministries={member.ministries} />}

      <div style={{ height: "3rem" }} />
    </div>

    {/* ── Own-profile bottom sheet ─────────────────────────────────────── */}
    {sheetType && (
      <>
        {/* Backdrop */}
        <div onClick={() => setSheetType(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.45)" }} />
        {/* Sheet */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 9999,
          background: "white", borderRadius: "20px 20px 0 0", padding: "0.75rem 0 calc(1.5rem + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -4px 32px rgba(0,0,0,0.18)" }}>
          {/* Handle */}
          <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 999, margin: "0 auto 1rem" }} />
          {sheetType === "profile" ? (
            <>
              <button onClick={() => { setSheetType(null); openViewer("profile"); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                <span style={{ fontSize: "1.3rem" }}>👁</span> See profile picture
              </button>
              <button onClick={() => { setActiveUploadType("profile"); setSheetType(null); setTimeout(() => fileInputRef.current?.click(), 100); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                <span style={{ fontSize: "1.3rem" }}>📷</span> Choose profile picture
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setSheetType(null); openViewer("cover"); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                <span style={{ fontSize: "1.3rem" }}>👁</span> See cover photo
              </button>
              <button onClick={() => { setActiveUploadType("cover"); setSheetType(null); setTimeout(() => fileInputRef.current?.click(), 100); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, color: "#1e293b" }}>
                <span style={{ fontSize: "1.3rem" }}>📷</span> Choose cover photo
              </button>
            </>
          )}
        </div>
      </>
    )}

    {/* Hidden file input — triggers phone gallery */}
    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
      style={{ display: "none" }}
      onChange={(e) => handleFileChange(e, activeUploadType)}
    />

    {/* ── Photo post viewer ────────────────────────────────────────────── */}
    {viewerOpen && viewerPhotos.length > 0 && (
      <PhotoPostViewer
        photos={viewerPhotos}
        startIndex={0}
        memberId={member.id}
        memberName={fullName}
        memberAvatar={avatarSrc}
        isOwn={member.isOwn}
        onClose={() => setViewerOpen(false)}
        onChoosePhoto={member.isOwn ? () => {
          const type = viewerPhotos[0]?.type === "cover" ? "cover" : "profile";
          setActiveUploadType(type);
          setViewerOpen(false);
          fileInputRef.current?.click();
        } : undefined}
      />
    )}
    </>
  );
}
