"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

interface Group {
  id: number;
  name: string;
  description: string | null;
  category: string;
  isPrivate: boolean;
  _count: { members: number };
  createdBy: { firstName: string; lastName: string };
}

const CATEGORIES = ["All", "Cell Group", "Ministry", "Youth", "Kids", "Women", "Men", "Prayer"];
const CATEGORY_ICONS: Record<string, string> = {
  "Cell Group": "🏘️", "Ministry": "⛪", "Youth": "🔥", "Kids": "🌟",
  "Women": "💜", "Men": "💪", "Prayer": "🙏", "General": "👥",
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => { setGroups(d.groups ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "All" ? groups : groups.filter((g) => g.category === filter);

  return (
    <div style={{ paddingBottom: "1.5rem" }}>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 100%)",
          padding: "1.25rem 1rem",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>👥</div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.25rem" }}>Community Groups</h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: "0 0 0.875rem" }}>
          Find your people — cell groups, ministries & more
        </p>
        <Link
          href="/groups/new"
          style={{
            display: "inline-block",
            background: "white",
            color: "#1b6ca8",
            padding: "0.45rem 1.25rem",
            borderRadius: "999px",
            fontSize: "0.8125rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Create Group
        </Link>
      </div>

      {/* Category filter */}
      <div style={{ background: "white", borderBottom: "1px solid #f1f5f9", overflowX: "auto", scrollbarWidth: "none" }}>
        <div style={{ display: "flex", padding: "0 0.75rem" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: "0.75rem 0.875rem",
                border: "none",
                borderBottom: filter === cat ? `2.5px solid ${PRIMARY}` : "2.5px solid transparent",
                background: "none",
                fontSize: "0.8rem",
                fontWeight: filter === cat ? 700 : 500,
                color: filter === cat ? PRIMARY : "#64748b",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Group list */}
      <div style={{ padding: "1rem" }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "16px",
                height: 90,
                marginBottom: "0.75rem",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>👥</div>
            <p style={{ fontSize: "0.9rem" }}>
              {filter === "All"
                ? "No groups yet. Be the first to create one!"
                : `No ${filter} groups yet.`}
            </p>
            <Link
              href="/groups/new"
              style={{
                display: "inline-block",
                marginTop: "0.75rem",
                background: PRIMARY,
                color: "white",
                padding: "0.625rem 1.5rem",
                borderRadius: "999px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "0.875rem",
              }}
            >
              Create a Group
            </Link>
          </div>
        ) : (
          filtered.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "1rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  gap: "0.875rem",
                  alignItems: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "14px",
                    background: "#e0f2fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    flexShrink: 0,
                  }}
                >
                  {CATEGORY_ICONS[group.category] ?? "👥"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#1e293b" }}>
                    {group.isPrivate ? "🔒 " : ""}{group.name}
                  </div>
                  {group.description && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#64748b",
                        marginTop: "0.125rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {group.description}
                    </div>
                  )}
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                    {group._count.members} member{group._count.members !== 1 ? "s" : ""} · {group.category}
                  </div>
                </div>
                <span style={{ color: "#cbd5e1" }}>›</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}
