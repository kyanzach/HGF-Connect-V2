"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import ConfirmModal from "@/components/ConfirmModal";

const PRIMARY = "#4EB1CB";

interface CommentAuthor {
  id: number; firstName: string; lastName: string; profilePicture: string | null;
}
interface Reply {
  id: number; content: string; createdAt: string;
  likeCount: number; isLiked: boolean; author: CommentAuthor;
}
interface Comment {
  id: number; postId: number; content: string; createdAt: string;
  isPinned: boolean; likeCount: number; isLiked: boolean;
  author: CommentAuthor; replies: Reply[];
}
interface Props {
  postId: number; postAuthorId: number;
  isOpen: boolean; onClose?: () => void;
  highlightCommentId?: number | null;
  onCommentCountChange?: (delta: number) => void;
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Avatar — clickable, navigates to /member/{id} */
function Avatar({ author, size = 32 }: { author: CommentAuthor; size?: number }) {
  const initials = `${author.firstName?.[0] ?? ""}${author.lastName?.[0] ?? ""}`.toUpperCase();
  const pic = author.profilePicture ? `/uploads/profile_pictures/${author.profilePicture}` : null;
  return (
    <button
      onClick={() => { window.location.href = `/member/${author.id}`; }}
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: `${PRIMARY}20`, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
    >
      {pic
        ? <Image src={pic} alt={initials} width={size} height={size} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        : <span style={{ fontSize: size * 0.35, fontWeight: 800, color: PRIMARY }}>{initials}</span>}
    </button>
  );
}

function buildAuthorMap(authors: CommentAuthor[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of authors) {
    const full = `${a.firstName} ${a.lastName}`.trim();
    map[full] = a.id;
    if (a.firstName && a.firstName !== full) map[a.firstName] = a.id;
    const firstWordOfLast = a.lastName.split(" ")[0];
    if (firstWordOfLast) map[`${a.firstName} ${firstWordOfLast}`] = a.id;
  }
  return map;
}

function CommentText({ content, authorMap }: { content: string; authorMap: Record<string, number> }) {
  const names = Object.keys(authorMap).sort((a, b) => b.length - a.length);
  if (names.length === 0) return <>{content}</>;

  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`@(${escaped.join("|")})`, "g");

  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    const name = m[1];
    const memberId = authorMap[name];
    parts.push(
      <a key={key++} href={`/member/${memberId}`} style={{ color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>
        @{name}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <>{parts}</>;
}

function resolveMentions(text: string, authorMap: Record<string, number>): number[] {
  const names = Object.keys(authorMap).sort((a, b) => b.length - a.length);
  if (!names.length) return [];
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`@(${escaped.join("|")})`, "g");
  const ids: Set<number> = new Set();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const id = authorMap[m[1]];
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

function CommentBubble({
  comment, sessionUserId, postAuthorId, authorMap,
  onLike, onPin, onDelete, onReply,
  isHighlighted, isReply = false,
}: {
  comment: Comment | Reply;
  sessionUserId: number | null;
  postAuthorId: number;
  authorMap: Record<string, number>;
  onLike: (id: number, currently: boolean) => void;
  onPin?: (id: number, currently: boolean) => void;
  onDelete: (id: number) => void;
  onReply?: (author: CommentAuthor) => void;
  isHighlighted?: boolean;
  isReply?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPinnable = "isPinned" in comment;
  const isPinned = isPinnable && (comment as Comment).isPinned;

  useEffect(() => {
    if (!showMenu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const isOwn = sessionUserId === comment.author.id;
  const isPostOwner = sessionUserId === postAuthorId;

  return (
    <div
      id={`comment-${comment.id}`}
      style={{ display: "flex", gap: "0.5rem", marginBottom: isReply ? "0.55rem" : "0.75rem", position: "relative" }}
    >
      <Avatar author={comment.author} size={isReply ? 26 : 32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {isPinned && (
          <div style={{ fontSize: "0.65rem", color: PRIMARY, fontWeight: 700, marginBottom: "0.2rem" }}>📌 Pinned comment</div>
        )}
        <div
          className={isHighlighted ? "hgf-pulse-highlight" : ""}
          style={{
            background: isPinned ? `${PRIMARY}10` : "#f1f5f9",
            borderRadius: "4px 16px 16px 16px",
            padding: "0.45rem 0.75rem",
            border: isPinned ? `1px solid ${PRIMARY}30` : isHighlighted ? `1.5px solid ${PRIMARY}` : "none",
            display: "inline-block",
            maxWidth: "100%",
            transition: "all 0.3s ease",
          }}
        >
          <button
            onClick={() => { window.location.href = `/member/${comment.author.id}`; }}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", display: "block", marginBottom: "0.1rem", textAlign: "left" }}
          >
            {comment.author.firstName} {comment.author.lastName}
          </button>
          <span style={{ fontSize: "0.85rem", color: "#1e293b", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
            <CommentText content={comment.content} authorMap={authorMap} />
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "0.25rem", paddingLeft: "0.25rem" }}>
          <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{timeAgo(comment.createdAt)}</span>

          {sessionUserId && (
            <button onClick={() => onLike(comment.id, comment.isLiked)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: comment.isLiked ? "#ef4444" : "#64748b", padding: 0, display: "flex", alignItems: "center", gap: "0.2rem" }}>
              {comment.isLiked ? "❤️" : "Like"} {comment.likeCount > 0 && comment.likeCount}
            </button>
          )}

          {onReply && sessionUserId && (
            <button onClick={() => onReply(comment.author)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#64748b", padding: 0 }}>
              Reply
            </button>
          )}

          {(isOwn || isPostOwner) && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setShowMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#94a3b8", padding: 0, lineHeight: 1 }}>•••</button>
              {showMenu && (
                <div style={{ position: "absolute", left: 0, bottom: "100%", background: "white", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 50, minWidth: 130, overflow: "hidden" }}>
                  {isPostOwner && isPinnable && (
                    <button onClick={() => { (onPin as any)?.(comment.id, isPinned); setShowMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#334155" }}>
                      {isPinned ? "📌 Unpin" : "📌 Pin comment"}
                    </button>
                  )}
                  <button onClick={() => { onDelete(comment.id); setShowMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#ef4444" }}>
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Inline Facebook/Instagram-Style Threaded Comments ──────────────────────── */
export default function CommentDrawer({ postId, postAuthorId, isOpen, highlightCommentId, onCommentCountChange }: Props) {
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ? parseInt(session.user.id) : null;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainText, setMainText] = useState("");
  const [submittingMain, setSubmittingMain] = useState(false);

  // Inline Reply state — opens directly beneath the comment thread being replied to
  const [replyTo, setReplyTo] = useState<{ parentId: number; name: string } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allAuthors: CommentAuthor[] = useMemo(() => Array.from(
    new Map([
      ...comments.map((c) => [c.author.id, c.author] as [number, CommentAuthor]),
      ...comments.flatMap((c) => (c.replies ?? []).map((r) => [r.author.id, r.author] as [number, CommentAuthor])),
    ]).values()
  ), [comments]);

  const authorMap = useMemo(() => buildAuthorMap(allAuthors), [allAuthors]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`/api/posts/${postId}/comments`).then((r) => r.json());
      setComments(d.comments ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen || !highlightCommentId || loading || comments.length === 0) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`comment-${highlightCommentId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, highlightCommentId, loading, comments]);

  async function submitMain() {
    if (!mainText.trim() || submittingMain || !session) return;
    setSubmittingMain(true);
    try {
      const mentionedMemberIds = resolveMentions(mainText, authorMap);
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: mainText.trim(), parentId: null, mentionedMemberIds }),
      });
      if (!res.ok) return;
      const { comment } = await res.json();
      setComments((prev) => [...prev, { ...comment, isPinned: false, likeCount: 0, isLiked: false, replies: [] }]);
      onCommentCountChange?.(1);
      setMainText("");
    } finally { setSubmittingMain(false); }
  }

  async function submitReply(parentId: number) {
    if (!replyText.trim() || submittingReply || !session) return;
    setSubmittingReply(true);
    try {
      const mentionedMemberIds = resolveMentions(replyText, authorMap);
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId, mentionedMemberIds }),
      });
      if (!res.ok) return;
      const { comment } = await res.json();
      const newReply = { ...comment, likeCount: 0, isLiked: false };
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newReply] } : c
      ));
      onCommentCountChange?.(1);
      setReplyText("");
      setReplyTo(null);
    } finally { setSubmittingReply(false); }
  }

  async function handleLike(id: number, isLiked: boolean) {
    if (!session) return;
    await fetch(`/api/comments/${id}/like`, { method: "POST" });
    setComments((prev) => prev.map((c) => {
      if (c.id === id) return { ...c, isLiked: !isLiked, likeCount: isLiked ? c.likeCount - 1 : c.likeCount + 1 };
      return { ...c, replies: (c.replies ?? []).map((r) => r.id === id ? { ...r, isLiked: !isLiked, likeCount: isLiked ? r.likeCount - 1 : r.likeCount + 1 } : r) };
    }));
  }

  async function handlePin(id: number, isPinned: boolean) {
    if (!session) return;
    await fetch(`/api/comments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isPinned ? "unpin" : "pin" }) });
    setComments((prev) =>
      prev.map((c) => ({ ...c, isPinned: c.id === id ? !isPinned : (isPinned ? c.isPinned : false) }))
        .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    );
  }

  async function confirmDelete() {
    if (!commentToDelete) return;
    setDeleting(true);
    try {
      await fetch(`/api/comments/${commentToDelete}`, { method: "DELETE" });
      const isTop = comments.some((c) => c.id === commentToDelete);
      if (isTop) {
        const target = comments.find((c) => c.id === commentToDelete);
        const removed = 1 + (target?.replies?.length ?? 0);
        setComments((prev) => prev.filter((c) => c.id !== commentToDelete));
        onCommentCountChange?.(-removed);
      } else {
        setComments((prev) => prev.map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== commentToDelete) })));
        onCommentCountChange?.(-1);
      }
    } finally {
      setDeleting(false);
      setCommentToDelete(null);
    }
  }

  function handleReply(author: CommentAuthor, parentCommentId: number) {
    const fullName = `${author.firstName} ${author.lastName}`.trim();
    setReplyTo({ parentId: parentCommentId, name: fullName });
    setReplyText(`@${fullName} `);
    setTimeout(() => {
      replyInputRef.current?.focus();
      replyInputRef.current?.setSelectionRange(9999, 9999);
    }, 80);
  }

  if (!isOpen) return null;

  const currentUser: CommentAuthor = {
    id: sessionUserId ?? 0,
    firstName: (session?.user as any)?.firstName ?? "You",
    lastName: (session?.user as any)?.lastName ?? "",
    profilePicture: (session?.user as any)?.profilePicture ?? null,
  };

  return (
    <div style={{ borderTop: "1px solid #f1f5f9", padding: "0.75rem 1rem 0.875rem", background: "#ffffff" }}>
      {loading ? (
        <div style={{ padding: "0.5rem 0", color: "#94a3b8", fontSize: "0.82rem", textAlign: "center" }}>Loading comments…</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem", color: "#94a3b8", fontSize: "0.82rem" }}>
          No comments yet. Share an encouraging word!
        </div>
      ) : (
        <div style={{ marginBottom: "0.5rem" }}>
          {comments.map((comment) => {
            const isReplyingHere = replyTo?.parentId === comment.id;
            return (
              <div key={comment.id}>
                <CommentBubble
                  comment={comment} sessionUserId={sessionUserId} postAuthorId={postAuthorId}
                  authorMap={authorMap} onLike={handleLike} onPin={handlePin}
                  onDelete={(id) => setCommentToDelete(id)}
                  onReply={(author) => handleReply(author, comment.id)}
                  isHighlighted={highlightCommentId === comment.id}
                />

                {(comment.replies ?? []).length > 0 && (
                  <div style={{ marginLeft: "2.25rem", paddingLeft: "0.65rem", borderLeft: "2px solid #e2e8f0", marginTop: "-0.25rem", marginBottom: "0.5rem" }}>
                    {comment.replies.map((reply) => (
                      <CommentBubble
                        key={reply.id} comment={reply} sessionUserId={sessionUserId}
                        postAuthorId={postAuthorId} authorMap={authorMap}
                        onLike={handleLike} onDelete={(id) => setCommentToDelete(id)}
                        onReply={(author) => handleReply(author, comment.id)}
                        isHighlighted={highlightCommentId === reply.id}
                        isReply
                      />
                    ))}
                  </div>
                )}

                {/* Inline Reply Input Box right beneath this specific comment thread */}
                {isReplyingHere && session && (
                  <div style={{ marginLeft: "2.25rem", marginBottom: "0.75rem", background: "#f8fafc", borderRadius: "14px", padding: "0.5rem 0.65rem", border: `1px solid ${PRIMARY}45` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.7rem", color: PRIMARY, fontWeight: 700 }}>↩ Replying to {replyTo.name}</span>
                      <button onClick={() => { setReplyTo(null); setReplyText(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8" }}>Cancel</button>
                    </div>
                    <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-end" }}>
                      <textarea
                        ref={replyInputRef}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(comment.id); } }}
                        placeholder={`Reply to ${replyTo.name}…`}
                        rows={1}
                        style={{ flex: 1, background: "#ffffff", borderRadius: "16px", padding: "0.4rem 0.75rem", border: "1px solid #e2e8f0", outline: "none", fontSize: "0.82rem", fontFamily: "inherit", color: "#1e293b", resize: "none", lineHeight: 1.45, maxHeight: 80, overflowY: "auto" }}
                      />
                      <button
                        onClick={() => submitReply(comment.id)}
                        disabled={!replyText.trim() || submittingReply}
                        style={{ background: !replyText.trim() ? "#e2e8f0" : PRIMARY, color: !replyText.trim() ? "#94a3b8" : "white", border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: "0.85rem", cursor: !replyText.trim() ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        {submittingReply ? "…" : "↑"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Bottom Comment Input (inline inside card) */}
      {session ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.25rem" }}>
          <Avatar author={currentUser} size={30} />
          <div style={{ flex: 1, background: "#f8fafc", borderRadius: "20px", padding: "0.35rem 0.4rem 0.35rem 0.85rem", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <textarea
              value={mainText}
              onChange={(e) => setMainText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMain(); } }}
              placeholder="Write a comment…"
              rows={1}
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "0.84rem", fontFamily: "inherit", color: "#1e293b", resize: "none", lineHeight: 1.45, maxHeight: 80, overflowY: "auto" }}
            />
            <button
              onClick={submitMain}
              disabled={!mainText.trim() || submittingMain}
              style={{ background: !mainText.trim() ? "#e2e8f0" : PRIMARY, color: !mainText.trim() ? "#94a3b8" : "white", border: "none", borderRadius: "50%", width: 28, height: 28, fontSize: "0.85rem", cursor: !mainText.trim() ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {submittingMain ? "…" : "↑"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ paddingTop: "0.35rem", textAlign: "center" }}>
          <a href="/login" style={{ color: PRIMARY, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>Log in to comment</a>
        </div>
      )}

      <ConfirmModal
        open={!!commentToDelete}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="#ef4444"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setCommentToDelete(null)}
      />
    </div>
  );
}
