import type { Metadata } from "next";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";
import { FeatureCard, HomeEventCard } from "@/components/ui/InteractiveCards";

export const metadata: Metadata = {
  title: "HGF Connect — House of Grace Fellowship",
  description:
    "Welcome to HGF Connect — member portal for House of Grace Fellowship in Davao City, Philippines. Events, directory, ministries, and more.",
  openGraph: {
    title: "HGF Connect — House of Grace Fellowship",
    description:
      "Your community hub for House of Grace Fellowship. Explore events, connect with members, and grow in faith together.",
    images: ["/og-home.jpg"],
  },
};

async function getUpcomingEvents() {
  const now = new Date();
  return db.event.findMany({
    where: {
      eventDate: { gte: now },
      status: "scheduled",
    },
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
    take: 4,
  });
}

async function getStats() {
  const [totalMembers, upcomingCount] = await Promise.all([
    db.member.count({ where: { status: "active" } }),
    db.event.count({
      where: { eventDate: { gte: new Date() }, status: "scheduled" },
    }),
  ]);
  return { totalMembers, upcomingCount };
}

export default async function HomePage() {
  const [session, events, stats] = await Promise.all([
    auth(),
    getUpcomingEvents(),
    getStats(),
  ]);

  return (
    <>
      <PublicNav />

      {/* Hero */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 50%, #1f6477 100%)",
          color: "white",
          padding: "5rem 1.5rem",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "rgba(78,177,203,0.12)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "-60px",
            width: "240px",
            height: "240px",
            borderRadius: "50%",
            background: "rgba(78,177,203,0.08)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
          <div
            style={{
              display: "inline-block",
              background: "rgba(78,177,203,0.2)",
              border: "1px solid rgba(78,177,203,0.4)",
              borderRadius: "999px",
              padding: "0.375rem 1rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#7ec8da",
              marginBottom: "1.5rem",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            🙏 House of Grace Fellowship · Davao City
          </div>

          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "1.25rem",
              letterSpacing: "-0.02em",
            }}
          >
            Connected in{" "}
            <span style={{ color: "#4eb1cb" }}>Faith,</span>
            <br />
            Rooted in{" "}
            <span style={{ color: "#4eb1cb" }}>Community</span>
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "rgba(255,255,255,0.75)",
              maxWidth: "560px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.65,
            }}
          >
            HGF Connect is your all-in-one portal for House of Grace Fellowship —
            events, ministries, member directory, and more.
          </p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {session ? (
              <Link
                href={
                  ["admin", "moderator"].includes(session.user.role)
                    ? "/admin"
                    : "/dashboard"
                }
                style={{
                  background: "linear-gradient(135deg, #4eb1cb, #3a95ad)",
                  color: "white",
                  textDecoration: "none",
                  padding: "0.875rem 2rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "1rem",
                }}
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  style={{
                    background: "linear-gradient(135deg, #4eb1cb, #3a95ad)",
                    color: "white",
                    textDecoration: "none",
                    padding: "0.875rem 2rem",
                    borderRadius: "10px",
                    fontWeight: 700,
                    fontSize: "1rem",
                  }}
                >
                  Join HGF Connect
                </Link>
                <Link
                  href="/login"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "white",
                    textDecoration: "none",
                    padding: "0.875rem 2rem",
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "1rem",
                  }}
                >
                  Sign In
                </Link>
              </>
            )}
            <Link
              href="/events"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "rgba(255,255,255,0.85)",
                textDecoration: "none",
                padding: "0.875rem 2rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              View Events
            </Link>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "3rem",
              justifyContent: "center",
              marginTop: "3rem",
              flexWrap: "wrap",
            }}
          >
            <StatItem value={`${stats.totalMembers}+`} label="Active Members" />
            <StatItem value={`${stats.upcomingCount}`} label="Upcoming Events" />
            <StatItem value="6" label="Ministry Teams" />
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section
        style={{
          padding: "5rem 1.5rem",
          background: "white",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "0.75rem",
                letterSpacing: "-0.02em",
              }}
            >
              Everything Your Church Needs
            </h2>
            <p style={{ color: "#64748b", fontSize: "1.0625rem" }}>
              One platform for members, ushers, and administrators
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            <FeatureCard
              icon="👥"
              title="Member Directory"
              description="Browse and connect with the HGF community. Privacy-controlled profiles with photos, ministries, and contact info."
              href="/directory"
              color="#4eb1cb"
            />
            <FeatureCard
              icon="📅"
              title="Events"
              description="Stay updated on Sunday services, prayer meetings, Bible studies, grace nights, and special events."
              href="/events"
              color="#8b5cf6"
            />
            <FeatureCard
              icon="🙌"
              title="Ministries"
              description="Join a ministry team — Worship, Admin, Ushering, and more. Serve your community with purpose."
              href="/directory"
              color="#f59e0b"
            />
            <FeatureCard
              icon="📖"
              title="Resources"
              description="Access Sunday Word PDFs, devotionals, and church resources to grow deeper in your faith."
              href="/resources"
              color="#10b981"
            />
            <FeatureCard
              icon="🏪"
              title="Marketplace"
              description="Members-only community marketplace — buy, sell, trade, or share. Support fellow members' businesses."
              href="/marketplace"
              color="#ec4899"
            />
            <FeatureCard
              icon="📊"
              title="Attendance"
              description="Dedicated kiosk app for ushers — real-time check-in, birthday lookups, and attendance reports."
              href="/attendance"
              color="#3a95ad"
            />
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section
          style={{
            padding: "5rem 1.5rem",
            background: "#f8fafc",
          }}
        >
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginBottom: "2rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    marginBottom: "0.25rem",
                  }}
                >
                  Upcoming Events
                </h2>
                <p style={{ color: "#64748b", fontSize: "0.9375rem" }}>
                  Join us for worship, fellowship, and growth
                </p>
              </div>
              <Link
                href="/events"
                style={{
                  color: "#4eb1cb",
                  textDecoration: "none",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                }}
              >
                See all events →
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {events.map((event) => (
                <HomeEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          background: "#0f172a",
          color: "rgba(255,255,255,0.6)",
          padding: "3rem 1.5rem",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: "1.125rem",
            color: "white",
            marginBottom: "0.5rem",
          }}
        >
          House of Grace Fellowship
        </p>
        <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Davao City, Philippines
        </p>
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "2rem",
          }}
        >
          {[
            ["/", "Home"],
            ["/events", "Events"],
            ["/directory", "Directory"],
            ["/resources", "Resources"],
            ["/marketplace", "Marketplace"],
            ["/login", "Sign In"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              style={{
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: "0.8125rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.5rem" }}>
          © {new Date().getFullYear()} House of Grace Fellowship. Built with HGF Connect v2.
        </p>
      </footer>
    </>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: "#4eb1cb" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)" }}>
        {label}
      </div>
    </div>
  );
}
