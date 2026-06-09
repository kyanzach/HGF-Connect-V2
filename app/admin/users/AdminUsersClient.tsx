"use client";
import { useState } from "react";
import Link from "next/link";

const P = "#4EB1CB";
const ROLE_COLOR: Record<string, string> = { admin: "#ef4444", moderator: "#f59e0b", usher: "#8b5cf6", multimedia: "#10b981", user: "#94a3b8" };
const ROLES = ["user", "usher", "moderator", "admin", "multimedia"];

type User = { id: number; firstName: string; lastName: string; email: string | null; phone: string | null; role: string; status: string; lastLogin: string | null; username: string | null };

export default function AdminUsersClient({ users: init }: { users: User[] }) {
  const [users, setUsers] = useState(init);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);

  const filtered = search 
    ? users.filter(u => `${u.firstName} ${u.lastName} ${u.email ?? ""} ${u.username ?? ""} ${u.phone ?? ""}`.toLowerCase().includes(search.toLowerCase())) 
    : users;

  async function changeRole(id: number, role: string) {
    setUpdating(id);
    const res = await fetch(`/api/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    if (res.ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    setUpdating(null);
  }

  return (
    <div className="users-container" style={{ padding: "1.5rem 2rem" }}>
      <div className="users-header" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>🔑 User Roles</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>Manage login roles for all members with accounts — Admin only</p>
      </div>
      <div className="users-search" style={{ marginBottom: "1rem" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search…" style={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.875rem", fontSize: "0.875rem", outline: "none", width: 280 }} />
      </div>
      <div className="users-desktop-table" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["Member", "Email", "Last Login", "Current Role", "Change Role"].map(h => (
                <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <Link href={`/member/${u.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>{u.firstName} {u.lastName}</Link>
                </td>
                <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>{u.email ?? "—"}</td>
                <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.8rem" }}>
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ROLE_COLOR[u.role] ?? "#64748b", background: `${ROLE_COLOR[u.role] ?? "#64748b"}18`, padding: "0.25rem 0.6rem", borderRadius: "4px", textTransform: "capitalize" }}>
                    {u.role === "user" ? "Member" : u.role}
                  </span>
                </td>
                <td style={{ padding: "0.75rem 1rem" }}>
                  <select
                    value={u.role}
                    disabled={updating === u.id}
                    onChange={e => changeRole(u.id, e.target.value)}
                    style={{ border: "1.5px solid #e2e8f0", borderRadius: "6px", padding: "0.35rem 0.625rem", fontSize: "0.8rem", outline: "none", color: "#374151", opacity: updating === u.id ? 0.5 : 1 }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r === "user" ? "Member" : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view card listing */}
      {filtered.length > 0 && (
        <div className="users-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((u) => (
            <div key={u.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <Link href={`/member/${u.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>
                  {u.firstName} {u.lastName}
                </Link>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: ROLE_COLOR[u.role] ?? "#64748b", background: `${ROLE_COLOR[u.role] ?? "#64748b"}18`, padding: "0.25rem 0.6rem", borderRadius: "4px", textTransform: "capitalize" }}>
                  {u.role === "user" ? "Member" : u.role}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#475569", margin: "0.25rem 0" }}>
                ✉️ {u.email ?? "—"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.25rem 0" }}>
                Last Login: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Change Role:</span>
                <select
                  value={u.role}
                  disabled={updating === u.id}
                  onChange={e => changeRole(u.id, e.target.value)}
                  style={{ border: "1.5px solid #e2e8f0", borderRadius: "6px", padding: "0.35rem 0.625rem", fontSize: "0.8rem", outline: "none", color: "#374151", opacity: updating === u.id ? 0.5 : 1 }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r === "user" ? "Member" : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>No users found.</div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .users-container {
            padding: 1rem !important;
          }
          .users-header {
            margin-bottom: 1rem !important;
          }
          .users-search input {
            width: 100% !important;
          }
          .users-desktop-table {
            display: none !important;
          }
          .users-mobile-cards {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
