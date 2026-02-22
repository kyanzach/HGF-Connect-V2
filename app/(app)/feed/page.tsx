"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PostCard from "@/components/feed/PostCard";

const PRIMARY = "#4EB1CB";

interface Post {
  id: number;
  type: string;
  content?: string | null;
  imageUrl?: string | null;
  aiCaption?: string | null;
  verseRef?: string | null;
  verseText?: string | null;
  createdAt: string;
  isLiked: boolean;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
    username?: string | null;
  };
  _count: { likes: number; comments: number };
}

const QUICK_ACTIONS = [
  { icon: "✍️", label: "Write", href: "/feed/create?type=TEXT" },
  { icon: "📖", label: "Share Devo", href: "/devo/new" },
  { icon: "🙏", label: "Pray", href: "/prayer/new" },
  { icon: "📅", label: "Events", href: "/events" },
];

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const firstName = session?.user?.firstName ?? session?.user?.name?.split(" ")[0] ?? "Friend";

  const loadPosts = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts?page=${p}`);
      const data = await res.json();
      if (p === 1) {
        setPosts(data.posts ?? []);
      } else {
        setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      }
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  return (
    <div style={{ padding: "0.875rem 1rem 0" }}>
      {/* ── Hero Card ── */}
      <div
        style={{
          background: `linear-gradient(135deg, #2d8fa6 0%, ${PRIMARY} 100%)`,
          borderRadius: "20px",
          padding: "1.25rem",
          color: "white",
          marginBottom: "1rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "100px",
            height: "100px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "50%",
          }}
        />
        <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>
          Welcome back,
        </p>
        <h2 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "0.125rem 0 0.875rem" }}>
          {firstName} 🙌
        </h2>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.85)", margin: "0 0 1rem", lineHeight: 1.5 }}>
          &ldquo;Give thanks to the Lord, for he is good; his love endures forever.&rdquo;
          <br />
          <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>— Psalm 107:1</span>
        </p>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <Link
            href="/devo/new"
            style={{
              background: "white",
              color: PRIMARY,
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              fontSize: "0.8125rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            📖 Share Devo
          </Link>
          <Link
            href="/prayer/new"
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.45rem 1rem",
              borderRadius: "999px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🙏 Pray
          </Link>
        </div>
      </div>

      {/* ── Quick Action Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem",
          marginBottom: "1.125rem",
        }}
      >
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3rem",
              background: "white",
              borderRadius: "14px",
              padding: "0.75rem 0.25rem",
              textDecoration: "none",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{action.icon}</span>
            <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "#475569", textAlign: "center" }}>
              {action.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Feed Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
          Community Feed
        </h3>
        <Link
          href="/feed/create"
          style={{
            fontSize: "0.75rem",
            color: PRIMARY,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          + Post
        </Link>
      </div>

      {/* ── Posts ── */}
      {loading && posts.length === 0 ? (
        /* Skeleton loaders */
        [1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "1rem",
              marginBottom: "0.75rem",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#e2e8f0" }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, marginBottom: 6, width: "40%" }} />
                <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "25%" }} />
              </div>
            </div>
            <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
            <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "75%" }} />
          </div>
        ))
      ) : posts.length === 0 ? (
        /* Empty state */
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✝️</div>
          <p style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.25rem" }}>
            Be the first to share!
          </p>
          <p style={{ fontSize: "0.8rem", margin: "0 0 1rem" }}>
            Share a reflection, devotional, or prayer with the community.
          </p>
          <Link
            href="/feed/create"
            style={{
              display: "inline-block",
              background: PRIMARY,
              color: "white",
              padding: "0.6rem 1.5rem",
              borderRadius: "999px",
              fontSize: "0.875rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Share Something
          </Link>
        </div>
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {/* Load More */}
          {page < totalPages && (
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                loadPosts(nextPage);
              }}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: "white",
                border: `1.5px solid ${PRIMARY}`,
                borderRadius: "14px",
                color: PRIMARY,
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                marginBottom: "0.75rem",
              }}
            >
              Load More Posts
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
