"use client";
import React, { useState, useMemo, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { useUpload } from "@/context/UploadContext";

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
  presentationFile: string | null;
  presentationOriginalName: string | null;
  presentationSlides: string[] | any | null;
  creator: { firstName: string; lastName: string } | null;
  speaker: string | null;
  commentary: string | null;
};

const fmtDate = (d: string) => {
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
  } catch { return d; }
};

const parseToDate = (t: string | null): Date | null => {
  if (!t) return null;
  try {
    if (t.includes("T")) {
      const normalized = t.endsWith("Z") ? t : `${t}Z`;
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const match = t.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      const h = match[1];
      const m = match[2];
      const s = match[3] || "00";
      return new Date(`1970-01-01T${h}:${m}:${s}Z`);
    }
    const fallback = new Date(t);
    if (!isNaN(fallback.getTime())) return fallback;
  } catch {}
  return null;
};

const fmtTime = (t: string | null) => {
  const d = parseToDate(t);
  if (!d) return "";
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
};

const toHHMM = (t: string | null) => {
  const d = parseToDate(t);
  if (!d) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
};

export const PRIMARY_SPEAKERS = [
  { label: "Ptra. Shalom Love Joy Baltazar", short: "Ptra. Shalom", aliases: ["shalom", "baltazar"] },
  { label: "Ptr. William Del Carmen", short: "Ptr. William", aliases: ["william", "carmen"] },
  { label: "Lilybeth Gabonada", short: "Beth G.", aliases: ["lilybeth", "beth", "gabonada", "lilyg"] },
  { label: "Ryan Paco", short: "Ryan P.", aliases: ["ryan", "paco"] },
  { label: "Karen Paco", short: "Karen P.", aliases: ["karen", "tan"] },
  { label: "Jun-jun Baltazar", short: "Jun-jun B.", aliases: ["jun-jun", "jun", "junbaltazar"] },
  { label: "Caryn Pepito", short: "Caryn P.", aliases: ["caryn", "pepito"] },
  { label: "Rina Del Carmen", short: "Rina D.", aliases: ["rina", "rinagirl"] },
  { label: "Bishop Joel M. Montes", short: "Bishop Joel", aliases: ["joel", "montes"] },
];

