"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import axios from "axios";
import ConfirmModal from "@/components/ConfirmModal";

const P = "#4EB1CB"; // HGF Teal

interface MemberSelect {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
}

interface SopTask {
  id: number;
  taskName: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedById: number | null;
  completedBy: MemberSelect | null;
}

interface EventRow {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  location: string | null;
  coverPhoto: string | null;
  presentationFile: string | null;
  presentationOriginalName: string | null;
  presentationSlides: string[] | any;
  sopTasks: SopTask[];
  creator: { firstName: string; lastName: string } | null;
}

interface Props {
  event: EventRow | null;
  crew: MemberSelect[];
  session: any;
  customSettings: Record<string, string>;
}

export default function MultimediaDashboardClient({
  event: initialEvent,
  crew,
  session,
  customSettings,
}: Props) {
  const [event, setEvent] = useState<EventRow | null>(initialEvent);
  const [tasks, setTasks] = useState<SopTask[]>(initialEvent?.sopTasks || []);
  const [activeSlide, setActiveSlide] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [currentTime, setCurrentTime] = useState("");

  // Role permissions
  const currentUserId = parseInt(session?.user?.id || "0", 10);
  const isLeader = ["admin", "moderator"].includes(session?.user?.role || "");

  // Confirm/Alert modal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmLabel: string;
    cancelLabel: string | null;
    confirmColor: string;
    loading: boolean;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    confirmColor: "#ef4444",
    loading: false,
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string) => {
    setConfirmModal({
      open: true,
      title,
      message,
      confirmLabel: "OK",
      cancelLabel: null,
      confirmColor: P,
      loading: false,
      onConfirm: () => setConfirmModal((prev) => ({ ...prev, open: false })),
    });
  };

  // Parsing patch configurations
  const [soundboardPatch, setSoundboardPatch] = useState<Array<{ ch: string; name: string }>>(() => {
    if (customSettings?.multimedia_patch_soundboard) {
      try {
        return JSON.parse(customSettings.multimedia_patch_soundboard);
      } catch {
        // Fallback below
      }
    }
    return [
      { ch: "1-2", name: "Main Out L/R (Broadcast)" },
      { ch: "3", name: "Pastor Handheld Mic (Wireless)" },
      { ch: "4", name: "Worship Leader Mic" },
      { ch: "5-8", name: "Praise Band (Instruments)" },
      { ch: "9-10", name: "ProPresenter Audio (Playbacks)" },
    ];
  });

  const [switcherPatch, setSwitcherPatch] = useState<Array<{ ch: string; name: string }>>(() => {
    if (customSettings?.multimedia_patch_switcher) {
      try {
        return JSON.parse(customSettings.multimedia_patch_switcher);
      } catch {
        // Fallback below
      }
    }
    return [
      { ch: "HDMI 1", name: "ProPresenter slides (1080p)" },
      { ch: "HDMI 2", name: "Main Stage Cam (Wide)" },
      { ch: "HDMI 3", name: "Audience Cam (Close)" },
      { ch: "HDMI 4", name: "Live Streaming Output Feed" },
    ];
  });

  // Modal statuses
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [showSopModal, setShowSopModal] = useState(false);

  // Form states for patches
  const [editSoundboard, setEditSoundboard] = useState([...soundboardPatch]);
  const [editSwitcher, setEditSwitcher] = useState([...switcherPatch]);
  const [savingPatches, setSavingPatches] = useState(false);

  // Form states for SOP management
  const [newTaskName, setNewTaskName] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [sopTemplate, setSopTemplate] = useState<string>(() => {
    if (customSettings?.multimedia_sop_defaults) {
      try {
        const parsed = JSON.parse(customSettings.multimedia_sop_defaults);
        if (Array.isArray(parsed)) return parsed.join("\n");
      } catch {}
    }
    return [
      "Turn on Projector & Check Screen Alignment",
      "Initialize ProPresenter & Load Sermon Slide Deck",
      "Test Wireless Microphones & Check Battery Levels",
      "Verify Stage Monitor Mix & Audio Signal Paths",
      "Start Live Stream Encoder & Check Video Input Feed",
      "Play Pre-Service Countdown Video & Background Music",
      "Synchronize Lyrics with the Praise & Worship Team",
      "Run Technical Rehearsal with Speakers & Pastors",
    ].join("\n");
  });
  const [savingSopTemplate, setSavingSopTemplate] = useState(false);

  // Status definitions
  const [serviceStatus, setServiceStatus] = useState<"ACTIVE" | "UPCOMING" | "PAST">("PAST");

  // get Manila date string (YYYY-MM-DD)
  const getManilaTodayStr = () => {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d); // e.g. "2026-06-10"
  };

  useEffect(() => {
    if (!event) return;
    const eventDateStr = event.eventDate.slice(0, 10);
    const manilaTodayStr = getManilaTodayStr();

    if (eventDateStr === manilaTodayStr) {
      setServiceStatus("ACTIVE");
    } else if (eventDateStr > manilaTodayStr) {
      setServiceStatus("UPCOMING");
    } else {
      setServiceStatus("PAST");
    }
  }, [event]);

  // 1. Live countdown calculator
  useEffect(() => {
    if (!event) return;

    const dateStr = event.eventDate.slice(0, 10);
    const timeStr = event.startTime.includes("T")
      ? event.startTime.split("T")[1].slice(0, 8)
      : event.startTime;
    const targetDate = new Date(`${dateStr}T${timeStr}`);

    const updateCountdown = () => {
      const difference = targetDate.getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [event]);

  // 2. Real-time clock display (Manila Time)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-PH", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Manila",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Toggle SOP task completion status
  const handleToggleTask = async (taskId: number) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const nextCompleted = !t.isCompleted;
            return {
              ...t,
              isCompleted: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
              completedById: nextCompleted ? currentUserId : null,
              completedBy: nextCompleted
                ? {
                    id: currentUserId,
                    firstName: session.user.firstName || "",
                    lastName: session.user.lastName || "",
                    profilePicture: session.user.profilePicture || null,
                  }
                : null,
            };
          }
          return t;
        })
      );

      const res = await axios.patch(`/api/admin/multimedia/tasks/${taskId}/toggle`);
      if (res.data?.success && res.data?.task) {
        const updatedTask = res.data.task;
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      }
    } catch (err) {
      console.error("Failed to toggle SOP task:", err);
      if (event) setTasks(event.sopTasks);
    }
  };

  // 4. Save Patch Configurations
  const handleSavePatches = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPatches(true);
    try {
      const body = {
        multimedia_patch_soundboard: JSON.stringify(editSoundboard),
        multimedia_patch_switcher: JSON.stringify(editSwitcher),
      };
      await axios.post("/api/church-settings", body);
      setSoundboardPatch(editSoundboard);
      setSwitcherPatch(editSwitcher);
      setShowPatchModal(false);
    } catch (err) {
      console.error("Failed to save patches:", err);
      showAlert("Error", "Error saving patch configuration");
    } finally {
      setSavingPatches(false);
    }
  };

  // 5. Add Custom Task to current event checklist
  const handleAddCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !newTaskName.trim()) return;
    setAddingTask(true);
    try {
      const res = await axios.post("/api/admin/multimedia/tasks", {
        eventId: event.id,
        taskName: newTaskName.trim(),
      });
      if (res.data?.success && res.data?.task) {
        setTasks((prev) => [...prev, res.data.task]);
        setNewTaskName("");
      }
    } catch (err) {
      console.error("Failed to add custom task:", err);
      showAlert("Error", "Error adding custom checklist task");
    } finally {
      setAddingTask(false);
    }
  };

  // 6. Delete Checklist Task from current event
  const handleDeleteTask = async (taskId: number) => {
    setDeletingTaskId(taskId);
    try {
      const res = await axios.delete(`/api/admin/multimedia/tasks/${taskId}`);
      if (res.data?.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
      showAlert("Error", "Error removing task from list");
    } finally {
      setDeletingTaskId(null);
    }
  };

  // 7. Save Checklist SOP defaults template (for future services)
  const handleSaveSopTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSopTemplate(true);
    try {
      const defaultsArray = sopTemplate
        .split("\n")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const body = {
        multimedia_sop_defaults: JSON.stringify(defaultsArray),
      };
      await axios.post("/api/church-settings", body);
      setShowSopModal(false);
      showAlert("Success", "SOP Template defaults saved! These will apply to future Sunday services.");
    } catch (err) {
      console.error("Failed to save SOP template:", err);
      showAlert("Error", "Error saving SOP template configuration");
    } finally {
      setSavingSopTemplate(false);
    }
  };

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const fmtDate = (d: string) => {
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-PH", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
      });
    } catch {
      return d;
    }
  };

  const fmtTime = (t: string) => {
    try {
      const d = t.includes("T") ? new Date(t) : new Date(`1970-01-01T${t}`);
      return d.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });
    } catch {
      return t;
    }
  };

  const getInitials = (m: MemberSelect) => {
    return `${m.firstName[0] || ""}${m.lastName[0] || ""}`.toUpperCase();
  };

  const getShortTime = (isoString: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  };

  const slides: string[] = event?.presentationSlides
    ? typeof event.presentationSlides === "string"
      ? JSON.parse(event.presentationSlides)
      : event.presentationSlides
    : [];

  const inp: React.CSSProperties = {
    width: "100%",
    border: "1.5px solid #cbd5e1",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "2rem 2.5rem", fontFamily: "Inter, sans-serif" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            📽️ Pre-Service Operations
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.25rem", fontSize: "0.875rem" }}>
            Real-time status board and slide management for Sunday Services.
          </p>
        </div>

        {/* Live Clock Widget */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.05)",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            padding: "0.5rem 1rem",
            borderRadius: "12px",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            Manila Time
          </div>
          <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
            {currentTime || "Loading clock..."}
          </div>
        </div>
      </div>

      {event ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
          className="dashboard-grid"
        >
          {/* Main Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Event Header Banner Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: "16px",
                color: "white",
                padding: "1.75rem",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.15)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "200px",
                  height: "200px",
                  borderRadius: "50%",
                  background: `${P}30`,
                  filter: "blur(50px)",
                }}
              />

              <div
                style={{
                  display: "inline-block",
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  color: serviceStatus === "ACTIVE" ? "#10b981" : serviceStatus === "UPCOMING" ? P : "#94a3b8",
                  background: serviceStatus === "ACTIVE" ? "rgba(16,185,129,0.15)" : serviceStatus === "UPCOMING" ? `${P}22` : "rgba(255,255,255,0.08)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {serviceStatus === "ACTIVE"
                  ? "🟢 Active Service (Today)"
                  : serviceStatus === "UPCOMING"
                  ? "📅 Upcoming Service"
                  : "📅 Past Service"}
              </div>

              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.5rem", marginBottom: "0.5rem", color: "white", letterSpacing: "-0.015em" }}>
                {event.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: "1.25rem",
                  fontSize: "0.875rem",
                  color: "#94a3b8",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span>📅 {fmtDate(event.eventDate)}</span>
                <span>⏰ {fmtTime(event.startTime)}</span>
                {event.location && <span>📍 {event.location}</span>}
              </div>
            </div>

            {/* Pre-Service SOP Checklist */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Pre-Service Checklist
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: "0.125rem 0 0" }}>
                    Complete checklist at least 30 minutes before worship service starts.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {isLeader && (
                    <button
                      onClick={() => setShowSopModal(true)}
                      style={{
                        background: "#f8fafc",
                        border: "1.5px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "0.375rem 0.75rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      ⚙️ Manage SOP
                    </button>
                  )}
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, color: P }}>
                    {completedCount} / {tasks.length} Completed
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  background: "#f1f5f9",
                  borderRadius: "4px",
                  marginBottom: "1.5rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    background: P,
                    borderRadius: "4px",
                    transition: "width 0.4s ease-out",
                  }}
                />
              </div>

              {/* Checklist Items */}
              {tasks.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.875rem", textAlign: "center", padding: "1rem" }}>
                  No pre-service tasks registered. {isLeader && "Click 'Manage SOP' to create tasks."}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.875rem 1rem",
                        borderRadius: "10px",
                        border: "1.5px solid",
                        borderColor: task.isCompleted ? "#e2f2f5" : "#f1f5f9",
                        background: task.isCompleted ? "#f7fcfd" : "#fafbfc",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        onClick={() => handleToggleTask(task.id)}
                        style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, cursor: "pointer", flex: 1 }}
                      >
                        <div
                          style={{
                            width: "20px",
                            height: "20px",
                            borderRadius: "6px",
                            border: "2px solid",
                            borderColor: task.isCompleted ? P : "#cbd5e1",
                            background: task.isCompleted ? P : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            color: "white",
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          {task.isCompleted && "✓"}
                        </div>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: task.isCompleted ? 600 : 500,
                            color: task.isCompleted ? "#0f172a" : "#334155",
                            textDecoration: task.isCompleted ? "line-through" : "none",
                            opacity: task.isCompleted ? 0.75 : 1,
                            minWidth: 0,
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.taskName}
                        </span>
                      </div>

                      {/* Right Section: Stamps / Remove */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                        {task.isCompleted && task.completedBy && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              background: "rgba(78, 177, 203, 0.1)",
                              color: P,
                              padding: "0.25rem 0.5rem",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            <span
                              title={`${task.completedBy.firstName} ${task.completedBy.lastName}`}
                              style={{
                                background: P,
                                color: "white",
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.625rem",
                                fontWeight: 800,
                              }}
                            >
                              {getInitials(task.completedBy)}
                            </span>
                            <span>{getShortTime(task.completedAt)}</span>
                          </div>
                        )}
                        {isLeader && (
                          <button
                            onClick={() => promptDeleteTask(task.id)}
                            disabled={deletingTaskId === task.id}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#f87171",
                              cursor: "pointer",
                              padding: "0.25rem",
                              fontSize: "0.875rem",
                            }}
                            title="Delete Task"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slide Presentation Carousel */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Sermon Slides
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: "0.125rem 0 0" }}>
                    Flattened and optimized JPEGs (150 DPI) ready for ProPresenter.
                  </p>
                </div>

                {event.presentationFile && (
                  <a
                    href={event.presentationFile}
                    download={event.presentationOriginalName || "presentation.pptx"}
                    style={{
                      background: P,
                      color: "white",
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      boxShadow: "0 4px 12px rgba(78, 177, 203, 0.2)",
                    }}
                  >
                    📥 Download Compressed PPTX
                  </a>
                )}
              </div>

              {slides.length === 0 ? (
                <div
                  style={{
                    padding: "3rem 1.5rem",
                    textAlign: "center",
                    border: "1.5px dashed #e2e8f0",
                    borderRadius: "12px",
                    background: "#f8fafc",
                  }}
                >
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "0.75rem" }}>📽️</span>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#475569", margin: "0 0 0.25rem" }}>
                    No Sermon Slides Uploaded Yet
                  </h4>
                  <p style={{ color: "#94a3b8", fontSize: "0.8125rem", maxWidth: "320px", margin: "0 auto 1rem" }}>
                    The preaching pastor should upload their PPTX or PDF slides when setting up the event.
                  </p>
                  <Link
                    href="/admin/events"
                    style={{
                      color: P,
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      textDecoration: "none",
                      border: `1.5px solid ${P}`,
                      padding: "0.375rem 0.875rem",
                      borderRadius: "6px",
                      background: "white",
                    }}
                  >
                    Go to Events Manager
                  </Link>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      borderRadius: "12px",
                      background: "#0f172a",
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      marginBottom: "0.75rem",
                      position: "relative",
                    }}
                  >
                    <img
                      src={slides[activeSlide]}
                      alt={`Slide ${activeSlide + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "0.75rem",
                        right: "0.75rem",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      Slide {activeSlide + 1} of {slides.length}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      overflowX: "auto",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    {slides.map((slide, idx) => (
                      <div
                        key={slide}
                        onClick={() => setActiveSlide(idx)}
                        style={{
                          width: "80px",
                          aspectRatio: "16/9",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: `2px solid ${activeSlide === idx ? P : "transparent"}`,
                          cursor: "pointer",
                          flexShrink: 0,
                          opacity: activeSlide === idx ? 1 : 0.75,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <img src={slide} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Service Countdown Card */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#64748b", margin: "0 0 1rem" }}>
                Service Starts In
              </h3>

              {serviceStatus === "PAST" ? (
                <div
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    padding: "0.75rem",
                    borderRadius: "12px",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                  }}
                >
                  📅 Service is Completed (Past)
                </div>
              ) : serviceStatus === "ACTIVE" ? (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: "0.75rem",
                    borderRadius: "12px",
                    color: "#065f46",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                  }}
                >
                  🟢 Service is Today! Pre-service Active
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                  <CountdownUnit value={timeLeft.days} label="Days" />
                  <CountdownUnit value={timeLeft.hours} label="Hrs" />
                  <CountdownUnit value={timeLeft.minutes} label="Mins" />
                  <CountdownUnit value={timeLeft.seconds} label="Secs" />
                </div>
              )}
            </div>

            {/* Signal Patch Sheet Widget */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
                <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  🎛️ Routing Patch Sheet
                </h3>
                {isLeader && (
                  <button
                    onClick={() => {
                      setEditSoundboard([...soundboardPatch]);
                      setEditSwitcher([...switcherPatch]);
                      setShowPatchModal(true);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: P,
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    ⚙️ Edit
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Section: Soundboard */}
                <div>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "0.375rem" }}>
                    Soundboard (Behringer X32)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {soundboardPatch.map((p) => (
                      <PatchRow key={p.ch} ch={p.ch} name={p.name} />
                    ))}
                  </div>
                </div>

                {/* Section: Video Switcher */}
                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "0.375rem" }}>
                    Video Switcher (ATEM Mini)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {switcherPatch.map((p) => (
                      <PatchRow key={p.ch} ch={p.ch} name={p.name} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Crew list */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "1.5rem",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
              }}
            >
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.875rem" }}>
                👥 Multimedia Crew
              </h3>
              {crew.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.8125rem", margin: 0 }}>
                  No members are assigned the multimedia role.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {crew.map((member) => (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      {member.profilePicture ? (
                        <img
                          src={`/uploads/profile_pictures/${member.profilePicture}`}
                          alt=""
                          style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: `${P}22`,
                            color: P,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                          }}
                        >
                          {getInitials(member)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
                          {member.firstName} {member.lastName}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Team Volunteer</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "5rem 2rem",
            textAlign: "center",
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
          }}
        >
          <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📅</span>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#334155", margin: "0 0 0.5rem" }}>
            No Active Sunday Service Scheduled
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto 1.5rem" }}>
            Go to the events console and configure the next Sunday Service event first. Once created, its checklist will appear here automatically.
          </p>
          <Link
            href="/admin/events"
            style={{
              background: P,
              color: "white",
              padding: "0.625rem 1.25rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            Create Event Now
          </Link>
        </div>
      )}

      {/* MODAL 1: Edit Patches (Soundboard/Switcher) */}
      {showPatchModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>Edit Routing Patch Sheet</h2>
            
            <form onSubmit={handleSavePatches}>
              <h4 style={{ fontSize: "0.8125rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Behringer X32 Soundboard</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                {editSoundboard.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontFamily: "monospace", width: "45px", fontSize: "0.875rem", fontWeight: 700, color: P }}>{item.ch}</span>
                    <input
                      style={inp}
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...editSoundboard];
                        copy[idx].name = e.target.value;
                        setEditSoundboard(copy);
                      }}
                      required
                    />
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: "0.8125rem", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>ATEM Mini Switcher</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
                {editSwitcher.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontFamily: "monospace", width: "60px", fontSize: "0.8125rem", fontWeight: 700, color: P }}>{item.ch}</span>
                    <input
                      style={inp}
                      value={item.name}
                      onChange={(e) => {
                        const copy = [...editSwitcher];
                        copy[idx].name = e.target.value;
                        setEditSwitcher(copy);
                      }}
                      required
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" onClick={() => setShowPatchModal(false)} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #cbd5e1", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={savingPatches} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700 }}>
                  {savingPatches ? "Saving..." : "Save Patch Sheet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Manage SOP defaults & Checklist Tasks */}
      {showSopModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>Manage SOP & Checklist</h2>
            
            {/* Part A: Add custom task to current event */}
            <div style={{ paddingBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", marginBottom: "1.25rem" }}>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155", margin: "0 0 0.5rem" }}>
                ➕ Add Task for THIS Service
              </h4>
              <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                This will append a custom checklist item only to the active event.
              </p>
              <form onSubmit={handleAddCustomTask} style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  style={inp}
                  placeholder="E.g., Prepare Communion Bread & Cup"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={addingTask}
                  style={{
                    background: P,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {addingTask ? "Adding..." : "Add"}
                </button>
              </form>
            </div>

            {/* Part B: Edit Template Defaults for FUTURE services */}
            <div>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155", margin: "0 0 0.5rem" }}>
                ⚙️ Template Defaults (Future Services)
              </h4>
              <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0 0 0.75rem" }}>
                Edit the checklist template below. One task per line. These tasks are automatically generated when a pastor creates a new service event.
              </p>
              <form onSubmit={handleSaveSopTemplate}>
                <textarea
                  style={{ ...inp, resize: "vertical", fontFamily: "inherit" }}
                  rows={8}
                  value={sopTemplate}
                  onChange={(e) => setSopTemplate(e.target.value)}
                  required
                />
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <button type="button" onClick={() => setShowSopModal(false)} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #cbd5e1", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                  <button type="submit" disabled={savingSopTemplate} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700 }}>
                    {savingSopTemplate ? "Saving..." : "Save Template Defaults"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS style overrides for layouts */}
      <style jsx global>{`
        @media (max-width: 991px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        confirmColor={confirmModal.confirmColor}
        loading={confirmModal.loading}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );

  // Helper trigger to delete checklist item
  function promptDeleteTask(taskId: number) {
    setConfirmModal({
      open: true,
      title: "Remove Task",
      message: "Are you sure you want to remove this task from this service's checklist?",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      confirmColor: "#ef4444",
      loading: false,
      onConfirm: () => {
        handleDeleteTask(taskId);
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        background: "#fafbfc",
        border: "1px solid #f1f5f9",
        padding: "0.5rem 0.25rem",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", fontFamily: "monospace" }}>
        {String(value).padStart(2, "0")}
      </div>
      <div style={{ fontSize: "0.625rem", color: "#64748b", fontWeight: 600, marginTop: "0.125rem" }}>
        {label}
      </div>
    </div>
  );
}

function PatchRow({ ch, name }: { ch: string; name: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.8125rem",
        padding: "0.25rem 0",
        borderBottom: "1px solid #f8fafc",
      }}
    >
      <span style={{ fontFamily: "monospace", color: P, fontWeight: 700 }}>{ch}</span>
      <span style={{ color: "#334155", fontWeight: 500 }}>{name}</span>
    </div>
  );
}
