"use client";
import React, { useState, useMemo } from "react";
import ConfirmModal from "@/components/ConfirmModal";

const P = "#4EB1CB";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  attendance: {
    id: number;
    attendanceDate: string;
  }[];
};

type AttendanceRecord = {
  id: number;
  memberId: number | null;
  eventId: number | null;
  attendanceDate: string | null;
  isFirstVisit: boolean;
  notes: string | null;
  member: Member | null;
};

type EventRow = {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  eventType: string;
  speaker: string | null;
  commentary: string | null;
  creator: { firstName: string; lastName: string } | null;
};

interface EventAnalyticsClientProps {
  event: EventRow;
  attendance: AttendanceRecord[];
  members: Member[];
}

const fmtDate = (d: string) => {
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Asia/Manila",
    });
  } catch {
    return d;
  }
};

const fmtTime = (t: string | null) => {
  if (!t) return "";
  try {
    const d = new Date(t.includes("T") ? t : `1970-01-01T${t}Z`);
    return d.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    });
  } catch {
    return t;
  }
};

const TYPE_LABELS: Record<string, string> = {
  sunday_service: "Sunday Service",
  prayer_meeting: "Prayer Meeting",
  bible_study: "Bible Study",
  special_event: "Special Event",
  grace_night: "Grace Night",
  other: "Other",
};

