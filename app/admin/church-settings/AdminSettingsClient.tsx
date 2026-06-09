"use client";

import { useState } from "react";

const PRIMARY = "#4EB1CB";

interface AdminSettingsClientProps {
  initialSettings: {
    church_name: string;
    church_address: string;
    sunday_services: string;
    midweek_services: string;
    prayer_schedules: string;
    cell_groups: string;
    volunteering: string;
    worship_team: string;
    prayer_support: string;
    latest_announcements: string;
  };
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (key: keyof typeof initialSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/church-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || "Something went wrong saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-container" style={{ padding: "2rem", maxWidth: "800px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            ⛪ AI & Church Knowledge Base Settings
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", margin: "0.25rem 0 0" }}>
            Configure basic church details. The HGF Connect AI assistant dynamically queries this database to answer questions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Status Messages */}
        {success && (
          <div
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "12px",
              padding: "1rem",
              color: "#065f46",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            ✅ Settings saved successfully! Changes are live immediately for the AI assistant.
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "1rem",
              color: "#991b1b",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Form Fields Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: 0, paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
            General Info
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Church Name
            </label>
            <input
              type="text"
              value={settings.church_name}
              onChange={(e) => handleChange("church_name", e.target.value)}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Church Address / Location
            </label>
            <input
              type="text"
              value={settings.church_address}
              onChange={(e) => handleChange("church_address", e.target.value)}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0.5rem 0 0", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
            Service Times & Schedules
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Sunday Service Times
            </label>
            <textarea
              value={settings.sunday_services}
              onChange={(e) => handleChange("sunday_services", e.target.value)}
              rows={3}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Midweek (Wednesday) Service Times
            </label>
            <textarea
              value={settings.midweek_services}
              onChange={(e) => handleChange("midweek_services", e.target.value)}
              rows={2}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Other Prayer Schedules
            </label>
            <textarea
              value={settings.prayer_schedules}
              onChange={(e) => handleChange("prayer_schedules", e.target.value)}
              rows={2}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0.5rem 0 0", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
            Groups, Ministries & Serving
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Cell Group Information & Joining Instructions
            </label>
            <textarea
              value={settings.cell_groups}
              onChange={(e) => handleChange("cell_groups", e.target.value)}
              rows={3}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Volunteering & Orientation
            </label>
            <textarea
              value={settings.volunteering}
              onChange={(e) => handleChange("volunteering", e.target.value)}
              rows={3}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Worship Team Info
            </label>
            <textarea
              value={settings.worship_team}
              onChange={(e) => handleChange("worship_team", e.target.value)}
              rows={3}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", margin: "0.5rem 0 0", paddingBottom: "0.5rem", borderBottom: "1px solid #f1f5f9" }}>
            Support & Updates
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Prayer Support Instructions
            </label>
            <textarea
              value={settings.prayer_support}
              onChange={(e) => handleChange("prayer_support", e.target.value)}
              rows={2}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <label style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#475569" }}>
              Latest Church Announcements / Info
            </label>
            <textarea
              value={settings.latest_announcements}
              onChange={(e) => handleChange("latest_announcements", e.target.value)}
              rows={2}
              style={{
                border: "1.5px solid #cbd5e1",
                borderRadius: "8px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor = PRIMARY)}
              onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              required
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="settings-submit-btn"
          disabled={saving}
          style={{
            alignSelf: "flex-end",
            background: PRIMARY,
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "0.75rem 2rem",
            fontSize: "0.9375rem",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(78,177,203,0.3)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          {saving ? "⏳ Saving settings..." : "💾 Save Settings"}
        </button>
      </form>

      <style>{`
        @media (max-width: 767px) {
          .settings-container {
            padding: 1rem !important;
          }
          .settings-submit-btn {
            width: 100% !important;
            align-self: stretch !important;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
