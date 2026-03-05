"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#4EB1CB";
const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", credited: "#10b981", expired: "#94a3b8" };

// ── Rotating Bible verses (diligence for sharers) ────────────────────────────
const SHARER_QUOTES = [
  { text: "Whatever you do, work at it with all your heart, as working for the Lord.", ref: "Colossians 3:23" },
  { text: "The soul of the diligent is richly supplied.", ref: "Proverbs 13:4" },
  { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest.", ref: "Galatians 6:9" },
  { text: "Each of you should use whatever gift you have received to serve others.", ref: "1 Peter 4:10" },
  { text: "Two are better than one, because they have a good return for their labor.", ref: "Ecclesiastes 4:9" },
  { text: "Give, and it will be given to you. A good measure, pressed down, shaken together.", ref: "Luke 6:38" },
];

interface Claim {
  id: number;
  amount: number;
  method: string | null;
  status: string;
  gcashName: string | null;
  gcashMobile: string | null;
  paidAt: string | null;
  receivedAt: string | null;
}

interface Share {
  id: number;
  shareCode: string;
  shareLink: string;
  loveGiftEarned: number;
  status: string;
  createdAt: string;
  listing: {
    id: number;
    title: string;
    listingType: string;
    ogPrice: number | null;
    loveGiftAmount: number;
    status: string;
    photo: string | null;
    sellerName: string;
    sellerPhone: string | null;
  };
  impressions: number;
  ctaClicks: number;
  prospectCount: number;
  claim: Claim | null;
  winner: { name: string; amount: number; status: string } | null;
  isWinner: boolean;
}

interface Wallet {
  totalEarned: number;
  pending: number;
  paid: number;
  confirmedSales: number;
}

// ── Quote Banner (diligence) ─────────────────────────────────────────────────
function QuoteBanner() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SHARER_QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);
  const q = SHARER_QUOTES[idx];
  return (
    <div style={{ background: "linear-gradient(135deg, #fef3c7, #fffbeb)", border: "1px solid #fde68a", borderRadius: "12px", padding: "0.625rem 1rem", margin: "0 0 1rem", textAlign: "center" }}>
      <p style={{ fontSize: "0.78rem", fontStyle: "italic", color: "#92400e", margin: 0, lineHeight: 1.5 }}>
        ✝️ &ldquo;{q.text}&rdquo;
      </p>
      <p style={{ fontSize: "0.65rem", color: "#a16207", margin: "0.25rem 0 0", fontWeight: 600 }}>— {q.ref}</p>
    </div>
  );
}

