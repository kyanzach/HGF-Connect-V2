"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

interface GroupDetail {
  id: number;
  name: string;
  description: string | null;
  category: string;
  isPrivate: boolean;
  coverImage: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
  members: Array<{
    id: number;
    role: string;
    member: { id: number; firstName: string; lastName: string; profilePicture: string | null };
  }>;
  _count: { members: number };
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/groups/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setGroup(d.group ?? null);
        setJoined(d.isMember ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleJoin() {
    if (joining || joined) return;
    setJoining(true);
    try {
      await fetch(`/api/groups/${id}/join`, { method: "POST" });
      setJoined(true);
      setGroup((g) => g ? { ...g, _count: { members: g._count.members + 1 } } : g);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "1.5rem" }}>
        {[1, 2].map((i) => (
          <div key={i} style={{ height: 80, background: "white", borderRadius: 12, marginBottom: "0.75rem", animation: "pulse 1.5s infinite" }} />
        ))}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#94a3b8" }}>
        <div style={{ fontSize: "3rem" }}>😕</div>
        <p>Group not found.</p>
        <Link href="/groups" style={{ color: PRIMARY, textDecoration: "none", fontWeight: 600 }}>← All Groups</Link>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "2rem" }}>
      {/* Cover / Hero */}
      <div
        style={{
          background: group.coverImage
            ? `url(${group.coverImage}) center/cover`
            : "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 100%)",
          minHeight: 140,
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
          padding: "1rem",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            position: "absolute",
            top: "0.75rem",
            left: "0.75rem",
            background: "rgba(0,0,0,0.4)",
            border: "none",
            color: "white",
            borderRadius: "50%",
            width: 32,
            height: 32,
            cursor: "pointer",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
        <div style={{ color: "white" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.25rem", fontWeight: 800, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
            {group.isPrivate ? "🔒 " : ""}{group.name}
          </h1>
          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.25)", padding: "0.2rem 0.625rem", borderRadius: 999 }}>
            {group.category} · {group._count.members} members
          </span>
        </div>
      </div>

      <div style={{ padding: "1rem" }}>
        {/* Join button */}
        {!joined ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              width: "100%",
              padding: "0.875rem",
              background: joining ? "#94a3b8" : PRIMARY,
              color: "white",
              border: "none",
              borderRadius: "14px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: joining ? "not-allowed" : "pointer",
              marginBottom: "1rem",
            }}
          >
            {joining ? "Joining..." : "Join Group"}
          </button>
        ) : (
          <div
            style={{
              width: "100%",
              padding: "0.875rem",
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "14px",
              textAlign: "center",
              color: "#16a34a",
              fontWeight: 700,
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            ✅ You are a member of this group
          </div>
        )}

        {/* Description */}
        {group.description && (
          <div style={{ background: "white", borderRadius: "14px", padding: "1rem", marginBottom: "0.75rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" }}>About</h3>
            <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.65, margin: 0 }}>{group.description}</p>
          </div>
        )}

        {/* Members */}
        <div style={{ background: "white", borderRadius: "14px", padding: "1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.875rem" }}>
            Members ({group._count.members})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {group.members.slice(0, 8).map((gm) => (
              <div key={gm.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: PRIMARY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {gm.member.firstName[0]}{gm.member.lastName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>
                    {gm.member.firstName} {gm.member.lastName}
                  </div>
                  {gm.role === "admin" && (
                    <span style={{ fontSize: "0.625rem", background: "#fef3c7", color: "#d97706", padding: "0.1rem 0.375rem", borderRadius: 4, fontWeight: 600 }}>
                      Admin
                    </span>
                  )}
                </div>
              </div>
            ))}
            {group._count.members > 8 && (
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", margin: "0.25rem 0 0" }}>
                +{group._count.members - 8} more members
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
