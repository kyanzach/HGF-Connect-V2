"use client";

import { useState, useEffect } from "react";
import ConfirmModal from "@/components/ConfirmModal";

const PRIMARY = "#4EB1CB";

interface LogEntry {
  id: number;
  actionType: string;
  description: string;
  performedByName: string | null;
  targetName: string | null;
  createdAt: string;
}

interface VerseItem {
  ref: string;
  text: string;
}

interface Props {
  initialLogs: LogEntry[];
  currentAdminPhone?: string | null;
}

const EVENT_TYPES = [
  { key: "sunday_service", label: "⛪ Sunday Service", icon: "⛪" },
  { key: "prayer_meeting", label: "🙏 Prayer Meeting", icon: "🙏" },
  { key: "bible_study", label: "📖 Bible Study", icon: "📖" },
  { key: "special_event", label: "🎉 Special Event", icon: "🎉" },
  { key: "other", label: "📌 Other Gatherings", icon: "📌" },
];

const TIMING_WINDOWS = [
  { key: "fiveday", label: "5 Days Before", icon: "5️⃣" },
  { key: "threeday", label: "3 Days Before", icon: "3️⃣" },
  { key: "oneday", label: "1 Day Before", icon: "1️⃣" },
  { key: "same_day", label: "Same Day (Morning)", icon: "☀️" },
];

