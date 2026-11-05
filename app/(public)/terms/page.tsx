import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use & Community Guidelines | HGF Connect",
  description: "Terms of Service, EULA, and Community Guidelines for HGF Connect — House of Grace Fellowship.",
};

export default function TermsOfUsePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1rem 5rem" }}>
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          background: "white",
          borderRadius: "16px",
          padding: "2rem 1.5rem",
          boxShadow: "0 2px 12px rgba(15, 45, 61, 0.06)",
          border: "1px solid #e2e8f0",
          color: "#1e293b",
          lineHeight: 1.65,
        }}
      >
        <div style={{ marginBottom: "1.5rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "1rem" }}>
          <span
            style={{
              display: "inline-block",
              background: "#e0f7fb",
              color: "#0e7490",
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              marginBottom: "0.5rem",
            }}
          >
            Community Standards &amp; EULA
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f2d3d", margin: "0 0 0.25rem" }}>
            Terms of Use &amp; Community Guidelines
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
            Effective Date: November 6, 2026 &bull; House of Grace Fellowship (HGF Connect)
          </p>
        </div>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            By accessing or using the HGF Connect mobile application or website, you agree to abide by these Terms of Use and our Christian community standards.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            2. Zero-Tolerance Policy for Objectionable Content &amp; Abuse
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            HGF Connect maintains a strict <strong>zero-tolerance policy</strong> for objectionable content, harassment, hate speech, defamation, fraudulent StewardShop listings, or abusive behavior. Members may not post content that is unlawful, threatening, sexually explicit, or harmful to others.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            3. Content Reporting, Blocking &amp; Moderation
          </h2>
          <ul style={{ fontSize: "0.9rem", color: "#475569", paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            <li><strong>Report Content:</strong> Any member can flag or report a feed post, comment, prayer request, or marketplace listing using the in-app Report option.</li>
            <li><strong>Block Users:</strong> Members can immediately block any user whose content they do not wish to see; blocked users&apos; posts are instantly hidden from your feed.</li>
            <li><strong>24-Hour Review Commitment:</strong> Church moderators review all reported content within 24 hours and will remove objectionable content and suspend or eject offending accounts.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            4. StewardShop Community Marketplace
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            StewardShop is a church member livelihood directory. All listings are subject to moderator review. House of Grace Fellowship is not a party to member-to-member transactions, and members must represent their goods and services truthfully.
          </p>
        </section>

        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", display: "flex", gap: "1rem" }}>
          <Link href="/" style={{ color: "#4EB1CB", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
            &larr; Back to HGF Connect
          </Link>
          <Link href="/privacy" style={{ color: "#64748b", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
            View Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
