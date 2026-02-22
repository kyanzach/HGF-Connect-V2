"use client";

import Link from "next/link";
import Image from "next/image";
import { EVENT_TYPE_LABELS, MEMBER_TYPE_LABELS } from "@/lib/utils";

/** Feature card with hover animation — client component (uses onMouseEnter) */
export function FeatureCard({
  icon,
  title,
  description,
  href,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "2rem",
          height: "100%",
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 12px 32px rgba(0,0,0,0.1)";
          (e.currentTarget as HTMLElement).style.borderColor = color;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
        }}
      >
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1.25rem",
            fontSize: "1.5rem",
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: "1.0625rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "0.625rem",
          }}
        >
          {title}
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
    </Link>
  );
}

/** Event card for home page with hover animation */
export function HomeEventCard({ event }: { event: any }) {
  const EVENT_ICONS: Record<string, string> = {
    sunday_service: "⛪",
    prayer_meeting: "🙏",
    bible_study: "📖",
    special_event: "✨",
    grace_night: "🌙",
    other: "📌",
  };

  return (
    <Link
      href={`/event/${event.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "1.5rem",
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "0 8px 24px rgba(0,0,0,0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #4eb1cb, #3a95ad)",
              borderRadius: "8px",
              padding: "0.625rem",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>
              {EVENT_ICONS[event.eventType] || "📌"}
            </span>
          </div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#4eb1cb",
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
          </span>
        </div>

        <h3
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "0.5rem",
            lineHeight: 1.3,
          }}
        >
          {event.title}
        </h3>

        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          📆 {new Date(event.eventDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "Asia/Manila",
          })}
        </p>
        {event.location && (
          <p style={{ color: "#94a3b8", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
            📍 {event.location}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Member card for directory with hover animation */
export function MemberCard({ member }: { member: any }) {
  const TYPE_COLORS: Record<string, string> = {
    FamilyMember: "#4eb1cb",
    GrowingFriend: "#ec4899",
    NewFriend: "#10b981",
  };

  const typeColor = TYPE_COLORS[member.type] || "#4eb1cb";
  const initials = `${member.firstName?.charAt(0) || ""}${member.lastName?.charAt(0) || ""}`;

  return (
    <Link href={`/member/${member.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "1.5rem",
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: `${typeColor}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.875rem",
            overflow: "hidden",
          }}
        >
          {member.profilePicture ? (
            <Image
              src={member.profilePicture}
              alt={`${member.firstName} ${member.lastName}`}
              width={56}
              height={56}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: typeColor, fontWeight: 800, fontSize: "1.125rem" }}>
              {initials}
            </span>
          )}
        </div>

        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.25rem" }}>
          {member.firstName} {member.lastName}
        </h3>

        <span
          style={{
            display: "inline-block",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: typeColor,
            background: `${typeColor}15`,
            padding: "0.15rem 0.55rem",
            borderRadius: "999px",
            marginBottom: "0.75rem",
          }}
        >
          {MEMBER_TYPE_LABELS[member.type] || member.type}
        </span>

        {member.ministries?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.5rem" }}>
            {member.ministries.map((mm: any) => (
              <span
                key={mm.id}
                style={{
                  fontSize: "0.7rem",
                  background: "#f1f5f9",
                  color: "#475569",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                }}
              >
                {mm.ministry.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