// ── Receipt Confirmation Modal ──────────────────────────────────────────────
function ReceiptModal({ claim, onClose, onDone }: {
  claim: Claim;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [thankYou, setThankYou] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/marketplace/love-gifts/${claim.id}/received`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thankYou: thankYou.trim() || null }),
      });
      const data = await res.json();
      if (data.ok) onDone(data.message);
      else alert(data.error ?? "Something went wrong");
    } catch { alert("Network error"); } finally { setSubmitting(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "white", borderTopLeftRadius: "20px", borderTopRightRadius: "20px", width: "100%", maxWidth: "500px", padding: "1.25rem", animation: "slideUp 0.25s ease" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 800 }}>✅ Confirm Receipt</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#64748b" }}>
          Confirming you received ₱{claim.amount.toLocaleString()}
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>Send a thank-you note to the seller (optional)</label>
          <textarea
            value={thankYou}
            onChange={(e) => setThankYou(e.target.value)}
            placeholder="e.g. Thank you so much for the blessing! God bless you! 🙏"
            rows={3}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "0.625rem 0.875rem", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" }}
          />
        </div>

        <button onClick={handleConfirm} disabled={submitting} style={{ width: "100%", padding: "0.75rem", background: submitting ? "#94a3b8" : "#10b981", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit" }}>
          {submitting ? "Confirming…" : "✅ Yes, I Received It!"}
        </button>
        <p style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", margin: "0.5rem 0 0" }}>
          A celebration post will be shared with the community 🎉
        </p>

        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: "0.5rem", padding: "0.5rem", background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ── Milestone Badges ─────────────────────────────────────────────────────────
function MilestoneBadges({ shares }: { shares: Share[] }) {
  const totalShares = shares.length;
  const totalProspects = shares.reduce((s, sh) => s + sh.prospectCount, 0);
  const totalEarned = shares.reduce((s, sh) => s + sh.loveGiftEarned, 0);
  const received = shares.filter((s) => s.claim?.status === "received").length;

  const badges = [
    { emoji: "🔗", label: "First Share", earned: totalShares >= 1 },
    { emoji: "👤", label: "First Prospect", earned: totalProspects >= 1 },
    { emoji: "❤️", label: "First Love Gift", earned: totalEarned > 0 },
    { emoji: "✅", label: "First Receipt", earned: received >= 1 },
    { emoji: "🔥", label: "5 Shares", earned: totalShares >= 5 },
    { emoji: "🌟", label: "10 Prospects", earned: totalProspects >= 10 },
    { emoji: "💎", label: "3 Love Gifts", earned: shares.filter((s) => s.loveGiftEarned > 0).length >= 3 },
  ];

  const earnedCount = badges.filter((b) => b.earned).length;
  if (earnedCount === 0) return null;

  return (
    <div style={{ background: "white", borderRadius: "14px", padding: "0.875rem", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "1rem" }}>
      <p style={{ margin: "0 0 0.5rem", fontWeight: 800, fontSize: "0.85rem", color: "#1e293b" }}>🏅 Your Badges ({earnedCount}/{badges.length})</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {badges.map((b) => (
          <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.2rem 0.5rem", borderRadius: "999px", background: b.earned ? "#fef3c7" : "#f1f5f9", border: b.earned ? "1px solid #fbbf24" : "1px solid #e2e8f0", opacity: b.earned ? 1 : 0.5 }}>
            <span style={{ fontSize: "0.85rem" }}>{b.emoji}</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: b.earned ? "#92400e" : "#94a3b8" }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Request Love Gift Modal ──────────────────────────────────────────────────
function ClaimModal({ claim, sellerName, sellerPhone, savedGCash, onClose, onDone }: {
  claim: Claim;
  sellerName: string; sellerPhone: string | null;
  savedGCash: { name: string | null; mobile: string | null };
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"contact" | "gcash">("gcash");
  const [gcashName, setGcashName] = useState(savedGCash.name ?? "");
  const [gcashMobile, setGcashMobile] = useState(savedGCash.mobile ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = tab === "gcash"
        ? { claimId: claim.id, method: "gcash", gcashName: gcashName.trim(), gcashMobile: gcashMobile.trim() }
        : { claimId: claim.id, method: "contact" };
      const res = await fetch("/api/marketplace/love-gifts/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        onDone(data.message);
      } else {
        alert(data.error ?? "Something went wrong");
      }
    } catch { alert("Network error"); } finally { setSubmitting(false); }
  }

  const validGCash = gcashName.trim() && /^09\d{9}$/.test(gcashMobile.trim());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
      <div style={{ position: "relative", background: "white", borderTopLeftRadius: "20px", borderTopRightRadius: "20px", width: "100%", maxWidth: "500px", maxHeight: "80vh", overflow: "auto", padding: "1.25rem", animation: "slideUp 0.25s ease" }}>
        <h2 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 800 }}>🎁 Request Love Gift</h2>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
          ₱{claim.amount.toLocaleString()} — choose how to collect
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}>
          <button onClick={() => setTab("gcash")} style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", border: tab === "gcash" ? "2px solid #0070e0" : "1.5px solid #e2e8f0", background: tab === "gcash" ? "#eff6ff" : "white", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 700, color: tab === "gcash" ? "#0070e0" : "#64748b" }}>
            💳 Send via GCash
          </button>
          <button onClick={() => setTab("contact")} style={{ flex: 1, padding: "0.5rem", borderRadius: "8px", border: tab === "contact" ? "2px solid #10b981" : "1.5px solid #e2e8f0", background: tab === "contact" ? "#f0fdf4" : "white", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem", fontWeight: 700, color: tab === "contact" ? "#10b981" : "#64748b" }}>
            📞 Contact Seller
          </button>
        </div>

        {tab === "gcash" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {savedGCash.name && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#166534" }}>
                ✅ Auto-filled from your saved GCash details
              </div>
            )}
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>GCash Account Name *</label>
              <input value={gcashName} onChange={(e) => setGcashName(e.target.value)} placeholder="e.g. Karen R." style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "0.625rem 0.875rem", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.375rem" }}>GCash Mobile Number *</label>
              <input value={gcashMobile} onChange={(e) => setGcashMobile(e.target.value)} placeholder="09xxxxxxxxx" type="tel" maxLength={11} style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "0.625rem 0.875rem", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              {gcashMobile && !/^09\d{9}$/.test(gcashMobile) && (
                <p style={{ fontSize: "0.7rem", color: "#ef4444", margin: "0.25rem 0 0" }}>Must be 11 digits starting with 09</p>
              )}
            </div>
            <button onClick={handleSubmit} disabled={submitting || !validGCash} style={{ padding: "0.75rem", background: submitting || !validGCash ? "#94a3b8" : "#0070e0", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit" }}>
              {submitting ? "Sending…" : "💳 Send GCash Request"}
            </button>
            <p style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", margin: 0 }}>
              Your GCash details will be saved for future claims
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "1rem", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>Seller Contact</p>
              <p style={{ fontSize: "0.95rem", fontWeight: 800, color: PRIMARY, margin: 0 }}>{sellerName}</p>
              {sellerPhone && (
                <a href={`tel:${sellerPhone}`} style={{ display: "inline-block", marginTop: "0.5rem", background: "#10b981", color: "white", borderRadius: "999px", padding: "0.375rem 1rem", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
                  📱 Call {sellerPhone}
                </a>
              )}
              {!sellerPhone && (
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0.375rem 0 0" }}>No phone on file — message them through the app</p>
              )}
            </div>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: "0.75rem", background: submitting ? "#94a3b8" : "#10b981", color: "white", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 800, cursor: submitting ? "wait" : "pointer", fontFamily: "inherit" }}>
              {submitting ? "Noting…" : "📞 I'll Contact the Seller"}
            </button>
          </div>
        )}

        <button onClick={onClose} style={{ display: "block", width: "100%", marginTop: "0.75rem", padding: "0.5rem", background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MySharesPage() {
  const router = useRouter();
  const [shares, setShares] = useState<Share[]>([]);
  const [wallet, setWallet] = useState<Wallet>({ totalEarned: 0, pending: 0, paid: 0, confirmedSales: 0 });
  const [savedGCash, setSavedGCash] = useState<{ name: string | null; mobile: string | null }>({ name: null, mobile: null });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [claimTarget, setClaimTarget] = useState<Share | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Share | null>(null);
  const [flashMsg, setFlashMsg] = useState("");

  useEffect(() => {
    fetch("/api/marketplace/shares/mine")
      .then((r) => r.json())
      .then((d) => {
        setShares(d.shares ?? []);
        setWallet(d.wallet ?? { totalEarned: 0, pending: 0, paid: 0, confirmedSales: 0 });
        setSavedGCash(d.savedGCash ?? { name: null, mobile: null });
      })
      .catch((err) => console.error("Failed to load my shares:", err))
      .finally(() => setLoading(false));
  }, []);

  async function copyLink(link: string, code: string) {
    try { await navigator.clipboard.writeText(link); }
    catch {
      const el = document.createElement("input"); el.value = link;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(code);
    setTimeout(() => setCopied(null), 2500);
  }

  function handleClaimDone(msg: string) {
    setClaimTarget(null);
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(""), 5000);
    // Refresh data
    fetch("/api/marketplace/shares/mine")
      .then((r) => r.json())
      .then((d) => {
        setShares(d.shares ?? []);
        setWallet(d.wallet ?? wallet);
        setSavedGCash(d.savedGCash ?? savedGCash);
      })
      .catch((err) => console.error("Failed to refresh shares after claim:", err));
  }

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Header + Wallet */}
      <div style={{ background: "linear-gradient(135deg, #be123c 0%, #ef4444 100%)", padding: "1rem", color: "white" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "1rem", cursor: "pointer", marginBottom: "0.375rem" }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>❤️ My Share Links</h1>
        <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.75rem", opacity: 0.85 }}>Track your shared listings and Love Gift earnings</p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.5rem 0.75rem", flex: 1, minWidth: "80px" }}>
            <p style={{ margin: 0, fontSize: "0.6rem", opacity: 0.85 }}>Total Earned</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem" }}>₱{wallet.totalEarned.toLocaleString()}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.5rem 0.75rem", flex: 1, minWidth: "80px" }}>
            <p style={{ margin: 0, fontSize: "0.6rem", opacity: 0.85 }}>Pending</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem" }}>₱{wallet.pending.toLocaleString()}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.5rem 0.75rem", flex: 1, minWidth: "80px" }}>
            <p style={{ margin: 0, fontSize: "0.6rem", opacity: 0.85 }}>Received</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem" }}>₱{wallet.paid.toLocaleString()}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "10px", padding: "0.5rem 0.75rem", flex: 1, minWidth: "80px" }}>
            <p style={{ margin: 0, fontSize: "0.6rem", opacity: 0.85 }}>Sales</p>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "1.1rem" }}>{wallet.confirmedSales}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        <QuoteBanner />
        <MilestoneBadges shares={shares} />

        {flashMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
            ✅ {flashMsg}
          </div>
        )}

        {loading && <p style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>Loading…</p>}

        {!loading && shares.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🔗</div>
            <p style={{ fontWeight: 600, color: "#64748b" }}>No shares yet</p>
            <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Browse StewardShop and tap &ldquo;Get My Share Link&rdquo; on listings you&apos;d like to promote!</p>
            <Link href="/stewardshop" style={{ background: "#ef4444", color: "white", borderRadius: "999px", padding: "0.625rem 1.5rem", textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}>
              Browse StewardShop
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {shares.map((share) => {
            const isSold = share.listing.status === "sold";
            return (
              <div key={share.id} style={{ background: "white", borderRadius: "14px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", opacity: isSold ? 0.85 : 1 }}>
                {/* Listing row */}
                <div style={{ display: "flex", gap: "0.875rem", padding: "0.875rem" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "8px", background: "#f1f5f9", flexShrink: 0, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                    {share.listing.photo ? (
                      <img src={`/uploads/marketplace/${share.listing.photo}`} alt={share.listing.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: isSold ? "grayscale(100%)" : "none" }} />
                    ) : "📦"}
                    {isSold && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(99,102,241,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: "0.5rem", fontWeight: 900, letterSpacing: "0.1em" }}>SOLD</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <p style={{ fontWeight: 700, fontSize: "0.875rem", color: isSold ? "#94a3b8" : "#1e293b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{share.listing.title}</p>
                      <span style={{ background: STATUS_COLORS[share.status] + "20", color: STATUS_COLORS[share.status], fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", flexShrink: 0 }}>
                        {share.status === "credited" ? "✅ Won" : share.status === "pending" ? "⏳ Active" : share.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", color: "#94a3b8", margin: "0.25rem 0" }}>
                      <span>👁 {share.impressions}</span>
                      <span>🖱️ {share.ctaClicks}</span>
                      <span>👤 {share.prospectCount}</span>
                    </div>
                    {/* Love gift earned / potential */}
                    {share.loveGiftEarned > 0 ? (
                      <span style={{ background: "#f0fdf4", color: "#166534", fontSize: "0.75rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                        ❤️ Earned ₱{share.loveGiftEarned.toLocaleString()}
                      </span>
                    ) : share.listing.loveGiftAmount > 0 && !isSold ? (
                      <span style={{ fontSize: "0.72rem", color: "#9f1239" }}>
                        ❤️ Potential: ₱{share.listing.loveGiftAmount.toLocaleString()} per sale
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* ── Winner banner / Claim button / Other-sharer info ──────────── */}
                {isSold && (
                  <div style={{ borderTop: "1px solid #f1f5f9" }}>
                    {share.isWinner && share.claim ? (
                      // Winner: show claim status
                      <div style={{ padding: "0.625rem 0.875rem", background: share.claim.status === "pending" ? "#fff7ed" : share.claim.status === "paid" ? "#f0fdf4" : "#f8fafc" }}>
                        {share.claim.status === "pending" && !share.claim.method ? (
                          // Not yet claimed — show claim button
                          <button onClick={() => setClaimTarget(share)} style={{ width: "100%", padding: "0.625rem", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white", border: "none", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                            🎁 Request Love Gift — ₱{share.claim.amount.toLocaleString()}
                          </button>
                        ) : share.claim.status === "pending" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.25rem" }}>⏳</span>
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", color: "#92400e" }}>
                                Claim sent ({share.claim.method === "gcash" ? "GCash" : "Contact"}) — waiting for seller
                              </p>
                              <p style={{ margin: "0.15rem 0 0", fontSize: "0.7rem", color: "#a16207" }}>
                                ₱{share.claim.amount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ) : share.claim.status === "paid" ? (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                              <span style={{ fontSize: "1.25rem" }}>💸</span>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", color: "#166534" }}>
                                  Seller marked as paid! ₱{share.claim.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => setReceiptTarget(share)} style={{ width: "100%", padding: "0.5rem", background: "#10b981", color: "white", border: "none", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                              ✅ Confirm Receipt
                            </button>
                          </div>
                        ) : share.claim.status === "received" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.25rem" }}>✅</span>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", color: "#166534" }}>
                              Received ₱{share.claim.amount.toLocaleString()} — Thank you!
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : share.winner ? (
                      // Other sharers: show who won
                      <div style={{ padding: "0.625rem 0.875rem", background: "#faf5ff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "1.25rem" }}>🏆</span>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.8rem", color: "#7c3aed" }}>
                              {share.winner.name} won ₱{share.winner.amount.toLocaleString()}
                            </p>
                            <p style={{ margin: "0.15rem 0 0", fontSize: "0.68rem", color: "#8b5cf6" }}>
                              Listing sold — keep sharing others!
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Sold without referral
                      <div style={{ padding: "0.625rem 0.875rem", background: "#f8fafc" }}>
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>
                          🏷️ Sold without referral
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Share link + copy (only for active listings) */}
                {!isSold && (
                  <div style={{ borderTop: "1px solid #f1f5f9", padding: "0.625rem 0.875rem", background: "#f8fafc" }}>
                    <p style={{ fontSize: "0.65rem", color: "#94a3b8", margin: "0 0 0.375rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                      {share.shareLink}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => copyLink(share.shareLink, share.shareCode)}
                        style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: "999px", padding: "0.375rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {copied === share.shareCode ? "✅ Copied!" : "📋 Copy Link"}
                      </button>
                      <Link href={`/stewardshop/${share.listing.id}`} style={{ flex: 1, textAlign: "center", background: "white", color: PRIMARY, border: `1.5px solid ${PRIMARY}`, borderRadius: "999px", padding: "0.375rem", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none" }}>
                        View Listing
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim Modal */}
      {claimTarget && claimTarget.claim && (
        <ClaimModal
          claim={claimTarget.claim}
          sellerName={claimTarget.listing.sellerName}
          sellerPhone={claimTarget.listing.sellerPhone}
          savedGCash={savedGCash}
          onClose={() => setClaimTarget(null)}
          onDone={handleClaimDone}
        />
      )}

      {/* Receipt Modal */}
      {receiptTarget && receiptTarget.claim && (
        <ReceiptModal
          claim={receiptTarget.claim}
          onClose={() => setReceiptTarget(null)}
          onDone={handleClaimDone}
        />
      )}
    </div>
  );
}
