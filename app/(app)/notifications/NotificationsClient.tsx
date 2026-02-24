"use client";

import { useRouter } from "next/navigation";

const PRIMARY = "#4EB1CB";

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function typeIcon(type: string) {
  const icons: Record<string, string> = {
    new_post: "✍️", new_comment: "💬", comment_reply: "↩️",
    mention: "📣", new_like: "❤️", new_member: "👋",
    new_marketplace: "🛍️", prayer_response: "🙏",
  };
  return icons[type] ?? "🔔";
}

interface Notif {
  id: number; type: string; title: string; body: string | null;
  link: string | null; isRead: boolean; createdAt: string;
}

export default function NotificationsClient({ notifications }: { notifications: Notif[] }) {
  const router = useRouter();

  function handleClick(n: Notif) {
    if (n.link) router.push(n.link);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Page header */}
      <div style={{ background: "white", padding: "1rem 1rem 0.75rem", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>🔔 Notifications</h1>
        <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.2rem 0 0" }}>
          {notifications.length} total · all marked as read
        </p>
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: "center", padding: "5rem 1rem", color: "#94a3b8" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🔔</div>
          <p style={{ fontWeight: 600, color: "#64748b" }}>No notifications yet</p>
          <p style={{ fontSize: "0.875rem" }}>You&apos;ll see activity from your community here.</p>
        </div>
      ) : (
        <div>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                padding: "0.875rem 1rem",
                borderBottom: "1px solid #f1f5f9",
                background: "white",
                cursor: n.link ? "pointer" : "default",
                marginBottom: "2px",
              }}
            >
              <span style={{ fontSize: "1.5rem", flexShrink: 0, lineHeight: 1.3 }}>{typeIcon(n.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#111", marginBottom: 2 }}>
                  {n.title}
                </div>
                {n.body && (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.4 }}>
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 4 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>
              {n.link && (
                <span style={{ fontSize: "0.75rem", color: PRIMARY, flexShrink: 0, paddingTop: 2 }}>›</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
