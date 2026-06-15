"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PhotoViewerModal, { type HistoryPhoto } from "@/components/PhotoViewerModal";

const PRIMARY = "#4EB1CB";

type TabKey = "personal" | "ministries" | "security" | "privacy";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "personal", icon: "👤", label: "Personal" },
  { key: "ministries", icon: "🤲", label: "Ministries" },
  { key: "security", icon: "🔑", label: "Security" },
  { key: "privacy", icon: "🔒", label: "Privacy" },
];

export default function EditProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [profileHistory, setProfileHistory] = useState<HistoryPhoto[]>([]);
  const [coverHistory,   setCoverHistory]   = useState<HistoryPhoto[]>([]);
  const [viewerPhotos,   setViewerPhotos]   = useState<HistoryPhoto[]>([]);
  const [viewerStart,    setViewerStart]    = useState(0);
  const [viewerOpen,     setViewerOpen]     = useState(false);
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

  const [masterMinistries, setMasterMinistries] = useState<{ id: number; name: string }[]>([]);
  const [selectedMinistryIds, setSelectedMinistryIds] = useState<number[]>([]);
  const [initialMinistryStatuses, setInitialMinistryStatuses] = useState<Record<number, string>>({});
  const [memberType, setMemberType] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "",
    birthdate: "", baptismDate: "",
    invitedBy: "", familyMembers: "",
    phone: "", address: "",
    favoriteVerse: "",
    showEmail: true, showPhone: true, showAddress: true,
    sms5dayReminder: true, sms3dayReminder: true,
    sms1dayReminder: true, smsSameDayReminder: true,
    username: "",
  });
  const [originalUsername, setOriginalUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    loading: boolean;
    available: boolean | null;
    error: string | null;
  }>({ loading: false, available: null, error: null });
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const username = form.username.trim().toLowerCase();
    if (!username || username === originalUsername.toLowerCase()) {
      setUsernameStatus({ loading: false, available: null, error: null });
      return;
    }

    setUsernameStatus({ loading: true, available: null, error: null });

    const delayDebounce = setTimeout(async () => {
      if (username.length < 4) {
        setUsernameStatus({ loading: false, available: false, error: "Username must be at least 4 letters." });
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        setUsernameStatus({ loading: false, available: false, error: "Username can only contain letters, numbers, underscores, and hyphens." });
        return;
      }

      try {
        const res = await fetch(`/api/members/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.available) {
          setUsernameStatus({ loading: false, available: true, error: null });
        } else {
          setUsernameStatus({ loading: false, available: false, error: data.error || "Username is already taken." });
        }
      } catch {
        setUsernameStatus({ loading: false, available: null, error: "Failed to verify username." });
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [form.username, originalUsername]);
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
          username: data.username ?? "",
        });
        setOriginalUsername(data.username ?? "");
        setMemberType(data.type ?? "Regular");

        const userMins = data.ministries || [];
        const ids = userMins.map((um: any) => um.ministryId);
        setSelectedMinistryIds(ids);

        const statuses: Record<number, string> = {};
        userMins.forEach((um: any) => {
          statuses[um.ministryId] = um.status;
        });
        setInitialMinistryStatuses(statuses);

        if (data.profilePicture) setProfilePic(`/uploads/profile_pictures/${data.profilePicture}`);
        if (data.coverPhoto) setCoverPic(`/uploads/cover_photos/${data.coverPhoto}`);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    fetch("/api/ministries")
      .then((r) => r.json())
      .then((data) => {
        if (data.ministries) {
          setMasterMinistries(data.ministries);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch photo history
  useEffect(() => {
    if (!memberId) return;
    fetch(`/api/members/${memberId}/photo-history?type=profile`).then(r => r.json()).then(data => { if (Array.isArray(data)) setProfileHistory(data); }).catch(() => {});
    fetch(`/api/members/${memberId}/photo-history?type=cover`).then(r => r.json()).then(data => { if (Array.isArray(data)) setCoverHistory(data); }).catch(() => {});
  }, [memberId]);

  function set(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openViewer(photos: HistoryPhoto[], start = 0) {
    setViewerPhotos(photos);
    setViewerStart(start);
    setViewerOpen(true);
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
          ministryIds: selectedMinistryIds,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save");
      setSaved(true);
      setOriginalUsername(form.username);

      // Re-fetch member details to update ministries state cleanly
      fetch(`/api/members/${memberId}`)
        .then((r) => r.json())
        .then((data) => {
          const userMins = data.ministries || [];
          const ids = userMins.map((um: any) => um.ministryId);
          setSelectedMinistryIds(ids);
          const statuses: Record<number, string> = {};
          userMins.forEach((um: any) => {
            statuses[um.ministryId] = um.status;
          });
          setInitialMinistryStatuses(statuses);
        })
        .catch(() => {});

      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUsername() {
    setUsernameSaving(true);
    setUsernameMsg(null);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update username");
      
      setOriginalUsername(form.username);
      setUsernameMsg({ ok: true, text: "Username updated successfully!" });
      
      if (update) {
        await update();
      }
      
      setTimeout(() => setUsernameMsg(null), 3000);
    } catch (e: unknown) {
      setUsernameMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to update username" });
    } finally {
      setUsernameSaving(false);
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
    <>
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
                <img src={profilePic} alt="Profile" style={{ width: 56, height: 56, objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "1.375rem", fontWeight: 800, color: PRIMARY }}>{form.firstName?.[0]?.toUpperCase() ?? "?"}</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#1e293b", fontSize: "0.875rem" }}>Profile Photo</p>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Tap to upload new · JPG, PNG, HEIC · max 10MB</p>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: "1.1rem" }}>›</span>
          </div>

          {/* Profile photo history strip */}
          {profileHistory.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", padding: "0.625rem 1.25rem", overflowX: "auto", borderBottom: "1px solid #f1f5f9", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Past &nbsp;photos:</span>
              {profileHistory.slice(0, 4).map((h, i) => (
                <button key={h.id} onClick={() => openViewer(profileHistory, i)}
                  style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: "2px solid #e2e8f0", background: "#f1f5f9", cursor: "pointer", padding: 0 }}>
                  <img src={h.thumbUrl ?? h.url} alt="past" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
              {profileHistory.length > 4 && (
                <button onClick={() => openViewer(profileHistory, 4)}
                  style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9", border: "2px solid #e2e8f0", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, color: PRIMARY }}>
                  +{profileHistory.length - 4}<br />more
                </button>
              )}
            </div>
          )}

          <input ref={profileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const fd = new FormData(); fd.append("file", file); fd.append("type", "profile");
            const res = await fetch(`/api/members/${memberId}/photo`, { method: "POST", body: fd });
            if (res.ok) {
              const { path } = await res.json();
              setProfilePic(path);
              // Refresh history
              fetch(`/api/members/${memberId}/photo-history?type=profile`).then(r => r.json()).then(data => { if (Array.isArray(data)) setProfileHistory(data); }).catch(() => {});
            }
          }} />

          {/* Cover photo row */}
          <div
            onClick={() => coverInputRef.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
          >
            <div style={{ width: 80, height: 48, borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "2px solid #e2e8f0", background: coverPic ? "transparent" : `linear-gradient(135deg, #0f2d3d, ${PRIMARY})`, position: "relative" }}>
              {coverPic ? (
                <img src={coverPic} alt="Cover" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: "1.25rem" }}>🌅</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#1e293b", fontSize: "0.875rem" }}>Cover Photo</p>
              <p style={{ margin: "0.125rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>Tap to upload new · JPG, PNG, HEIC · max 10MB</p>
            </div>
            <span style={{ color: "#cbd5e1", fontSize: "1.1rem" }}>›</span>
          </div>

          {/* Cover photo history strip */}
          {coverHistory.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", padding: "0.625rem 1.25rem", overflowX: "auto", alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>Past &nbsp;covers:</span>
              {coverHistory.slice(0, 3).map((h, i) => (
                <button key={h.id} onClick={() => openViewer(coverHistory, i)}
                  style={{ flexShrink: 0, width: 70, height: 42, borderRadius: 6, overflow: "hidden", border: "2px solid #e2e8f0", background: "#f1f5f9", cursor: "pointer", padding: 0 }}>
                  <img src={h.url} alt="past cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
              {coverHistory.length > 3 && (
                <button onClick={() => openViewer(coverHistory, 3)}
                  style={{ flexShrink: 0, width: 44, height: 42, borderRadius: 6, background: "#f1f5f9", border: "2px solid #e2e8f0", cursor: "pointer", fontSize: "0.65rem", fontWeight: 700, color: PRIMARY }}>
                  +{coverHistory.length - 3}<br />more
                </button>
              )}
            </div>
          )}

          <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" style={{ display: "none" }} onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            const fd = new FormData(); fd.append("file", file); fd.append("type", "cover");
            const res = await fetch(`/api/members/${memberId}/photo`, { method: "POST", body: fd });
            if (res.ok) {
              const { path } = await res.json();
              setCoverPic(path);
              fetch(`/api/members/${memberId}/photo-history?type=cover`).then(r => r.json()).then(data => { if (Array.isArray(data)) setCoverHistory(data); }).catch(() => {});
            }
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
                {/* Section: Basic Info */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: PRIMARY, margin: "0 0 1rem 0", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "0.5rem" }}>Basic Details</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                    {fieldGroup("First Name", <input style={inputStyle} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="First name" />)}
                    {fieldGroup("Last Name", <input style={inputStyle} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Last name" />)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                    {fieldGroup("Birthday", <input type="date" style={inputStyle} value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} />)}
                    {fieldGroup("Baptism Date", <input type="date" style={inputStyle} value={form.baptismDate} onChange={(e) => set("baptismDate", e.target.value)} />)}
                  </div>
                </div>

                {/* Section: Contact Details */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: PRIMARY, margin: "0 0 1rem 0", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "0.5rem" }}>Contact Information</h3>
                  {fieldGroup("Mobile Number", <input style={inputStyle} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+63 917 123 4567" />)}
                  {fieldGroup("Address", <textarea style={{ ...inputStyle, resize: "none" } as React.CSSProperties} rows={3} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Davao City, Philippines" />)}
                </div>

                {/* Section: Bio & Verse */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: PRIMARY, margin: "0 0 1rem 0", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "0.5rem" }}>Bio & Favorite Verse</h3>
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
                    <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "0.875rem 1rem", borderLeft: `3px solid ${PRIMARY}`, marginTop: "-0.5rem", marginBottom: "1rem" }}>
                      <p style={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic", margin: 0 }}>{form.favoriteVerse}</p>
                    </div>
                  )}
                </div>

                {/* Section: Additional Details */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: PRIMARY, margin: "0 0 1rem 0", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "0.5rem" }}>Background & Connection</h3>
                  {fieldGroup("Invited / Referred By", <input style={inputStyle} value={form.invitedBy} onChange={(e) => set("invitedBy", e.target.value)} placeholder="Who invited you?" />)}
                  {fieldGroup("Family Members (comma-separated)", <input style={inputStyle} value={form.familyMembers} onChange={(e) => set("familyMembers", e.target.value)} placeholder="" />)}
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div>
                {/* Section: Profile Visibility */}
                <div style={{ marginBottom: "1.75rem" }}>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: PRIMARY, margin: "0 0 0.5rem 0", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "0.5rem" }}>Profile Visibility</h3>
                  <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "0.875rem" }}>Control what other members can see on your public profile in the church directory.</p>
                  {toggleRow("Show Email Address", "Members in the directory can see your email", "showEmail")}
                  {toggleRow("Show Phone Number", "Members in the directory can see your phone", "showPhone")}
                  {toggleRow("Show Home Address", "Members in the directory can see your address", "showAddress")}
                </div>

                {/* Section: SMS Alerts */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: PRIMARY, margin: "0 0 0.5rem 0", borderBottom: "1.5px solid #f1f5f9", paddingBottom: "0.5rem" }}>SMS Event Reminders</h3>
                  <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "0.875rem" }}>Choose which SMS event alerts and reminders you&apos;d like to receive on your mobile number.</p>
                  {toggleRow("5-Day Reminder", "Receive an SMS 5 days before an event", "sms5dayReminder")}
                  {toggleRow("3-Day Reminder", "Receive an SMS 3 days before an event", "sms3dayReminder")}
                  {toggleRow("1-Day Reminder", "Receive an SMS 1 day before an event", "sms1dayReminder")}
                  {toggleRow("Same-Day Reminder", "Receive an SMS on the morning of an event", "smsSameDayReminder")}
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div>
                {/* Username Input with Debounced Live Verification */}
                <div style={{ marginBottom: "1.25rem", paddingBottom: "1.25rem", borderBottom: "1.5px dashed #f1f5f9" }}>
                  <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.3rem" }}>Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="Enter unique username"
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }}
                  />
                  {usernameStatus.loading && (
                    <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <span>🔄</span> Checking username availability...
                    </p>
                  )}
                  {!usernameStatus.loading && usernameStatus.error && (
                    <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                      <span>❌</span> {usernameStatus.error}
                    </p>
                  )}
                  {!usernameStatus.loading && usernameStatus.available && (
                    <p style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                      <span>✅</span> Username is available!
                    </p>
                  )}
                  {!usernameStatus.loading && usernameStatus.available === false && !usernameStatus.error && (
                    <p style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
                      <span>❌</span> Username is already taken.
                    </p>
                  )}
                  {usernameMsg && (
                    <p style={{ fontSize: "0.85rem", color: usernameMsg.ok ? "#059669" : "#ef4444", marginTop: "0.75rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                      {usernameMsg.ok ? "✅" : "⚠️"} {usernameMsg.text}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={usernameSaving || usernameStatus.loading || usernameStatus.available === false || !!usernameStatus.error || form.username.trim() === "" || form.username.toLowerCase() === originalUsername.toLowerCase()}
                    onClick={handleUpdateUsername}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      background: (usernameSaving || usernameStatus.loading || usernameStatus.available === false || !!usernameStatus.error || form.username.trim() === "" || form.username.toLowerCase() === originalUsername.toLowerCase()) ? "#94a3b8" : PRIMARY,
                      border: "none",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      cursor: (usernameSaving || usernameStatus.loading || usernameStatus.available === false || !!usernameStatus.error || form.username.trim() === "" || form.username.toLowerCase() === originalUsername.toLowerCase()) ? "not-allowed" : "pointer",
                      marginTop: "0.75rem"
                    }}
                  >
                    {usernameSaving ? "Updating Username…" : "💾 Update Username"}
                  </button>
                </div>

                <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "1rem", lineHeight: 1.5 }}>
                  Set or update your login password.
                </p>
                {([
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
                        body: JSON.stringify({ newPassword: pwNew }),
                      });
                      const d = await r.json();
                      if (d.ok) {
                        setPwMsg({ ok: true, text: "Password updated successfully!" });
                        setPwNew(""); setPwConfirm("");
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

            {activeTab === "ministries" && (
              <div>
                <p style={{ fontSize: "0.825rem", color: "#64748b", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  Join ministries to serving our community. Regular selections require administrative confirmation.
                </p>
                {memberType?.toLowerCase() === "new friend" ? (
                  <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "1.25rem", borderLeft: `4px solid ${PRIMARY}` }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.25rem" }}>ℹ️</span>
                      <div>
                        <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", fontWeight: 700, color: "#1e293b" }}>Family Member Access Only</h4>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                          Ministry involvement selections are only available for Family Members. We&apos;d like to invite you to become a member — please contact the church for more information!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Unsaved changes notice */}
                    {JSON.stringify([...selectedMinistryIds].sort()) !== JSON.stringify(Object.keys(initialMinistryStatuses).map(Number).sort()) && (
                      <div style={{ background: "#fffbeb", border: "1px solid #fef3c7", borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                        <span style={{ fontSize: "0.8rem", color: "#b45309", fontWeight: 600 }}>
                          You have unsaved changes. Click &quot;Save Changes&quot; at the bottom of the page to submit your request.
                        </span>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
                      {masterMinistries.map((m) => {
                        const isSelected = selectedMinistryIds.includes(m.id);
                        const status = initialMinistryStatuses[m.id]; // "active", "pending", or undefined
                        const isPendingUnsaved = isSelected && !status;

                        // Visual styling states
                        let border = "1.5px solid #e2e8f0";
                        let bg = "white";
                        let statusText = "";
                        let statusColor = "#94a3b8";
                        let actionLabel = "Request to Join";
                        let actionColor = PRIMARY;

                        if (isSelected) {
                          if (status === "active") {
                            border = `1.5px solid #10b981`;
                            bg = "#f0fdf4";
                            statusText = "✅ Active";
                            statusColor = "#10b981";
                            actionLabel = "Leave Ministry";
                            actionColor = "#ef4444";
                          } else if (status === "pending") {
                            border = `1.5px solid #f59e0b`;
                            bg = "#fffbeb";
                            statusText = "⏳ Pending Approval";
                            statusColor = "#f59e0b";
                            actionLabel = "Cancel Request";
                            actionColor = "#ef4444";
                          } else if (isPendingUnsaved) {
                            border = `1.5px dashed ${PRIMARY}`;
                            bg = "#f0f9ff";
                            statusText = "✍️ Applying (Unsaved)";
                            statusColor = PRIMARY;
                            actionLabel = "Cancel Request";
                            actionColor = "#ef4444";
                          }
                        }

                        return (
                          <div
                            key={m.id}
                            style={{
                              border,
                              background: bg,
                              borderRadius: "12px",
                              padding: "1rem",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              minHeight: 110,
                              boxSizing: "border-box",
                              transition: "all 0.2s",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>{m.name}</div>
                              {statusText && (
                                <div style={{ fontSize: "0.72rem", color: statusColor, fontWeight: 700, marginTop: "0.25rem" }}>
                                  {statusText}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedMinistryIds(prev => prev.filter(id => id !== m.id));
                                } else {
                                  setSelectedMinistryIds(prev => [...prev, m.id]);
                                }
                              }}
                              style={{
                                width: "100%",
                                padding: "0.4rem 0",
                                border: `1px solid ${actionColor}`,
                                borderRadius: "6px",
                                background: isSelected ? "white" : actionColor,
                                color: isSelected ? actionColor : "white",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                marginTop: "0.75rem",
                                transition: "all 0.15s",
                              }}
                            >
                              {actionLabel}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
            disabled={saving || loading || usernameStatus.loading || usernameStatus.available === false || !!usernameStatus.error}
            style={{ flex: 2, padding: "0.875rem", background: (saving || usernameStatus.loading || usernameStatus.available === false || !!usernameStatus.error) ? "#94a3b8" : PRIMARY, border: "none", borderRadius: "12px", color: "white", fontSize: "0.9rem", fontWeight: 800, cursor: (saving || usernameStatus.loading || usernameStatus.available === false || !!usernameStatus.error) ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>

    {/* Photo Viewer Modal */}
    {viewerOpen && viewerPhotos.length > 0 && (
      <PhotoViewerModal
        photos={viewerPhotos}
        startIndex={viewerStart}
        memberId={parseInt(memberId!)}
        onClose={() => setViewerOpen(false)}
        onRestore={(photo) => {
          if (photo.type === "profile") {
            setProfilePic(photo.url);
            fetch(`/api/members/${memberId}/photo-history?type=profile`).then(r => r.json()).then(data => { if (Array.isArray(data)) setProfileHistory(data); }).catch(() => {});
          } else {
            setCoverPic(photo.url);
            fetch(`/api/members/${memberId}/photo-history?type=cover`).then(r => r.json()).then(data => { if (Array.isArray(data)) setCoverHistory(data); }).catch(() => {});
          }
        }}
      />
    )}
    </>
  );
}
