"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

const P = "#4EB1CB";

type Member = {
  id: number; firstName: string; lastName: string; email: string | null;
  phone: string | null; status: string; role: string; type: string;
  ageGroup: string | null; joinDate: string | null; createdAt: string; invitedBy: string | null;
  ministries: { ministry: { name: string } }[];
};

const STATUS_COLOR: Record<string, string> = { active: "#10b981", pending: "#f59e0b", inactive: "#94a3b8" };
const ROLE_COLOR: Record<string, string> = { admin: "#ef4444", moderator: "#f59e0b", usher: "#8b5cf6", member: "#64748b" };

export default function AdminMembersClient({
  members: initial, ministries, isAdmin,
}: { members: Member[]; ministries: { id: number; name: string }[]; isAdmin: boolean }) {
  const [members, setMembers] = useState(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", joinDate: "", ageGroup: "Adult", type: "Growing Friend", role: "member",
  });

  const filtered = useMemo(() => {
    let list = members;
    if (search) list = list.filter(m => `${m.firstName} ${m.lastName} ${m.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") list = list.filter(m => m.status === statusFilter);
    if (typeFilter !== "all") list = list.filter(m => m.type === typeFilter);
    return list;
  }, [members, search, statusFilter, typeFilter]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAdding(true); setAddErr("");
    const res = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setAddErr(data.error ?? "Failed"); setAdding(false); return; }
    setMembers(prev => [data.member ?? data, ...prev]);
    setShowAdd(false); setForm({ firstName: "", lastName: "", email: "", phone: "", joinDate: "", ageGroup: "Adult", type: "Growing Friend", role: "member" });
    setAdding(false);
  }

  async function toggleStatus(id: number, current: string) {
    const newStatus = current === "active" ? "inactive" : "active";
    const res = await fetch(`/api/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) setMembers(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
  }

  async function deleteMember(id: number) {
    if (!confirm("Delete this member? This cannot be undone.")) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id));
  }

  const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
  const sel: React.CSSProperties = { ...inp };

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>👥 Members</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{members.length} total members</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: P, color: "white", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}>
          ➕ Add Member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or email…" style={{ ...inp, maxWidth: 280 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...sel, width: 140 }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...sel, width: 160 }}>
          <option value="all">All types</option>
          <option value="Family Member">Family Member</option>
          <option value="Growing Friend">Growing Friend</option>
          <option value="New Friend">New Friend</option>
        </select>
        <span style={{ color: "#94a3b8", fontSize: "0.875rem", alignSelf: "center" }}>{filtered.length} shown</span>
      </div>

      {/* Add member modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>Add New Member</h2>
            <form onSubmit={handleAdd}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[["First Name*", "firstName"], ["Last Name*", "lastName"]].map(([l, k]) => (
                  <div key={k}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{l}</label>
                    <input required style={inp} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
                ))}
              </div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Email</label>
                <input type="email" style={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Phone</label>
                <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+63 917 000 0000" /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Join Date</label>
                <input type="date" style={inp} value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Age Group</label>
                  <select style={sel} value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}>
                    <option>Adult</option><option>Youth</option><option>Kids</option>
                  </select></div>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Type</label>
                  <select style={sel} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option>Family Member</option><option>Growing Friend</option><option>New Friend</option>
                  </select></div>
                {isAdmin && <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Role</label>
                  <select style={sel} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="member">Member</option><option value="usher">Usher</option>
                    <option value="moderator">Moderator</option><option value="admin">Admin</option>
                  </select></div>}
              </div>
              {addErr && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{addErr}</p>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={adding} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700 }}>
                  {adding ? "Adding…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Member", "Contact", "Type", "Status", "Role", "Ministries", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Link href={`/member/${m.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>{m.firstName} {m.lastName}</Link>
                    {m.joinDate && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Since {new Date(m.joinDate).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}</div>}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                    <div style={{ fontSize: "0.8rem" }}>{m.email ?? "—"}</div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{m.phone ?? "—"}</div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.75rem", background: "#f1f5f9", color: "#475569", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{m.type}</span></td>
                  <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.75rem", fontWeight: 700, color: STATUS_COLOR[m.status] ?? "#64748b", background: `${STATUS_COLOR[m.status] ?? "#64748b"}18`, padding: "0.2rem 0.6rem", borderRadius: "4px", textTransform: "capitalize" }}>{m.status}</span></td>
                  <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.75rem", fontWeight: 700, color: ROLE_COLOR[m.role] ?? "#64748b" }}>{m.role}</span></td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                      {m.ministries.slice(0, 2).map((mm, j) => <span key={j} style={{ fontSize: "0.7rem", background: P, color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{mm.ministry.name}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <Link href={`/member/${m.id}`} style={{ fontSize: "0.75rem", color: P, textDecoration: "none", fontWeight: 700 }}>View</Link>
                      <span style={{ color: "#e2e8f0" }}>|</span>
                      <button onClick={() => toggleStatus(m.id, m.status)} style={{ fontSize: "0.75rem", color: m.status === "active" ? "#f59e0b" : "#10b981", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>
                        {m.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      {isAdmin && <><span style={{ color: "#e2e8f0" }}>|</span>
                        <button onClick={() => deleteMember(m.id)} style={{ fontSize: "0.75rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>Delete</button></>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
