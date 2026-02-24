"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const PRIMARY = "#4EB1CB";

type TabKey = "personal" | "contact" | "bio" | "privacy" | "sms" | "security";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "personal", icon: "👤", label: "Personal" },
  { key: "contact", icon: "📋", label: "Contact" },
  { key: "bio", icon: "✝️", label: "Bio & Verse" },
  { key: "privacy", icon: "🔒", label: "Privacy" },
  { key: "sms", icon: "📲", label: "SMS Alerts" },
  { key: "security", icon: "🔑", label: "Security" },
];

export default function EditProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew]         = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving]   = useState(false);
  const [pwMsg, setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "",
    birthdate: "", baptismDate: "",
    invitedBy: "", familyMembers: "",
    phone: "", address: "",
    favoriteVerse: "",
    showEmail: true, showPhone: true, showAddress: true,
    sms5dayReminder: true, sms3dayReminder: true,
    sms1dayReminder: true, smsSameDayReminder: true,
  });
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [coverPic, setCoverPic] = useState<string | null>(null);

  const memberId = session?.user?.id;

  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/members/${memberId}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          birthdate: data.birthdate ? data.birthdate.slice(0, 10) : "",
          baptismDate: data.baptismDate ? data.baptismDate.slice(0, 10) : "",
          invitedBy: data.invitedBy ?? "",
          familyMembers: data.familyMembers ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
          favoriteVerse: data.favoriteVerse ?? "",
          showEmail: data.showEmail ?? true,
          showPhone: data.showPhone ?? true,
          showAddress: data.showAddress ?? true,
          sms5dayReminder: data.sms5dayReminder ?? true,
          sms3dayReminder: data.sms3dayReminder ?? true,
          sms1dayReminder: data.sms1dayReminder ?? true,
          smsSameDayReminder: data.smsSameDayReminder ?? true,
        });
        if (data.profilePicture) setProfilePic(`/uploads/profile_pictures/${data.profilePicture}`);
        if (data.coverPhoto) setCoverPic(`/uploads/profile_pictures/${data.coverPhoto}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [memberId]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          birthdate: form.birthdate || null,
          baptismDate: form.baptismDate || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return (
    <div style={{ padding: "4rem 1rem", textAlign: "center", color: "#94a3b8" }}>
      Please <a href="/login" style={{ color: PRIMARY }}>sign in</a> to edit your profile.
    </div>
  );

  // ── Input styles ────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "10px",
    padding: "0.625rem 0.875rem", fontSize: "0.9rem", fontFamily: "inherit",
    color: "#1e293b", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem", fontWeight: 700, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "0.375rem",
  };
  const fieldGroup = (label: string, children: React.ReactNode) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
  const toggleRow = (label: string, sub: string, key: keyof typeof form) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 0", borderBottom: "1px solid #f8fafc" }}>
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{label}</div>
        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{sub}</div>
      </div>
      <button
        type="button"
        onClick={() => set(key, !form[key])}
        style={{
          width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
          background: form[key] as boolean ? PRIMARY : "#e2e8f0",
          position: "relative", transition: "background 0.2s", flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: form[key] as boolean ? 22 : 2,
          width: 20, height: 20, borderRadius: "50%", background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.2s",
        }} />
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: "1rem 1rem 1.25rem", color: "white", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "white", fontSize: "0.875rem", cursor: "pointer", marginBottom: "0.375rem", padding: 0, opacity: 0.85 }}>
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 800 }}>✏️ Edit Profile</h1>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem 0" }}>
        {/* Photos section */}
        <div style={{ background: "white", borderRadius: "14px", overflow: "hidden", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

          {/* Profile photo row */}
          <div
            onClick={() => profileInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: `${PRIMARY}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2.5px solid ${PRIMARY}` }}>
              {profilePic ? (
                <Image src={profilePic} alt="Profile" width={56} height={56} style={{ objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "1.375rem", fontWeight: 800, color: PRIMARY }}>{form.firstName?.[0]?.toUpperCase() ?? "?"}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#1e293b", fontSize: "0.875rem" }}>Profile Photo</p>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Tap to change · JPG, PNG · max 5MB</p>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: "1.1rem" }}>›</span>
          </div>
          <input ref={profileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const fd = new FormData(); fd.append("file", file); fd.append("type", "profile");
            const res = await fetch(`/api/members/${memberId}/photo`, { method: "POST", body: fd });
            if (res.ok) { const { path } = await res.json(); setProfilePic(path); }
          }} />

          {/* Cover photo row */}
          <div
            onClick={() => coverInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            {/* Cover preview — landscape rectangle */}
            <div style={{ width: 80, height: 48, borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "2px solid #e2e8f0", background: coverPic ? "transparent" : `linear-gradient(135deg, #0f2d3d, ${PRIMARY})`, position: "relative" }}>
              {coverPic ? (
                <Image src={coverPic} alt="Cover" fill style={{ objectFit: "cover" }} sizes="80px" />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.25rem" }}>🌅</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#1e293b", fontSize: "0.875rem" }}>Cover Photo</p>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Tap to change · JPG, PNG · max 5MB</p>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: "1.1rem" }}>›</span>
          </div>
          <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const fd = new FormData(); fd.append("file", file); fd.append("type", "cover");
            const res = await fetch(`/api/members/${memberId}/photo`, { method: "POST", body: fd });
            if (res.ok) { const { path } = await res.json(); setCoverPic(path); }
          }} />
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", marginBottom: "1rem", scrollbarWidth: "none" }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flexShrink: 0, padding: "0.5rem 1rem", borderRadius: "999px",
              border: activeTab === t.key ? "none" : "1.5px solid #e2e8f0",
              background: activeTab === t.key ? PRIMARY : "white",
              color: activeTab === t.key ? "white" : "#64748b",
              fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8" }}>Loading…</div>
        ) : (
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

            {activeTab === "personal" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                  {fieldGroup("First Name", <input style={inputStyle} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" />)}
                  {fieldGroup("Last Name", <input style={inputStyle} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" />)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                  {fieldGroup("Birthday", <input type="date" style={inputStyle} value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} />)}
                  {fieldGroup("Baptism Date", <input type="date" style={inputStyle} value={form.baptismDate} onChange={(e) => set("baptismDate", e.target.value)} />)}
                </div>
                {fieldGroup("Invited / Referred By", <input style={inputStyle} value={form.invitedBy} onChange={(e) => set("invitedBy", e.target.value)} placeholder="Who invited you?" />)}
                {fieldGroup("Family Members (comma-separated)", <input style={inputStyle} value={form.familyMembers} onChange={(e) => set("familyMembers", e.target.value)} placeholder="Karen Joan, Kyrah Grace, Kyan Zach" />)}
              </div>
            )}

            {activeTab === "contact" && (
              <div>
                {fieldGroup("Mobile Number", <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+63 917 123 4567" />)}
                {fieldGroup("Address", <textarea style={{ ...inputStyle, resize: "none" } as React.CSSProperties} rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Davao City, Philippines" />)}
              </div>
            )}

            {activeTab === "bio" && (
              <div>
                <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "0.75rem" }}>Share a Bible verse that inspires you — it will appear on your public profile.</p>
                {fieldGroup("Favorite Bible Verse", (
                  <textarea
                    style={{ ...inputStyle, resize: "vertical", minHeight: 100 } as React.CSSProperties}
                    rows={5}
                    value={form.favoriteVerse}
                    onChange={(e) => set("favoriteVerse", e.target.value)}
                    placeholder='"For God so loved the world..." — John 3:16'
                  />
                ))}
                {form.favoriteVerse && (
                  <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "0.875rem 1rem", borderLeft: `3px solid ${PRIMARY}` }}>
                    <p style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", margin: 0 }}>{form.favoriteVerse}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "0.875rem" }}>Control what other members can see on your public profile.</p>
                {toggleRow("Show Email Address", "Members in the directory can see your email", "showEmail")}
                {toggleRow("Show Phone Number", "Members in the directory can see your phone", "showPhone")}
                {toggleRow("Show Home Address", "Members in the directory can see your address", "showAddress")}
              </div>
            )}

            {activeTab === "sms" && (
              <div>
                <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "0.875rem" }}>Choose which SMS event reminders you&apos;d like to receive.</p>
                {toggleRow("5-Day Reminder", "Receive an SMS 5 days before an event", "sms5dayReminder")}
                {toggleRow("3-Day Reminder", "Receive an SMS 3 days before an event", "sms3dayReminder")}
                {toggleRow("1-Day Reminder", "Receive an SMS 1 day before an event", "sms1dayReminder")}
                {toggleRow("Same-Day Reminder", "Receive an SMS on the morning of an event", "smsSameDayReminder")}
              </div>
            )}

            {activeTab === "security" && (
              <div>
                <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "1rem", lineHeight: 1.5 }}>
                  Set or update your login password. If your account does not have a password yet, leave the current password field blank.
                </p>
                {([
                  { label: "Current Password", val: pwCurrent, set: setPwCurrent, placeholder: "Leave blank if no password yet" },
                  { label: "New Password", val: pwNew, set: setPwNew, placeholder: "Min. 8 characters" },
                  { label: "Confirm New Password", val: pwConfirm, set: setPwConfirm, placeholder: "Repeat new password" },
                ] as { label: string; val: string; set: (v: string) => void; placeholder: string }[]).map(({ label, val, set, placeholder }) => (
                  <div key={label} style={{ marginBottom: "0.875rem" }}>
                    <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>{label}</label>
                    <input
                      type="password"
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder={placeholder}
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
                {pwMsg && (
                  <p style={{ fontSize: "0.85rem", color: pwMsg.ok ? "#059669" : "#ef4444", marginBottom: "0.75rem", fontWeight: 600 }}>
                    {pwMsg.ok ? "✅" : "⚠️"} {pwMsg.text}
                  </p>
                )}
                <button
                  disabled={pwSaving}
                  onClick={async () => {
                    setPwMsg(null);
                    if (!pwNew) return setPwMsg({ ok: false, text: "Please enter a new password." });
                    if (pwNew.length < 8) return setPwMsg({ ok: false, text: "Password must be at least 8 characters." });
                    if (pwNew !== pwConfirm) return setPwMsg({ ok: false, text: "Passwords do not match." });
                    setPwSaving(true);
                    try {
                      const r = await fetch("/api/profile/password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ currentPassword: pwCurrent || undefined, newPassword: pwNew }),
                      });
                      const d = await r.json();
                      if (d.ok) {
                        setPwMsg({ ok: true, text: "Password updated successfully!" });
                        setPwCurrent(""); setPwNew(""); setPwConfirm("");
                      } else {
                        setPwMsg({ ok: false, text: d.error ?? "Failed to update password." });
                      }
                    } catch { setPwMsg({ ok: false, text: "Network error. Please try again." }); }
                    finally { setPwSaving(false); }
                  }}
                  style={{ width: "100%", padding: "0.875rem", background: pwSaving ? "#94a3b8" : PRIMARY, border: "none", borderRadius: "12px", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: pwSaving ? "not-allowed" : "pointer" }}
                >
                  {pwSaving ? "Updating…" : "🔑 Update Password"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        {error && <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.75rem", textAlign: "center" }}>{error}</p>}
        {saved && <p style={{ color: "#059669", fontSize: "0.875rem", marginTop: "0.75rem", textAlign: "center", fontWeight: 700 }}>✅ Changes saved!</p>}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button
            onClick={() => router.push(`/member/${memberId}`)}
            style={{ flex: 1, padding: "0.875rem", background: "white", border: "1.5px solid #e2e8f0", borderRadius: "12px", color: "#64748b", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}
          >
            View Profile
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{ flex: 2, padding: "0.875rem", background: saving ? "#94a3b8" : PRIMARY, border: "none", borderRadius: "12px", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
