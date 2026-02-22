"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";

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
    _count?: {
      likes: number;
      comments: number;
    };
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
  TEXT: { icon: "✍️", label: "Reflection", color: "#6c757d" },
  DEVO: { icon: "📖", label: "Devotional", color: PRIMARY },
  VERSE_CARD: { icon: "📜", label: "Bible Verse", color: "#805AD5" },
  PRAYER: { icon: "🙏", label: "Prayer", color: "#E67E22" },
  PRAISE: { icon: "🙌", label: "Praise Report", color: "#27AE60" },
  EVENT: { icon: "📅", label: "Event", color: "#E74C3C" },
};

export default function PostCard({ post }: PostCardProps) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [loading, setLoading] = useState(false);

  const authorName = `${post.author.firstName} ${post.author.lastName}`;
  const initials = `${post.author.firstName[0]}${post.author.lastName[0]}`.toUpperCase();
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.TEXT;
  const profilePic = post.author.profilePicture
    ? `/uploads/profile_pictures/${post.author.profilePicture}`
    : null;

  async function toggleLike() {
    if (!session || loading) return;
    setLoading(true);
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? p - 1 : p + 1));
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch {
      // revert on error
      setLiked((p) => !p);
      setLikeCount((p) => (liked ? p + 1 : p - 1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: "16px",
        marginBottom: "0.75rem",
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "0.875rem 1rem 0.5rem", gap: "0.625rem" }}>
        {/* Avatar */}
        {profilePic ? (
          <Image
            src={profilePic}
            alt={authorName}
            width={38}
            height={38}
            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: PRIMARY,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.875rem",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
            {authorName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{timeAgo(post.createdAt)}</span>
            <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>·</span>
            <span
              style={{
                fontSize: "0.6875rem",
                color: typeInfo.color,
                fontWeight: 600,
              }}
            >
              {typeInfo.icon} {typeInfo.label}
            </span>
          </div>
        </div>
        <span style={{ fontSize: "1rem", color: "#94a3b8", cursor: "pointer" }}>•••</span>
      </div>

      {/* Content */}
      {post.content && (
        <div style={{ padding: "0 1rem 0.5rem", fontSize: "0.9375rem", color: "#334155", lineHeight: 1.65, whiteSpace: "pre-line" }}>
          {post.content}
        </div>
      )}

      {/* Devo Image */}
      {post.imageUrl && (
        <div style={{ margin: "0.25rem 0" }}>
          <Image
            src={post.imageUrl.startsWith("http") ? post.imageUrl : `/uploads/${post.imageUrl}`}
            alt="Devotional"
            width={500}
            height={300}
            style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "cover" }}
          />
        </div>
      )}

      {/* AI Caption */}
      {post.aiCaption && post.type === "DEVO" && (
        <div
          style={{
            margin: "0 1rem 0.5rem",
            background: "#f0f9ff",
            borderLeft: `3px solid ${PRIMARY}`,
            padding: "0.625rem 0.75rem",
            borderRadius: "0 8px 8px 0",
            fontSize: "0.875rem",
            color: "#334155",
            fontStyle: "italic",
          }}
        >
          {post.aiCaption}
        </div>
      )}

      {/* Bible Verse Card */}
      {post.verseText && (
        <div
          style={{
            margin: "0.25rem 1rem 0.5rem",
            background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
            borderRadius: "12px",
            padding: "1rem",
            color: "white",
          }}
        >
          <div style={{ fontSize: "1.25rem", opacity: 0.5, lineHeight: 1, marginBottom: "0.25rem" }}>❝</div>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 0.5rem", fontStyle: "italic" }}>
            &ldquo;{post.verseText}&rdquo;
          </p>
          {post.verseRef && (
            <span
              style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.2)",
                padding: "0.2rem 0.625rem",
                borderRadius: "999px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              — {post.verseRef}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid #f1f5f9",
          padding: "0.1rem 0",
        }}
      >
        <button
          onClick={toggleLike}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.625rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: liked ? "#ef4444" : "#64748b",
            fontWeight: liked ? 700 : 400,
            transition: "color 0.15s",
          }}
        >
          {liked ? "❤️" : "🤍"} {likeCount > 0 && likeCount}
        </button>
        <button
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.625rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: "#64748b",
          }}
        >
          💬 {post._count?.comments ?? 0}
        </button>
        <button
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            padding: "0.625rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: "#64748b",
          }}
        >
          📤 Share
        </button>
      </div>
    </div>
  );
}
