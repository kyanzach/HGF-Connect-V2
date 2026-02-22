"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

const TYPE_LABELS: Record<string, string> = {
  sale: "For Sale", trade: "Trade", free: "Free",
  service: "Service", borrow: "Borrow", official_store: "Official Store",
};
const TYPE_COLORS: Record<string, string> = {
  sale: "#10b981", trade: "#3b82f6", free: "#f59e0b",
  service: "#8b5cf6", borrow: "#f97316", official_store: "#ec4899",
};
const CONDITION_LABELS: Record<string, string> = {
  new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", poor: "For Parts",
};

interface ListingData {
  id: number;
  title: string;
  description: string | null;
  listingType: string;
  category: string | null;
  ogPrice: number | null;
  hasDiscount: boolean;
  priceLabel: string | null;
  conditionType: string | null;
  locationArea: string | null;
  loveGiftAmount: number;
  viewCount: number;
  createdAt: string;
  photos: { photoPath: string }[];
  seller: { id: number; firstName: string; lastName: string; profilePicture: string | null };
  isOwner: boolean;
  isLoggedIn: boolean;
  shareToken: string | null;
}

// ── Shared input style ─────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: "10px",
  padding: "0.625rem 0.875rem",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box" as const,
};

// ── Modal backdrop ─────────────────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "20px 20px 0 0",
          padding: "1.5rem 1.25rem", width: "100%", maxWidth: "600px",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
          animation: "slideUp 0.25s ease",
        }}
      >
        {children}
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}

