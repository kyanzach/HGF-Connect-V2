import type { Metadata } from "next";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/layout/PublicNav";

export const metadata: Metadata = {
  title: "HGF Connect — House of Grace Fellowship",
  description:
    "The official mobile community app for House of Grace Fellowship members.",
  openGraph: {
    title: "HGF Connect",
    description: "Community app for House of Grace Fellowship.",
    type: "website",
  },
};

const DAILY_VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you.", reference: "Jeremiah 29:11" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.", reference: "Joshua 1:9" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
  { text: "For God so loved the world that he gave his one and only Son.", reference: "John 3:16" },
];

const APP_FEATURES = [
  { icon: "📖", label: "Daily Devo", desc: "Share & read devotionals" },
  { icon: "🙏", label: "Prayer Wall", desc: "Pray for one another" },
  { icon: "✝️", label: "AI Chat", desc: "Church AI assistant" },
  { icon: "📔", label: "Journal", desc: "Private spiritual diary" },
  { icon: "📅", label: "Events", desc: "RSVP & get reminders" },
  { icon: "🛍️", label: "Marketplace", desc: "Member listings" },
  { icon: "👥", label: "Directory", desc: "Find church members" },
  { icon: "📚", label: "Resources", desc: "Sunday Word & media" },
];

async function getData() {
  const [memberCount, upcomingEvents, ministryCount] = await Promise.all([
    db.member.count({ where: { status: "active" } }),
    db.event.findMany({
      where: { eventDate: { gte: new Date() }, status: "scheduled" },
      orderBy: { eventDate: "asc" },
      take: 5,
      select: { id: true, title: true, location: true, eventDate: true },
    }),
    db.ministry.count({ where: { status: "active" } }),
  ]);
  return { memberCount, upcomingEvents, ministryCount };
}

const PRIMARY = "#4EB1CB";

