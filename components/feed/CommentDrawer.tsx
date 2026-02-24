"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
  postId: number;
  postAuthorId: number;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange?: (delta: number) => void;
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Clickable avatar that navigates to member profile */
function Avatar({ author, size = 36 }: { author: CommentAuthor; size?: number }) {
  const router = useRouter();
  const initials = `${author.firstName[0]}${author.lastName[0]}`.toUpperCase();
  const pic = author.profilePicture ? `/uploads/profile_pictures/${author.profilePicture}` : null;
  return (
    <button
      onClick={() => router.push(`/member/${author.id}`)}
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: `${PRIMARY}20`, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
    >
      {pic ? (
        <Image src={pic} alt={initials} width={size} height={size} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      ) : (
        <span style={{ fontSize: size * 0.35, fontWeight: 800, color: PRIMARY }}>{initials}</span>
      )}
    </button>
  );
}

/** Parse comment text and turn @mentions into clickable links */
function CommentText({ content, authors }: { content: string; authors: CommentAuthor[] }) {
  // Build a lookup: "First Last" → id
  const authorMap: Record<string, number> = {};
  authors.forEach((a) => { authorMap[`${a.firstName} ${a.lastName}`] = a.id; });

  const parts: React.ReactNode[] = [];
  const regex = /@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s[A-Za-zÀ-ÖØ-öø-ÿ]+)*)/g;
  let last = 0; let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    const name = m[1];
    const memberId = authorMap[name];
    if (memberId) {
      parts.push(
        <a key={key++} href={`/member/${memberId}`} style={{ color: PRIMARY, fontWeight: 700, textDecoration: "none" }}>
          @{name}
        </a>
      );
    } else {
      parts.push(`@${name}`);
    }
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return <>{parts}</>;
}

