import PublicNav from "@/components/layout/PublicNav";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "HGF Connect Marketplace — members-only community marketplace. Buy, sell, trade, or share with fellow HGF members.",
};

export default function MarketplacePage() {
  return (
    <>
      <PublicNav />
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f2d3d 0%, #1f6477 100%)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🏪</div>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
            }}
          >
            Marketplace
          </h1>
          <div
            style={{
              display: "inline-block",
              background: "rgba(78,177,203,0.2)",
              border: "1px solid rgba(78,177,203,0.4)",
              borderRadius: "999px",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#7ec8da",
              marginBottom: "1.5rem",
            }}
          >
            🚧 Coming Soon
          </div>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "1.0625rem",
              maxWidth: "480px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.65,
            }}
          >
            The HGF Connect Marketplace is under development. Buy, sell, trade, and offer services exclusively within our HGF community — no strangers, just church family.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
            }}
          >
            {[
              { icon: "🛍️", label: "Buy & Sell" },
              { icon: "🔄", label: "Trade Items" },
              { icon: "🎁", label: "Free Giveaways" },
              { icon: "🛠️", label: "Offer Services" },
            ].map((f) => (
              <div
                key={f.label}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{f.icon}</div>
                {f.label}
              </div>
            ))}
          </div>

          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.75rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "white",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.9375rem",
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
