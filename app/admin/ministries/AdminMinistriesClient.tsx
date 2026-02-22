"use client";
import { useState } from "react";

const P = "#4EB1CB";

type Ministry = { id: number; name: string; description: string | null; status: string; _count: { members: number } };

export default function AdminMinistriesClient({ ministries: init }: { ministries: Ministry[] }) {
  const [ministries, setMinistries] = useState(init);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Ministry | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", description: "", status: "active" });

  function openAdd() { setEditing(null); setForm({ name: "", description: "", status: "active" }); setShowModal(true); }
  function openEdit(m: Ministry) { setEditing(m); setForm({ name: m.name, description: m.description ?? "", status: m.status }); setShowModal(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    const url = editing ? `/api/ministries/${editing.id}` : "/api/ministries";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Failed"); setSaving(false); return; }
    if (editing) {
      setMinistries(prev => prev.map(m => m.id === editing.id ? { ...m, ...form } : m));
    } else {
      setMinistries(prev => [...prev, { ...(data.ministry ?? data), _count: { members: 0 } }]);
    }
    setShowModal(false); setSaving(false);
  }

  async function toggleActive(m: Ministry) {
    const newStatus = m.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/ministries/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) setMinistries(prev => prev.map(mi => mi.id === m.id ? { ...mi, status: newStatus } : mi));
  }

  const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>🙌 Ministries</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{ministries.length} ministries</p>
        </div>
        <button onClick={openAdd} style={{ background: P, color: "white", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}>➕ Add Ministry</button>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>{editing ? "Edit Ministry" : "Add Ministry"}</h2>
            <form onSubmit={handleSave}>
              <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Name *</label>
                <input required style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Description</label>
                <textarea style={{ ...inp, resize: "vertical" }} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Status</label>
                <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select></div>
              {err && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{err}</p>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700 }}>
                  {saving ? "Saving…" : editing ? "Update" : "Add Ministry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {ministries.map(m => (
          <div key={m.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{m.name}</h3>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "4px", background: m.status === "active" ? "#d1fae5" : "#f1f5f9", color: m.status === "active" ? "#10b981" : "#94a3b8" }}>
                {m.status}
              </span>
            </div>
            {m.description && <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 0.75rem", lineHeight: 1.5 }}>{m.description}</p>}
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.875rem" }}>👥 {m._count.members} active member{m._count.members !== 1 ? "s" : ""}</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => openEdit(m)} style={{ flex: 1, padding: "0.4rem", border: `1.5px solid ${P}30`, background: `${P}10`, color: P, borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Edit</button>
              <button onClick={() => toggleActive(m)} style={{ flex: 1, padding: "0.4rem", border: "1.5px solid #e2e8f0", background: "white", color: "#64748b", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
                {m.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