function CommentBubble({
  comment, sessionUserId, postAuthorId, allAuthors,
  onLike, onPin, onDelete, onReply,
}: {
  comment: Comment | Reply;
  sessionUserId: number | null;
  postAuthorId: number;
  allAuthors: CommentAuthor[];
  onLike: (id: number, currentlyLiked: boolean) => void;
  onPin?: (id: number, currentlyPinned: boolean) => void;
  onDelete: (id: number) => void;
  onReply?: (author: CommentAuthor) => void;
}) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isPinnable = "isPinned" in comment;
  const isPinned = "isPinned" in comment ? comment.isPinned : false;

  useEffect(() => {
    if (!showMenu) return;
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showMenu]);

  const isOwn = sessionUserId === comment.author.id;
  const isPostOwner = sessionUserId === postAuthorId;
  const canDelete = isOwn || isPostOwner;
  const canPin = isPostOwner && isPinnable;

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", position: "relative" }}>
      <Avatar author={comment.author} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {isPinned && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.65rem", color: PRIMARY, fontWeight: 700, marginBottom: "0.25rem" }}>
            📌 Pinned comment
          </div>
        )}
        <div style={{ background: isPinned ? `${PRIMARY}10` : "#f1f5f9", borderRadius: "0 14px 14px 14px", padding: "0.5rem 0.75rem", border: isPinned ? `1px solid ${PRIMARY}30` : "none", display: "inline-block", maxWidth: "100%" }}>
          {/* Clickable name */}
          <button
            onClick={() => router.push(`/member/${comment.author.id}`)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, color: PRIMARY, display: "block", marginBottom: "0.15rem", textAlign: "left" }}
          >
            {comment.author.firstName} {comment.author.lastName}
          </button>
          <span style={{ fontSize: "0.875rem", color: "#1e293b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            <CommentText content={comment.content} authors={allAuthors} />
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "0.3rem", paddingLeft: "0.25rem" }}>
          <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>{timeAgo(comment.createdAt)}</span>
          {sessionUserId && (
            <button onClick={() => onLike(comment.id, comment.isLiked)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: comment.isLiked ? "#ef4444" : "#94a3b8", padding: 0, display: "flex", alignItems: "center", gap: "0.2rem" }}>
              {comment.isLiked ? "❤️" : "🤍"} {comment.likeCount > 0 && comment.likeCount}
            </button>
          )}
          {onReply && sessionUserId && (
            <button onClick={() => onReply(comment.author)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", padding: 0 }}>
              Reply
            </button>
          )}
          {(canDelete || canPin) && (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button onClick={() => setShowMenu((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#94a3b8", padding: 0, lineHeight: 1 }}>•••</button>
              {showMenu && (
                <div style={{ position: "absolute", left: 0, bottom: "100%", background: "white", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 50, minWidth: 130, overflow: "hidden" }}>
                  {canPin && onPin && (
                    <button onClick={() => { onPin(comment.id, isPinned); setShowMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#334155" }}>
                      {isPinned ? "📌 Unpin" : "📌 Pin comment"}
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => { onDelete(comment.id); setShowMenu(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.875rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#ef4444" }}>
                      🗑️ Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Extract @Name mentions from text and resolve to member IDs using known authors */
function resolveMentions(text: string, authors: CommentAuthor[]): number[] {
  const authorMap: Record<string, number> = {};
  authors.forEach((a) => { authorMap[`${a.firstName} ${a.lastName}`] = a.id; });
  const regex = /@([A-Za-zÀ-ÖØ-öø-ÿ]+(?:\s[A-Za-zÀ-ÖØ-öø-ÿ]+)*)/g;
  const ids: Set<number> = new Set();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const id = authorMap[m[1]];
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

export default function CommentDrawer({ postId, postAuthorId, isOpen, onClose, onCommentCountChange }: Props) {
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id ? parseInt(session.user.id) : null;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; name: string; author: CommentAuthor } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // All unique authors in thread (for @mention resolution)
  const allAuthors: CommentAuthor[] = Array.from(
    new Map([
      ...comments.map((c) => [c.author.id, c.author] as [number, CommentAuthor]),
      ...comments.flatMap((c) => (c.replies ?? []).map((r) => [r.author.id, r.author] as [number, CommentAuthor])),
    ]).values()
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch(`/api/posts/${postId}/comments`).then((r) => r.json());
      setComments(d.comments ?? []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);
  useEffect(() => { if (isOpen) document.body.style.overflow = "hidden"; else document.body.style.overflow = ""; return () => { document.body.style.overflow = ""; }; }, [isOpen]);

  async function submit() {
    if (!text.trim() || submitting || !session) return;
    setSubmitting(true);
    try {
      const mentionedMemberIds = resolveMentions(text, allAuthors);
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim(), parentId: replyTo?.id ?? null, mentionedMemberIds }),
      });
      if (!res.ok) return;
      const { comment } = await res.json();
      if (replyTo) {
        setComments((prev) => prev.map((c) =>
          c.id === replyTo.id ? { ...c, replies: [...(c.replies ?? []), { ...comment, likeCount: 0, isLiked: false }] } : c
        ));
        onCommentCountChange?.(1); // replies count too
      } else {
        setComments((prev) => [...prev, { ...comment, isPinned: false, likeCount: 0, isLiked: false, replies: [] }]);
        onCommentCountChange?.(1);
      }
      setText(""); setReplyTo(null);
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 100);
    } finally { setSubmitting(false); }
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

  async function handleDelete(id: number) {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    const top = comments.find((c) => c.id === id);
    if (top) {
      setComments((prev) => prev.filter((c) => c.id !== id));
      onCommentCountChange?.(-1);
    } else {
      setComments((prev) => prev.map((c) => ({ ...c, replies: (c.replies ?? []).filter((r) => r.id !== id) })));
      onCommentCountChange?.(-1); // reply also counted
    }
  }

  function handleReply(author: CommentAuthor, parentId: number) {
    setReplyTo({ id: parentId, name: `${author.firstName} ${author.lastName}`, author });
    setText(`@${author.firstName} ${author.lastName} `);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  if (!isOpen) return null;

  const currentUser: CommentAuthor = {
    id: sessionUserId ?? 0,
    firstName: (session?.user as any)?.firstName ?? "You",
    lastName: (session?.user as any)?.lastName ?? "",
    profilePicture: (session?.user as any)?.profilePicture ?? null,
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, height: "75vh", background: "white", borderRadius: "20px 20px 0 0", zIndex: 201, display: "flex", flexDirection: "column", boxShadow: "0 -4px 30px rgba(0,0,0,0.18)", animation: "slideUp 0.25s ease" }}>
        <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(100%); } to { transform: translateX(-50%) translateY(0); } }`}</style>

        {/* Handle + header */}
        <div style={{ padding: "0.75rem 1rem 0.5rem", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: "#e2e8f0", borderRadius: 99, margin: "0 auto 0.625rem" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1e293b" }}>
              💬 Comments {comments.length > 0 && `· ${comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)}`}
            </span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#94a3b8", padding: "0.25rem" }}>✕</button>
          </div>
        </div>

        {/* Comment list */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "0.875rem 1rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8", fontSize: "0.875rem" }}>Loading…</div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💬</div>
              <p style={{ color: "#94a3b8", fontSize: "0.875rem", margin: 0 }}>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id}>
                <CommentBubble
                  comment={comment} sessionUserId={sessionUserId} postAuthorId={postAuthorId}
                  allAuthors={allAuthors} onLike={handleLike} onPin={handlePin}
                  onDelete={handleDelete} onReply={(author) => handleReply(author, comment.id)}
                />
                {(comment.replies ?? []).length > 0 && (
                  <div style={{ marginLeft: "2.5rem", marginTop: "-0.375rem" }}>
                    {comment.replies.map((reply) => (
                      <CommentBubble
                        key={reply.id} comment={reply} sessionUserId={sessionUserId}
                        postAuthorId={postAuthorId} allAuthors={allAuthors}
                        onLike={handleLike} onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        {session ? (
          <div style={{ padding: "0.625rem 1rem", borderTop: "1px solid #f1f5f9", background: "white", flexShrink: 0 }}>
            {replyTo && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                <span style={{ fontSize: "0.72rem", color: PRIMARY, fontWeight: 700 }}>↩ Replying to {replyTo.name}</span>
                <button onClick={() => { setReplyTo(null); setText(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.7rem", color: "#94a3b8" }}>✕</button>
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <Avatar author={currentUser} size={32} />
              <div style={{ flex: 1, background: "#f8fafc", borderRadius: "20px", padding: "0.5rem 0.875rem", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a comment…"}
                  rows={1}
                  style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "0.875rem", fontFamily: "inherit", color: "#1e293b", resize: "none", lineHeight: 1.5, maxHeight: 80, overflowY: "auto" }}
                />
                <button
                  onClick={submit} disabled={!text.trim() || submitting}
                  style={{ background: !text.trim() ? "#e2e8f0" : PRIMARY, color: !text.trim() ? "#94a3b8" : "white", border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: "0.9rem", cursor: !text.trim() ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
                >
                  {submitting ? "…" : "↑"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "0.875rem 1rem", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <a href="/login" style={{ color: PRIMARY, fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>Log in to comment</a>
          </div>
        )}
      </div>
    </>
  );
}
