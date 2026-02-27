"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PostCard from "@/components/feed/PostCard";
import HeroCarousel from "@/components/feed/HeroCarousel";

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

// GCash-style horizontal scrollable shortcuts
const SHORTCUTS = [
  { icon: "✍️", label: "Write", href: "/feed/create?type=TEXT", color: "#e0f2fe", iconBg: "#0ea5e9" },
  { icon: "📖", label: "Devo", href: "/devo/new", color: "#e0fdf4", iconBg: "#10b981" },
  { icon: "🙏", label: "Pray", href: "/prayer/new", color: "#faf5ff", iconBg: "#a855f7" },
  { icon: "✝️", label: "AI Helper", href: "/ai", color: "#fff7ed", iconBg: "#f97316" },
  { icon: "📅", label: "Events", href: "/events", color: "#fef3c7", iconBg: "#f59e0b" },
  { icon: "👥", label: "Directory", href: "/directory", color: "#fce7f3", iconBg: "#ec4899" },
  { icon: "🛍️", label: "Market", href: "/marketplace", color: "#f0f9ff", iconBg: PRIMARY },
  { icon: "📚", label: "Resources", href: "/resources", color: "#f0fdf4", iconBg: "#22c55e" },
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
      if (p === 1) setPosts(data.posts ?? []);
      else setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(1); }, [loadPosts]);

  return (
    <div style={{ paddingBottom: "0.5rem" }}>

      {/* ── Hero Carousel ── */}
      <HeroCarousel firstName={firstName} />

      {/* ── GCash-style Horizontal Shortcut Scroll ── */}
      <div style={{ background: "white", paddingTop: "1rem", paddingBottom: "0.875rem", boxShadow: "0 1px 0 #f1f5f9" }}>
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: "0",
            paddingLeft: "1rem",
            paddingRight: "1rem",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch" as any,
          }}
        >
          {SHORTCUTS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.375rem",
                textDecoration: "none",
                minWidth: "68px",
                flexShrink: 0,
                padding: "0 0.25rem",
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "16px",
                  background: item.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.375rem",
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "#475569",
                  textAlign: "center",
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Feed Section ── */}
      <div style={{ padding: "0.875rem 1rem 0" }}>

        {/* Feed header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            Community Feed
          </h3>
          <Link
            href="/feed/create"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.8rem",
              color: PRIMARY,
              fontWeight: 600,
              textDecoration: "none",
              background: "#e0f7fb",
              padding: "0.3rem 0.75rem",
              borderRadius: "999px",
            }}
          >
            ✍️ Post
          </Link>
        </div>

        {/* Posts */}
        {loading && posts.length === 0 ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "1rem",
                marginBottom: "0.75rem",
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
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>✝️</div>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, margin: "0 0 0.25rem", color: "#64748b" }}>
              Be the first to share!
            </p>
            <p style={{ fontSize: "0.8rem", margin: "0 0 1rem" }}>
              Share a reflection, devotional, or prayer.
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
              Share Something ✝️
            </Link>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {page < totalPages && (
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  loadPosts(next);
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
                Load More
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
