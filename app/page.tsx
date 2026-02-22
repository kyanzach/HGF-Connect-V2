import type { Metadata } from "next";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/layout/PublicNav";

export const metadata: Metadata = {
  title: "HGF Connect — House of Grace Fellowship",
  description:
    "Your comprehensive community platform for managing your profile, staying connected with events, accessing resources, and exploring our holistic marketplace.",
  openGraph: {
    title: "HGF Connect",
    description: "Community platform for House of Grace Fellowship members.",
    type: "website",
  },
};

// Bible verses for Daily Word (used in sidebar future, or home)
const BIBLE_VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:5-6" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
];

async function getData() {
  const [memberCount, upcomingEvents, ministryCount] = await Promise.all([
    db.member.count({ where: { status: "active" } }),
    db.event.findMany({
      where: {
        eventDate: { gte: new Date() },
        status: "scheduled",
      },
      orderBy: { eventDate: "asc" },
      take: 10,
      select: { id: true, title: true, location: true, eventDate: true },
    }),
    db.ministry.count({ where: { status: "active" } }),
  ]);
  return { memberCount, upcomingEvents, ministryCount };
}

const PRIMARY = "#4EB1CB";
const PRIMARY_DARK = "#3A95AD";
const PRIMARY_HERO = "#2d8fa6"; // hero bg darker shade