export default function AdminSmsHubClient({ initialLogs, currentAdminPhone }: Props) {
  const [activeTab, setActiveTab] = useState<"logs" | "reminder_verses" | "birthday_sms">("logs");

  // Settings State
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [reminderVerses, setReminderVerses] = useState<Record<string, Record<string, string[]>>>({});
  const [birthdaySettings, setBirthdaySettings] = useState<{ enabled: boolean; template: string }>({
    enabled: true,
    template: `🎉 Happy Birthday, {firstName}! 🎂 House of Grace Fellowship celebrates you today and thanks God for the gift of your life! "{verseText}" ({verseRef}) God bless you abundantly! ❤️`,
  });
  const [birthdayVerses, setBirthdayVerses] = useState<VerseItem[]>([]);
  const [defaults, setDefaults] = useState<any>(null);

  // Reminder Verses Filter
  const [selectedEventType, setSelectedEventType] = useState("sunday_service");
  const [selectedTiming, setSelectedTiming] = useState("fiveday");

  // Verse Add/Edit Modals
  const [verseModal, setVerseModal] = useState<{
    open: boolean;
    mode: "add_reminder" | "edit_reminder" | "add_birthday" | "edit_birthday";
    index?: number;
    ref: string;
    text: string;
  }>({
    open: false,
    mode: "add_reminder",
    ref: "",
    text: "",
  });

  // Test SMS State
  const [testingSms, setTestingSms] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
    confirmLabel: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  // Feedback Notification
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch settings on mount or tab change
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/sms/settings");
      const data = await res.json();
      if (res.ok) {
        setReminderVerses(data.reminderVerses || {});
        setBirthdaySettings(data.birthdaySettings || { enabled: true, template: "" });
        setBirthdayVerses(data.birthdayVerses || []);
        setDefaults(data.defaults || null);
      }
    } catch (err) {
      console.error("Failed to load SMS settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Save Settings to Backend
  const saveAllSettings = async (
    newReminderVerses = reminderVerses,
    newBirthdaySettings = birthdaySettings,
    newBirthdayVerses = birthdayVerses
  ) => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/sms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reminderVerses: newReminderVerses,
          birthdaySettings: newBirthdaySettings,
          birthdayVerses: newBirthdayVerses,
        }),
      });

      if (!res.ok) throw new Error("Failed to save SMS settings");
      showToast("success", "✅ SMS settings and verse pools saved successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Get current active reminder verses array
  const currentPool: string[] =
    reminderVerses[selectedEventType]?.[selectedTiming] || [];

  // Handle Add/Edit Reminder Verse
  const handleSaveReminderVerse = () => {
    if (!verseModal.text.trim()) return;

    let fullVerseString = verseModal.text.trim();
    if (verseModal.ref.trim()) {
      fullVerseString = `"${verseModal.text.trim().replace(/^["']|["']$/g, "")}" (${verseModal.ref.trim().replace(/^[()]|[()]$/g, "")})`;
    }

    const updated = JSON.parse(JSON.stringify(reminderVerses));
    if (!updated[selectedEventType]) updated[selectedEventType] = {};
    if (!updated[selectedEventType][selectedTiming]) updated[selectedEventType][selectedTiming] = [];

    if (verseModal.mode === "add_reminder") {
      updated[selectedEventType][selectedTiming].push(fullVerseString);
    } else if (verseModal.mode === "edit_reminder" && typeof verseModal.index === "number") {
      updated[selectedEventType][selectedTiming][verseModal.index] = fullVerseString;
    }

    setReminderVerses(updated);
    setVerseModal({ open: false, mode: "add_reminder", ref: "", text: "" });
    saveAllSettings(updated, birthdaySettings, birthdayVerses);
  };

  // Handle Delete Reminder Verse
  const handleDeleteReminderVerse = (index: number) => {
    setConfirmModal({
      open: true,
      title: "Delete Scripture Verse",
      message: "Are you sure you want to remove this verse from this reminder timing pool?",
      confirmLabel: "Delete Verse",
      confirmColor: "#ef4444",
      onConfirm: () => {
        const updated = JSON.parse(JSON.stringify(reminderVerses));
        if (updated[selectedEventType]?.[selectedTiming]) {
          updated[selectedEventType][selectedTiming].splice(index, 1);
          setReminderVerses(updated);
          saveAllSettings(updated, birthdaySettings, birthdayVerses);
        }
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Handle Reset Reminder Verses to Default
  const handleResetReminderCategory = () => {
    if (!defaults?.reminderVerses) return;
    setConfirmModal({
      open: true,
      title: "Reset to Church Standard Verses",
      message: `Reset verses for ${EVENT_TYPES.find((e) => e.key === selectedEventType)?.label} (${TIMING_WINDOWS.find((t) => t.key === selectedTiming)?.label}) back to system defaults?`,
      confirmLabel: "Reset to Defaults",
      confirmColor: "#f59e0b",
      onConfirm: () => {
        const updated = JSON.parse(JSON.stringify(reminderVerses));
        if (!updated[selectedEventType]) updated[selectedEventType] = {};
        const defaultPool = defaults.reminderVerses[selectedEventType]?.[selectedTiming] || defaults.reminderVerses.other[selectedTiming];
        updated[selectedEventType][selectedTiming] = [...defaultPool];
        setReminderVerses(updated);
        saveAllSettings(updated, birthdaySettings, birthdayVerses);
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Handle Add/Edit Birthday Verse
  const handleSaveBirthdayVerse = () => {
    if (!verseModal.text.trim()) return;

    const newVerse: VerseItem = {
      ref: verseModal.ref.trim() || "Scripture",
      text: verseModal.text.trim().replace(/^["']|["']$/g, ""),
    };

    const updated = [...birthdayVerses];
    if (verseModal.mode === "add_birthday") {
      updated.push(newVerse);
    } else if (verseModal.mode === "edit_birthday" && typeof verseModal.index === "number") {
      updated[verseModal.index] = newVerse;
    }

    setBirthdayVerses(updated);
    setVerseModal({ open: false, mode: "add_birthday", ref: "", text: "" });
    saveAllSettings(reminderVerses, birthdaySettings, updated);
  };

  // Handle Delete Birthday Verse
  const handleDeleteBirthdayVerse = (index: number) => {
    setConfirmModal({
      open: true,
      title: "Delete Birthday Verse",
      message: "Are you sure you want to remove this verse from the birthday blessing pool?",
      confirmLabel: "Delete Verse",
      confirmColor: "#ef4444",
      onConfirm: () => {
        const updated = [...birthdayVerses];
        updated.splice(index, 1);
        setBirthdayVerses(updated);
        saveAllSettings(reminderVerses, birthdaySettings, updated);
        setConfirmModal((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // Send Test Birthday SMS
  const handleSendTestBirthdaySms = async () => {
    setTestingSms(true);
    setTestResult(null);
    try {
      const sampleVerse = birthdayVerses[0] || { ref: "Numbers 6:24-25", text: "The Lord bless you and keep you." };
      const res = await fetch("/api/admin/sms/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: birthdaySettings.template,
          verse: sampleVerse,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test SMS");

      setTestResult({
        success: true,
        msg: `✅ Test SMS dispatched successfully to your mobile (${data.recipient})!`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: `⚠️ ${err.message || "Failed to send test SMS"}`,
      });
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <div className="sms-hub-container" style={{ padding: "1.5rem 2rem", maxWidth: "1200px" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            zIndex: 99999,
            background: toast.type === "success" ? "#065f46" : "#991b1b",
            color: "white",
            padding: "0.875rem 1.25rem",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            fontWeight: 700,
            fontSize: "0.875rem",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            📱 SMS Command & Verse Management Hub
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            Audit activity logs, randomize reminder Scripture verses, and configure birthday SMS greetings.
          </p>
        </div>

        {savingSettings && (
          <span style={{ fontSize: "0.8125rem", color: PRIMARY, fontWeight: 700, background: "#4eb1cb15", padding: "0.35rem 0.75rem", borderRadius: "6px" }}>
            💾 Saving changes...
          </span>
        )}
      </div>

      {/* Nav Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "2px solid #e2e8f0",
          marginBottom: "1.5rem",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            background: "none",
            fontSize: "0.9375rem",
            fontWeight: activeTab === "logs" ? 800 : 600,
            color: activeTab === "logs" ? PRIMARY : "#64748b",
            borderBottom: activeTab === "logs" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            cursor: "pointer",
            marginBottom: "-2px",
            whiteSpace: "nowrap",
            transition: "all 0.15s ease",
          }}
        >
          📋 SMS Activity Logs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reminder_verses")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            background: "none",
            fontSize: "0.9375rem",
            fontWeight: activeTab === "reminder_verses" ? 800 : 600,
            color: activeTab === "reminder_verses" ? PRIMARY : "#64748b",
            borderBottom: activeTab === "reminder_verses" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            cursor: "pointer",
            marginBottom: "-2px",
            whiteSpace: "nowrap",
            transition: "all 0.15s ease",
          }}
        >
          📖 Reminder Scripture Verses
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("birthday_sms")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            background: "none",
            fontSize: "0.9375rem",
            fontWeight: activeTab === "birthday_sms" ? 800 : 600,
            color: activeTab === "birthday_sms" ? PRIMARY : "#64748b",
            borderBottom: activeTab === "birthday_sms" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            cursor: "pointer",
            marginBottom: "-2px",
            whiteSpace: "nowrap",
            transition: "all 0.15s ease",
          }}
        >
          🎂 Birthday SMS & Verses
        </button>
      </div>

      {/* ── TAB 1: SMS ACTIVITY LOGS ── */}
      {activeTab === "logs" && (
        <div>
          <div className="smslogs-desktop-table" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            {initialLogs.length === 0 ? (
              <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>No log entries recorded yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Time", "Action", "Description", "Performed By", "Target"].map((h) => (
                        <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {initialLogs.map((log, i) => (
                      <tr key={log.id} style={{ borderBottom: i < initialLogs.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "#94a3b8", fontSize: "0.8rem" }}>
                          {new Date(log.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              background: log.actionType.includes("failed") ? "#fee2e2" : "#f1f5f9",
                              color: log.actionType.includes("failed") ? "#b91c1c" : "#475569",
                            }}
                          >
                            {log.actionType}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#374151", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.description}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#475569", whiteSpace: "nowrap" }}>{log.performedByName ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.8rem" }}>{log.targetName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile view card listing */}
          {initialLogs.length > 0 && (
            <div className="smslogs-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "1rem" }}>
              {initialLogs.map((log) => (
                <div key={log.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        background: log.actionType.includes("failed") ? "#fee2e2" : "#f1f5f9",
                        color: log.actionType.includes("failed") ? "#b91c1c" : "#475569",
                      }}
                    >
                      {log.actionType}
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                      {new Date(log.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#374151", margin: "0.5rem 0", lineHeight: 1.4 }}>
                    {log.description}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem" }}>
                    <span style={{ color: "#64748b" }}>By: <strong>{log.performedByName ?? "—"}</strong></span>
                    <span style={{ color: "#94a3b8" }}>Target: {log.targetName ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: REMINDER SCRIPTURE VERSES ── */}
      {activeTab === "reminder_verses" && (
        <div>
          {/* Category Selector Pills */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                1. Select Event Type:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    onClick={() => setSelectedEventType(type.key)}
                    style={{
                      padding: "0.5rem 0.875rem",
                      borderRadius: "8px",
                      border: selectedEventType === type.key ? `2px solid ${PRIMARY}` : "1.5px solid #cbd5e1",
                      background: selectedEventType === type.key ? "#4eb1cb18" : "white",
                      color: selectedEventType === type.key ? PRIMARY : "#334155",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                2. Select Reminder Timing Window:
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {TIMING_WINDOWS.map((time) => (
                  <button
                    key={time.key}
                    type="button"
                    onClick={() => setSelectedTiming(time.key)}
                    style={{
                      padding: "0.5rem 0.875rem",
                      borderRadius: "8px",
                      border: selectedTiming === time.key ? `2px solid #0f172a` : "1.5px solid #cbd5e1",
                      background: selectedTiming === time.key ? "#0f172a" : "white",
                      color: selectedTiming === time.key ? "white" : "#334155",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {time.icon} {time.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Pool Header & Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Active Scripture Pool ({currentPool.length} Verses)
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: "0.15rem 0 0" }}>
                When sending automated event reminders, a verse is picked at random from this active pool.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleResetReminderCategory}
                style={{
                  padding: "0.5rem 0.875rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  background: "white",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                🔄 Restore Defaults
              </button>
              <button
                type="button"
                onClick={() =>
                  setVerseModal({
                    open: true,
                    mode: "add_reminder",
                    ref: "",
                    text: "",
                  })
                }
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: PRIMARY,
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  boxShadow: "0 2px 8px rgba(78, 177, 203, 0.3)",
                }}
              >
                ➕ Add Scripture Verse
              </button>
            </div>
          </div>

          {/* Verses Cards */}
          {currentPool.length === 0 ? (
            <div style={{ background: "white", borderRadius: "12px", border: "1.5px dashed #cbd5e1", padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
              No verses in this pool yet. Click "Add Scripture Verse" or "Restore Defaults" above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {currentPool.map((verseString, idx) => {
                // Parse verse reference if enclosed in parenthesis at the end
                const refMatch = verseString.match(/\(([^)]+)\)$/);
                const ref = refMatch ? refMatch[1] : "";
                const textOnly = refMatch ? verseString.replace(/\s*\([^)]+\)$/, "").replace(/^["']|["']$/g, "") : verseString;

                return (
                  <div
                    key={idx}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      padding: "1rem 1.25rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9375rem", color: "#1e293b", fontWeight: 500, lineHeight: 1.5, marginBottom: "0.35rem" }}>
                        "{textOnly}"
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
                        {ref && <span style={{ fontWeight: 700, color: PRIMARY }}>📖 {ref}</span>}
                        <span style={{ color: "#94a3b8" }}>{verseString.length} characters</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setVerseModal({
                            open: true,
                            mode: "edit_reminder",
                            index: idx,
                            ref: ref,
                            text: textOnly,
                          })
                        }
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "#f8fafc",
                          color: "#475569",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReminderVerse(idx)}
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid #fee2e2",
                          background: "#fef2f2",
                          color: "#ef4444",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: BIRTHDAY SMS & VERSES ── */}
      {activeTab === "birthday_sms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card A: Automated Birthday SMS Setting & Template */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  🎂 Automated Birthday SMS Greetings
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: "0.2rem 0 0" }}>
                  Dispatches an encouraging personalized SMS greeting to members on their birthday morning.
                </p>
              </div>

              {/* Toggle Switch */}
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={birthdaySettings.enabled}
                  onChange={(e) => {
                    const updated = { ...birthdaySettings, enabled: e.target.checked };
                    setBirthdaySettings(updated);
                    saveAllSettings(reminderVerses, updated, birthdayVerses);
                  }}
                  style={{ width: "1.25rem", height: "1.25rem", accentColor: PRIMARY }}
                />
                <span style={{ fontWeight: 700, fontSize: "0.875rem", color: birthdaySettings.enabled ? "#059669" : "#64748b" }}>
                  {birthdaySettings.enabled ? "✅ Automated SMS Enabled" : "⏸️ Automated SMS Disabled"}
                </span>
              </label>
            </div>

            {/* Template Editor */}
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                Birthday SMS Message Template
              </label>
              <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 0.5rem" }}>
                Available placeholders: <code style={{ color: PRIMARY, fontWeight: 700 }}>{"{firstName}"}</code>,{" "}
                <code style={{ color: PRIMARY, fontWeight: 700 }}>{"{lastName}"}</code>,{" "}
                <code style={{ color: PRIMARY, fontWeight: 700 }}>{"{verseText}"}</code>,{" "}
                <code style={{ color: PRIMARY, fontWeight: 700 }}>{"{verseRef}"}</code>
              </p>
              <textarea
                rows={3}
                value={birthdaySettings.template}
                onChange={(e) => setBirthdaySettings((prev) => ({ ...prev, template: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  lineHeight: 1.4,
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => saveAllSettings(reminderVerses, birthdaySettings, birthdayVerses)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "8px",
                      border: "none",
                      background: PRIMARY,
                      color: "white",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                    }}
                  >
                    💾 Save Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...birthdaySettings, template: defaults?.birthdaySettings?.template || "" };
                      setBirthdaySettings(updated);
                      saveAllSettings(reminderVerses, updated, birthdayVerses);
                    }}
                    style={{
                      padding: "0.5rem 0.875rem",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      background: "white",
                      color: "#475569",
                      fontWeight: 700,
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                    }}
                  >
                    🔄 Reset Template
                  </button>
                </div>

                {/* Test SMS Send */}
                <button
                  type="button"
                  disabled={testingSms}
                  onClick={handleSendTestBirthdaySms}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    cursor: testingSms ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {testingSms ? "⏳ Sending Preview..." : "📲 Send Test Preview SMS to Me"}
                </button>
              </div>

              {testResult && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: testResult.success ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${testResult.success ? "#a7f3d0" : "#fecaca"}`,
                    color: testResult.success ? "#065f46" : "#991b1b",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                  }}
                >
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>

          {/* Card B: Birthday Scripture Blessing Pool */}
          <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  📖 Birthday Scripture Verse Pool ({birthdayVerses.length} Blessing Verses)
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.8125rem", margin: "0.2rem 0 0" }}>
                  Each celebrant receives an encouraging verse blessing rotated from this pool.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!defaults?.birthdayVerses) return;
                    setConfirmModal({
                      open: true,
                      title: "Reset Birthday Verses",
                      message: "Reset the birthday verse pool back to church standard defaults?",
                      confirmLabel: "Reset to Defaults",
                      confirmColor: "#f59e0b",
                      onConfirm: () => {
                        setBirthdayVerses(defaults.birthdayVerses);
                        saveAllSettings(reminderVerses, birthdaySettings, defaults.birthdayVerses);
                        setConfirmModal((prev) => ({ ...prev, open: false }));
                      },
                    });
                  }}
                  style={{
                    padding: "0.5rem 0.875rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    background: "white",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}
                >
                  🔄 Restore Defaults
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setVerseModal({
                      open: true,
                      mode: "add_birthday",
                      ref: "",
                      text: "",
                    })
                  }
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    background: PRIMARY,
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    boxShadow: "0 2px 8px rgba(78, 177, 203, 0.3)",
                  }}
                >
                  ➕ Add Birthday Verse
                </button>
              </div>
            </div>

            {/* Verses List */}
            {birthdayVerses.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8", border: "1.5px dashed #cbd5e1", borderRadius: "10px" }}>
                No birthday verses in this pool yet. Click "Add Birthday Verse" or "Restore Defaults".
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {birthdayVerses.map((verse, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#f8fafc",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                      padding: "1rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9375rem", color: "#1e293b", lineHeight: 1.5, marginBottom: "0.25rem" }}>
                        "{verse.text}"
                      </div>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: PRIMARY }}>
                        📖 {verse.ref}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() =>
                          setVerseModal({
                            open: true,
                            mode: "edit_birthday",
                            index: idx,
                            ref: verse.ref,
                            text: verse.text,
                          })
                        }
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          background: "white",
                          color: "#475569",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBirthdayVerse(idx)}
                        style={{
                          padding: "0.35rem 0.65rem",
                          borderRadius: "6px",
                          border: "1px solid #fee2e2",
                          background: "#fef2f2",
                          color: "#ef4444",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT SCRIPTURE VERSE ── */}
      {verseModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", margin: "0 0 1rem" }}>
              {verseModal.mode.startsWith("add") ? "➕ Add Scripture Verse" : "✏️ Edit Scripture Verse"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Scripture Reference (e.g. Philippians 4:13, Psalm 118:24)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Psalm 122:1"
                  value={verseModal.ref}
                  onChange={(e) => setVerseModal((prev) => ({ ...prev, ref: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.875rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#334155", marginBottom: "0.35rem" }}>
                  Verse Scripture Text
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter the encouraging Scripture text..."
                  value={verseModal.text}
                  onChange={(e) => setVerseModal((prev) => ({ ...prev, text: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "0.625rem 0.875rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    lineHeight: 1.4,
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>
                  Character count: <strong>{verseModal.text.length}</strong> chars (Keep concise for single-segment SMS)
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setVerseModal({ open: false, mode: "add_reminder", ref: "", text: "" })}
                  style={{
                    flex: 1,
                    padding: "0.625rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    background: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (verseModal.mode.includes("reminder")) {
                      handleSaveReminderVerse();
                    } else {
                      handleSaveBirthdayVerse();
                    }
                  }}
                  style={{
                    flex: 2,
                    padding: "0.625rem",
                    borderRadius: "8px",
                    border: "none",
                    background: PRIMARY,
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Save Verse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmColor={confirmModal.confirmColor}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
      />

      <style jsx global>{`
        @media (max-width: 767px) {
          .sms-hub-container {
            padding: 1rem 0.75rem !important;
          }
          .smslogs-desktop-table {
            display: none !important;
          }
          .smslogs-mobile-cards {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
