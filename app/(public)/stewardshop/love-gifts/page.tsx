import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Love Gifts — Share & Bless | HGF StewardShop",
  description: "Discover how HGF Connect's Love Gift program works. Share listings with your community and earn a blessing for every confirmed sale.",
};

export default function LoveGiftsPage() {
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #be123c 0%, #f43f5e 50%, #fb7185 100%)",
          color: "white", padding: "2.5rem 1.25rem 2rem", textAlign: "center",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "0.75rem" }}>❤️</div>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.2 }}>
          Share &amp; Bless
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", opacity: 0.9, lineHeight: 1.6 }}>
          Share marketplace listings with your community<br />
          and earn a Love Gift when your share leads to a sale.
        </p>
      </div>

      <div style={{ padding: "1.25rem" }}>

        {/* L.O.V.E. Explanation Block */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem",
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          marginBottom: "1.25rem",
          border: "1px solid #ffe4e6",
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 900, color: "#be123c", margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
            ❤️ What L.O.V.E. Stands For
          </h2>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
            In the House of Grace Fellowship (HGF) StewardShop, the acronym <strong>L.O.V.E.</strong> stands for:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
            {[
              { letter: "L", word: "Livelihood", desc: "Supporting members' local businesses, services, and products to foster economic growth within the congregation." },
              { letter: "O", word: "Opportunity", desc: "Creating shared financial opportunities for everyone to bless and be blessed through the \"Share & Bless\" referral program." },
              { letter: "V", word: "Value", desc: "Encouraging fair, honest, and high-value transactions rooted in Christian integrity and mutual respect." },
              { letter: "E", word: "Empowerment", desc: "Empowering the community to lift one another up, strengthening church ties and shared prosperity." }
            ].map(({ letter, word, desc }) => (
              <div key={letter} style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #f43f5e, #be123c)",
                  color: "white",
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 3px 8px rgba(190,18,60,0.15)"
                }}>
                  {letter}
                </div>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", fontWeight: 800, color: "#1e293b" }}>
                    {word}
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#475569",
            lineHeight: 1.6,
            background: "#fff1f2",
            padding: "0.875rem",
            borderRadius: "12px",
            borderLeft: "4px solid #f43f5e",
            fontWeight: 500
          }}>
            This highlights the church&apos;s community-centric philosophy: the marketplace is designed not for commercial advertising or affiliate marketing, but rather to foster <strong>Livelihood</strong> support, create shared financial <strong>Opportunities</strong> through the &ldquo;Share &amp; Bless&rdquo; program, encourage fair and honest <strong>Value</strong>, and promote mutual <strong>Empowerment</strong> across the congregation.
          </p>
        </div>

        {/* How it works */}
        <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 1.25rem", textAlign: "center" }}>
            How It Works
          </h2>
          {[
            { step: "1", emoji: "🔍", title: "Find a listing", desc: "Browse the HGF Marketplace and find something worth sharing with your friends or family." },
            { step: "2", emoji: "🔗", title: "Get your unique link", desc: "Tap 'Get My Share Link' on any listing. You'll get a personal link that tracks your referral." },
            { step: "3", emoji: "📤", title: "Share it!", desc: "Send your link via Viber, Facebook, SMS, or any platform. Your link stays active as long as the listing is." },
            { step: "4", emoji: "👤", title: "Prospect submits info", desc: "When someone clicks your link and reveals the discount or contacts the seller, a prospect record is created — with your referral tracked." },
            { step: "5", emoji: "✅", title: "Sale confirmed", desc: "The seller confirms the sale and selects the prospect that came through your link." },
            { step: "6", emoji: "🎁", title: "Love Gift credited!", desc: "You receive the Love Gift amount (set by the seller) as a blessing for helping facilitate the sale." },
          ].map(({ step, emoji, title, desc }) => (
            <div key={step} style={{ display: "flex", gap: "0.875rem", marginBottom: "1.25rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff1f2", color: "#be123c", fontWeight: 900, fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {emoji}
              </div>
              <div>
                <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                  Step {step}: {title}
                </p>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 2px 16px rgba(0,0,0,0.07)", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 1.25rem" }}>
            Frequently Asked Questions
          </h2>
          {[
            { q: "Who can share listings?", a: "Any logged-in HGF Connect member can generate a share link for any active listing (except their own)." },
            { q: "How much is the Love Gift?", a: "The seller sets the Love Gift amount when they create the listing. It's a fixed peso amount (e.g., ₱100), shown on the listing card." },
            { q: "When is the Love Gift paid?", a: "After the seller confirms the sale via the Prospects dashboard. The seller manually selects which prospect led to the confirmed purchase." },
            { q: "What if multiple people share the same listing?", a: "Love Gifts are attributed based on who's share link was clicked by the specific buyer. Each confirmed sale credits only the sharer whose link was used." },
            { q: "How do I track my earnings?", a: "Go to ❤️ My Shares in the app menu to see your impressions, clicks, prospects, and earned Love Gifts per share link." },
            { q: "Is the Love Gift a commission?", a: "No — it's a goodwill blessing from the seller, not a financial commitment enforced by HGF Connect. It's a thank-you for helping the community connect." },
          ].map(({ q, a }) => (
            <div key={q} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9" }}>
              <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>🙋 {q}</p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <Link href="/stewardshop" style={{ display: "inline-block", background: "linear-gradient(135deg, #be123c, #ef4444)", color: "white", borderRadius: "999px", padding: "0.875rem 2rem", textDecoration: "none", fontSize: "1rem", fontWeight: 800, boxShadow: "0 4px 14px rgba(239,68,68,0.4)" }}>
            Browse Marketplace →
          </Link>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.75rem", lineHeight: 1.5 }}>
            Share a listing and start blessing someone today. 🙏
          </p>
        </div>
      </div>
    </div>
  );
}