export default async function HomePage() {
  const session = await auth();
  const { memberCount, upcomingEvents, ministryCount } = await getData();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const verse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];

  return (
    <>
      <PublicNav />

      <div style={{ maxWidth: "500px", margin: "0 auto", background: "#f8fafc", minHeight: "100dvh" }}>

        {/* ── Hero ── */}
        <div
          style={{
            background: `linear-gradient(145deg, #1a7a94 0%, ${PRIMARY} 100%)`,
            padding: "1.75rem 1.25rem 2rem",
            position: "relative",
            overflow: "hidden",
            textAlign: "center",
          }}
        >
          {/* Decorative circles */}
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "rgba(255,255,255,0.07)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />

          <div style={{ position: "relative" }}>
  
            <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.375rem", letterSpacing: "-0.01em" }}>
              HGF Connect
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem", margin: "0 0 1.25rem" }}>
              House of Grace Fellowship Community App
            </p>

            {session ? (
              <Link
                href="/feed"
                style={{
                  display: "inline-block",
                  background: "white",
                  color: PRIMARY,
                  fontWeight: 700,
                  padding: "0.75rem 2rem",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontSize: "0.9375rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                Open App →
              </Link>
            ) : (
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/login"
                  style={{
                    background: "white",
                    color: PRIMARY,
                    fontWeight: 700,
                    padding: "0.75rem 1.5rem",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  🔑 Login
                </Link>
                <Link
                  href="/register"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontWeight: 600,
                    padding: "0.75rem 1.5rem",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    border: "1.5px solid rgba(255,255,255,0.4)",
                  }}
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div
          style={{
            display: "flex",
            background: "white",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          {[
            { value: `${memberCount}+`, label: "Members" },
            { value: `${upcomingEvents.length}`, label: "Events" },
            { value: `${ministryCount}`, label: "Ministries" },
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
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: PRIMARY }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Daily Verse Card ── */}
        <div style={{ padding: "1rem" }}>
          <div
            style={{
              background: `linear-gradient(135deg, #1a7a94 0%, ${PRIMARY} 100%)`,
              borderRadius: "18px",
              padding: "1.125rem",
              color: "white",
            }}
          >
            <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
              📜 Daily Verse
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.65, margin: "0 0 0.5rem", fontStyle: "italic" }}>
              &ldquo;{verse.text}&rdquo;
            </p>
            <span
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.2)",
                padding: "0.2rem 0.625rem",
                borderRadius: "999px",
                fontSize: "0.7rem",
                fontWeight: 600,
              }}
            >
              — {verse.reference}
            </span>
          </div>
        </div>

        {/* ── App Features — Horizontal Scroll ── */}
        <div style={{ background: "white", padding: "1rem 0 1.125rem" }}>
          <div style={{ padding: "0 1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
              What&apos;s in the App
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              gap: "0",
              paddingLeft: "1rem",
              paddingRight: "1rem",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch" as any,
            }}
          >
            {APP_FEATURES.map((f) => (
              <div
                key={f.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                  minWidth: "80px",
                  flexShrink: 0,
                  padding: "0 0.375rem",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "18px",
                    background: "#f0f9ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    border: "1px solid #e0f2fe",
                  }}
                >
                  {f.icon}
                </div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#1e293b", textAlign: "center" }}>
                  {f.label}
                </span>
                <span style={{ fontSize: "0.5875rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.2 }}>
                  {f.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upcoming Events ── */}
        <div style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
              📅 Upcoming Events
            </h2>
            <Link href="/events" style={{ fontSize: "0.75rem", color: PRIMARY, fontWeight: 600, textDecoration: "none" }}>
              See all →
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "1.25rem",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              No upcoming events. Check back soon!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={session ? `/event/${event.id}` : "/login"}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: "14px",
                      padding: "0.875rem 1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Date badge */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        background: "#e0f7fb",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: "0.6rem", fontWeight: 700, color: PRIMARY, textTransform: "uppercase" }}>
                        {new Date(event.eventDate).toLocaleDateString("en-PH", { month: "short" })}
                      </span>
                      <span style={{ fontSize: "1.125rem", fontWeight: 800, color: PRIMARY, lineHeight: 1 }}>
                        {new Date(event.eventDate).getDate()}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {event.title}
                      </div>
                      {event.location && (
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.125rem" }}>
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                    <span style={{ color: "#cbd5e1", fontSize: "1rem" }}>›</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Login CTA (for guests) ── */}
        {!session && (
          <div style={{ padding: "0 1rem 1.5rem" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1a7a94 0%, #4EB1CB 100%)",
                borderRadius: "18px",
                padding: "1.375rem 1.25rem",
                color: "white",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🙌</div>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 0.375rem" }}>
                Join HGF Connect
              </h3>
              <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: "0 0 1rem", lineHeight: 1.5 }}>
                Log in to access devotionals, prayer wall, events, marketplace, and more.
              </p>
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center" }}>
                <Link
                  href="/login"
                  style={{
                    background: "white",
                    color: PRIMARY,
                    fontWeight: 700,
                    padding: "0.625rem 1.25rem",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                  }}
                >
                  🔑 Login
                </Link>
                <Link
                  href="/register"
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    fontWeight: 600,
                    padding: "0.625rem 1.25rem",
                    borderRadius: "999px",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    border: "1px solid rgba(255,255,255,0.35)",
                  }}
                >
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer
          style={{
            background: "#1e293b",
            color: "rgba(255,255,255,0.65)",
            padding: "1.25rem",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Image src="/HGF-icon-v1.0.png" alt="HGF" width={24} height={24} style={{ borderRadius: "50%" }} />
            <span style={{ color: "white", fontWeight: 700, fontSize: "0.875rem" }}>House of Grace Fellowship</span>
          </div>
          <p style={{ fontSize: "0.7rem", margin: "0 0 0.375rem" }}>
            📧 hello@houseofgrace.ph · 📞 +63 991 927 1810
          </p>
          <p style={{ fontSize: "0.7rem", margin: "0 0 0.75rem" }}>
            📍 11-A Iñigo St., Obrero, Davao City
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", marginBottom: "0.75rem" }}>
            {["Events", "Directory", "Resources"].map((l) => (
              <Link key={l} href={`/${l.toLowerCase()}`} style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
                {l}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: "0.65rem", margin: 0 }}>
            © 2026 House of Grace Fellowship. All rights reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
