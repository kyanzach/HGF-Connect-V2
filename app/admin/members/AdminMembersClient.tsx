"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";

const P = "#4EB1CB";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  status: string;
  role: string;
  type: string;
  ageGroup: string | null;
  joinDate: string | null;
  createdAt: string;
  invitedBy: string | null;
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
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string;
    confirmColor: string; loading: boolean; onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", confirmColor: "#ef4444", loading: false, onConfirm: () => {} });

  const [resetDetails, setResetDetails] = useState<{
    open: boolean;
    name: string;
    username: string;
    password?: string;
    loading: boolean;
    copied: boolean;
    error: string;
  }>({ open: false, name: "", username: "", loading: false, copied: false, error: "" });

  const filtered = useMemo(() => {
    let list = members;
    if (search) list = list.filter(m => `${m.firstName} ${m.lastName} ${m.email ?? ""} ${m.username ?? ""}`.toLowerCase().includes(search.toLowerCase()));
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

  function promptDeleteMember(id: number, name: string) {
    setConfirmModal({
      open: true, title: "Delete Member",
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete", confirmColor: "#ef4444", loading: false,
      onConfirm: () => executeDeleteMember(id),
    });
  }

  async function executeDeleteMember(id: number) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id));
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
  }

  async function handleResetPassword(id: number, name: string) {
    setResetDetails({ open: true, name, username: "", loading: true, copied: false, error: "" });
    try {
      const res = await fetch(`/api/members/${id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResetDetails(prev => ({ ...prev, loading: false, error: data.error ?? "Failed to reset password." }));
        return;
      }
      setResetDetails({
        open: true,
        name: data.name,
        username: data.username,
        password: data.password,
        loading: false,
        copied: false,
        error: ""
      });
      // Also update local list in case a new username was generated
      setMembers(prev => prev.map(m => m.id === id ? { ...m, username: data.username } : m));
    } catch (err) {
      console.error(err);
      setResetDetails(prev => ({ ...prev, loading: false, error: "An unexpected network error occurred." }));
    }
  }

  // Pre-formatted credentials template
  const shareText = `⛪ HGF Connect Account Credentials

Here are your login credentials for HGF Fellowship:
🔗 Login URL: https://connect.houseofgrace.ph/login
👤 Username: ${resetDetails.username}
🔑 Password: ${resetDetails.password}

Please log in and update your password under your Profile settings.`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareText);
      setResetDetails(prev => ({ ...prev, copied: true }));
      setTimeout(() => {
        setResetDetails(prev => ({ ...prev, copied: false }));
      }, 2000);
    } catch (err) {
      console.error("Clipboard write error", err);
    }
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

      {/* ── Desktop View (Hidden on mobile) ── */}
      <div className="desktop-view" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Member", "Contact", "Type", "Status", "Role", "Ministries", "Username", "Actions"].map(h => (
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
                    <code style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "0.2rem 0.45rem", borderRadius: "4px", color: "#0f172a" }}>
                      {m.username ?? "—"}
                    </code>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <Link href={`/member/${m.id}`} style={{ fontSize: "0.75rem", color: P, textDecoration: "none", fontWeight: 700 }}>View</Link>
                      <span style={{ color: "#e2e8f0" }}>|</span>
                      <button onClick={() => toggleStatus(m.id, m.status)} style={{ fontSize: "0.75rem", color: m.status === "active" ? "#f59e0b" : "#10b981", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>
                        {m.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <span style={{ color: "#e2e8f0" }}>|</span>
                      <button onClick={() => handleResetPassword(m.id, `${m.firstName} ${m.lastName}`)} style={{ fontSize: "0.75rem", color: "#4f46e5", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>
                        Reset Pass
                      </button>
                      {isAdmin && <><span style={{ color: "#e2e8f0" }}>|</span>
                        <button onClick={() => promptDeleteMember(m.id, `${m.firstName} ${m.lastName}`)} style={{ fontSize: "0.75rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>Delete</button></>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile View (Cards) ── */}
      <div className="mobile-view" style={{ display: "none" }}>
        {filtered.map(m => (
          <div key={m.id} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            {/* Header: Name & Status badges */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.625rem" }}>
              <div>
                <Link href={`/member/${m.id}`} style={{ fontWeight: 800, color: "#0f172a", textDecoration: "none", fontSize: "1.0625rem", lineHeight: 1.25 }}>
                  {m.firstName} {m.lastName}
                </Link>
                {m.joinDate && (
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                    Since {new Date(m.joinDate).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: STATUS_COLOR[m.status] ?? "#64748b", background: `${STATUS_COLOR[m.status] ?? "#64748b"}18`, padding: "0.2rem 0.5rem", borderRadius: "4px", textTransform: "capitalize" }}>
                  {m.status}
                </span>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, color: ROLE_COLOR[m.role] ?? "#64748b", background: `${ROLE_COLOR[m.role] ?? "#64748b"}18`, padding: "0.2rem 0.5rem", borderRadius: "4px", textTransform: "capitalize" }}>
                  {m.role}
                </span>
              </div>
            </div>

            {/* Badges: Type & Active Ministries */}
            <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.7rem", background: "#f1f5f9", color: "#475569", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 500 }}>
                {m.type}
              </span>
              {m.ministries.map((mm, j) => (
                <span key={j} style={{ fontSize: "0.7rem", background: P, color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 500 }}>
                  {mm.ministry.name}
                </span>
              ))}
            </div>

            {/* Contact details & Username card */}
            <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.75rem", fontSize: "0.8rem", color: "#475569", marginBottom: "0.75rem", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", marginBottom: "0.35rem" }}>
                <span style={{ width: "80px", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>Email:</span>
                <span style={{ wordBreak: "break-all" }}>{m.email ?? "—"}</span>
              </div>
              <div style={{ display: "flex", marginBottom: "0.35rem" }}>
                <span style={{ width: "80px", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>Phone:</span>
                <span>{m.phone ?? "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "80px", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>Username:</span>
                <code style={{ background: "#e2e8f0", color: "#0f172a", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {m.username ?? "—"}
                </code>
              </div>
            </div>

            {/* Responsive Actions bar */}
            <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem", flexWrap: "wrap" }}>
              <Link href={`/member/${m.id}`} style={{ flex: 1, textAlign: "center", fontSize: "0.75rem", color: P, background: "#e0f7fb", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, textDecoration: "none" }}>
                View
              </Link>
              <button onClick={() => toggleStatus(m.id, m.status)} style={{ flex: 1.5, fontSize: "0.75rem", color: m.status === "active" ? "#d97706" : "#059669", background: m.status === "active" ? "#fef3c7" : "#d1fae5", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, cursor: "pointer" }}>
                {m.status === "active" ? "Deactivate" : "Activate"}
              </button>
              <button onClick={() => handleResetPassword(m.id, `${m.firstName} ${m.lastName}`)} style={{ flex: 1.5, fontSize: "0.75rem", color: "#4f46e5", background: "#e0e7ff", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, cursor: "pointer" }}>
                Reset Pass
              </button>
              {isAdmin && (
                <button onClick={() => promptDeleteMember(m.id, `${m.firstName} ${m.lastName}`)} style={{ flex: 1, fontSize: "0.75rem", color: "#dc2626", background: "#fee2e2", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, cursor: "pointer" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>No members found.</div>
        )}
      </div>

      {/* ── Custom Password Reset Modal (Glassmorphic) ── */}
      {resetDetails.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: 440, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🔑</span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>Temporary Credentials</h2>
            </div>

            {resetDetails.loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 0" }}>
                <div className="spinner" style={{ width: "32px", height: "32px", border: "3px solid #f3f3f3", borderTop: `3px solid ${P}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: "1rem", color: "#64748b", fontSize: "0.875rem", fontWeight: 600 }}>Resetting account password...</p>
              </div>
            ) : resetDetails.error ? (
              <div>
                <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: "1rem 0" }}>{resetDetails.error}</p>
                <button onClick={() => setResetDetails(prev => ({ ...prev, open: false }))} style={{ width: "100%", padding: "0.625rem", border: "none", borderRadius: "8px", background: "#f1f5f9", color: "#475569", fontWeight: 700, cursor: "pointer" }}>Close</button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
                  Password reset successfully for <strong style={{ color: "#0f172a" }}>{resetDetails.name}</strong>. Share the credentials package below:
                </p>

                {/* Details card */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "1rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Username:</span>
                    <strong style={{ color: "#0f172a" }}>{resetDetails.username}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Password:</span>
                    <code style={{ background: "#fef3c7", color: "#d97706", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.875rem" }}>
                      {resetDetails.password}
                    </code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Login Link:</span>
                    <a href="https://connect.houseofgrace.ph/login" target="_blank" rel="noreferrer" style={{ color: P, fontWeight: 700, textDecoration: "none" }}>
                      connect.houseofgrace.ph/login
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "none",
                      borderRadius: "10px",
                      background: resetDetails.copied ? "#10b981" : P,
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      transition: "background 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem"
                    }}
                  >
                    {resetDetails.copied ? "📋 Copied successfully! ✓" : "📋 Copy Account Info"}
                  </button>
                  <button
                    onClick={() => setResetDetails(prev => ({ ...prev, open: false }))}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "white",
                      color: "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.875rem"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel} confirmColor={confirmModal.confirmColor} loading={confirmModal.loading} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))} />

      {/* Responsive Styles Injection */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 767px) {
          .desktop-view {
            display: none !important;
          }
          .mobile-view {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