// ── Revealed price card ────────────────────────────────────────────────────────
function RevealedCard({
  ogPrice, discountedPrice, sellerName, loveGiftAmount, actionType,
}: {
  ogPrice: number | null; discountedPrice: number; sellerName: string;
  loveGiftAmount: number; actionType: "reveal" | "contact";
}) {
  const saving = ogPrice ? ogPrice - discountedPrice : 0;
  const pct = ogPrice ? Math.round((saving / ogPrice) * 100) : 0;
  return (
    <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "14px", padding: "1.25rem", marginTop: "1rem" }}>
      <p style={{ textAlign: "center", color: "#16a34a", fontWeight: 700, fontSize: "0.9rem", margin: "0 0 0.625rem" }}>
        🎉 {actionType === "contact" ? "Contact request sent!" : "Discount revealed!"}
      </p>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        {ogPrice && <span style={{ fontSize: "1.1rem", color: "#94a3b8", textDecoration: "line-through" }}>₱{ogPrice.toLocaleString()}</span>}
        <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "#16a34a" }}>₱{discountedPrice.toLocaleString()}</span>
        {pct > 0 && <span style={{ background: "#16a34a", color: "white", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px" }}>{pct}% OFF</span>}
      </div>
      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#4b5563", margin: "0.5rem 0" }}>
        Contact <strong>{sellerName}</strong> to complete your purchase.
      </p>
      {loveGiftAmount > 0 && (
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9f1239", margin: "0.375rem 0 0" }}>
          ❤️ Share this listing — earn ₱{loveGiftAmount.toLocaleString()} Love Gift per confirmed sale!
        </p>
      )}
      <p style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
        Someone from HGF Connect may reach out to confirm details.
      </p>
    </div>
  );
}

// ── Share & Bless Panel ────────────────────────────────────────────────────────
function SharePanel({ listingId, loveGiftAmount, title }: { listingId: number; loveGiftAmount: number; title: string }) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch existing share link on mount
  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}/share`)
      .then((r) => r.json())
      .then((d) => { if (d.shareLink) setShareLink(d.shareLink); })
      .catch(() => {});
  }, [listingId]);

  async function generateLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/share`, { method: "POST" });
      const data = await res.json();
      if (data.shareLink) setShareLink(data.shareLink);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function shareNative() {
    if (!shareLink) return;
    if (navigator.share) {
      navigator.share({ title, text: `Check out this listing on HGF Connect Marketplace!`, url: shareLink }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", border: "1px solid #fecdd3" }}>
      <h3 style={{ fontSize: "0.875rem", fontWeight: 800, color: "#be123c", margin: "0 0 0.25rem" }}>
        ❤️ Share &amp; Bless — Love Gift: ₱{loveGiftAmount.toLocaleString()}
      </h3>
      <p style={{ fontSize: "0.8rem", color: "#9f1239", margin: "0 0 0.875rem", lineHeight: 1.6 }}>
        Share your unique link! If your shared link leads to a confirmed sale, you&apos;ll earn{" "}
        <strong>₱{loveGiftAmount.toLocaleString()}</strong> as a Love Gift. 🎁
      </p>
      {shareLink ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ background: "white", border: "1px solid #fecdd3", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.72rem", color: "#9f1239", wordBreak: "break-all", fontFamily: "monospace" }}>
            {shareLink}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={copyLink}
              style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: "999px", padding: "0.45rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              {copied ? "✅ Copied!" : "📋 Copy Link"}
            </button>
            <button
              onClick={shareNative}
              style={{ flex: 1, background: "white", color: "#be123c", border: "1.5px solid #f87171", borderRadius: "999px", padding: "0.45rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              📤 Share
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={generateLink}
          disabled={loading}
          style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "999px", padding: "0.45rem 1.25rem", fontSize: "0.8rem", fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "inherit" }}
        >
          {loading ? "Generating…" : "🔗 Get My Share Link"}
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ListingDetailClient({ listing }: { listing: ListingData }) {
  const shareToken = listing.shareToken ?? undefined;

  // Log CTA impression track helper
  const logEvent = useCallback((event: string) => {
    fetch("/api/marketplace/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, shareCode: shareToken ?? null, event }),
    }).catch(() => {});
  }, [listing.id, shareToken]);

  // Modal state
  const [modal, setModal] = useState<"reveal" | "contact" | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<{
    discountedPrice: number; ogPrice: number | null;
    sellerName: string; actionType: "reveal" | "contact";
  } | null>(null);

  const sellerName = `${listing.seller.firstName} ${listing.seller.lastName}`;
  const sellerInitials = `${listing.seller.firstName[0]}${listing.seller.lastName?.[0] ?? ""}`;

  function openModal(type: "reveal" | "contact") {
    setModal(type);
    setError("");
    logEvent(type === "reveal" ? "reveal_click" : "contact_click");
  }

  function closeModal() {
    setModal(null);
    setError("");
  }

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError("Full name is required"); return; }
    if (modal === "contact" && !mobile.trim()) { setError("Mobile number is required for contact requests"); return; }
    if (modal === "contact" && !consented) { setError("Please agree to be contacted by the seller"); return; }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          actionType: modal,
          shareToken: shareToken ?? null,
          prospectName: name,
          prospectMobile: mobile || null,
          prospectEmail: email || null,
          consented,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");

      setRevealed({
        discountedPrice: data.discountedPrice ?? (listing.ogPrice ?? 0),
        ogPrice: data.ogPrice,
        sellerName: data.sellerName ?? sellerName,
        actionType: modal as "reveal" | "contact",
      });
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [modal, name, mobile, email, consented, listing.id, listing.ogPrice, shareToken, sellerName]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Back nav */}
      <div style={{ padding: "0.75rem 1rem", background: "white", borderBottom: "1px solid #f1f5f9" }}>
        <Link href="/marketplace" style={{ color: PRIMARY, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
          ← Marketplace
        </Link>
      </div>

      {/* Photo */}
      <div style={{ background: "#f1f5f9", width: "100%", height: 260, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
        {listing.photos[0] ? (
          <Image src={`/uploads/marketplace/${listing.photos[0].photoPath}`} alt={listing.title} fill style={{ objectFit: "cover" }} />
        ) : "📦"}
        <span style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: TYPE_COLORS[listing.listingType] ?? PRIMARY, color: "white", fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "6px", textTransform: "uppercase" }}>
          {TYPE_LABELS[listing.listingType] ?? listing.listingType}
        </span>
        {listing.loveGiftAmount > 0 && (
          <span style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "#ef4444", color: "white", fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "6px" }}>
            ❤️ Love Gift ₱{listing.loveGiftAmount.toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ padding: "1rem" }}>
        {/* Title + Price */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.5rem" }}>{listing.title}</h1>

          {listing.ogPrice ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.625rem", fontWeight: 900, color: PRIMARY }}>₱{listing.ogPrice.toLocaleString()}</span>
              {listing.hasDiscount && (
                <span style={{ background: "#f0f9ff", color: PRIMARY, fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${PRIMARY}` }}>
                  🔒 Discount available
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: PRIMARY, marginBottom: "0.5rem" }}>
              {listing.priceLabel ?? "Free"}
            </div>
          )}

          {revealed && (
            <RevealedCard
              ogPrice={revealed.ogPrice} discountedPrice={revealed.discountedPrice}
              sellerName={revealed.sellerName} loveGiftAmount={listing.loveGiftAmount}
              actionType={revealed.actionType}
            />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            {listing.conditionType && <span style={{ background: "#eff6ff", color: "#1d4ed8", fontSize: "0.72rem", padding: "0.2rem 0.625rem", borderRadius: "999px", fontWeight: 600 }}>{CONDITION_LABELS[listing.conditionType] ?? listing.conditionType}</span>}
            {listing.category && <span style={{ background: "#f5f3ff", color: "#7c3aed", fontSize: "0.72rem", padding: "0.2rem 0.625rem", borderRadius: "999px", fontWeight: 600 }}>{listing.category}</span>}
            {listing.locationArea && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>📍 {listing.locationArea}</span>}
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>👁 {listing.viewCount} views</span>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div style={{ background: "white", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>About this item</h3>
            <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, margin: 0, whiteSpace: "pre-line" }}>{listing.description}</p>
          </div>
        )}

        {/* ── GATED CTAs (v1.1 §39–41) — hidden once revealed ─────────────────── */}
        {!revealed && (
          <div style={{ background: "white", borderRadius: "16px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 2px 12px rgba(78,177,203,0.12)", border: "1.5px solid #bae6fd" }}>
            <p style={{ fontSize: "0.8rem", color: "#0369a1", textAlign: "center", margin: "0 0 1rem", lineHeight: 1.5 }}>
              {listing.hasDiscount
                ? "🔒 A discounted price is available. Fill a short form to reveal it — this helps track referrals so sharers receive their Love Gifts."
                : "Interested? Contact the seller to get more information about this listing."}
            </p>
            {listing.hasDiscount && (
              <button
                onClick={() => openModal("reveal")}
                style={{ display: "block", width: "100%", background: PRIMARY, color: "white", border: "none", borderRadius: "999px", padding: "0.875rem", fontSize: "1rem", fontWeight: 700, cursor: "pointer", marginBottom: "0.625rem", fontFamily: "inherit" }}
              >
                🔓 Reveal Discount
              </button>
            )}
            <button
              onClick={() => openModal("contact")}
              style={{ display: "block", width: "100%", background: "white", color: PRIMARY, border: `2px solid ${PRIMARY}`, borderRadius: "999px", padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              💬 Contact the Seller
            </button>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", margin: "0.75rem 0 0", lineHeight: 1.5 }}>
              We&apos;ll share your contact only with the seller to help complete this purchase.
            </p>
          </div>
        )}

        {/* ── Share & Bless Panel — logged in, not owner ────────────────────────── */}
        {listing.loveGiftAmount > 0 && listing.isLoggedIn && !listing.isOwner && (
          <SharePanel listingId={listing.id} loveGiftAmount={listing.loveGiftAmount} title={listing.title} />
        )}

        {/* Love Gift info — for guests or when loveGift set but user is guest */}
        {listing.loveGiftAmount > 0 && !listing.isLoggedIn && (
          <div style={{ background: "linear-gradient(135deg, #fff1f2, #ffe4e6)", borderRadius: "16px", padding: "1rem", marginBottom: "0.75rem", border: "1px solid #fecdd3" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 800, color: "#be123c", margin: "0 0 0.375rem" }}>
              ❤️ Share &amp; Bless — Love Gift: ₱{listing.loveGiftAmount.toLocaleString()}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#9f1239", margin: "0 0 0.75rem", lineHeight: 1.6 }}>
              HGF members can share this listing and earn ₱{listing.loveGiftAmount.toLocaleString()} Love Gift per confirmed sale.
            </p>
            <Link href="/login" style={{ background: "#ef4444", color: "white", borderRadius: "999px", padding: "0.45rem 1.25rem", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
              Login to Share &amp; Earn
            </Link>
          </div>
        )}

        {/* Seller */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>
            {sellerInitials}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{sellerName}</div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>HGF Member · {listing.viewCount} views</div>
          </div>
          {listing.isOwner && (
            <Link href={`/marketplace/my-listings`} style={{ marginLeft: "auto", background: "#f1f5f9", color: "#64748b", borderRadius: "999px", padding: "0.35rem 0.875rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
              My Listings →
            </Link>
          )}
        </div>
      </div>

      {/* ── REVEAL DISCOUNT MODAL (v1.1 §46–56) ──────────────────────────────── */}
      {modal === "reveal" && (
        <Modal onClose={closeModal}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.375rem" }}>🔓 See discounted price</h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
            Enter your full name to view the discounted price and receive seller contact. This helps us track referrals so we can thank the sharer with a Love Gift.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Email (optional)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Mobile (optional)</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09xxxxxxxxx" type="tel" style={inputStyle} />
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>I agree to be contacted by the seller regarding this listing (recommended)</span>
            </label>
            {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
            <button
              onClick={handleSubmit} disabled={submitting || !name.trim()}
              style={{ padding: "0.875rem", background: (submitting || !name.trim()) ? "#94a3b8" : PRIMARY, color: "white", border: "none", borderRadius: "999px", fontSize: "1rem", fontWeight: 700, cursor: (submitting || !name.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {submitting ? "Checking…" : "🔓 Reveal Discount"}
            </button>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              We&apos;ll share your contact only with the seller. See our privacy policy.
            </p>
          </div>
        </Modal>
      )}

      {/* ── CONTACT THE SELLER MODAL (v1.1 §58–69) ───────────────────────────── */}
      {modal === "contact" && (
        <Modal onClose={closeModal}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.375rem" }}>💬 Contact the Seller</h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
            Provide your full name and mobile number so the seller can follow up and help you with this offer.
            {listing.hasDiscount && " We'll also reveal the discounted price after submission."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>Mobile Number *</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09xxxxxxxxx" type="tel" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Email (optional)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" style={inputStyle} />
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 600, lineHeight: 1.5 }}>I agree to be contacted by the seller * (required)</span>
            </label>
            {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !mobile.trim() || !consented}
              style={{ padding: "0.875rem", background: (submitting || !name.trim() || !mobile.trim() || !consented) ? "#94a3b8" : PRIMARY, color: "white", border: "none", borderRadius: "999px", fontSize: "1rem", fontWeight: 700, cursor: (submitting || !name.trim() || !mobile.trim() || !consented) ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {submitting ? "Sending…" : "📤 Send Contact Request"}
            </button>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              We&apos;ll share your contact only with the seller to help complete this purchase.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
