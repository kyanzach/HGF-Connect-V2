import { db } from "@/lib/db";
import { formatDate, formatTime, EVENT_TYPE_LABELS } from "@/lib/utils";
import { notFound } from "next/navigation";
import PublicNav from "@/components/layout/PublicNav";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id: parseInt(id) } });
  if (!event) return { title: "Event Not Found" };
  return {
    title: event.title,
    description: event.description || `${EVENT_TYPE_LABELS[event.eventType]} at House of Grace Fellowship — ${formatDate(event.eventDate)}`,
    openGraph: {
      title: event.title,
      description: event.description || `Join us for ${EVENT_TYPE_LABELS[event.eventType]}`,
      type: "website",
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id: parseInt(id) },
    include: {
      creator: { select: { firstName: true, lastName: true } },
      _count: { select: { attendance: true } },
    },
  });

  if (!event) notFound();

  const statusColors: Record<string, string> = {
    scheduled: "#10b981",
    cancelled: "#ef4444",
    completed: "#64748b",
  };

  return (
    <>
      <PublicNav />
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 100%)",
            color: "white",
            padding: "3rem 1.5rem",
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <Link
              href="/events"
              style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "1.5rem" }}
            >
              ← Back to Events
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#4eb1cb",
                  background: "rgba(78,177,203,0.15)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                }}
              >
                {EVENT_TYPE_LABELS[event.eventType]}
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "999px",
                  background: `${statusColors[event.status]}22`,
                  color: statusColors[event.status],
                }}
              >
                {event.status}
              </span>
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
              {event.title}
            </h1>
          </div>
        </div>

        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem" }}>
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "2rem",
              marginBottom: "1.5rem",
            }}
          >
            {/* Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
                marginBottom: event.description ? "2rem" : 0,
              }}
            >
              <DetailItem icon="📆" label="Date" value={formatDate(event.eventDate)} />
              <DetailItem icon="🕐" label="Start Time" value={formatTime(event.startTime)} />
              {event.endTime && <DetailItem icon="🕕" label="End Time" value={formatTime(event.endTime)} />}
              {event.location && <DetailItem icon="📍" label="Location" value={event.location} />}
              <DetailItem icon="👤" label="Organized by" value={`${event.creator.firstName} ${event.creator.lastName}`} />
            </div>

            {event.description && (
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
                <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.75rem" }}>
                  About this event
                </h2>
                <p style={{ color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {event.description}
                </p>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <Link
              href="/events"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                background: "linear-gradient(135deg, #4eb1cb, #3a95ad)",
                color: "white",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.9375rem",
              }}
            >
              ← View All Events
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.125rem" }}>
          {label}
        </div>
        <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#0f172a" }}>{value}</div>
      </div>
    </div>
  );
}
