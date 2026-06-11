"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PostCard from "@/components/feed/PostCard";
import BirthdayCircle from "@/components/feed/BirthdayCircle";

const PRIMARY = "#4EB1CB";
const GOLD = "#f59e0b";

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  coverPhoto: string | null;
  birthdate: string;
  birthMonth: number;
  birthDay: number;
}

interface EventRow {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  eventType: string;
  status: string;
}

const EVENT_ICONS: Record<string, string> = {
  sunday_service: "⛪", prayer_meeting: "🙏", bible_study: "📖",
  special_event: "✨", grace_night: "🌙", other: "📌",
};
const EVENT_COLORS: Record<string, string> = {
  sunday_service: "#4eb1cb", prayer_meeting: "#8b5cf6", bible_study: "#f59e0b",
  special_event: "#ec4899", grace_night: "#3b82f6", other: "#64748b",
};
const EVENT_TYPE_LABELS: Record<string, string> = {
  sunday_service: "Sunday Service", prayer_meeting: "Prayer Meeting",
  bible_study: "Bible Study", special_event: "Special Event",
  grace_night: "Grace Night", other: "Other",
};

const TYPES = [
  { key: "all", label: "All Types" },
  { key: "sunday_service", label: "Sunday Service" },
  { key: "prayer_meeting", label: "Prayer Meeting" },
  { key: "bible_study", label: "Bible Study" },
  { key: "special_event", label: "Special Event" },
  { key: "grace_night", label: "Grace Night" },
  { key: "other", label: "Other" },
];

const PAGE_SIZE = 5;

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

function fmtTime(t: string | Date) {
  try {
    let d: Date;
    if (t instanceof Date) {
      d = t;
    } else {
      const timeWithZ = t.includes("T") ? (t.endsWith("Z") ? t : `${t}Z`) : `1970-01-01T${t}Z`;
      d = new Date(timeWithZ);
    }
    if (isNaN(d.getTime())) return String(t).includes("T") ? String(t).slice(11, 16) : String(t).slice(0, 5);
    return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
  } catch { return String(t).includes("T") ? String(t).slice(11, 16) : String(t).slice(0, 5); }
}

