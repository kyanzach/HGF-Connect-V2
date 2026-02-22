"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PublicNav from "@/components/layout/PublicNav";
import Image from "next/image";

const BIBLE_VERSES = [
  { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.", reference: "Proverbs 3:5-6" },
  { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", reference: "Romans 8:28" },
  { text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.", reference: "Isaiah 40:31" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.", reference: "Zephaniah 3:17" },
  { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
  { text: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul.", reference: "Psalm 23:1-3" },
];

const PRIMARY = "#4EB1CB";
const PRIMARY_DARK = "#3A95AD";

const FEATURES = [
  {
    icon: "🤝",
    title: "Community Trading",
    desc: "Buy, sell, and trade with fellow church members in a safe, trusted environment. From furniture and electronics to clothing and collectibles, connect with your church family for fair deals. Build relationships while finding great bargains and giving your items new life in loving homes.",
  },
  {
    icon: "❤️",
    title: "Support Local",
    desc: "Discover and support businesses owned by our church family members. From home-based services like catering and tutoring to professional services like accounting and home repair. Help our community thrive by keeping business within our fellowship and supporting each other's entrepreneurial dreams.",
  },
  {
    icon: "🎁",
    title: "Share Resources",
    desc: "Share tools, books, household items, and even find loving homes for pets. Connect with fellow members for pet adoption, lending library books, sharing garden tools, kitchen appliances, and other community resources to help each other thrive.",
  },
];

export default function MarketplacePage() {
  const [verse, setVerse] = useState(BIBLE_VERSES[5]); // Zephaniah 3:17 default (matches screenshot)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setVerse(BIBLE_VERSES[dayOfYear % BIBLE_VERSES.length]);
  }, []);

  return (
    <>
      <PublicNav />

      <div style={{ minHeight: "calc(100vh - 120px)", background: "#ffffff", padding: "4rem 1.5rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>

          {/* Marketplace Icon — animated pulse */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "5rem",
                animation: "hgfPulse 2s ease-in-out infinite",
                color: PRIMARY,
              }}
            >
              🛍️
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4rem)",
              fontWeight: 700,
              color: PRIMARY,
              marginBottom: "1rem",
              lineHeight: 1.1,
            }}
          >
            Marketplace
          </h1>

          {/* Coming Soon Badge */}
          <div style={{ marginBottom: "1.5rem" }}>
            <span
              style={{
                display: "inline-block",
                background: PRIMARY,
                color: "white",
                fontWeight: 600,
                fontSize: "1.1rem",
                padding: "0.5rem 1.5rem",
                borderRadius: "999px",
                boxShadow: "0 4px 15px rgba(78,177,203,0.35)",
              }}
            >
              Coming Soon
            </span>
          </div>

          {/* Subtitle */}
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#6c757d", marginBottom: "1.25rem" }}>
            Something Amazing is on the Way!
          </h2>

          <p
            style={{
              fontSize: "1.0625rem",
              color: "#495057",
              marginBottom: "3rem",
              lineHeight: 1.75,
              maxWidth: "640px",
              margin: "0 auto 3rem",
            }}
          >
            We&apos;re building an incredible marketplace where our church community can connect,
            share resources, and support each other through buying, selling, and trading.
            Get ready for a platform that brings our fellowship together in new and exciting ways!
          </p>

          {/* Feature Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1.5rem",
              marginBottom: "3rem",
            }}
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{
                  background: "white",
                  borderRadius: "15px",
                  padding: "2rem 1.5rem",
                  border: hoveredCard === i ? `2px solid ${PRIMARY}` : "2px solid #f8f9fa",
                  boxShadow: hoveredCard === i
                    ? "0 10px 30px rgba(78,177,203,0.2)"
                    : "0 4px 6px rgba(0,0,0,0.08)",
                  transform: hoveredCard === i ? "translateY(-5px)" : "none",
                  transition: "all 0.3s ease",
                  cursor: "default",
                  textAlign: "center",
                }}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div style={{ fontSize: "2.5rem", color: PRIMARY, marginBottom: "0.75rem" }}>
                  {f.icon}
                </div>
                <h5 style={{ fontSize: "1.0625rem", fontWeight: 700, color: PRIMARY, marginBottom: "0.75rem" }}>
                  {f.title}
                </h5>
                <p style={{ color: "#6c757d", fontSize: "0.9rem", lineHeight: 1.65, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bible Verse Card */}
          <div
            style={{
              background: "#f8f9fa",
              borderRadius: "20px",
              padding: "2.5rem",
              color: "#2c3e50",
              boxShadow: "0 4px 6px rgba(0,0,0,0.08)",
              border: `2px solid ${PRIMARY}`,
              position: "relative",
              overflow: "hidden",
              marginBottom: "3rem",
              textAlign: "left",
            }}
          >
            {/* Animated gradient top bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: `linear-gradient(90deg, ${PRIMARY}, #65C6DE, ${PRIMARY})`,
                backgroundSize: "200% 100%",
                animation: "hgfGradientMove 3s ease infinite",
              }}
            />

            {/* Quote icon */}
            <div
              style={{
                fontSize: "2rem",
                color: PRIMARY,
                opacity: 0.3,
                lineHeight: 1,
                marginBottom: "0.5rem",
              }}
            >
              ❝
            </div>

            <blockquote
              style={{
                fontStyle: "italic",
                fontSize: "1.0625rem",
                lineHeight: 1.75,
                color: "#2c3e50",
                margin: "0 0 1rem",
                paddingLeft: "1rem",
              }}
            >
              &ldquo;{verse.text}&rdquo;
            </blockquote>

            <div
              style={{
                background: PRIMARY,
                color: "white",
                padding: "0.625rem 1.25rem",
                borderRadius: "8px",
                display: "inline-block",
                fontWeight: 600,
                fontSize: "0.9375rem",
              }}
            >
              — {verse.reference}
            </div>
          </div>

          {/* Stay Connected CTA */}
          <div style={{ marginTop: "2rem" }}>
            <h4 style={{ fontSize: "1.375rem", fontWeight: 700, color: "#212529", marginBottom: "0.5rem" }}>
              Stay Connected
            </h4>
            <p style={{ color: "#6c757d", marginBottom: "1.75rem", fontSize: "1rem" }}>
              Be the first to know when our marketplace launches!
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              <Link
                href="/directory"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: PRIMARY,
                  color: "white",
                  padding: "0.875rem 2rem",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 15px rgba(78,177,203,0.3)",
                  transition: "transform 0.15s",
                }}
              >
                👥 Explore Community
              </Link>
              <Link
                href="/events"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: `2px solid ${PRIMARY}`,
                  color: PRIMARY,
                  padding: "0.875rem 2rem",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  transition: "all 0.15s",
                }}
              >
                📅 Upcoming Events
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "#2d3748", color: "rgba(255,255,255,0.75)", padding: "3rem 1.5rem 1.5rem", marginTop: "4rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem", marginBottom: "2rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <Image src="/HGF-icon-v1.0.png" alt="HGF Logo" width={40} height={40} style={{ borderRadius: "50%" }} />
                <h5 style={{ color: "white", margin: 0, fontWeight: 700 }}>House of Grace Fellowship</h5>
              </div>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.7, margin: 0 }}>
                A Christ-centered, Spirit-led community where faith grows, grace flows, love serves, and transformation is a way of life.
              </p>
            </div>
            <div>
              <h5 style={{ color: "white", fontWeight: 700, marginBottom: "0.75rem" }}>Quick Links</h5>
              {[{ href: "/", label: "Home" }, { href: "/events", label: "Events" }, { href: "/directory", label: "Members" }, { href: "/resources", label: "Resources" }].map((l) => (
                <div key={l.href} style={{ marginBottom: "0.375rem" }}>
                  <Link href={l.href} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "0.875rem" }}>{l.label}</Link>
                </div>
              ))}
            </div>
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
              {["Facebook", "Instagram", "YouTube", "Twitter"].map((name) => (
                <a key={name} href="#" style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", textDecoration: "none" }}>{name[0]}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes hgfPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes hgfGradientMove {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
}
