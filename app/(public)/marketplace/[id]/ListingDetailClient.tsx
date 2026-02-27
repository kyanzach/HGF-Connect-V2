"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

// ── Photo Carousel ─────────────────────────────────────────────────────────────
function PhotoCarousel({ photos, title }: { photos: { photoPath: string }[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (photos.length === 0) {
    return (
      <div style={{ background: "#f1f5f9", width: "100%", height: 260, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
        📦
      </div>
    );
  }

  function prev() { setIdx((i) => (i - 1 + photos.length) % photos.length); }
  function next() { setIdx((i) => (i + 1) % photos.length); }

  return (
    <div
      style={{ position: "relative", width: "100%", height: 260, background: "#f1f5f9", overflow: "hidden", userSelect: "none" }}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (dx > 40) prev();
        else if (dx < -40) next();
        touchStartX.current = null;
      }}
    >
      <img
        src={`/uploads/marketplace/${photos[idx].photoPath}`}
        alt={`${title} — photo ${idx + 1}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.2s" }}
      />
      {photos.length > 1 && (
        <>
          {/* Prev arrow */}
          <button
            onClick={prev}
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}
          >‹</button>
          {/* Next arrow */}
          <button
            onClick={next}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.45)", color: "white", border: "none", borderRadius: "50%", width: 32, height: 32, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}
          >›</button>
          {/* Dot indicators */}
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                style={{ width: i === idx ? 16 : 8, height: 8, borderRadius: 4, background: i === idx ? "white" : "rgba(255,255,255,0.55)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s", WebkitTapHighlightColor: "transparent" }}
              />
            ))}
          </div>
          {/* Counter badge */}
          <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "white", fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 999 }}>
            {idx + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  sale: "For Sale", trade: "Trade", free: "Free",
  service: "Service", rent: "Rent", official_store: "Official Store",
};
const TYPE_COLORS: Record<string, string> = {
  sale: "#10b981", trade: "#3b82f6", free: "#f59e0b",
  service: "#8b5cf6", rent: "#f97316", official_store: "#ec4899",
};
const CONDITION_LABELS: Record<string, string> = {
  new: "Brand New", like_new: "Like New", good: "Good", fair: "Fair", poor: "For Parts",
};

interface ListingData {
  id: number; title: string; description: string | null;
  listingType: string; category: string | null;
  ogPrice: number | null; hasDiscount: boolean;
  priceLabel: string | null; conditionType: string | null;
  locationArea: string | null; loveGiftAmount: number;
  viewCount: number; createdAt: string;
  photos: { photoPath: string }[];
  seller: { id: number; firstName: string; lastName: string; profilePicture: string | null; isVerified: boolean };
  isOwner: boolean; isLoggedIn: boolean; shareToken: string | null;
}

interface RevealedState {
  discountedPrice: number;
  ogPrice: number | null;
  sellerName: string;
  actionType: "reveal" | "contact";
  couponCode: string | null; // e.g. RYANP01
}

const inputStyle = {
  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px",
  padding: "0.625rem 0.875rem", fontSize: "0.95rem",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
};

// ── Confetti burst (pure CSS/JS, no deps) ──────────────────────────────────────
function useConfetti() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  function burst() {
    const container = containerRef.current;
    if (!container) return;
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 8 + 4;
      const left = Math.random() * 100;
      const delay = Math.random() * 0.4;
      const duration = Math.random() * 0.8 + 0.8;
      const rotate = Math.random() * 720 - 360;
      el.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;
        background:${color};left:${left}%;top:50%;
        border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
        animation:confetti-fall ${duration}s ${delay}s ease-out forwards;
        transform-origin:center;pointer-events:none;
      `;
      container.appendChild(el);
      setTimeout(() => el.remove(), (delay + duration) * 1000 + 100);
    }
  }

  return { containerRef, burst };
}

// ── Modal backdrop ─────────────────────────────────────────────────────────────
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "20px 20px 0 0", padding: "1.5rem 1.25rem", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -4px 30px rgba(0,0,0,0.15)", animation: "slideUp 0.25s ease" }}
      >
        {children}
      </div>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-200px) rotate(var(--r,360deg)) translateX(var(--x,0px)); opacity: 0; }
        }
        @keyframes coupon-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
      `}</style>
    </div>
  );
}

// ── Coupon Code card — shows after reveal ──────────────────────────────────────
function CouponRevealCard({ revealed, sellerName, loveGiftAmount }: {
  revealed: RevealedState; sellerName: string; loveGiftAmount: number;
}) {
  const { discountedPrice, ogPrice, couponCode, actionType } = revealed;
  const saving = ogPrice ? ogPrice - discountedPrice : 0;
  const pct = ogPrice ? Math.round((saving / ogPrice) * 100) : 0;

  return (
    <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", borderRadius: "16px", padding: "1.25rem", marginTop: "1rem", position: "relative", overflow: "hidden" }}>
      <p style={{ textAlign: "center", color: "#16a34a", fontWeight: 700, fontSize: "0.9rem", margin: "0 0 1rem" }}>
        🎉 {actionType === "contact" ? "Contact request sent!" : "Discount revealed!"}
      </p>

      {/* Price reveal */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
        {ogPrice && <span style={{ fontSize: "1.1rem", color: "#94a3b8", textDecoration: "line-through" }}>₱{ogPrice.toLocaleString()}</span>}
        <span style={{ fontSize: "1.875rem", fontWeight: 900, color: "#16a34a" }}>₱{discountedPrice.toLocaleString()}</span>
        {pct > 0 && <span style={{ background: "#16a34a", color: "white", fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px" }}>{pct}% OFF</span>}
      </div>

      {/* Coupon code */}
      {couponCode && (
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.72rem", color: "#64748b", margin: "0 0 0.375rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Your Discount Code
          </p>
          <div style={{ display: "inline-block", background: "white", border: "2px dashed #16a34a", borderRadius: "12px", padding: "0.625rem 1.5rem", animation: "coupon-pop 0.5s ease forwards" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 900, color: "#15803d", letterSpacing: "0.12em", fontFamily: "monospace" }}>
              {couponCode}
            </span>
          </div>
          <p style={{ fontSize: "0.72rem", color: "#16a34a", margin: "0.5rem 0 0", fontWeight: 600 }}>
            📸 Screenshot this! Show code <strong>{couponCode}</strong> to the seller at purchase time.
          </p>
          <p style={{ fontSize: "0.68rem", color: "#94a3b8", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
            This code stays saved here — come back anytime to view it.
          </p>
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#4b5563", margin: "0.5rem 0" }}>
        Contact <strong>{sellerName}</strong> to complete your purchase.
      </p>
      {loveGiftAmount > 0 && (
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#9f1239", margin: "0.375rem 0 0" }}>
          ❤️ Share this listing — earn ₱{loveGiftAmount.toLocaleString()} Love Gift per confirmed sale!
        </p>
      )}
    </div>
  );
}

// ── Share & Bless Panel ────────────────────────────────────────────────────────
function SharePanel({ listingId, loveGiftAmount, title }: { listingId: number; loveGiftAmount: number; title: string }) {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/marketplace/listings/${listingId}/share`)
      .then((r) => r.json())
      .then((d) => {
        if (d.shareLink) { setShareLink(d.shareLink); setShareCode(d.shareCode); }
      })
      .catch(() => {});
  }, [listingId]);

  async function generateLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/share`, { method: "POST" });
      const data = await res.json();
      if (data.shareLink) { setShareLink(data.shareLink); setShareCode(data.shareCode); }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function copyLink() {
    if (!shareLink) return;
    try { await navigator.clipboard.writeText(shareLink); }
    catch {
      const input = document.createElement("input"); input.value = shareLink;
      document.body.appendChild(input); input.select(); document.execCommand("copy"); document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareNative() {
    if (!shareLink) return;
    if (navigator.share) {
      navigator.share({ title, text: `Check this out on HGF Marketplace! Use code ${shareCode} for a discount 🎁`, url: shareLink }).catch(() => {});
    } else { copyLink(); }
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

      {shareCode && (
        <div style={{ background: "white", border: "1.5px dashed #f87171", borderRadius: "10px", padding: "0.5rem 0.875rem", marginBottom: "0.625rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Coupon Code</p>
          <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#be123c", letterSpacing: "0.1em", fontFamily: "monospace" }}>{shareCode}</span>
        </div>
      )}

      {shareLink ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ background: "white", border: "1px solid #fecdd3", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.68rem", color: "#9f1239", wordBreak: "break-all", fontFamily: "monospace" }}>
            {shareLink}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={copyLink} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: "999px", padding: "0.45rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {copied ? "✅ Copied!" : "📋 Copy Link"}
            </button>
            <button onClick={shareNative} style={{ flex: 1, background: "white", color: "#be123c", border: "1.5px solid #f87171", borderRadius: "999px", padding: "0.45rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              📤 Share
            </button>
          </div>
        </div>
      ) : (
        <button onClick={generateLink} disabled={loading} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: "999px", padding: "0.45rem 1.25rem", fontSize: "0.8rem", fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: "inherit" }}>
          {loading ? "Generating…" : "🔗 Get My Share Link"}
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ListingDetailClient({ listing }: { listing: ListingData }) {
  const shareToken = listing.shareToken ?? undefined;
  const { containerRef, burst } = useConfetti();

  // localStorage key for this listing's reveal
  const localKey = `hgf_reveal_${listing.id}`;

  const logEvent = useCallback((event: string) => {
    fetch("/api/marketplace/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, shareCode: shareToken ?? null, event }),
    }).catch(() => {});
  }, [listing.id, shareToken]);

  const [modal, setModal] = useState<"reveal" | "contact" | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<RevealedState | null>(null);

  // Load persisted reveal from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) setRevealed(JSON.parse(stored) as RevealedState);
    } catch { /* ignore */ }
  }, [localKey]);

  const sellerName = `${listing.seller.firstName} ${listing.seller.lastName}`;
  const sellerInitials = `${listing.seller.firstName[0]}${listing.seller.lastName?.[0] ?? ""}`;

  function openModal(type: "reveal" | "contact") {
    setModal(type); setError("");
    logEvent(type === "reveal" ? "reveal_click" : "contact_click");
  }
  function closeModal() { setModal(null); setError(""); }

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { setError("Full name is required"); return; }
    if (modal === "contact" && !mobile.trim()) { setError("Mobile number is required"); return; }
    if (modal === "contact" && !consented) { setError("Please agree to be contacted"); return; }

    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/marketplace/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id, actionType: modal,
          shareToken: shareToken ?? null,
          prospectName: name, prospectMobile: mobile || null, prospectEmail: email || null, consented,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");

      const revealData: RevealedState = {
        discountedPrice: data.discountedPrice ?? (listing.ogPrice ?? 0),
        ogPrice: data.ogPrice,
        sellerName: data.sellerName ?? sellerName,
        actionType: modal as "reveal" | "contact",
        couponCode: data.couponCode ?? null,
      };

      // Persist to localStorage forever
      try { localStorage.setItem(localKey, JSON.stringify(revealData)); } catch { /* ignore */ }
      setRevealed(revealData);
      setModal(null);

      // 🎉 Confetti burst!
      setTimeout(() => burst(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { setSubmitting(false); }
  }, [modal, name, mobile, email, consented, listing.id, listing.ogPrice, shareToken, sellerName, localKey, burst]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", background: "#f8fafc", minHeight: "100vh", position: "relative" }}>
      {/* Confetti container — positioned fixed so it overlays the screen */}
      <div
        ref={containerRef}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}
      />

      {/* Back nav */}
      <div style={{ padding: "0.75rem 1rem", background: "white", borderBottom: "1px solid #f1f5f9" }}>
        <Link href="/marketplace" style={{ color: PRIMARY, textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" }}>
          ← Marketplace
        </Link>
      </div>

      {/* Photo Carousel — swipeable on mobile, arrows + dot indicators */}
      <div style={{ position: "relative" }}>
        <PhotoCarousel photos={listing.photos} title={listing.title} />
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
              {listing.hasDiscount && !revealed && (
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

          {/* ── Coupon Reveal Card (shown after submit OR restored from localStorage) */}
          {revealed && (
            <CouponRevealCard
              revealed={revealed}
              sellerName={revealed.sellerName}
              loveGiftAmount={listing.loveGiftAmount}
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

        {/* ── GATED CTAs — hidden once revealed. hasDiscount=false: only show Contact */}
        {!revealed && (
          <div style={{ background: "white", borderRadius: "16px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 2px 12px rgba(78,177,203,0.12)", border: "1.5px solid #bae6fd" }}>
            <p style={{ fontSize: "0.8rem", color: "#0369a1", textAlign: "center", margin: "0 0 1rem", lineHeight: 1.5 }}>
              {listing.hasDiscount
                ? "🔒 A discounted price is available. Reveal it to see your discount code — show the code to the seller at purchase to claim your discount!"
                : listing.ogPrice
                  ? "Interested? Contact the seller to discuss pricing or arrange a purchase."
                  : "Interested? Contact the seller to get more information about this listing."}
            </p>
            {/* Only show Reveal button if hasDiscount is true */}
            {listing.hasDiscount && (
              <button
                onClick={() => openModal("reveal")}
                style={{ display: "block", width: "100%", background: `linear-gradient(135deg, ${PRIMARY}, #2563eb)`, color: "white", border: "none", borderRadius: "999px", padding: "0.875rem", fontSize: "1rem", fontWeight: 700, cursor: "pointer", marginBottom: "0.625rem", fontFamily: "inherit", animation: "pulse-glow 2s infinite" }}
              >
                🎟️ Reveal Discount &amp; Get Code
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

        {/* ── Share & Bless Panel */}
        {listing.loveGiftAmount > 0 && listing.isLoggedIn && !listing.isOwner && (
          <SharePanel listingId={listing.id} loveGiftAmount={listing.loveGiftAmount} title={listing.title} />
        )}



        {/* Seller card */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "1rem", flexShrink: 0 }}>
            {sellerInitials}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{sellerName}</span>
              {listing.seller.isVerified && (
                <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "#0d9488", color: "white", borderRadius: "999px", padding: "0.1rem 0.45rem", display: "inline-flex", alignItems: "center", gap: 2 }}>
                  ✓ Verified
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>HGF Member · {listing.viewCount} views</div>
          </div>
          {listing.isOwner && (
            <Link href="/marketplace/my-listings" style={{ marginLeft: "auto", background: "#f1f5f9", color: "#64748b", borderRadius: "999px", padding: "0.35rem 0.875rem", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
              My Listings →
            </Link>
          )}
        </div>
      </div>

      {/* ── REVEAL DISCOUNT MODAL */}
      {modal === "reveal" && (
        <Modal onClose={closeModal}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.375rem" }}>🎟️ Reveal Discount Code</h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
            Enter your name to reveal the discounted price and receive your personal discount code. Show the code to the seller at purchase to claim your discount — and to credit the person who shared this with you!
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>Full Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Mobile (optional)</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09xxxxxxxxx" type="tel" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.375rem" }}>Email (optional)</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" style={inputStyle} />
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
              <input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} style={{ marginTop: "3px", flexShrink: 0 }} />
              <span style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>I agree to be contacted by the seller (recommended)</span>
            </label>
            {error && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
            <button
              onClick={handleSubmit} disabled={submitting || !name.trim()}
              style={{ padding: "0.875rem", background: (submitting || !name.trim()) ? "#94a3b8" : `linear-gradient(135deg, ${PRIMARY}, #2563eb)`, color: "white", border: "none", borderRadius: "999px", fontSize: "1rem", fontWeight: 700, cursor: (submitting || !name.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {submitting ? "Checking…" : "🎟️ Get My Discount Code"}
            </button>
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", lineHeight: 1.5, margin: 0 }}>
              Your contact is shared only with the seller. See our privacy policy.
            </p>
          </div>
        </Modal>
      )}

      {/* ── CONTACT MODAL */}
      {modal === "contact" && (
        <Modal onClose={closeModal}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.375rem" }}>💬 Contact the Seller</h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
            Provide your full name and mobile number so the seller can follow up.
            {listing.hasDiscount && " A discount code will also be revealed after submission."}
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