export default function ChurchClient({
  initialMembers,
  upcomingEvents,
  pastEvents
}: {
  initialMembers: any[];
  upcomingEvents: EventRow[];
  pastEvents: EventRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"wall" | "birthdays" | "events">("wall");

  // ─── Wall Feed State ──────────────────────────────────────────────────────
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);

  const loadPosts = useCallback(async (p = 1) => {
    try {
      if (p === 1) setPostsLoading(true);
      else setPostsLoadingMore(true);

      const res = await fetch(`/api/posts?church=true&page=${p}`);
      const data = await res.json();
      if (p === 1) setPosts(data.posts ?? []);
      else setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setPostsTotalPages(data.totalPages ?? 1);
      setPostsPage(p);
    } catch (err) {
      console.error("Failed to load church posts:", err);
    } finally {
      setPostsLoading(false);
      setPostsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "wall") {
      loadPosts(1);
    }
  }, [activeTab, loadPosts]);

  // Infinite Scroll Observer for Wall
  useEffect(() => {
    if (activeTab !== "wall" || postsLoading || postsPage >= postsTotalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !postsLoadingMore) {
          loadPosts(postsPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    const target = document.getElementById("church-feed-bottom-trigger");
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [activeTab, postsLoading, postsLoadingMore, postsPage, postsTotalPages, loadPosts]);


  // ─── Birthdays State & Format ─────────────────────────────────────────────
  const now = new Date();
  const manilaStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaDate = new Date(manilaStr);
  const currentMonthNum = manilaDate.getMonth() + 1; // 1-12

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const parsedMembers: Member[] = useMemo(() => {
    return initialMembers.map((m) => {
      const birth = new Date(m.birthdate);
      const month = birth.getUTCMonth() + 1;
      const day = birth.getUTCDate();

      let resolvedPic = null;
      if (m.profilePicture) {
        resolvedPic = `/uploads/profile_pictures/${m.profilePicture}`;
      } else if (m.coverPhoto) {
        resolvedPic = `/uploads/cover_photos/${m.coverPhoto}`;
      }

      return {
        ...m,
        birthMonth: month,
        birthDay: day,
        profilePicture: resolvedPic,
      };
    });
  }, [initialMembers]);

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const monthNums = Array.from({ length: 12 }, (_, i) => i + 1);

  const activeCelebrants = useMemo(() => {
    return parsedMembers
      .filter((m) => m.birthMonth === selectedMonth)
      .sort((a, b) => a.birthDay - b.birthDay);
  }, [parsedMembers, selectedMonth]);


  // ─── Events State ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [eventsPage, setEventsPage] = useState(1);

  const filteredPast = useMemo(() => {
    let list = pastEvents;
    if (search) list = list.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || (e.description ?? "").toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "all") list = list.filter(e => e.eventType === typeFilter);
    return list;
  }, [pastEvents, search, typeFilter]);

  const totalEventsPages = Math.max(1, Math.ceil(filteredPast.length / PAGE_SIZE));
  const safeEventsPage = Math.min(eventsPage, totalEventsPages);
  const paginatedPastEvents = filteredPast.slice((safeEventsPage - 1) * PAGE_SIZE, safeEventsPage * PAGE_SIZE);

  function handleEventsSearch(v: string) { setSearch(v); setEventsPage(1); }
  function handleEventsType(v: string) { setTypeFilter(v); setEventsPage(1); }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: "100px", position: "relative" }}>
      {/* ── Cover photo ── */}
      <div style={{ position: "relative", height: 160, background: `linear-gradient(160deg, #0f2d3d 0%, ${PRIMARY} 100%)`, overflow: "hidden" }}>
        {/* Backdrop overlay */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)" }} />
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: "0.875rem",
            left: "0.875rem",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: 700,
            zIndex: 10
          }}
        >
          ←
        </button>
      </div>

      {/* ── Hero Info card ── */}
      <div style={{ background: "white", padding: "0 1rem 1rem", position: "relative", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.875rem", marginTop: -40 }}>
          {/* Avatar Church Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "24px",
              background: PRIMARY,
              border: "4px solid white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
              flexShrink: 0
            }}
          >
            ⛪
          </div>

          <div style={{ minWidth: 0, paddingBottom: "6px" }}>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>
              House of Grace Fellowship
            </h1>
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
              Official Church Page
            </span>
          </div>
        </div>

        {/* Bio description */}
        <p style={{ color: "#475569", fontSize: "0.82rem", lineHeight: 1.4, margin: "0.75rem 0 0" }}>
          Grace upon grace. Connecting hearts, cultivating faith, and building community in Davao City. Follow for official announcements, events, and monthly birthdays!
        </p>
      </div>

      {/* ── Navigation Tabs ── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          background: "white",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}
      >
        {(["wall", "birthdays", "events"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "wall" ? "📰 Wall" : tab === "birthdays" ? "🎂 Birthdays" : "📅 Events";
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "14px 0",
                background: "none",
                border: "none",
                borderBottom: isActive ? `3px solid ${PRIMARY}` : "3px solid transparent",
                color: isActive ? PRIMARY : "#64748b",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Panels ── */}
      <div style={{ padding: "0.875rem 1rem" }}>

        {/* WALL PANEL */}
        {activeTab === "wall" && (
          <div>
            {postsLoading && posts.length === 0 ? (
              [1, 2, 3].map((i) => (
                <div key={i} style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#e2e8f0" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, marginBottom: 6, width: "40%" }} />
                      <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "25%" }} />
                    </div>
                  </div>
                  <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
                  <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "75%" }} />
                </div>
              ))
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⛪</div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>
                  No announcements yet
                </p>
                <p style={{ fontSize: "0.78rem" }}>
                  Check back later for official updates.
                </p>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
                {postsPage < postsTotalPages && (
                  <div
                    id="church-feed-bottom-trigger"
                    style={{
                      width: "100%",
                      padding: "1.25rem",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: PRIMARY,
                      fontSize: "0.82rem",
                      fontWeight: 600
                    }}
                  >
                    {postsLoadingMore ? "Loading more..." : "Scroll for more"}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* BIRTHDAYS PANEL */}
        {activeTab === "birthdays" && (
          <div>
            {/* Month tabs scrollable */}
            <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", paddingBottom: "0.6rem", borderBottom: "1px solid #f1f5f9", marginBottom: "1rem", scrollbarWidth: "none" }}>
              {monthNums.map((mNum) => {
                const isActive = selectedMonth === mNum;
                return (
                  <button
                    key={mNum}
                    onClick={() => setSelectedMonth(mNum)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: "none",
                      whiteSpace: "nowrap",
                      background: isActive ? `${PRIMARY}18` : "transparent",
                      color: isActive ? PRIMARY : "#64748b",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {monthNames[mNum - 1].slice(0, 3)}
                    {mNum === currentMonthNum && " 📌"}
                  </button>
                );
              })}
            </div>

            {/* Orbit Circle */}
            {activeCelebrants.length > 0 ? (
              <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1.25rem", marginBottom: "1rem" }}>
                <BirthdayCircle
                  month={monthNames[selectedMonth - 1]}
                  celebrants={activeCelebrants.map((c) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`,
                    profilePicture: c.profilePicture
                  }))}
                />
              </div>
            ) : (
              <div style={{ background: "white", borderRadius: "16px", border: "1px dashed #cbd5e1", padding: "2.5rem 1rem", textAlign: "center", color: "#64748b", fontSize: "0.8rem", marginBottom: "1rem" }}>
                No celebrants in {monthNames[selectedMonth - 1]}.
              </div>
            )}

            {/* Grid Celebrants list */}
            {activeCelebrants.length > 0 && (
              <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "1rem" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "0.78rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  🎉 {monthNames[selectedMonth - 1]} Celebrants List:
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
                  {activeCelebrants.map((c) => {
                    const initials = `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
                    return (
                      <button
                        key={c.id}
                        onClick={() => router.push(`/member/${c.id}`)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "#f8fafc",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "1px solid #f1f5f9",
                          cursor: "pointer",
                          textAlign: "left",
                          width: "100%",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: PRIMARY,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: `1px solid ${GOLD}30`,
                          flexShrink: 0
                        }}>
                          {c.profilePicture ? (
                            <img src={c.profilePicture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>{initials}</span>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                            {c.firstName} {c.lastName}
                          </div>
                          <span style={{ fontSize: "0.7rem", color: GOLD, fontWeight: 700 }}>
                            🎂 {monthNames[c.birthMonth - 1]} {c.birthDay}
                          </span>
                        </div>
                        <span style={{ fontSize: "1rem", color: "#cbd5e1" }}>→</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVENTS PANEL */}
        {activeTab === "events" && (
          <div>
            {/* Upcoming Events */}
            <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              📅 Upcoming Events
              <span style={{ fontSize: "0.72rem", background: PRIMARY, color: "white", padding: "0.1rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
                {upcomingEvents.length}
              </span>
            </h2>

            {upcomingEvents.length === 0 ? (
              <div style={{ background: "white", borderRadius: "12px", padding: "2rem 1rem", textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
                <p style={{ fontWeight: 600, color: "#64748b", fontSize: "0.8rem", margin: 0 }}>No upcoming events scheduled</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {upcomingEvents.map(ev => <ChurchEventCard key={ev.id} event={ev} />)}
              </div>
            )}

            {/* Past Events Area */}
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.4rem", margin: 0 }}>
                  📁 Past Events
                  <span style={{ fontSize: "0.72rem", background: "#64748b", color: "white", padding: "0.1rem 0.5rem", borderRadius: "999px", fontWeight: 600 }}>
                    {filteredPast.length}
                  </span>
                </h2>
                <input
                  value={search}
                  onChange={e => handleEventsSearch(e.target.value)}
                  placeholder="🔍 Search past events…"
                  style={{ border: "1px solid #e2e8f0", borderRadius: "999px", padding: "0.4rem 0.75rem", fontSize: "0.78rem", outline: "none", width: 140 }}
                />
              </div>

              {/* Type filter chips */}
              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {TYPES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => handleEventsType(t.key)}
                    style={{
                      padding: "0.25rem 0.6rem", borderRadius: "999px", border: "1px solid",
                      borderColor: typeFilter === t.key ? EVENT_COLORS[t.key] ?? PRIMARY : "#e2e8f0",
                      background: typeFilter === t.key ? (EVENT_COLORS[t.key] ?? PRIMARY) : "white",
                      color: typeFilter === t.key ? "white" : "#64748b",
                      fontWeight: 700, fontSize: "0.7rem", cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {t.key !== "all" && <>{EVENT_ICONS[t.key]} </>}{t.label}
                  </button>
                ))}
              </div>

              {paginatedPastEvents.length === 0 ? (
                <div style={{ background: "white", borderRadius: "12px", padding: "2rem 1rem", textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontSize: "0.8rem", margin: 0 }}>No past events found.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {paginatedPastEvents.map(ev => <ChurchEventCard key={ev.id} event={ev} past />)}
                </div>
              )}

              {/* Pagination controls */}
              {totalEventsPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem", marginTop: "1rem" }}>
                  <button
                    onClick={() => setEventsPage(p => Math.max(1, p - 1))}
                    disabled={safeEventsPage === 1}
                    style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", color: safeEventsPage === 1 ? "#cbd5e1" : "#374151", cursor: safeEventsPage === 1 ? "default" : "pointer", fontWeight: 700, fontSize: "0.75rem" }}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalEventsPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setEventsPage(p)}
                      style={{
                        padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid",
                        borderColor: safeEventsPage === p ? PRIMARY : "#e2e8f0",
                        background: safeEventsPage === p ? PRIMARY : "white",
                        color: safeEventsPage === p ? "white" : "#374151",
                        cursor: "pointer", fontWeight: 700, fontSize: "0.75rem"
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setEventsPage(p => Math.min(totalEventsPages, p + 1))}
                    disabled={safeEventsPage === totalEventsPages}
                    style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", color: safeEventsPage === totalEventsPages ? "#cbd5e1" : "#374151", cursor: safeEventsPage === totalEventsPages ? "default" : "pointer", fontWeight: 700, fontSize: "0.75rem" }}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ChurchEventCard({ event, past = false }: { event: EventRow; past?: boolean }) {
  const color = EVENT_COLORS[event.eventType] ?? "#64748b";
  const icon = EVENT_ICONS[event.eventType] ?? "📌";
  const label = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;

  return (
    <Link href={`/event/${event.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white", border: "1px solid #e2e8f0", borderRadius: "10px",
          padding: "0.75rem 1rem",
          display: "flex", gap: "0.75rem", alignItems: "center",
          opacity: past ? 0.75 : 1, cursor: "pointer",
          transition: "box-shadow 0.15s, transform 0.15s",
          borderLeft: past ? "none" : `3px solid ${color}`,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "8px", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</span>
            {event.status === "cancelled" && <span style={{ fontSize: "0.62rem", fontWeight: 700, background: "#fef2f2", color: "#ef4444", padding: "0.05rem 0.3rem", borderRadius: "3px" }}>CANCELLED</span>}
          </div>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", margin: "0.1rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.title}
          </h3>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <span style={{ color: "#64748b", fontSize: "0.72rem" }}>📆 {fmtDate(event.eventDate)}</span>
            <span style={{ color: "#64748b", fontSize: "0.72rem" }}>⏰ {fmtTime(event.startTime)}</span>
          </div>
        </div>
        <span style={{ color: PRIMARY, fontSize: "1.1rem", flexShrink: 0 }}>›</span>
      </div>
    </Link>
  );
}