export function detectDefaultSpeaker(user?: { firstName?: string; lastName?: string; username?: string; name?: string } | null): string {
  if (!user) return "Ptr. William Del Carmen";
  const first = (user.firstName || "").toLowerCase();
  const last = (user.lastName || "").toLowerCase();
  const uname = (user.username || "").toLowerCase();
  const full = `${first} ${last} ${uname}`.trim();

  for (const s of PRIMARY_SPEAKERS) {
    if (s.aliases.some((a) => a && full.includes(a.toLowerCase()))) {
      return s.label;
    }
  }

  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`.trim();
  }
  return user.name || "Ptr. William Del Carmen";
}

export default function AdminEventsClient({
  events: initial,
  currentUser,
}: {
  events: EventRow[];
  currentUser?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    username?: string;
    name?: string;
  } | null;
}) {
  const [events, setEvents] = useState(initial);
  const stats = useMemo(() => {
    const total = events.length;
    const sundayServices = events.filter(e => e.eventType === "sunday_service").length;
    const thisMonth = events.filter(e => {
      const d = new Date(e.eventDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const withSlides = events.filter(e => e.presentationFile).length;
    return { total, sundayServices, thisMonth, withSlides };
  }, [events]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({
    title: "", description: "", eventDate: "", startTime: "", endTime: "", location: "", eventType: "sunday_service", status: "scheduled", coverPhoto: "",
    presentationFile: "", presentationOriginalName: "", presentationSlides: [] as string[], speaker: "", commentary: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [presUploading, setPresUploading] = useState(false);
  const [presProgress, setPresProgress] = useState(0);
  const [dragCover, setDragCover] = useState(false);
  const [dragPres, setDragPres] = useState(false);

  const { startUpload } = useUpload();

  const onDragOverCover = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragCover(true);
  };
  const onDragLeaveCover = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCover(false);
  };
  const onDropCover = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCover(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleCoverUpload(file);
    }
  };

  const onDragOverPres = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!presUploading) setDragPres(true);
  };
  const onDragLeavePres = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragPres(false);
  };
  const onDropPres = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragPres(false);
    if (presUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf" || ext === "pptx" || file.type === "application/pdf" || file.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        handlePresentationUpload(file);
      }
    }
  };

  // ── Confirm modal state ──
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string;
    confirmColor: string; loading: boolean; onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", confirmColor: "#ef4444", loading: false, onConfirm: () => {} });

  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = typeFilter === "all" ? events : events.filter(e => e.eventType === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        (e.title || "").toLowerCase().includes(q) ||
        (e.speaker || "").toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.location || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, typeFilter, searchQuery]);

  function openAdd() { 
    setEditing(null); 
    setErr("");
    const defaultSpeaker = detectDefaultSpeaker(currentUser);
    setForm({ 
      title: "", 
      description: "", 
      eventDate: "", 
      startTime: "", 
      endTime: "", 
      location: "", 
      eventType: "sunday_service", 
      status: "scheduled", 
      coverPhoto: "", 
      presentationFile: "", 
      presentationOriginalName: "", 
      presentationSlides: [], 
      speaker: defaultSpeaker, 
      commentary: "" 
    }); 
    setShowModal(true); 
  }
  
  function openEdit(ev: EventRow) {
    setEditing(ev);
    setErr("");
    setForm({ 
      title: ev.title, 
      description: ev.description ?? "", 
      eventDate: ev.eventDate.slice(0, 10), 
      startTime: toHHMM(ev.startTime), 
      endTime: toHHMM(ev.endTime), 
      location: ev.location ?? "", 
      eventType: ev.eventType, 
      status: ev.status, 
      coverPhoto: ev.coverPhoto ?? "",
      presentationFile: ev.presentationFile ?? "",
      presentationOriginalName: ev.presentationOriginalName ?? "",
      presentationSlides: (ev.presentationSlides as string[]) ?? [],
      speaker: ev.speaker ?? "",
      commentary: ev.commentary ?? "",
    });
    setShowModal(true);
  }

  async function handlePresentationUpload(file: File) {
    setPresUploading(true);
    setPresProgress(5);
    setErr("");
    try {
      const jobId = await startUpload(file);
      
      // Poll background status inline to bind form parameters on completion
      let complete = false;
      while (!complete) {
        await new Promise((r) => setTimeout(r, 1500));
        const res = await fetch(`/api/events/presentation/upload?jobId=${jobId}`);
        if (!res.ok) {
          throw new Error("Polling error");
        }
        const job = await res.json();
        
        setPresProgress(job.progress);
        
        if (job.status === "completed") {
          setForm((f) => ({
            ...f,
            presentationFile: job.result.presentationFile,
            presentationOriginalName: job.result.presentationOriginalName,
            presentationSlides: job.result.presentationSlides,
            commentary: job.result.commentary || f.commentary,
          }));
          complete = true;
        } else if (job.status === "failed") {
          throw new Error(job.error || "Optimization failed");
        }
      }
    } catch (errErr: any) {
      setErr(errErr.message || "Failed to process presentation slides");
    } finally {
      setPresUploading(false);
      setPresProgress(0);
    }
  }

  async function handleCoverUpload(file: File) {
    setUploading(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/events/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.photoPath) {
        setForm(f => ({ ...f, coverPhoto: data.photoPath }));
      } else {
        setErr(data.error ?? "Upload failed");
      }
    } catch { 
      setErr("Network error during upload");
    } finally { 
      setUploading(false); 
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); 
    setSaving(true); 
    setErr("");
    
    try {
      const url = editing ? `/api/events/${editing.id}` : "/api/events";
      const method = editing ? "PATCH" : "POST";
      const body = { 
        ...form, 
        endTime: form.endTime || null, 
        coverPhoto: form.coverPhoto || null,
        presentationFile: form.presentationFile || null,
        presentationOriginalName: form.presentationOriginalName || null,
        presentationSlides: form.presentationSlides.length > 0 ? form.presentationSlides : null,
        speaker: form.speaker || null,
        commentary: form.commentary || null,
      };
      
      const res = await fetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      });
      
      const data = await res.json();
      if (!res.ok) { 
        setErr(data.error ?? "Failed to save event"); 
        setSaving(false); 
        return; 
      }
      
      const savedEvent = data.event ?? data;
      if (editing) {
        setEvents(prev => prev.map(e => e.id === editing.id ? { ...e, ...savedEvent } : e));
      } else {
        setEvents(prev => [savedEvent, ...prev]);
      }
      
      setShowModal(false);
    } catch (err) {
      setErr("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  function promptDelete(id: number, title: string) {
    setConfirmModal({
      open: true,
      title: "Delete Event",
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      confirmColor: "#ef4444",
      loading: false,
      onConfirm: () => executeDelete(id),
    });
  }

  async function executeDelete(id: number) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
        setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
      } else {
        const data = await res.json();
        setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
        setErr(data.error ?? "Failed to delete event");
      }
    } catch {
      setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
      setErr("Network error occurred while deleting");
    }
  }

  const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
  const half: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" };

  return (
    <div className="events-page-container" style={{ padding: "1.5rem 2rem" }}>
      <div className="events-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>📅 Events</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{events.length} total events</p>
        </div>
        <button onClick={openAdd} style={{ background: P, color: "white", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}>➕ Add Event</button>
      </div>

      {err && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>{err} <button onClick={() => setErr("")} style={{ float: "right", background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}

      {/* Search Bar */}
      <div style={{ marginBottom: "1.5rem", maxWidth: "450px" }}>
        <input
          type="text"
          placeholder="🔍 Search events by title, speaker, location..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.625rem 0.875rem",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            outline: "none",
            fontSize: "0.875rem",
            boxSizing: "border-box"
          }}
        />
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {["all", ...EVENT_TYPES].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "0.375rem 0.875rem", borderRadius: "999px", border: "1.5px solid", borderColor: typeFilter === t ? P : "#e2e8f0", background: typeFilter === t ? P : "white", color: typeFilter === t ? "white" : "#64748b", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
            {t === "all" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* KPI Stats widgets row */}
      <div className="events-kpis-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "8px", background: "#3b82f615", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>📅</div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Events</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{stats.total}</span>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "8px", background: `${P}15`, color: P, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>⛪</div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Sunday Services</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{stats.sundayServices}</span>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "8px", background: "#10b98115", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>📈</div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>This Month</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{stats.thisMonth}</span>
          </div>
        </div>
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "8px", background: "#8b5cf615", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>📽️</div>
          <div>
            <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Presentations</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{stats.withSlides}</span>
          </div>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>{editing ? "Edit Event" : "Add New Event"}</h2>
            <form onSubmit={handleSave}>
              <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Title *</label>
                <input required style={inp} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Description</label>
                <textarea style={{ ...inp, resize: "none" }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Sermon Commentary & Takeaways (Markdown supported)</label>
                <textarea style={{ ...inp, resize: "vertical" }} rows={4} value={form.commentary} onChange={e => setForm(f => ({ ...f, commentary: e.target.value }))} placeholder="AI generated summary, takeaways, and reflections will populate here..." /></div>
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
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                    Speaker / Preacher
                  </label>
                  {form.speaker && (
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, speaker: "" }))}
                      style={{ border: "none", background: "none", color: "#94a3b8", fontSize: "0.7rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick 1-Tap Speaker Selector Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.45rem" }}>
                  {PRIMARY_SPEAKERS.map(s => {
                    const isSelected = form.speaker.trim().toLowerCase() === s.label.toLowerCase();
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, speaker: s.label }))}
                        style={{
                          padding: "0.22rem 0.55rem",
                          borderRadius: "999px",
                          fontSize: "0.72rem",
                          fontWeight: isSelected ? 700 : 500,
                          border: isSelected ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                          background: isSelected ? "#e0f2fe" : "#f8fafc",
                          color: isSelected ? "#0369a1" : "#475569",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                        }}
                      >
                        {isSelected && <span style={{ fontSize: "0.65rem" }}>✓</span>}
                        {s.short}
                      </button>
                    );
                  })}
                </div>

                {/* Autocomplete Input with datalist + Custom Type support */}
                <div style={{ position: "relative" }}>
                  <input
                    list="speaker-suggestions"
                    style={inp}
                    value={form.speaker}
                    onChange={e => setForm(f => ({ ...f, speaker: e.target.value }))}
                    placeholder="Select from above or type any speaker/guest name..."
                  />
                  <datalist id="speaker-suggestions">
                    {PRIMARY_SPEAKERS.map(s => (
                      <option key={s.label} value={s.label} />
                    ))}
                  </datalist>
                </div>
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
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={uploading} 
                    onDragOver={onDragOverCover}
                    onDragLeave={onDragLeaveCover}
                    onDrop={onDropCover}
                    style={{ 
                      ...inp, 
                      marginTop: "0.375rem", 
                      cursor: "pointer", 
                      color: "#64748b", 
                      textAlign: "center" as const, 
                      background: dragCover ? "#e0f2fe" : "#f8fafc",
                      border: dragCover ? `2px dashed ${P}` : "1.5px dashed #cbd5e1",
                      padding: "1.25rem 0.75rem",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {uploading ? "Uploading…" : dragCover ? "💧 Drop image here" : "📷 Click or Drag & Drop cover photo"}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={e => { if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]); e.target.value = ""; }} />
              </div>

              {/* Sermon Presentation (PDF/PPTX) */}
              <div style={{ marginTop: "0.75rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Sermon Presentation (PDF or PPTX)</label>
                {form.presentationFile ? (
                  <div style={{ marginTop: "0.375rem", padding: "0.75rem", borderRadius: "8px", border: "1.5px solid #10b981", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <span style={{ fontSize: "1.25rem" }}>📽️</span>
                      <div style={{ minWidth: 0, textAlign: "left" }}>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#166534", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {form.presentationOriginalName}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "#15803d", margin: 0 }}>
                          ✅ Optimized & Compressed ({form.presentationSlides.length} slides)
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, presentationFile: "", presentationOriginalName: "", presentationSlides: [] }))} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 700 }}>✕ Remove</button>
                  </div>
                ) : (
                  <div>
                    <button 
                      type="button" 
                      onClick={() => presInputRef.current?.click()} 
                      disabled={presUploading} 
                      onDragOver={onDragOverPres}
                      onDragLeave={onDragLeavePres}
                      onDrop={onDropPres}
                      style={{ 
                        ...inp, 
                        marginTop: "0.375rem", 
                        cursor: "pointer", 
                        color: "#64748b", 
                        textAlign: "center" as const, 
                        background: dragPres ? "#e0f2fe" : "#f8fafc",
                        border: dragPres ? `2px dashed ${P}` : "1.5px dashed #cbd5e1",
                        padding: "1.25rem 0.75rem",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {presUploading ? `⚡ Optimizing slides... (${presProgress}%)` : dragPres ? "💧 Drop PDF/PPTX here" : "📁 Click or Drag & Drop PDF/PPTX presentation"}
                    </button>
                    <input ref={presInputRef} type="file" accept=".pdf,.pptx" hidden onChange={e => { if (e.target.files?.[0]) handlePresentationUpload(e.target.files[0]); e.target.value = ""; }} />
                  </div>
                )}
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

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      {/* Cards */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {filtered.map(ev => (
          <div key={ev.id} className="event-card" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.25rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            {ev.coverPhoto ? (
              <div className="event-card-icon-container" style={{ width: 48, height: 48, borderRadius: "10px", overflow: "hidden", flexShrink: 0 }}>
                <img src={`/uploads/events/${ev.coverPhoto}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            ) : (
              <div className="event-card-icon-container" style={{ width: 48, height: 48, borderRadius: "10px", background: `${TYPE_COLORS[ev.eventType] ?? "#94a3b8"}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>
                {ev.eventType === "sunday_service" ? "⛪" : ev.eventType === "prayer_meeting" ? "🙏" : ev.eventType === "bible_study" ? "📖" : ev.eventType === "grace_night" ? "🌙" : "📅"}
              </div>
            )}
            <div className="event-card-details-container" style={{ flex: 1, minWidth: 0 }}>
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
            <div className="event-actions" style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <a href={`/admin/events/${ev.id}/analytics`} style={{ padding: "0.375rem 0.75rem", border: "1.5px solid #6366f130", background: "#6366f110", color: "#6366f1", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>📊 Stats</a>
              <a href={`/event/${ev.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: "0.375rem 0.75rem", border: "1.5px solid #10b98130", background: "#10b98110", color: "#10b981", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", textDecoration: "none" }}>View</a>
              <button onClick={() => openEdit(ev)} style={{ padding: "0.375rem 0.75rem", border: `1.5px solid ${P}30`, background: `${P}10`, color: P, borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Edit</button>
              <button onClick={() => promptDelete(ev.id, ev.title)} style={{ padding: "0.375rem 0.75rem", border: "1.5px solid #fee2e2", background: "#fef2f2", color: "#ef4444", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>No events found.</div>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .events-page-container {
            padding: 1rem !important;
          }
          .events-header {
            flex-direction: column;
            align-items: stretch !important;
            gap: 1rem;
          }
          .events-header button {
            width: 100%;
            text-align: center;
          }
          .event-card {
            flex-direction: column;
            align-items: stretch !important;
            gap: 1rem !important;
          }
          .event-card-icon-container {
            align-self: flex-start;
          }
          .event-card-details-container {
            min-width: 100% !important;
          }
          .event-actions {
            width: 100%;
            justify-content: flex-end;
            border-top: 1px solid #f1f5f9;
            padding-top: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
