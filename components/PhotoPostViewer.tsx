import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";


export interface PhotoEntry {
  id: number;
  type: string;
  fileName: string;
  thumbName: string | null;
  url: string;
  thumbUrl: string | null;
  postId: number | null;
  caption: string | null;
  createdAt: string;
}

interface Comment {
  id: number;
  content: string;
  author: { id: number; firstName: string; lastName: string; profilePicture?: string | null };
  createdAt: string;
}

interface Props {
  photos: PhotoEntry[];
  startIndex?: number;
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  isOwn: boolean;
  onClose: () => void;
  onChoosePhoto?: () => void;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

const PRIMARY = "#4EB1CB";

export default function PhotoPostViewer({
  photos, startIndex = 0, memberId, memberName, memberAvatar, isOwn, onClose, onChoosePhoto,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [idx, setIdx]                   = useState(Math.max(0, Math.min(startIndex, photos.length - 1)));
  const [imgErr, setImgErr]             = useState(false);
  const [reactions, setReactions]       = useState<any[]>([]);
  const [likeLoading, setLikeLoading]   = useState(false);
  const [activeReactionTab, setActiveReactionTab] = useState<string>("ALL");
  const [showReactions, setShowReactions] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);

  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const touchTimer = useRef<NodeJS.Timeout | null>(null);
  const touchHappened = useRef(false);

  const myReaction = session ? reactions.find((r: any) => r.memberId === parseInt(session.user.id)) : null;
  const liked = !!myReaction;
  const likedType = myReaction ? myReaction.type : null;
  const likeCount = reactions.length;

  const REACTION_EMOJIS: Record<string, string> = {
    HEART: "❤️",
    PRAY: "🙏",
    HUG: "🤗",
  };

  const [comments, setComments]         = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText]   = useState("");
  const [sending, setSending]           = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft]     = useState("");
  const [captionSaving, setCaptionSaving]   = useState(false);
  const [savedCaptions, setSavedCaptions]     = useState<Record<number, string | null>>({});
  const [savedHistoryIds, setSavedHistoryIds] = useState<Record<number, number>>({});

  // Zoom state
  const [scale, setScale]             = useState(1);
  const [panX, setPanX]               = useState(0);
  const [panY, setPanY]               = useState(0);
  const lastTap                       = useRef(0);
  const pinchDist                     = useRef<number | null>(null);
  const panStart                      = useRef<{ x: number; y: number } | null>(null);
  const currentScale                  = useRef(1);

  // Swipe
  const touchX = useRef<number | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const photo    = photos[idx];
  const postId   = photo?.postId ?? null;
  const caption  = idx in savedCaptions ? savedCaptions[idx] : photo?.caption ?? null;
  const histId   = savedHistoryIds[idx] ?? (photo?.id && photo.id > 0 ? photo.id : null);

  const prev = useCallback(() => { setIdx(i => Math.max(0, i - 1)); }, []);
  const next = useCallback(() => { setIdx(i => Math.min(photos.length - 1, i + 1)); }, [photos.length]);

  // Reset all state on photo change
  useEffect(() => {
    setImgErr(false);
    setReactions([]);
    setComments([]);
    setCaptionDraft(idx in savedCaptions ? (savedCaptions[idx] ?? "") : (photo?.caption ?? ""));
    setEditingCaption(false);
    setScale(1); setPanX(0); setPanY(0);
    currentScale.current = 1;

    if (!postId) return;

    fetch(`/api/posts/${postId}/reactions`)
      .then(r => r.ok ? r.json() : [])
      .then(list => setReactions(list))
      .catch(() => {});

    setCommentsLoading(true);
    fetch(`/api/posts/${postId}/comments`)
      .then(r => r.json())
      .then(d => setComments(Array.isArray(d) ? d : d.comments ?? []))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [idx, postId, photo?.caption]);

  // Keyboard nav
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function handleReactionSelect(type: string) {
    if (!postId || !session || likeLoading) return;
    setLikeLoading(true);

    const memberId = parseInt(session.user.id);
    const existing = reactions.find((r: any) => r.memberId === memberId);

    // Optimistic UI update
    let newReactions = [...reactions];
    if (existing) {
      if (existing.type === type) {
        newReactions = newReactions.filter((r: any) => r.memberId !== memberId);
      } else {
        newReactions = newReactions.map((r: any) =>
          r.memberId === memberId ? { ...r, type } : r
        );
      }
    } else {
      newReactions.push({
        memberId,
        type,
        member: {
          id: memberId,
          firstName: (session.user as any).firstName || "",
          lastName: (session.user as any).lastName || "",
          profilePicture: (session.user as any).profilePicture || null,
        }
      });
    }

    const prevReactions = reactions;
    setReactions(newReactions);
    setShowReactions(false);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        setReactions(prevReactions);
      }
    } catch {
      setReactions(prevReactions);
    } finally {
      setLikeLoading(false);
    }
  }

  const toggleLike = () => {
    if (liked) {
      handleReactionSelect(likedType || "HEART");
    } else {
      handleReactionSelect("HEART");
    }
  };

  const handleMouseEnter = () => {
    if (touchHappened.current) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setShowReactions(true);
    }, 450);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setShowReactions(false);
    }, 300);
  };

  const handleTouchStart = () => {
    touchHappened.current = true;
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => {
      setShowReactions(true);
      if (navigator.vibrate) navigator.vibrate(12);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
      touchTimer.current = null;
      if (!showReactions) {
        toggleLike();
      }
    }
  };

  const handleLikeClick = () => {
    if (touchHappened.current) return;
    toggleLike();
  };

  async function handleComment() {
    if (!postId || !commentText.trim() || sending) return;
    setSending(true);
    try {
      const res  = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const data = await res.json();
      if (data.comment) setComments(c => [data.comment, ...c]);
      setCommentText("");
    } catch { /* silent */ } finally { setSending(false); }
  }

  async function handleSaveCaption() {
    if (captionSaving) return;
    setCaptionSaving(true);
    try {
      const res = await fetch(`/api/members/${memberId}/photo-history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          historyId: histId ?? -1,
          caption: captionDraft.trim() || null,
          type: photo?.type ?? "profile",
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setSavedCaptions(prev => ({ ...prev, [idx]: captionDraft.trim() || null }));
        setEditingCaption(false);
        // Remember the new real historyId if server created one
        if (d.historyId && d.historyId > 0) setSavedHistoryIds(prev => ({ ...prev, [idx]: d.historyId }));
      }
    } catch { /* silent */ } finally { setCaptionSaving(false); }
  }

  // ── Pinch & double-tap zoom ────────────────────────────────────────────────
  function resetZoom() { setScale(1); setPanX(0); setPanY(0); currentScale.current = 1; }

  function onImgTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1) {
      // Double-tap detection
      const now = Date.now();
      if (now - lastTap.current < 280) {
        // double-tap
        if (currentScale.current > 1) { resetZoom(); }
        else { currentScale.current = 2.5; setScale(2.5); }
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      if (currentScale.current > 1) {
        panStart.current = { x: e.touches[0].clientX - panX, y: e.touches[0].clientY - panY };
      } else {
        // Swipe for nav
        touchX.current = e.touches[0].clientX;
      }
    }
  }

  function onImgTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchDist.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchDist.current;
      const newScale = Math.min(5, Math.max(1, currentScale.current * ratio));
      setScale(newScale);
      pinchDist.current = dist;
      currentScale.current = newScale;
      e.preventDefault();
    } else if (e.touches.length === 1 && currentScale.current > 1 && panStart.current) {
      setPanX(e.touches[0].clientX - panStart.current.x);
      setPanY(e.touches[0].clientY - panStart.current.y);
      e.preventDefault();
    }
  }

  function onImgTouchEnd(e: React.TouchEvent) {
    if (e.changedTouches.length === 1 && pinchDist.current === null && currentScale.current <= 1) {
      const endX = e.changedTouches[0].clientX;
      if (touchX.current !== null) {
        const diff = touchX.current - endX;
        if (diff > 50) next();
        else if (diff < -50) prev();
        touchX.current = null;
      }
    }
    if (e.touches.length < 2) pinchDist.current = null;
    if (e.touches.length === 0) panStart.current = null;
  }

  const showSocial = !!postId;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", flexDirection: "column",
      background: "#000",
      // Safe area: handled per-section
    }}>

      {/* ── Top bar (close + counter) — respects safe-area-inset-top ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.75rem 1rem",
        paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        flexShrink: 0,
        zIndex: 1,
      }}>
        <button onClick={onClose} style={{
          width: 38, height: 38, borderRadius: "50%", border: "none",
          background: "rgba(255,255,255,0.15)", color: "white",
          fontSize: "1.25rem", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>

        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", fontWeight: 600 }}>
          {photos.length > 1 ? `${idx + 1} / ${photos.length}` : "Profile Photo"}
        </span>

        {isOwn && onChoosePhoto ? (
          <button onClick={onChoosePhoto} style={{
            padding: "0.35rem 0.85rem", borderRadius: "999px", border: "none",
            background: PRIMARY, color: "white", fontSize: "0.75rem",
            fontWeight: 700, cursor: "pointer",
          }}>📷 Change</button>
        ) : <div style={{ width: 38 }} />}
      </div>

      {/* ── Photo area ───────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", position: "relative",
      }}
        onTouchStart={onImgTouchStart}
        onTouchMove={onImgTouchMove}
        onTouchEnd={onImgTouchEnd}
      >
        {!imgErr ? (
          <img
            src={photo?.url}
            alt="Profile photo"
            draggable={false}
            onError={() => setImgErr(true)}
            style={{
              maxWidth: "100%", maxHeight: "100%",
              objectFit: "contain",
              transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`,
              transition: pinchDist.current !== null ? "none" : "transform 0.15s",
              touchAction: "none",
              userSelect: "none",
              cursor: scale > 1 ? "grab" : "default",
            }}
          />
        ) : (
          <div style={{ color: "#666", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🖼️</div>
            <p style={{ fontSize: "0.85rem" }}>Image unavailable</p>
          </div>
        )}

        {/* Nav arrows */}
        {idx > 0 && scale <= 1 && (
          <button onClick={prev} style={{ position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", color: "white", fontSize: "1.3rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        )}
        {idx < photos.length - 1 && scale <= 1 && (
          <button onClick={next} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", color: "white", fontSize: "1.3rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        )}

        {/* Zoom reset hint */}
        {scale > 1 && (
          <button onClick={resetZoom} style={{ position: "absolute", bottom: "0.75rem", left: "50%", transform: "translateX(-50%)", padding: "0.3rem 0.85rem", borderRadius: "999px", background: "rgba(0,0,0,0.55)", border: "none", color: "white", fontSize: "0.72rem", cursor: "pointer" }}>
            Tap to reset zoom
          </button>
        )}

        {/* Dot indicators */}
        {photos.length > 1 && scale <= 1 && (
          <div style={{ position: "absolute", bottom: "0.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.3rem" }}>
            {photos.map((_, i) => (
              <div key={i} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 999, background: i === idx ? "white" : "rgba(255,255,255,0.35)", transition: "all 0.2s" }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Info card: author + caption + social (white panel) ── */}
      <div style={{
        background: "white",
        borderRadius: "20px 20px 0 0",
        flexShrink: 0,
        maxHeight: "48%",
        overflowY: "auto",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1rem 0.5rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", background: `${PRIMARY}20`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {memberAvatar
              ? <img src={memberAvatar} alt={memberName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: "1rem", fontWeight: 900, color: PRIMARY }}>{memberName[0]}</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{memberName}</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", gap: "0.3rem", alignItems: "center" }}>
              {photo?.createdAt && <span>{fmtDate(photo.createdAt)}</span>}
              <span>·</span>
              <span title="Visible to members" style={{ color: PRIMARY }}>🌐</span>
              {idx === 0 && <span style={{ background: PRIMARY, color: "white", fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: "999px", marginLeft: "0.25rem" }}>Current</span>}
            </div>
          </div>
        </div>

        {/* Caption */}
        <div style={{ padding: "0.25rem 1rem 0.75rem" }}>
          {editingCaption ? (
            <div>
              <textarea
                ref={commentInputRef}
                value={captionDraft}
                onChange={e => setCaptionDraft(e.target.value)}
                placeholder="Add a caption…"
                rows={2}
                style={{ width: "100%", border: `1.5px solid ${PRIMARY}`, borderRadius: "10px", padding: "0.5rem 0.75rem", fontSize: "0.85rem", resize: "none", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                <button onClick={handleSaveCaption} disabled={captionSaving}
                  style={{ flex: 1, background: PRIMARY, color: "white", border: "none", borderRadius: "8px", padding: "0.45rem", fontWeight: 700, fontSize: "0.82rem", cursor: captionSaving ? "wait" : "pointer" }}>
                  {captionSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditingCaption(false)}
                  style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", padding: "0.45rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              {caption
                ? <p style={{ flex: 1, fontSize: "0.875rem", color: "#334155", lineHeight: 1.55, margin: 0 }}>{caption}</p>
                : isOwn && <p style={{ flex: 1, fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic", margin: 0 }}>Add a caption…</p>}
              {isOwn && (
                <button onClick={() => { setCaptionDraft(caption ?? ""); setEditingCaption(true); }}
                  style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: PRIMARY, fontSize: "0.72rem", fontWeight: 700, padding: "0.1rem 0.3rem" }}>
                  {caption ? "Edit" : "Add"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Social: likes + comments */}
        {showSocial ? (
          <div>
            {/* Reactions Summary row */}
            {likeCount > 0 && (() => {
              const distinctTypes = Array.from(new Set(reactions.map((r: any) => r.type || "HEART")));
              return (
                <div 
                  onClick={() => setShowReactionsModal(true)}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "flex-end",
                    gap: "8px", 
                    padding: "0.5rem 1rem 0.25rem", 
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {distinctTypes.map((type: any, i) => (
                      <div 
                        key={type} 
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          marginLeft: i > 0 ? "-6px" : "0",
                          zIndex: 3 - i,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          border: "1px solid #f1f5f9"
                        }}
                      >
                        {REACTION_EMOJIS[type] || "❤️"}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                    {likeCount}
                  </span>
                </div>
              );
            })()}

            {/* Like row */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderTop: "1px solid #f1f5f9", position: "relative" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                {showReactions && (
                  <div
                    onMouseEnter={() => {
                      if (hoverTimer.current) clearTimeout(hoverTimer.current);
                    }}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      left: "0",
                      background: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      borderRadius: "24px",
                      padding: "4px 8px",
                      display: "flex",
                      gap: "10px",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
                      border: "1px solid rgba(0, 0, 0, 0.05)",
                      zIndex: 31000,
                      transform: "translateY(-4px)",
                      animation: "popReactions 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards",
                    }}
                  >
                    {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => (
                      <button
                        key={key}
                        onClick={() => handleReactionSelect(key)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "1.45rem",
                          cursor: "pointer",
                          padding: "4px",
                          transition: "transform 0.1s ease",
                          borderRadius: "50%",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.35)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                <button 
                  onClick={handleLikeClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  disabled={likeLoading}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem",
                    border: `1.5px solid ${liked ? (likedType === "HEART" ? "#ef4444" : likedType === "PRAY" ? "#7c3aed" : "#f59e0b") : "#e2e8f0"}`,
                    borderRadius: "999px",
                    background: liked ? (likedType === "HEART" ? "#fff1f2" : likedType === "PRAY" ? "#f5f3ff" : "#fffbeb") : "white",
                    color: likedType === "HEART" ? "#ef4444" : likedType === "PRAY" ? "#7c3aed" : likedType === "HUG" ? "#f59e0b" : "#64748b",
                    fontWeight: 700, fontSize: "0.82rem",
                    cursor: likeLoading ? "wait" : "pointer",
                  }}
                >
                  {likedType === "HEART" ? "❤️" : likedType === "PRAY" ? "🙏" : likedType === "HUG" ? "🤗" : "🤍"}
                </button>
              </div>

              <button onClick={() => commentInputRef.current?.focus()}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "999px", background: "white", color: "#64748b", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                💬 {comments.length > 0 && comments.length}
              </button>
            </div>

            {/* Comments list */}
            {commentsLoading && <p style={{ padding: "0.5rem 1rem", fontSize: "0.8rem", color: "#94a3b8" }}>Loading comments…</p>}
            {comments.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: "flex", gap: "0.6rem", padding: "0.4rem 1rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${PRIMARY}20`, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {c.author.profilePicture
                    ? <img src={`/uploads/profile_pictures/${c.author.profilePicture}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: "0.7rem", fontWeight: 900, color: PRIMARY }}>{c.author.firstName[0]}</span>}
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "0.35rem 0.6rem", flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.72rem", color: "#1e293b" }}>{c.author.firstName} {c.author.lastName}</div>
                  <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "0.1rem" }}>{c.content}</div>
                </div>
              </div>
            ))}

            {/* Comment input */}
            <div style={{
              display: "flex", gap: "0.5rem", padding: "0.6rem 1rem",
              borderTop: "1px solid #f1f5f9",
              paddingBottom: "calc(0.6rem + env(safe-area-inset-bottom, 0px))",
            }}>
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                rows={1}
                style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: "10px", padding: "0.45rem 0.75rem", fontSize: "0.85rem", resize: "none", outline: "none", fontFamily: "inherit" }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              />
              <button onClick={handleComment} disabled={!commentText.trim() || sending}
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: commentText.trim() ? PRIMARY : "#e2e8f0", color: commentText.trim() ? "white" : "#94a3b8", fontSize: "1.1rem", cursor: commentText.trim() ? "pointer" : "default", flexShrink: 0 }}>
                ➤
              </button>
            </div>
          </div>
        ) : (
          <p style={{ padding: "0.75rem 1rem 1rem", color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic", textAlign: "center" }}>
            Likes and comments are not available for this photo.
          </p>
        )}
      </div>
      {/* Reactions Analytics Modal */}
      {showReactionsModal && (
        <>
          {/* Backdrop */}
          <div 
            onClick={() => setShowReactionsModal(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 30000,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)"
            }}
          />
          {/* Modal Container */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "480px",
              background: "white",
              borderRadius: "24px 24px 0 0",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.2)",
              zIndex: 30001,
              padding: "1rem 0 calc(1.5rem + env(safe-area-inset-bottom, 0px))",
              maxHeight: "75vh",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 999, margin: "0 auto 12px" }} />
            
            {/* Title / Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 1.25rem 0.5rem" }}>
              <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Reactions</span>
              <button 
                onClick={() => setShowReactionsModal(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {/* Reactions Tabs */}
            <div style={{ display: "flex", gap: "8px", padding: "0.5rem 1.25rem", borderBottom: "1px solid #f1f5f9", overflowX: "auto" }}>
              {["ALL", "HEART", "PRAY", "HUG"].map((tab) => {
                const count = tab === "ALL" ? reactions.length : reactions.filter(r => r.type === tab).length;
                if (count === 0 && tab !== "ALL") return null;
                const isActive = activeReactionTab === tab;
                const emoji = tab === "ALL" ? "👍" : REACTION_EMOJIS[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveReactionTab(tab)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: isActive ? `${PRIMARY}15` : "none",
                      border: "none",
                      borderRadius: "16px",
                      padding: "6px 12px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: isActive ? PRIMARY : "#64748b",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span>{emoji}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Reactors list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1.25rem" }}>
              {reactions
                .filter(r => activeReactionTab === "ALL" || r.type === activeReactionTab)
                .map((r: any) => {
                  const initials = `${r.member?.firstName?.[0] ?? ""}${r.member?.lastName?.[0] ?? ""}`.toUpperCase();
                  const fullName = `${r.member?.firstName ?? ""} ${r.member?.lastName ?? ""}`;
                  return (
                    <div 
                      key={r.memberId} 
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f8fafc" }}
                      onClick={() => {
                        setShowReactionsModal(false);
                        window.location.href = `/member/${r.memberId}`;
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${PRIMARY}20`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                          {r.member?.profilePicture ? (
                            <img src={`/uploads/profile_pictures/${r.member.profilePicture}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ color: PRIMARY, fontSize: "0.8rem", fontWeight: 700 }}>
                              {initials}
                            </span>
                          )}
                          <div style={{ position: "absolute", bottom: -2, right: -2, background: "white", borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
                            {REACTION_EMOJIS[r.type] || "❤️"}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>
                          {fullName}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes popReactions {
          0% { opacity: 0; transform: translateY(8px) scale(0.9); }
          100% { opacity: 1; transform: translateY(-4px) scale(1); }
        }
      `}</style>
    </div>
  );
}
