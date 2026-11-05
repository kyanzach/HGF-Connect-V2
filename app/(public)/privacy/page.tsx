import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | HGF Connect",
  description: "Privacy Policy and Data Protection Guidelines for HGF Connect — House of Grace Fellowship.",
};

export default function PrivacyPolicyPage() {
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
            Data Protection &amp; Privacy
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f2d3d", margin: "0 0 0.25rem" }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
            Effective Date: November 6, 2026 &bull; House of Grace Fellowship (HGF Connect)
          </p>
        </div>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            1. Information We Collect
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            HGF Connect collects only the information necessary to provide our church community social feed, prayer wall, events, devotionals, and StewardShop directory:
          </p>
          <ul style={{ fontSize: "0.9rem", color: "#475569", paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
            <li><strong>Account &amp; Profile Data:</strong> Name, username, email address, mobile number, birthdate, gender, favorite Bible verse, and optional profile/cover photos.</li>
            <li><strong>Community Content:</strong> Posts, comments, prayer requests, testimonies, devotional reflections, and StewardShop listings you voluntarily share.</li>
            <li><strong>Device &amp; Notification Permissions:</strong> Camera and Photo Library access (only when you choose to upload a photo) and Push Notification permissions (to deliver church updates, prayer alerts, and community notifications).</li>
          </ul>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            2. How We Use Your Information
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            We use your information strictly for church community fellowship, ministry coordination, event RSVP reminders, prayer support, and account security. We never sell, rent, or trade your personal data to third-party advertisers or data brokers.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            3. Directory Visibility &amp; Privacy Controls
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            You have granular control over whether your email address, phone number, or home address is visible to other approved church members via <strong>Profile &rarr; Edit Profile &rarr; Privacy</strong>. You may also opt in or out of SMS event reminders at any time.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            4. Account &amp; Data Deletion (Self-Service)
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            In compliance with Apple App Store Guideline 5.1.1(v) and Google Play Data Deletion requirements, you can permanently delete your account at any time directly inside the app by navigating to <strong>Profile &rarr; Edit Profile &rarr; Security &rarr; Delete My Account</strong>. Upon confirmation, your personal contact details and credentials are immediately scrubbed and deactivated.
          </p>
        </section>

        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f2d3d", marginBottom: "0.5rem" }}>
            5. Contact Us
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#475569", margin: 0 }}>
            If you have questions about this Privacy Policy or your personal data, please contact House of Grace Fellowship Administration in Davao City, Philippines, or via <a href="https://connect.houseofgrace.ph" style={{ color: "#4EB1CB", fontWeight: 600 }}>connect.houseofgrace.ph</a>.
          </p>
        </section>

        <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9", display: "flex", gap: "1rem" }}>
          <Link href="/" style={{ color: "#4EB1CB", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
            &larr; Back to HGF Connect
          </Link>
          <Link href="/terms" style={{ color: "#64748b", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
            View Terms of Use &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
