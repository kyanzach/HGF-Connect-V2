"use client";
import { useState, useMemo, useRef } from "react";

const P = "#4EB1CB";

const EVENT_TYPES = ["sunday_service", "prayer_meeting", "bible_study", "special_event", "grace_night", "other"];
const TYPE_LABELS: Record<string, string> = {
  sunday_service: "Sunday Service", prayer_meeting: "Prayer Meeting",
  bible_study: "Bible Study", special_event: "Special Event",
  grace_night: "Grace Night", other: "Other",
};
const TYPE_COLORS: Record<string, string> = {
  sunday_service: "#4EB1CB", prayer_meeting: "#8b5cf6", bible_study: "#10b981",
  special_event: "#f59e0b", grace_night: "#ec4899", other: "#94a3b8",
};

type EventRow = {
  id: number; title: string; description: string | null; eventDate: string;
  startTime: string; endTime: string | null; location: string | null;
  eventType: string; status: string; createdBy: number;
  coverPhoto: string | null;
  creator: { firstName: string; lastName: string } | null;
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
const fmtTime = (t: string) => new Date(`1970-01-01T${t}`).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });

export default function AdminEventsClient({ events: initial }: { events: EventRow[] }) {
  const [events, setEvents] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", description: "", eventDate: "", startTime: "", endTime: "", location: "", eventType: "sunday_service", status: "scheduled", coverPhoto: "" as string,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => typeFilter === "all" ? events : events.filter(e => e.eventType === typeFilter), [events, typeFilter]);

  function openAdd() { setEditing(null); setForm({ title: "", description: "", eventDate: "", startTime: "", endTime: "", location: "", eventType: "sunday_service", status: "scheduled", coverPhoto: "" }); setShowModal(true); }
  function openEdit(ev: EventRow) {
    setEditing(ev);
    setForm({ title: ev.title, description: ev.description ?? "", eventDate: ev.eventDate.slice(0, 10), startTime: ev.startTime.includes("T") ? ev.startTime.slice(11, 16) : ev.startTime.slice(0, 5), endTime: ev.endTime ? (ev.endTime.includes("T") ? ev.endTime.slice(11, 16) : ev.endTime.slice(0, 5)) : "", location: ev.location ?? "", eventType: ev.eventType, status: ev.status, coverPhoto: ev.coverPhoto ?? "" });
    setShowModal(true);
  }

  async function handleCoverUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/events/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.photoPath) setForm(f => ({ ...f, coverPhoto: data.photoPath }));
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr("");
    const url = editing ? `/api/events/${editing.id}` : "/api/events";
    const method = editing ? "PATCH" : "POST";
    const body = { ...form, eventDate: form.eventDate, endTime: form.endTime || null, coverPhoto: form.coverPhoto || null };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error ?? "Failed"); setSaving(false); return; }
    if (editing) {
      setEvents(prev => prev.map(e => e.id === editing.id ? { ...e, ...body } : e));
    } else {
      setEvents(prev => [data.event ?? data, ...prev]);
    }
    setShowModal(false); setSaving(false);
  }

  async function deleteEvent(id: number) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (res.ok) setEvents(prev => prev.filter(e => e.id !== id));
  }

  const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
  const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" };

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>📅 Events</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{events.length} total events</p>
        </div>
        <button onClick={openAdd} style={{ background: P, color: "white", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}>➕ Add Event</button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {["all", ...EVENT_TYPES].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "0.375rem 0.875rem", borderRadius: "999px", border: "1.5px solid", borderColor: typeFilter === t ? P : "#e2e8f0", background: typeFilter === t ? P : "white", color: typeFilter === t ? "white" : "#64748b", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
            {t === "all" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>{editing ? "Edit Event" : "Add New Event"}</h2>
            <form onSubmit={handleSave}>
              <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Title *</label>
                <input required style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Description</label>
                <textarea style={{ ...inp, resize: "none" }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div style={half}>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Date *</label>
                  <input required type="date" style={inp} value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} /></div>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Type *</label>
                  <select required style={inp} value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select></div>
              </div>
              <div style={half}>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Start Time *</label>
                  <input required type="time" style={inp} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>End Time</label>
                  <input type="time" style={inp} value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
              </div>
              <div style={half}>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Location</label>
                  <input style={inp} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue name" /></div>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Status</label>
                  <select style={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="scheduled">Scheduled</option><option value="cancelled">Cancelled</option><option value="completed">Completed</option>
                  </select></div>
              </div>
              {/* Cover Photo */}
              <div style={{ marginTop: "0.75rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Cover Photo</label>
                {form.coverPhoto ? (
                  <div style={{ marginTop: "0.375rem", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #e2e8f0" }}>
                    <img src={`/uploads/events/${form.coverPhoto}`} alt="Cover" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, coverPhoto: "" }))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ ...inp, marginTop: "0.375rem", cursor: "pointer", color: "#64748b", textAlign: "center" as const, background: "#f8fafc" }}>
                    {uploading ? "Uploading…" : "📷 Click to upload cover photo"}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={e => { if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]); e.target.value = ""; }} />
              </div>
              {err && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{err}</p>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700 }}>
                  {saving ? "Saving…" : editing ? "Update Event" : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {filtered.map(ev => (
          <div key={ev.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, borderRadius: "10px", background: `${TYPE_COLORS[ev.eventType] ?? "#94a3b8"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>
              {ev.eventType === "sunday_service" ? "⛪" : ev.eventType === "prayer_meeting" ? "🙏" : ev.eventType === "bible_study" ? "📖" : ev.eventType === "grace_night" ? "🌙" : "📅"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>{ev.title}</h3>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: TYPE_COLORS[ev.eventType] ?? "#64748b", background: `${TYPE_COLORS[ev.eventType] ?? "#94a3b8"}18`, padding: "0.2rem 0.5rem", borderRadius: "4px", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {TYPE_LABELS[ev.eventType] ?? ev.eventType}
                </span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0.25rem 0 0" }}>
                📅 {fmtDate(ev.eventDate)} · ⏰ {fmtTime(ev.startTime)}{ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ""}{ev.location ? ` · 📍 ${ev.location}` : ""}
              </p>
              {ev.description && <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.25rem 0 0" }}>{ev.description}</p>}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button onClick={() => openEdit(ev)} style={{ padding: "0.375rem 0.75rem", border: `1.5px solid ${P}30`, background: `${P}10`, color: P, borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Edit</button>
              <button onClick={() => deleteEvent(ev.id)} style={{ padding: "0.375rem 0.75rem", border: "1.5px solid #fee2e2", background: "#fef2f2", color: "#ef4444", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>No events found.</div>
        )}
      </div>
    </div>
  );
}