export default async function HomePage() {
  const session = await auth();
  const { memberCount, upcomingEvents, ministryCount } = await getData();

  // deterministic verse based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const verse = BIBLE_VERSES[dayOfYear % BIBLE_VERSES.length];

  return (
    <>
      <PublicNav />

      {/* ── Hero Section ── */}
      <section
        style={{
          background: `linear-gradient(135deg, ${PRIMARY_HERO} 0%, ${PRIMARY} 100%)`,
          color: "white",
          padding: "4rem 1rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            Welcome to HGF Connect
          </h1>
          <p
            style={{
              fontSize: "1.0625rem",
              color: "rgba(255,255,255,0.85)",
              marginBottom: "2rem",
              lineHeight: 1.7,
            }}
          >
            Your comprehensive community platform for managing your profile, staying
            connected with events, accessing resources, and exploring our holistic marketplace.
          </p>
          {session ? (
            <Link
              href="/dashboard"
              style={{
                display: "inline-block",
                background: "white",
                color: PRIMARY,
                fontWeight: 700,
                padding: "0.875rem 2rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "1rem",
                transition: "transform 0.15s",
              }}
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              style={{
                display: "inline-block",
                background: "white",
                color: PRIMARY,
                fontWeight: 700,
                padding: "0.875rem 2rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "1rem",
              }}
            >
              Login to Access Member Services
            </Link>
          )}
        </div>
      </section>

      {/* ── Main 2-Column Layout ── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 1rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* ── LEFT: Main Content ── */}
          <div>
            {/* Features Card */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "1.75rem",
                marginBottom: "2rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  color: "#212529",
                  marginBottom: "0.75rem",
                }}
              >
                HGF Connect Features
              </h2>
              <p style={{ color: "#555", marginBottom: "1rem", lineHeight: 1.7 }}>
                Your all-in-one platform for community connection, spiritual growth, and holistic
                living. Access member services, explore our marketplace, and stay connected with
                the House of Grace Fellowship family.
              </p>

              {/* Info Alert */}
              <div
                style={{
                  background: "#e8f4f8",
                  border: "1px solid #bee3f8",
                  borderRadius: "6px",
                  padding: "0.875rem 1rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  color: "#2c6e8a",
                  fontSize: "0.9375rem",
                }}
              >
                <span style={{ flexShrink: 0 }}>ℹ️</span>
                <span>
                  <strong>Member Access Required:</strong> Please log in to access your personal
                  dashboard and exclusive member features.
                </span>
              </div>

              <p style={{ color: "#555", marginBottom: "1.5rem", lineHeight: 1.7 }}>
                HGF Connect is more than just a member portal — it&apos;s your gateway to a
                thriving community where faith meets daily life. Manage your profile, discover
                events, connect with fellow members, and explore our unique holistic marketplace
                designed to support one another in our spiritual and wellness journey.
              </p>

              {/* 6 Feature Icons */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {[
                  { icon: "👤", label: "Profile Management", desc: "Update your personal information, contact details, and spiritual preferences.", color: PRIMARY },
                  { icon: "📅", label: "Event Access", desc: "View upcoming events, RSVP, and receive automated reminders for fellowship activities.", color: PRIMARY },
                  { icon: "👥", label: "Community Connect", desc: "Stay connected with fellow members through our social communication platform.", color: PRIMARY },
                  { icon: "🛍️", label: "Holistic Marketplace", desc: "Discover and support member businesses offering holistic products and services.", color: "#28a745" },
                  { icon: "🛒", label: "Official HGF Store", desc: "Shop exclusive HGF merchandise, books, and faith-based resources.", color: "#17a2b8" },
                  { icon: "💬", label: "Social Hub", desc: "Engage in meaningful conversations and share your faith journey with the community.", color: "#ffc107" },
                ].map((f) => (
                  <div key={f.label} style={{ textAlign: "center", padding: "0.75rem" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{f.icon}</div>
                    <h5 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#212529", marginBottom: "0.375rem" }}>
                      {f.label}
                    </h5>
                    <p style={{ fontSize: "0.8125rem", color: "#6c757d", lineHeight: 1.5 }}>
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Coming Soon Section */}
              <div style={{ marginTop: "2.5rem" }}>
                <h3
                  style={{
                    textAlign: "center",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "#212529",
                    marginBottom: "1.5rem",
                  }}
                >
                  Coming Soon — Enhanced Features
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {/* Member Marketplace Card */}
                  <div
                    style={{
                      border: "1px solid #28a745",
                      borderRadius: "8px",
                      padding: "1.25rem",
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "1.5rem" }}>🌿</span>
                      <h5 style={{ fontSize: "1rem", fontWeight: 700, color: "#212529", margin: 0 }}>
                        Member Marketplace
                      </h5>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "#495057", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                      A dedicated platform where HGF members can showcase and sell their holistic
                      products and services. From handmade crafts to wellness services, support
                      fellow members while discovering amazing offerings that align with our values.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.875rem", color: "#495057" }}>
                      {["Member-to-member commerce", "Holistic and faith-based products", "Community-driven marketplace", "Secure transaction system"].map((item) => (
                        <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span style={{ color: "#28a745" }}>✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Official HGF Store Card */}
                  <div
                    style={{
                      border: "1px solid #17a2b8",
                      borderRadius: "8px",
                      padding: "1.25rem",
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "1.5rem" }}>✝️</span>
                      <h5 style={{ fontSize: "1rem", fontWeight: 700, color: "#212529", margin: 0 }}>
                        Official HGF Store
                      </h5>
                    </div>
                    <p style={{ fontSize: "0.9rem", color: "#495057", marginBottom: "0.75rem", lineHeight: 1.6 }}>
                      Shop our exclusive collection of House of Grace Fellowship branded merchandise
                      and spiritual resources. From inspirational books to branded apparel,
                      everything you need to represent your faith community.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.875rem", color: "#495057" }}>
                      {["Godly magazines and publications", "HGF branded apparel and bags", "Christian books and resources", "Faith-based accessories"].map((item) => (
                        <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span style={{ color: "#17a2b8" }}>✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Additional Upcoming Features */}
                <div
                  style={{
                    border: "1px solid #ffc107",
                    borderRadius: "8px",
                    padding: "1.25rem",
                    background: "white",
                    textAlign: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>🚀</span>
                    <h5 style={{ fontSize: "1rem", fontWeight: 700, color: "#212529", margin: 0 }}>
                      Additional Upcoming Features
                    </h5>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: "0.5rem",
                    }}
                  >
                    {[
                      { icon: "📹", label: "Live Streaming Events" },
                      { icon: "🙏", label: "Prayer Request System" },
                      { icon: "📖", label: "Daily Devotionals" },
                      { icon: "❤️", label: "Ministry Volunteer Portal" },
                    ].map((f) => (
                      <div key={f.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#495057", justifyContent: "center" }}>
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Sticky Sidebar ── */}
          <div style={{ position: "sticky", top: "1.25rem" }}>
            {/* Upcoming Events */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                marginBottom: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: PRIMARY,
                  color: "white",
                  padding: "0.875rem 1.25rem",
                }}
              >
                <h5 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Upcoming Events</h5>
              </div>
              <div style={{ padding: "1rem 1.25rem" }}>
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map((event, i) => (
                    <div key={event.id}>
                      <Link
                        href={session ? `/event/${event.id}` : "/login"}
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          style={{
                            padding: "0.5rem",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          <h6
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 600,
                              color: PRIMARY,
                              marginBottom: "0.25rem",
                            }}
                          >
                            {event.title}
                          </h6>
                          {event.location && (
                            <div style={{ fontSize: "0.8125rem", color: "#6c757d" }}>
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      </Link>
                      {i < upcomingEvents.length - 1 && (
                        <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0.5rem 0" }} />
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ color: "#6c757d", textAlign: "center", fontSize: "0.9rem", margin: 0 }}>
                    No upcoming events.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: PRIMARY,
                  color: "white",
                  padding: "0.875rem 1.25rem",
                }}
              >
                <h5 style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Quick Actions</h5>
              </div>
              <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {session ? (
                  <>
                    <QuickActionLink href="/profile" icon="✏️" label="Update Profile" />
                    <QuickActionLink href="/events" icon="📅" label="View Events" />
                    <QuickActionLink href="/directory" icon="👥" label="Member Directory" />
                    <QuickActionLink href="/resources" icon="📚" label="Resources" />
                  </>
                ) : (
                  <>
                    <QuickActionLink href="/events" icon="📅" label="View Events" />
                    <QuickActionLink href="/directory" icon="👥" label="Member Directory" />
                    <QuickActionLink href="/resources" icon="📚" label="Resources" />
                    <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0.25rem 0" }} />
                    <Link
                      href="/login"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: "0.625rem 1rem",
                        background: PRIMARY,
                        color: "white",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.9rem",
                        textAlign: "center",
                      }}
                    >
                      🔑 Member Login
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                background: "white",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                padding: "1.25rem",
                marginTop: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.75rem",
                textAlign: "center",
              }}
            >
              <StatMini value={`${memberCount}+`} label="Members" />
              <StatMini value={`${upcomingEvents.length}`} label="Events" />
              <StatMini value={`${ministryCount}`} label="Ministries" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          background: "#2d3748",
          color: "rgba(255,255,255,0.75)",
          padding: "3rem 1.5rem 1.5rem",
          marginTop: "3rem",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <Image src="/HGF-icon-v1.0.png" alt="HGF Logo" width={40} height={40} style={{ borderRadius: "50%" }} />
                <h5 style={{ color: "white", margin: 0, fontWeight: 700 }}>House of Grace Fellowship</h5>
              </div>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>
                A Christ-centered, Spirit-led community where faith grows, grace flows, love serves, and transformation is a way of life.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h5 style={{ color: "white", fontWeight: 700, marginBottom: "0.75rem" }}>Quick Links</h5>
              {[{ href: "/", label: "Home" }, { href: "/events", label: "Events" }, { href: "/directory", label: "Members" }, { href: "/resources", label: "Resources" }].map((l) => (
                <div key={l.href} style={{ marginBottom: "0.375rem" }}>
                  <Link href={l.href} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.875rem" }}>
                    {l.label}
                  </Link>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div>
              <h5 style={{ color: "white", fontWeight: 700, marginBottom: "0.75rem" }}>Contact Us</h5>
              <p style={{ fontSize: "0.875rem", marginBottom: "0.375rem" }}>📧 Email: <a href="mailto:hello@houseofgrace.ph" style={{ color: "rgba(255,255,255,0.7)" }}>hello@houseofgrace.ph</a></p>
              <p style={{ fontSize: "0.875rem", marginBottom: "0.375rem" }}>📞 Phone: +63 991 927 1810</p>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>📍 Address: Sazon Compound, 3 Gen. Douglas MacArthur Hwy, Matina, Davao City, Philippines, 8000</p>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: "1.25rem" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.875rem" }}>© 2026 House of Grace Fellowship. All rights reserved.</p>
            <div style={{ display: "flex", gap: "1rem" }}>
              {["f", "📷", "▶", "🐦"].map((icon, i) => (
                <a key={i} href="#" style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", textDecoration: "none" }}>
                  {["Facebook", "Instagram", "YouTube", "Twitter"][i]}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

function QuickActionLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        border: "1px solid #4EB1CB",
        color: "#4EB1CB",
        borderRadius: "6px",
        textDecoration: "none",
        fontWeight: 500,
        fontSize: "0.875rem",
        transition: "all 0.15s",
      }}
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}

function StatMini({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: "1.375rem", fontWeight: 800, color: "#4EB1CB" }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>{label}</div>
    </div>
  );
}
