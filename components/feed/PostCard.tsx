"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import CommentDrawer from "./CommentDrawer";

const PRIMARY = "#4EB1CB";

interface PostCardProps {
  post: {
    id: number;
    type: string;
    content?: string | null;
    imageUrl?: string | null;
    aiCaption?: string | null;
    verseRef?: string | null;
    verseText?: string | null;
    createdAt: Date | string;
    author: {
      id: number;
      firstName: string;
      lastName: string;
      profilePicture?: string | null;
      username?: string | null;
    };
    _count?: { likes: number; comments: number };
    isLiked?: boolean;
  };
}

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

const TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  TEXT:       { icon: "✍️",  label: "Reflection",    color: "#6c757d" },
  DEVO:       { icon: "📖",  label: "Devotional",    color: PRIMARY },
  VERSE_CARD: { icon: "📜",  label: "Bible Verse",   color: "#805AD5" },
  PRAYER:     { icon: "🙏",  label: "Prayer",        color: "#E67E22" },
  PRAISE:     { icon: "🙌",  label: "Praise Report", color: "#27AE60" },
  EVENT:      { icon: "📅",  label: "Event",         color: "#E74C3C" },
};

export default function PostCard({ post }: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`.toUpperCase();
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.TEXT;
  const profilePic = post.author.profilePicture
    ? `/uploads/profile_pictures/${post.author.profilePicture}`
    : null;
  const isOwnPost = session?.user?.id === String(post.author.id);

  async function toggleLike() {
    if (!session || loading) return;
    setLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((p) => (wasLiked ? p - 1 : p + 1));
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked(wasLiked);
      setLikeCount((p) => (wasLiked ? p + 1 : p - 1));
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    if (navigator.share) {
      navigator.share({ title: `${authorName} on HGF Connect`, text: post.content ?? "", url });
    } else {
      navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    setMenuOpen(false);
    await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <>
      <div
        style={{ background: "white", borderRadius: "16px", marginBottom: "0.75rem", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "0.875rem 1rem 0.5rem", gap: "0.625rem" }}>
          {/* Avatar */}
          <button
            onClick={() => router.push(`/member/${post.author.id}`)}
            aria-label={`View ${authorName}'s profile`}
            style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "none", padding: 0, cursor: "pointer", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {profilePic ? (
              <Image src={profilePic} alt={authorName} width={40} height={40} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <span style={{ color: "white", fontWeight: 700, fontSize: "0.875rem" }}>{initials}</span>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => router.push(`/member/${post.author.id}`)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{authorName}</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{timeAgo(post.createdAt)}</span>
              <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>·</span>
              <span style={{ fontSize: "0.6875rem", color: typeInfo.color, fontWeight: 600 }}>
                {typeInfo.icon} {typeInfo.label}
              </span>
            </div>
          </div>

          {/* Three-dots menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{ background: "none", border: "none", fontSize: "1.1rem", color: "#94a3b8", cursor: "pointer", padding: "4px 8px", borderRadius: "8px" }}
            >•••</button>
            {menuOpen && (
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
              />
            )}
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "white", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 160, zIndex: 11, overflow: "hidden" }}>
                <button onClick={() => { setMenuOpen(false); router.push(`/member/${post.author.id}`); }} style={menuItemStyle}>👤 View Profile</button>
                <button onClick={() => { setMenuOpen(false); setCommentsOpen(true); }} style={menuItemStyle}>💬 View Comments</button>
                {isOwnPost && <button onClick={handleDelete} style={{ ...menuItemStyle, color: "#ef4444" }}>🗑️ Delete Post</button>}
                <button onClick={() => { setMenuOpen(false); handleShare(); }} style={menuItemStyle}>📤 Share Post</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {post.content && (
          <div style={{ padding: "0 1rem 0.5rem", fontSize: "0.9375rem", color: "#334155", lineHeight: 1.65, whiteSpace: "pre-line" }}>
            {post.content}
          </div>
        )}

        {/* Image */}
        {post.imageUrl && (
          <div style={{ margin: "0.25rem 0" }}>
            <Image
              src={post.imageUrl.startsWith("http") ? post.imageUrl : `/uploads/${post.imageUrl}`}
              alt="Post image" width={500} height={300}
              style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "cover" }}
            />
          </div>
        )}

        {/* AI Caption */}
        {post.aiCaption && post.type === "DEVO" && (
          <div style={{ margin: "0 1rem 0.5rem", background: "#f0f9ff", borderLeft: `3px solid ${PRIMARY}`, padding: "0.625rem 0.75rem", borderRadius: "0 8px 8px 0", fontSize: "0.875rem", color: "#334155", fontStyle: "italic" }}>
            {post.aiCaption}
          </div>
        )}

        {/* Verse card */}
        {post.verseText && (
          <div style={{ margin: "0.25rem 1rem 0.5rem", background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)", borderRadius: "12px", padding: "1rem", color: "white" }}>
            <div style={{ fontSize: "1.25rem", opacity: 0.5, lineHeight: 1, marginBottom: "0.25rem" }}>❝</div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 0.5rem", fontStyle: "italic" }}>&ldquo;{post.verseText}&rdquo;</p>
            {post.verseRef && (
              <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.625rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                — {post.verseRef}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", borderTop: "1px solid #f1f5f9", padding: "0.1rem 0" }}>
          <button onClick={toggleLike} style={{ ...actionBtnStyle, color: liked ? "#ef4444" : "#64748b", fontWeight: liked ? 700 : 400 }}>
            {liked ? "❤️" : "🤍"} {likeCount > 0 && likeCount}
          </button>
          <button onClick={() => setCommentsOpen(true)} style={actionBtnStyle}>
            💬 {commentCount > 0 && commentCount}
          </button>
          <button onClick={handleShare} style={actionBtnStyle}>
            📤 Share
          </button>
        </div>
      </div>

      {/* Comment Drawer */}
      <CommentDrawer
        postId={post.id}
        postAuthorId={post.author.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={(delta) => setCommentCount((c) => c + delta)}
      />
    </>
  );
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  gap: "0.375rem", padding: "0.625rem", background: "none", border: "none",
  cursor: "pointer", fontSize: "0.875rem", color: "#64748b", transition: "color 0.15s",
};

const menuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  padding: "0.75rem 1rem", background: "none", border: "none",
  cursor: "pointer", fontSize: "0.875rem", color: "#334155",
};
