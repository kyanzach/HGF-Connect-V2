"use client";
/**
 * PhotoPostViewer — Facebook-style full-screen profile/cover photo viewer.
 * Shows the photo, author metadata, caption, likes, comments, and navigation.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

export interface PhotoEntry {
  id: number;          // history row id
  type: "profile" | "cover";
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
  createdAt: string;
  author: { id: number; firstName: string; lastName: string; profilePicture?: string | null; username?: string | null };
}

interface Props {
  photos: PhotoEntry[];
  startIndex?: number;
  memberId: number;
  memberName: string;
  memberAvatar: string | null;
  isOwn: boolean;
  onClose: () => void;
  onChoosePhoto?: () => void;      // triggers file input from parent
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return fmtDate(d);
}

export default function PhotoPostViewer({
  photos, startIndex = 0, memberId, memberName, memberAvatar, isOwn, onClose, onChoosePhoto,
}: Props) {
  const [idx, setIdx]           = useState(Math.max(0, Math.min(startIndex, photos.length - 1)));
  const [imgErr, setImgErr]     = useState(false);
  const [likeCount, setLikeCount]   = useState(0);
  const [liked, setLiked]           = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments]     = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending]       = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft]     = useState("");
  const [captionSaving, setCaptionSaving]   = useState(false);
  const [localCaption, setLocalCaption]     = useState<string | null>(null);
  const touchX = useRef<number | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const photo = photos[idx];
  const postId = photo?.postId ?? null;
  const caption = localCaption !== null ? localCaption : photo?.caption ?? null;

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(photos.length - 1, i + 1)), [photos.length]);

  // Reset state on photo change
  useEffect(() => {
    setImgErr(false);
    setLikeCount(0);
    setLiked(false);
    setComments([]);
    setLocalCaption(null);
    setCaptionDraft(photo?.caption ?? "");
    setEditingCaption(false);

    if (!postId) return;

    // Load likes count
    fetch(`/api/posts/${postId}/count`)
      .then(r => r.json())
      .then(d => { setLikeCount(d.likes ?? 0); setLiked(d.isLiked ?? false); })
      .catch(() => {});

    // Load comments
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
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next, onClose]);

  async function handleLike() {
    if (!postId || likeLoading) return;
    setLikeLoading(true);
    try {
      const r = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const d = await r.json();
      setLiked(d.liked);
      setLikeCount(c => d.liked ? c + 1 : Math.max(0, c - 1));
    } catch { /* silent */ }
    finally { setLikeLoading(false); }
  }

  async function handleComment() {
    if (!postId || !commentText.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const d = await r.json();
      if (d.id) {
        setComments(prev => [d, ...prev]);
        setCommentText("");
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function saveCaption() {
    if (!photo) return;
    setCaptionSaving(true);
    try {
      await fetch(`/api/members/${memberId}/photo-history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId: photo.id, caption: captionDraft.trim() || null }),
      });
      setLocalCaption(captionDraft.trim() || null);
      setEditingCaption(false);
    } catch { /* silent */ }
    finally { setCaptionSaving(false); }
  }

  const S: React.CSSProperties = {};

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000",
        display: "flex", flexDirection: "column", overflowY: "auto" }}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (!touchX.current) return;
        const d = touchX.current - e.changedTouches[0].clientX;
        if (d > 50) next(); if (d < -50) prev();
        touchX.current = null;
      }}
    >
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", position: "sticky", top: 0, zIndex: 2, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none",
          color: "white", borderRadius: "50%", width: 36, height: 36, fontSize: "1.1rem", cursor: "pointer" }}>✕</button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>
          {photos.length > 1 ? `${idx + 1} / ${photos.length}` : "Profile photo"}
        </span>
        <div style={{ width: 36 }} />{/* spacer */}
      </div>

      {/* ── Photo ── */}
      <div style={{ background: "#111", display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "45vw", maxHeight: "60vh", position: "relative", overflow: "hidden" }}>
        {/* arrows */}
        {idx > 0 && (
          <button onClick={prev} style={{ position: "absolute", left: 8, zIndex: 3, background: "rgba(255,255,255,0.18)",
            border: "none", color: "white", borderRadius: "50%", width: 44, height: 44, fontSize: "1.4rem", cursor: "pointer" }}>‹</button>
        )}
        {idx < photos.length - 1 && (
          <button onClick={next} style={{ position: "absolute", right: 8, zIndex: 3, background: "rgba(255,255,255,0.18)",
            border: "none", color: "white", borderRadius: "50%", width: 44, height: 44, fontSize: "1.4rem", cursor: "pointer" }}>›</button>
        )}

        {imgErr ? (
          <div style={{ color: "#6b7280", textAlign: "center", padding: "3rem", fontSize: "0.9rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🖼️</div>
            Photo unavailable
          </div>
        ) : (
          <img
            src={photo?.url ?? ""}
            alt="Photo"
            onError={() => setImgErr(true)}
            style={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain", display: "block" }}
          />
        )}
      </div>

      {/* ── Card below photo ── */}
      <div style={{ background: "white", flex: 1, borderRadius: "20px 20px 0 0", marginTop: -8,
        paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>

        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1rem 0.5rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden",
            background: `${PRIMARY}20`, flexShrink: 0, border: `2px solid ${PRIMARY}` }}>
            {memberAvatar ? (
              <img src={memberAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                justifyContent: "center", color: PRIMARY, fontWeight: 800, fontSize: "1rem" }}>
                {memberName[0]}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{memberName}</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              {photo ? fmtDate(photo.createdAt) : ""} · 🌐
            </div>
          </div>
          {isOwn && onChoosePhoto && (
            <button onClick={onChoosePhoto}
              style={{ marginLeft: "auto", background: `${PRIMARY}15`, border: "none", color: PRIMARY,
                borderRadius: "999px", padding: "0.4rem 0.9rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
              📷 Change
            </button>
          )}
        </div>

        {/* Caption */}
        <div style={{ padding: "0.25rem 1rem 0.75rem" }}>
          {editingCaption ? (
            <div>
              <textarea
                value={captionDraft}
                onChange={e => setCaptionDraft(e.target.value)}
                placeholder="Write a caption…"
                rows={3}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "0.625rem",
                  fontSize: "0.875rem", resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.375rem" }}>
                <button onClick={saveCaption} disabled={captionSaving}
                  style={{ background: PRIMARY, color: "white", border: "none", borderRadius: 8,
                    padding: "0.45rem 1rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                  {captionSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditingCaption(false)}
                  style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8,
                    padding: "0.45rem 1rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
              {caption ? (
                <p style={{ fontSize: "0.9rem", color: "#1e293b", margin: 0, lineHeight: 1.55, flex: 1 }}>{caption}</p>
              ) : isOwn ? (
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0, flex: 1, fontStyle: "italic" }}>Add a caption…</p>
              ) : null}
              {isOwn && (
                <button onClick={() => { setCaptionDraft(caption ?? ""); setEditingCaption(true); }}
                  style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6,
                    padding: "0.3rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                  Edit
                </button>
              )}
            </div>
          )}
        </div>

        {/* Likes / Actions / Comments — only if linked to a Post */}
        {postId ? (
          <>
            {/* Reaction count */}
            {likeCount > 0 && (
              <div style={{ padding: "0 1rem 0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                ❤️ {likeCount} {likeCount === 1 ? "person" : "people"}
              </div>
            )}

            {/* Action bar */}
            <div style={{ display: "flex", borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
              <button onClick={handleLike} disabled={likeLoading}
                style={{ flex: 1, padding: "0.625rem", background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.825rem", fontWeight: liked ? 800 : 600, color: liked ? PRIMARY : "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
                {liked ? "❤️" : "🤍"} Like
              </button>
              <button onClick={() => commentInputRef.current?.focus()}
                style={{ flex: 1, padding: "0.625rem", background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.825rem", fontWeight: 600, color: "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem" }}>
                💬 Comment
              </button>
            </div>

            {/* Comments */}
            <div style={{ padding: "0.75rem 1rem 0" }}>
              {commentsLoading ? (
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", padding: "0.5rem" }}>Loading…</div>
              ) : comments.length > 0 ? (
                comments.map(c => (
                  <div key={c.id} style={{ display: "flex", gap: "0.625rem", marginBottom: "0.625rem" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden",
                      background: `${PRIMARY}20`, flexShrink: 0 }}>
                      {c.author.profilePicture ? (
                        <img src={`/uploads/profile_pictures/${c.author.profilePicture}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                          justifyContent: "center", color: PRIMARY, fontWeight: 700, fontSize: "0.75rem" }}>
                          {c.author.firstName[0]}
                        </div>
                      )}
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: "12px 12px 12px 4px", padding: "0.5rem 0.75rem", flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#0f172a" }}>
                        {c.author.firstName} {c.author.lastName}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#1e293b", marginTop: "0.125rem" }}>{c.content}</div>
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.25rem" }}>{timeAgo(c.createdAt)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", margin: "0.5rem 0" }}>
                  No comments yet. Be the first!
                </p>
              )}
            </div>

            {/* Comment input */}
            <div style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1rem",
              borderTop: "1px solid #f1f5f9", alignItems: "flex-end", position: "sticky", bottom: 0,
              background: "white" }}>
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                placeholder="Write a comment…"
                rows={1}
                style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "0.5rem 0.875rem",
                  fontSize: "0.875rem", resize: "none", outline: "none", fontFamily: "inherit",
                  lineHeight: 1.4, maxHeight: 100, overflowY: "auto" }}
              />
              <button onClick={handleComment} disabled={sending || !commentText.trim()}
                style={{ background: commentText.trim() ? PRIMARY : "#e2e8f0", border: "none",
                  color: commentText.trim() ? "white" : "#94a3b8", borderRadius: "50%",
                  width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: commentText.trim() ? "pointer" : "default", flexShrink: 0, fontSize: "1rem" }}>
                ▶
              </button>
            </div>
          </>
        ) : (
          /* No linked post — historical photo */
          <div style={{ padding: "0.75rem 1rem 1.5rem", color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", fontStyle: "italic" }}>
            Likes and comments are not available for this photo.
          </div>
        )}
      </div>
    </div>
  );
}
