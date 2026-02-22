"use client";
import { useState, useEffect } from "react";

const P = "#4EB1CB";

export default function AdminSendSmsPage() {
  const [members, setMembers] = useState<{ id: number; firstName: string; lastName: string; phone: string | null; type: string; ageGroup: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/members?status=active&limit=500")
      .then(r => r.json())
      .then(d => setMembers(d.members ?? d ?? []));
  }, []);

  const filtered = filter === "all" ? members : members.filter(m => m.type === filter || m.ageGroup === filter);
  const allSelected = filtered.length > 0 && filtered.every(m => selected.has(m.id));

  function toggleAll() {
    if (allSelected) { const s = new Set(selected); filtered.forEach(m => s.delete(m.id)); setSelected(s); }
    else { const s = new Set(selected); filtered.forEach(m => s.add(m.id)); setSelected(s); }
  }

  function toggle(id: number) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  async function handleSend() {
    if (selected.size === 0) { alert("Select at least one recipient."); return; }
    if (!message.trim()) { alert("Enter a message."); return; }
    if (!confirm(`Send SMS to ${selected.size} recipient${selected.size !== 1 ? "s" : ""}?`)) return;
    setSending(true); setResult(null);
    const res = await fetch("/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: Array.from(selected), message }),
    });
    const data = await res.json();
    setResult({ success: res.ok, message: data.message ?? (res.ok ? "Queued successfully" : "Failed to send") });
    if (res.ok) { setSelected(new Set()); setMessage(""); }
    setSending(false);
  }

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>📱 Send Custom SMS</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>Send a message to selected active members</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem", alignItems: "flex-start" }}>
        {/* Recipient picker */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>Recipients</span>
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{selected.size} selected</span>
            <div style={{ flex: 1 }} />
            {["all", "Family Member", "Growing Friend", "New Friend", "Adult", "Youth", "Kids"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "0.25rem 0.625rem", fontSize: "0.75rem", fontWeight: 700, borderRadius: "999px", border: "1.5px solid", borderColor: filter === f ? P : "#e2e8f0", background: filter === f ? P : "white", color: filter === f ? "white" : "#64748b", cursor: "pointer" }}>
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            <div onClick={toggleAll} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 1rem", cursor: "pointer", borderBottom: "1px solid #f8fafc", background: "#f8fafc" }}>
              <input type="checkbox" readOnly checked={allSelected} style={{ width: 16, height: 16 }} />
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#475569" }}>Select all ({filtered.length})</span>
            </div>
            {filtered.map(m => (
              <div key={m.id} onClick={() => toggle(m.id)} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 1rem", cursor: "pointer", borderBottom: "1px solid #f8fafc", background: selected.has(m.id) ? `${P}08` : "white" }}>
                <input type="checkbox" readOnly checked={selected.has(m.id)} style={{ width: 16, height: 16 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a" }}>{m.firstName} {m.lastName}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{m.phone ?? "No phone"} · {m.ageGroup ?? m.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message composer */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem" }}>
          <h3 style={{ fontWeight: 800, color: "#0f172a", margin: "0 0 1rem", fontSize: "0.9rem" }}>Compose Message</h3>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={8}
            maxLength={1000}
            placeholder="Type your SMS message here…"
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.75rem", fontSize: "0.875rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.375rem", textAlign: "right" }}>{message.length}/1000</div>

          {result && (
            <div style={{ padding: "0.75rem", borderRadius: "8px", background: result.success ? "#d1fae5" : "#fee2e2", color: result.success ? "#065f46" : "#991b1b", fontSize: "0.85rem", fontWeight: 600, marginTop: "0.75rem" }}>
              {result.success ? "✅ " : "❌ "}{result.message}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || selected.size === 0 || !message.trim()}
            style={{ width: "100%", marginTop: "1rem", padding: "0.75rem", background: sending || selected.size === 0 || !message.trim() ? "#94a3b8" : P, color: "white", border: "none", borderRadius: "8px", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
          >
            {sending ? "Sending…" : `📤 Send to ${selected.size} Member${selected.size !== 1 ? "s" : ""}`}
          </button>
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem", textAlign: "center" }}>
            SMS will be queued via the batch system
          </p>
        </div>
      </div>
    </div>
  );
}
