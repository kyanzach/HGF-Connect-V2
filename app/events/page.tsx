import { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDate, formatTime, EVENT_TYPE_LABELS } from "@/lib/utils";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past events at House of Grace Fellowship — Sunday services, prayer meetings, Bible studies, grace nights, and special events.",
  openGraph: {
    title: "HGF Events — House of Grace Fellowship",
    description: "Explore upcoming events at HGF Davao City.",
  },
};

async function getEvents() {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.event.findMany({
      where: { eventDate: { gte: now }, status: "scheduled" },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    }),
    db.event.findMany({
      where: {
        OR: [
          { eventDate: { lt: now } },
          { status: { in: ["completed", "cancelled"] } },
        ],
      },
      orderBy: [{ eventDate: "desc" }],
      take: 12,
    }),
  ]);
  return { upcoming, past };
}

const EVENT_ICONS: Record<string, string> = {
  sunday_service: "⛪",
  prayer_meeting: "🙏",
  bible_study: "📖",
  special_event: "✨",
  grace_night: "🌙",
  other: "📌",
};

const EVENT_COLORS: Record<string, string> = {
  sunday_service: "#4eb1cb",
  prayer_meeting: "#8b5cf6",
  bible_study: "#f59e0b",
  special_event: "#ec4899",
  grace_night: "#3b82f6",
  other: "#64748b",
};

export default async function EventsPage() {
  const { upcoming, past } = await getEvents();

  return (
    <>
      <PublicNav />

      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)",
            color: "white",
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "0.5rem",
            }}
          >
            Events
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem" }}>
            Join us for worship, fellowship, and growth
          </p>
        </div>

        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "3rem 1.5rem" }}>
          {/* Upcoming Events */}
          <section style={{ marginBottom: "4rem" }}>
            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>📅</span> Upcoming Events{" "}
              <span
                style={{
                  fontSize: "0.8rem",
                  background: "#4eb1cb",
                  color: "white",
                  padding: "0.15rem 0.6rem",
                  borderRadius: "999px",
                  fontWeight: 600,
                }}
              >
                {upcoming.length}
              </span>
            </h2>

            {upcoming.length === 0 ? (
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "3rem",
                  textAlign: "center",
                  color: "#94a3b8",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🗓️</div>
                <p style={{ fontWeight: 600, color: "#64748b" }}>No upcoming events scheduled</p>
                <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Check back soon!</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>

          {/* Past Events */}
          {past.length > 0 && (
            <section>
              <h2
                style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>📁</span> Past Events
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {past.map((event) => (
                  <EventCard key={event.id} event={event} past />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function EventCard({ event, past = false }: { event: any; past?: boolean }) {
  const color = EVENT_COLORS[event.eventType] || "#64748b";
  const icon = EVENT_ICONS[event.eventType] || "📌";

  return (
    <Link href={`/event/${event.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "1.5rem",
          display: "flex",
          gap: "1.25rem",
          alignItems: "flex-start",
          opacity: past ? 0.75 : 1,
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "10px",
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap", marginBottom: "0.375rem" }}>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
            </span>
            {event.status === "cancelled" && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background: "#fef2f2",
                  color: "#ef4444",
                  padding: "0.1rem 0.5rem",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                }}
              >
                Cancelled
              </span>
            )}
          </div>
          <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.375rem" }}>
            {event.title}
          </h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
              📆 {formatDate(event.eventDate)}
            </span>
            <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
              🕐 {formatTime(event.startTime)}
            </span>
            {event.location && (
              <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                📍 {event.location}
              </span>
            )}
          </div>
        </div>
        <span style={{ color: "#4eb1cb", fontSize: "1.25rem", flexShrink: 0 }}>›</span>
      </div>
    </Link>
  );
}