export default function EventAnalyticsClient({
  event,
  attendance,
  members,
}: EventAnalyticsClientProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "attendees" | "absent" | "returned" | "outreach">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutreach, setSelectedOutreach] = useState<number[]>([]);
  const [smsModal, setSmsModal] = useState<{
    open: boolean;
    recipients: { id: number; name: string; phone: string }[];
    message: string;
    sending: boolean;
    error: string;
    success: string;
  }>({
    open: false,
    recipients: [],
    message: "",
    sending: false,
    error: "",
    success: "",
  });

  const eventTime = useMemo(() => new Date(event.eventDate).getTime(), [event]);

  // 1. Segment members based on attendance
  const attendeeIds = useMemo(() => new Set(attendance.map((a) => a.memberId).filter(Boolean)), [attendance]);

  const segmentedData = useMemo(() => {
    // Actives/Approved
    const activePool = members.filter((m) => ["active", "approved"].includes(m.status));
    
    // Attended Actives
    const attendedActives = activePool.filter((m) => attendeeIds.has(m.id));
    
    // Absent Actives
    const absentActives = activePool.filter((m) => !attendeeIds.has(m.id));

    // Returned Inactives (marked inactive in db, but attended this event)
    const returnedInactives = members.filter((m) => m.status === "inactive" && attendeeIds.has(m.id));

    // Guests (marked guest in db, or new first-time visit)
    const guests = attendance.filter((a) => !a.member || a.member.status === "guest" || a.isFirstVisit);

    // Calculate consecutive absences for absent active members
    const absentWithAbsenceData = absentActives.map((m) => {
      // Find the last attendance before this event
      const lastAttendance = m.attendance.find(
        (a) => new Date(a.attendanceDate).getTime() < eventTime
      );

      let consecutiveWeeks = 0;
      let lastDateString = "Never";

      if (lastAttendance) {
        const lastTime = new Date(lastAttendance.attendanceDate).getTime();
        const diffDays = Math.floor((eventTime - lastTime) / (1000 * 60 * 60 * 24));
        consecutiveWeeks = Math.floor(diffDays / 7);
        lastDateString = fmtDate(lastAttendance.attendanceDate);
      } else {
        consecutiveWeeks = 12; // cap placeholder for never attended
      }

      return {
        member: m,
        lastAttended: lastDateString,
        weeksAbsent: consecutiveWeeks,
      };
    });

    // Outreach candidates: Absent actives who missed >= 3 weeks, OR any inactive member who didn't attend
    const inactiveAbsentees = members.filter((m) => m.status === "inactive" && !attendeeIds.has(m.id));
    
    const chronicAbsentees = absentWithAbsenceData.filter((candidate) => candidate.weeksAbsent >= 3);

    const outreachCandidates = [
      ...chronicAbsentees.map((c) => ({
        id: c.member.id,
        name: `${c.member.firstName} ${c.member.lastName}`,
        phone: c.member.phone,
        status: c.member.status,
        reason: `Missed ${c.weeksAbsent} consecutive weeks (Last: ${c.lastAttended})`,
      })),
      ...inactiveAbsentees.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        phone: m.phone,
        status: m.status,
        reason: "Inactive status (Needs regular follow-up outreach)",
      })),
    ];

    return {
      totalActives: activePool.length,
      attendedActives,
      absentActives: absentWithAbsenceData,
      returnedInactives,
      guests,
      outreachCandidates,
    };
  }, [members, attendeeIds, eventTime, attendance]);

  // Filters for tables/lists
  const filteredAttendees = useMemo(() => {
    return attendance.filter((a) => {
      const name = a.member ? `${a.member.firstName} ${a.member.lastName}`.toLowerCase() : "guest / visitor";
      const notes = (a.notes || "").toLowerCase();
      return name.includes(searchQuery.toLowerCase()) || notes.includes(searchQuery.toLowerCase());
    });
  }, [attendance, searchQuery]);

  const filteredAbsentActives = useMemo(() => {
    return segmentedData.absentActives.filter((c) => {
      const name = `${c.member.firstName} ${c.member.lastName}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    });
  }, [segmentedData.absentActives, searchQuery]);

  const filteredOutreach = useMemo(() => {
    return segmentedData.outreachCandidates.filter((c) => {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [segmentedData.outreachCandidates, searchQuery]);

  // SMS dispatch actions
  const openSingleSms = (id: number, name: string, phone: string | null) => {
    if (!phone) {
      alert(`Cannot send SMS to ${name} because they don't have a phone number on file.`);
      return;
    }
    setSmsModal({
      open: true,
      recipients: [{ id, name, phone }],
      message: `Hi ${name}, we missed you at our ${TYPE_LABELS[event.eventType] || "service"} "${event.title}". Hope to see you back with us soon! Join us next time. connect.houseofgrace.ph/login`,
      sending: false,
      error: "",
      success: "",
    });
  };

  const openBulkSms = () => {
    if (selectedOutreach.length === 0) return;
    const recipients = segmentedData.outreachCandidates
      .filter((c) => selectedOutreach.includes(c.id) && c.phone)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone! }));

    if (recipients.length === 0) {
      alert("None of the selected recipients have a valid phone number.");
      return;
    }

    setSmsModal({
      open: true,
      recipients,
      message: `Hi, we missed you at our ${TYPE_LABELS[event.eventType] || "service"}! We'd love to invite you to join us again this Sunday. Hope to see you! connect.houseofgrace.ph/login`,
      sending: false,
      error: "",
      success: "",
    });
  };

  const handleSendSms = async () => {
    setSmsModal((prev) => ({ ...prev, sending: true, error: "" }));
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: smsModal.recipients.map((r) => r.id),
          message: smsModal.message,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsModal((prev) => ({
          ...prev,
          sending: false,
          success: `Successfully queued SMS follow-up for ${smsModal.recipients.length} member(s)!`,
        }));
        // Clear selection
        setSelectedOutreach([]);
      } else {
        setSmsModal((prev) => ({ ...prev, sending: false, error: data.error || "Failed to send SMS." }));
      }
    } catch {
      setSmsModal((prev) => ({ ...prev, sending: false, error: "Network error occurred." }));
    }
  };

  const toggleSelectAllOutreach = () => {
    const candidatesWithPhone = segmentedData.outreachCandidates.filter((c) => c.phone);
    if (selectedOutreach.length === candidatesWithPhone.length) {
      setSelectedOutreach([]);
    } else {
      setSelectedOutreach(candidatesWithPhone.map((c) => c.id));
    }
  };

  const toggleSelectOutreach = (id: number) => {
    setSelectedOutreach((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Math formatting helper
  const attendanceRate = segmentedData.totalActives > 0
    ? Math.round((segmentedData.attendedActives.length / segmentedData.totalActives) * 100)
    : 0;

  return (
    <div className="event-analytics-container" style={{ padding: "1.5rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Back to Events and Title */}
      <div style={{ marginBottom: "1.5rem" }}>
        <a
          href="/admin/events"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#64748b",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}
        >
          ← Back to Event list
        </a>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
          📊 Event Attendance Analytics
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
          Comprehensive statistics, absence tracking, and pastoral care follow-up for <strong>{event.title}</strong>
        </p>
      </div>

      {/* Details Box */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: "16px",
          color: "white",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Event Title</span>
            <h2 style={{ fontSize: "1.25rem", margin: "0.25rem 0", color: "#f8fafc" }}>{event.title}</h2>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Event Type</span>
            <p style={{ margin: "0.25rem 0", color: "#f1f5f9", fontWeight: 600 }}>{TYPE_LABELS[event.eventType] || event.eventType}</p>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Speaker / Host</span>
            <p style={{ margin: "0.25rem 0", color: "#f1f5f9", fontWeight: 600 }}>{event.speaker || "None / N/A"}</p>
          </div>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Event Date & Time</span>
            <p style={{ margin: "0.25rem 0", color: "#f1f5f9", fontSize: "0.875rem" }}>
              {fmtDate(event.eventDate)} · {fmtTime(event.startTime)}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {/* Total Attended */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>TOTAL ATTENDED</span>
            <span style={{ fontSize: "1.25rem" }}>👥</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.5rem 0 0" }}>{attendance.length}</p>
        </div>

        {/* Active Member Attendance Rate */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>ACTIVE ATTENDANCE RATE</span>
            <span style={{ fontSize: "1.25rem" }}>📈</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: P, margin: "0.5rem 0 0" }}>{attendanceRate}%</p>
          <p style={{ fontSize: "0.7rem", color: "#64748b", margin: "0.125rem 0 0" }}>
            {segmentedData.attendedActives.length} / {segmentedData.totalActives} active members
          </p>
        </div>

        {/* Absent Actives */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>ABSENT ACTIVES</span>
            <span style={{ fontSize: "1.25rem" }}>❌</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444", margin: "0.5rem 0 0" }}>{segmentedData.absentActives.length}</p>
        </div>

        {/* Returned Inactives */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>RETURNED INACTIVES</span>
            <span style={{ fontSize: "1.25rem" }}>🎉</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#10b981", margin: "0.5rem 0 0" }}>{segmentedData.returnedInactives.length}</p>
          <p style={{ fontSize: "0.7rem", color: "#64748b", margin: "0.125rem 0 0" }}>Inactive members who attended</p>
        </div>

        {/* Follow-up Candidates */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>OUTREACH FOLLOW-UPS</span>
            <span style={{ fontSize: "1.25rem" }}>💬</span>
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f59e0b", margin: "0.5rem 0 0" }}>{segmentedData.outreachCandidates.length}</p>
          <p style={{ fontSize: "0.7rem", color: "#64748b", margin: "0.125rem 0 0" }}>Needs pastoral care reminder</p>
        </div>
      </div>

      {/* Tabs list */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1.5px solid #e2e8f0", marginBottom: "1.5rem", flexWrap: "wrap", paddingBottom: "0.5rem" }}>
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "attendees", label: `✅ Attendees (${attendance.length})` },
          { key: "absent", label: `❌ Absent Actives (${segmentedData.absentActives.length})` },
          { key: "returned", label: `🎉 Returned Inactives (${segmentedData.returnedInactives.length})` },
          { key: "outreach", label: `💬 Follow-up Outreach (${segmentedData.outreachCandidates.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveTab(t.key as any);
              setSearchQuery("");
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === t.key ? `${P}15` : "transparent",
              color: activeTab === t.key ? P : "#64748b",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Input for Data lists */}
      {activeTab !== "overview" && (
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="🔍 Search candidates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "0.5rem 0.75rem",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              outline: "none",
              fontSize: "0.875rem",
            }}
          />
        </div>
      )}

      {/* ────────────────── OVERVIEW TAB ────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="analytics-overview-grid">
          {/* Summary Chart placeholder */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 1rem" }}>Attendance Segmentation</h3>
            
            {/* Visual Segments */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>Active Members Attended</span>
                  <span style={{ color: "#64748b" }}>{segmentedData.attendedActives.length} ({attendanceRate}%)</span>
                </div>
                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${attendanceRate}%`, height: "100%", background: P }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>Returned Inactive Members</span>
                  <span style={{ color: "#64748b" }}>{segmentedData.returnedInactives.length} attendees</span>
                </div>
                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${segmentedData.returnedInactives.length > 0 ? 100 : 0}%`, height: "100%", background: "#10b981" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>First-time Visitors & Guests</span>
                  <span style={{ color: "#64748b" }}>{segmentedData.guests.length} visitors</span>
                </div>
                <div style={{ height: "8px", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${segmentedData.guests.length > 0 ? 100 : 0}%`, height: "100%", background: "#f59e0b" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Outreach list */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "0 0 1rem" }}>High Priority Outreach</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto" }}>
              {segmentedData.outreachCandidates.slice(0, 4).map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>{c.name}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#eab308" }}>⚠️ {c.reason.split(" (")[0]}</p>
                  </div>
                  {c.phone && (
                    <button
                      onClick={() => openSingleSms(c.id, c.name, c.phone)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: `${P}10`,
                        border: "none",
                        color: P,
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      💬 Remind
                    </button>
                  )}
                </div>
              ))}
              {segmentedData.outreachCandidates.length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", margin: "2rem 0" }}>🎉 Everyone is accounted for! No outstanding outreach needed.</p>
              )}
              {segmentedData.outreachCandidates.length > 4 && (
                <button
                  onClick={() => setActiveTab("outreach")}
                  style={{
                    background: "none",
                    border: "none",
                    color: P,
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  View all {segmentedData.outreachCandidates.length} outreach targets →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── ATTENDEES TAB ────────────────── */}
      {activeTab === "attendees" && (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Phone</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Visit Type</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                    {a.member ? `${a.member.firstName} ${a.member.lastName}` : "Guest / Visitor"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                    {a.member?.phone || "N/A"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {a.member ? (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          background: a.member.status === "inactive" ? "#fee2e2" : "#d1fae5",
                          color: a.member.status === "inactive" ? "#ef4444" : "#10b981",
                        }}
                      >
                        {a.member.status}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#fef3c7", color: "#d97706" }}>
                        guest
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {a.isFirstVisit ? (
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f59e0b", background: "#fef3c7", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                        🆕 First Visit
                      </span>
                    ) : (
                      <span style={{ color: "#64748b" }}>Regular</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.notes || "—"}
                  </td>
                </tr>
              ))}
              {filteredAttendees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No attendees match your query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ────────────────── ABSENT ACTIVES TAB ────────────────── */}
      {activeTab === "absent" && (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Phone</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Consecutive Absences</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Last Attended</th>
                <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAbsentActives.map((c) => (
                <tr key={c.member.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                    {c.member.firstName} {c.member.lastName}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                    {c.member.phone || "N/A"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {c.weeksAbsent >= 3 ? (
                      <span style={{ color: "#ef4444", fontWeight: 700, background: "#fee2e2", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                        ⚠️ {c.weeksAbsent} weeks absent
                      </span>
                    ) : c.weeksAbsent > 0 ? (
                      <span style={{ color: "#d97706", fontWeight: 700, background: "#fef3c7", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}>
                        {c.weeksAbsent} week{c.weeksAbsent > 1 ? "s" : ""} absent
                      </span>
                    ) : (
                      <span style={{ color: "#64748b" }}>First miss</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                    {c.lastAttended}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    {c.member.phone && (
                      <button
                        onClick={() => openSingleSms(c.member.id, `${c.member.firstName} ${c.member.lastName}`, c.member.phone)}
                        style={{
                          padding: "0.375rem 0.75rem",
                          border: `1.5px solid ${P}30`,
                          background: `${P}10`,
                          color: P,
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        💬 SMS Outreach
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAbsentActives.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No absent active members found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ────────────────── RETURNED INACTIVES TAB ────────────────── */}
      {activeTab === "returned" && (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {segmentedData.returnedInactives.map((m) => (
              <div
                key={m.id}
                style={{
                  border: "1.5px solid #10b98130",
                  background: "#10b98105",
                  borderRadius: "12px",
                  padding: "1rem",
                  width: "100%",
                  maxWidth: "280px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#065f46" }}>
                    🎉 {m.firstName} {m.lastName}
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#047857" }}>Status: Inactive Returned</p>
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                  📞 {m.phone || "No phone on file"}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <a
                    href={`/admin/members?search=${m.firstName}`}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "#10b98120",
                      borderRadius: "4px",
                      color: "#047857",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
            {segmentedData.returnedInactives.length === 0 && (
              <div style={{ width: "100%", textAlign: "center", padding: "4rem", color: "#94a3b8" }}>
                <span style={{ fontSize: "2rem", display: "block" }}>⛪</span>
                No previously inactive members attended this event.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── OUTREACH TAB ────────────────── */}
      {activeTab === "outreach" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Header Action Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#64748b" }}>
              Select candidates below to send bulk follow-up SMS.
            </p>
            <button
              onClick={openBulkSms}
              disabled={selectedOutreach.length === 0}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: selectedOutreach.length > 0 ? P : "#cbd5e1",
                color: "white",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: selectedOutreach.length > 0 ? "pointer" : "default",
              }}
            >
              💬 Send Bulk SMS ({selectedOutreach.length} selected)
            </button>
          </div>

          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                  <th style={{ padding: "0.75rem 1rem", width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={
                        selectedOutreach.length > 0 &&
                        selectedOutreach.length === segmentedData.outreachCandidates.filter((c) => c.phone).length
                      }
                      onChange={toggleSelectAllOutreach}
                    />
                  </th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Name</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Phone</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#475569" }}>Outreach Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredOutreach.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      {c.phone ? (
                        <input
                          type="checkbox"
                          checked={selectedOutreach.includes(c.id)}
                          onChange={() => toggleSelectOutreach(c.id)}
                        />
                      ) : (
                        <span style={{ fontSize: "0.75rem" }}>🚫</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                      {c.name}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                      {c.phone || <span style={{ color: "#ef4444", fontWeight: 600 }}>No Phone Number</span>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          background: c.status === "inactive" ? "#fee2e2" : "#fef3c7",
                          color: c.status === "inactive" ? "#ef4444" : "#d97706",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                      {c.reason}
                    </td>
                  </tr>
                ))}
                {filteredOutreach.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No candidates match outreach criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── SMS DIALOG MODAL ────────────────── */}
      {smsModal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1.125rem", fontWeight: 800 }}>💬 Send Follow-up SMS Outreach</h2>
            
            {smsModal.success ? (
              <div>
                <p style={{ color: "#10b981", fontWeight: 600, fontSize: "0.9rem", margin: "1rem 0" }}>{smsModal.success}</p>
                <button
                  onClick={() => setSmsModal((prev) => ({ ...prev, open: false, success: "" }))}
                  style={{
                    width: "100%",
                    padding: "0.625rem",
                    border: "none",
                    borderRadius: "8px",
                    background: P,
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 1rem" }}>
                  Sending to <strong>{smsModal.recipients.length}</strong> recipient(s). 
                  (Note: Web protocols like http/https or www are excluded from standard telco messages).
                </p>

                <div style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "0.75rem", maxHeight: "100px", overflowY: "auto", marginBottom: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>Recipients list:</p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    {smsModal.recipients.map((r) => `${r.name} (${r.phone})`).join(", ")}
                  </p>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", display: "block", marginBottom: "0.25rem" }}>SMS Content message</label>
                  <textarea
                    rows={4}
                    value={smsModal.message}
                    onChange={(e) => setSmsModal((prev) => ({ ...prev, message: e.target.value }))}
                    style={{
                      width: "100%",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.875rem",
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "0.25rem" }}>
                    Character count: {smsModal.message.length} · Max segments: {Math.ceil(smsModal.message.length / 160)}
                  </span>
                </div>

                {smsModal.error && (
                  <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: "0 0 1rem", fontWeight: 600 }}>{smsModal.error}</p>
                )}

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    disabled={smsModal.sending}
                    onClick={() => setSmsModal((prev) => ({ ...prev, open: false, error: "" }))}
                    style={{
                      flex: 1,
                      padding: "0.625rem",
                      border: "1.5px solid #cbd5e1",
                      borderRadius: "8px",
                      background: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={smsModal.sending}
                    onClick={handleSendSms}
                    style={{
                      flex: 2,
                      padding: "0.625rem",
                      border: "none",
                      borderRadius: "8px",
                      background: P,
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {smsModal.sending ? "Sending SMS Batch..." : "Send SMS outreach"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media styling responsive queries */}
      <style>{`
        @media (max-width: 767px) {
          .event-analytics-container {
            padding: 1rem !important;
          }
          .analytics-overview-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
