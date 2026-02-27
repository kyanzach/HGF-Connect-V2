"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const P = "#4EB1CB";
const EVENT_TYPES = ["sunday_service", "prayer_meeting", "bible_study", "special_event", "grace_night", "other"];
const TYPE_LABELS: Record<string, string> = {
  sunday_service: "Sunday Service", prayer_meeting: "Prayer Meeting",
  bible_study: "Bible Study", special_event: "Special Event",
  grace_night: "Grace Night", other: "Other",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddEventModal({ open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", eventDate: "", startTime: "", endTime: "",
    location: "", eventType: "sunday_service", coverPhoto: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    const body = { ...form, endTime: form.endTime || null, coverPhoto: form.coverPhoto || null };
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error ?? "Failed to create event"); setSaving(false); return; }
      onClose();
      router.push("/events");
      router.refresh();
    } catch {
      setErr("Network error");
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px",
    padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box",
  };
  const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" };
  const lbl: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 700, color: "#64748b" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>📅 Add New Event</h2>
        <form onSubmit={handleSubmit}>
          <div><label style={lbl}>Title *</label>
            <input required style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ marginTop: "0.75rem" }}><label style={lbl}>Description</label>
            <textarea style={{ ...inp, resize: "none" }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          <div style={half}>
            <div><label style={lbl}>Date *</label>
              <input required type="date" style={inp} value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} /></div>
            <div><label style={lbl}>Type *</label>
              <select required style={inp} value={form.eventType} onChange={e => setForm(f => ({ ...f, eventType: e.target.value }))}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select></div>
          </div>
          <div style={half}>
            <div><label style={lbl}>Start Time *</label>
              <input required type="time" style={inp} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></div>
            <div><label style={lbl}>End Time</label>
              <input type="time" style={inp} value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></div>
          </div>
          <div style={{ marginTop: "0.75rem" }}><label style={lbl}>Location</label>
            <input style={inp} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue name" /></div>

          {/* Cover Photo */}
          <div style={{ marginTop: "0.75rem" }}>
            <label style={lbl}>Cover Photo</label>
            {form.coverPhoto ? (
              <div style={{ marginTop: "0.375rem", position: "relative", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #e2e8f0" }}>
                <img src={`/uploads/events/${form.coverPhoto}`} alt="Cover" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, coverPhoto: "" }))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ ...inp, marginTop: "0.375rem", cursor: "pointer", color: "#64748b", textAlign: "center" as const, background: "#f8fafc" }}>
                {uploading ? "Uploading…" : "📷 Click to upload cover photo"}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]); e.target.value = ""; }} />
          </div>

          {err && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{err}</p>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
            <button type="submit" disabled={saving || uploading} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700, opacity: saving || uploading ? 0.6 : 1 }}>
              {saving ? "Creating…" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
