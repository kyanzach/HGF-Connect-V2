"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";

const PRIMARY = "#4EB1CB";

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

const PAGE_SIZE = 12;

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}
function fmtTime(t: string | Date) {
  try {
    const base = typeof t === "string" && t.includes("T") ? t : `1970-01-01T${t}`;
    return new Date(base).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return String(t).slice(0, 5); }
}

type EventRow = {
  id: number; title: string; description: string | null; eventDate: string;
  startTime: string; endTime: string | null; location: string | null;
  eventType: string; status: string;
};

export default function EventsClient({ upcoming, allPast }: { upcoming: EventRow[]; allPast: EventRow[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filteredPast = useMemo(() => {
    let list = allPast;
    if (search) list = list.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || (e.description ?? "").toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "all") list = list.filter(e => e.eventType === typeFilter);
    return list;
  }, [allPast, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPast.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredPast.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleType(v: string) { setTypeFilter(v); setPage(1); }

  return (
    <>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)", color: "white", padding: "3rem 1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>Events</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem" }}>Join us for worship, fellowship, and growth</p>
        </div>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.25rem" }}>

          {/* ─── Upcoming ─── */}
          <section style={{ marginBottom: "3.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              📅 Upcoming Events
              <span style={{ fontSize: "0.8rem", background: PRIMARY, color: "white", padding: "0.15rem 0.6rem", borderRadius: "999px", fontWeight: 600 }}>{upcoming.length}</span>
            </h2>
            {upcoming.length === 0 ? (
              <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗓️</div>
                <p style={{ fontWeight: 600, color: "#64748b" }}>No upcoming events scheduled</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Check back soon!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {upcoming.map(ev => <EventCard key={ev.id} event={ev} />)}
              </div>
            )}
          </section>

          {/* ─── Past Events ─── */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                📁 Past Events
                <span style={{ fontSize: "0.8rem", background: "#64748b", color: "white", padding: "0.15rem 0.6rem", borderRadius: "999px", fontWeight: 600 }}>{filteredPast.length}</span>
              </h2>
              {/* Search bar */}
              <div style={{ flex: "0 0 auto" }}>
                <input
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="🔍 Search events…"
                  style={{ border: "1.5px solid #e2e8f0", borderRadius: "999px", padding: "0.5rem 1rem", fontSize: "0.875rem", outline: "none", width: 220 }}
                />
              </div>
            </div>

            {/* Type filter chips */}
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              {TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleType(t.key)}
                  style={{
                    padding: "0.35rem 0.875rem", borderRadius: "999px", border: "1.5px solid",
                    borderColor: typeFilter === t.key ? EVENT_COLORS[t.key] ?? PRIMARY : "#e2e8f0",
                    background: typeFilter === t.key ? (EVENT_COLORS[t.key] ?? PRIMARY) : "white",
                    color: typeFilter === t.key ? "white" : "#64748b",
                    fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {t.key !== "all" && <>{EVENT_ICONS[t.key]} </>}{t.label}
                </button>
              ))}
            </div>

            {paginated.length === 0 ? (
              <div style={{ background: "white", borderRadius: "12px", padding: "3rem", textAlign: "center", color: "#94a3b8", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
                <p>No past events match your search.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {paginated.map(ev => <EventCard key={ev.id} event={ev} past />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.375rem", marginTop: "2rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", color: safePage === 1 ? "#cbd5e1" : "#374151", cursor: safePage === 1 ? "default" : "pointer", fontWeight: 700, fontSize: "0.875rem" }}
                >
                  ‹ Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .reduce<(number | "…")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(p); return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} style={{ padding: "0.5rem 0.25rem", color: "#94a3b8" }}>…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        style={{ padding: "0.5rem 0.875rem", borderRadius: "8px", border: "1.5px solid", borderColor: safePage === p ? PRIMARY : "#e2e8f0", background: safePage === p ? PRIMARY : "white", color: safePage === p ? "white" : "#374151", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" }}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", color: safePage === totalPages ? "#cbd5e1" : "#374151", cursor: safePage === totalPages ? "default" : "pointer", fontWeight: 700, fontSize: "0.875rem" }}
                >
                  Next ›
                </button>
                <span style={{ color: "#94a3b8", fontSize: "0.8rem", marginLeft: "0.5rem" }}>Page {safePage} of {totalPages}</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function EventCard({ event, past = false }: { event: EventRow; past?: boolean }) {
  const color = EVENT_COLORS[event.eventType] ?? "#64748b";
  const icon = EVENT_ICONS[event.eventType] ?? "📌";
  const label = EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;

  return (
    <Link href={`/event/${event.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white", border: "1px solid #e2e8f0", borderRadius: "12px",
          padding: past ? "1rem 1.25rem" : "1.25rem 1.5rem",
          display: "flex", gap: "1rem", alignItems: "center",
          opacity: past ? 0.8 : 1, cursor: "pointer",
          transition: "box-shadow 0.15s, transform 0.15s",
          borderLeft: past ? "none" : `4px solid ${color}`,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; if (!past) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
      >
        <div style={{ width: past ? 40 : 52, height: past ? 40 : 52, borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: past ? "1.25rem" : "1.5rem", flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
            {event.status === "cancelled" && <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#fef2f2", color: "#ef4444", padding: "0.1rem 0.5rem", borderRadius: "4px" }}>CANCELLED</span>}
          </div>
          <h3 style={{ fontSize: past ? "0.9375rem" : "1.0625rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {event.title}
          </h3>
          <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>📆 {fmtDate(event.eventDate)}</span>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>⏰ {fmtTime(event.startTime)}</span>
            {event.location && <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>📍 {event.location}</span>}
          </div>
        </div>
        <span style={{ color: PRIMARY, fontSize: "1.25rem", flexShrink: 0 }}>›</span>
      </div>
    </Link>
  );
}
