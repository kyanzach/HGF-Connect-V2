"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import MemberAttendanceModal from "@/components/MemberAttendanceModal";

const P = "#4EB1CB";

type Member = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  status: string;
  role: string;
  type: string;
  ageGroup: string | null;
  joinDate: string | null;
  createdAt: string;
  invitedBy: string | null;
  ministries: { ministry: { name: string } }[];
  attendance?: { attendanceDate: string | Date | null; event?: { title: string } | null }[];
};

type SegmentTab = "active" | "inactive" | "guests" | "archived";

const STATUS_COLOR: Record<string, string> = { approved: "#10b981", active: "#10b981", pending: "#f59e0b", inactive: "#ef4444", guest: "#8b5cf6", archived: "#64748b" };
const ROLE_COLOR: Record<string, string> = { admin: "#ef4444", moderator: "#f59e0b", usher: "#8b5cf6", member: "#64748b" };

export default function AdminMembersClient({
  members: initial, ministries, isAdmin, initialTab, initialAge,
}: { members: Member[]; ministries: { id: number; name: string }[]; isAdmin: boolean; initialTab?: string; initialAge?: string }) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const isStrictAdmin = session?.user?.role === "admin";

  const [members, setMembers] = useState(initial);
  const [updatingTypeIds, setUpdatingTypeIds] = useState<Record<number, boolean>>({});
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Record<number, boolean>>({});
  const [updatingAgeGroupIds, setUpdatingAgeGroupIds] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");

  const isValidTab = (tab?: string): tab is SegmentTab => {
    return ["active", "inactive", "guests", "archived"].includes(tab || "");
  };
  const [segmentTab, setSegmentTab] = useState<SegmentTab>(
    isValidTab(initialTab) ? initialTab : "active"
  );
  const [typeFilter, setTypeFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState(initialAge || "all");
  const [sortField, setSortField] = useState<"name" | "type" | "ageGroup" | "visits" | "lastVisit" | "ministries" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedMemberForStats, setSelectedMemberForStats] = useState<{ id: number; name: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", joinDate: "", ageGroup: "Adult", type: "GrowingFriend", role: "member",
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string;
    confirmColor: string; loading: boolean; onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", confirmColor: "#ef4444", loading: false, onConfirm: () => {} });

  const [resetDetails, setResetDetails] = useState<{
    open: boolean;
    name: string;
    username: string;
    password?: string;
    loading: boolean;
    copied: boolean;
    error: string;
  }>({ open: false, name: "", username: "", loading: false, copied: false, error: "" });

  const [ministryManager, setMinistryManager] = useState<{
    open: boolean; memberId: number; memberName: string; selectedIds: Set<number>; loading: boolean; error?: string;
  } | null>(null);

  const openMinistryManager = (memberId: number, memberName: string, currentMinistries: any[]) => {
    const ids = new Set<number>(currentMinistries.map(m => m.ministryId || m.ministry?.id).filter(Boolean));
    setMinistryManager({
      open: true,
      memberId,
      memberName,
      selectedIds: ids,
      loading: false
    });
  };

  const saveMinistries = async () => {
    if (!ministryManager) return;
    setMinistryManager(prev => prev ? { ...prev, loading: true, error: "" } : null);
    try {
      const res = await fetch(`/api/members/${ministryManager.memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ministryIds: Array.from(ministryManager.selectedIds)
        })
      });
      if (res.ok) {
        const updatedList = ministries.filter(m => ministryManager.selectedIds.has(m.id));
        setMembers(prev => prev.map(m => {
          if (m.id === ministryManager.memberId) {
            return {
              ...m,
              ministries: updatedList.map(min => ({
                ministry: { name: min.name },
                ministryId: min.id
              }))
            } as any;
          }
          return m;
        }));
        setMinistryManager(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setMinistryManager(prev => prev ? { ...prev, loading: false, error: errData.error || "Failed to save ministries." } : null);
      }
    } catch (err) {
      console.error(err);
      setMinistryManager(prev => prev ? { ...prev, loading: false, error: "An error occurred while saving." } : null);
    }
  };

  async function changeStatus(id: number, newStatus: string) {
    setUpdatingStatusIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatusIds(prev => ({ ...prev, [id]: false }));
    }
  }

  function getMemberAutoSegment(m: Member): "active" | "inactive" | "guests" | "archived" {
    if (m.status === "archived") return "archived";
    if (m.status === "active") return "active";
    if (m.status === "inactive") return "inactive";
    if (m.status === "guest") return "guests";

    const records = m.attendance || [];
    if (records.length <= 1) return "guests";

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dates = records.map(a => a.attendanceDate ? new Date(a.attendanceDate as string).getTime() : 0);
    const latest = Math.max(...dates);
    if (latest >= thirtyDaysAgo.getTime()) return "active";
    return "inactive";
  }

  // ── Segment members by attendance behavior & overrides ────────────────────
  const segments = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const activeList: Member[] = [];
    const inactiveList: Member[] = [];
    const guestList: Member[] = [];
    const archivedList: Member[] = [];

    members.forEach(m => {
      if (m.status === "archived") {
        archivedList.push(m);
        return;
      }
      if (m.status === "pending") {
        return;
      }

      // Check for manual overrides:
      if (m.status === "active") {
        activeList.push(m);
        return;
      }
      if (m.status === "inactive") {
        inactiveList.push(m);
        return;
      }
      if (m.status === "guest") {
        guestList.push(m);
        return;
      }

      // Default: Auto (Attendance-based)
      const records = m.attendance || [];
      const total = records.length;
      if (total <= 1) {
        guestList.push(m);
      } else {
        const dates = records.map(a => a.attendanceDate ? new Date(a.attendanceDate as string).getTime() : 0);
        const latest = Math.max(...dates);
        if (latest >= thirtyDaysAgo.getTime()) {
          activeList.push(m);
        } else {
          inactiveList.push(m);
        }
      }
    });

    return { activeList, inactiveList, guestList, archivedList };
  }, [members]);

  const filtered = useMemo(() => {
    let list = segments.activeList;
    if (segmentTab === "inactive") list = segments.inactiveList;
    else if (segmentTab === "guests") list = segments.guestList;
    else if (segmentTab === "archived") list = segments.archivedList;
    
    if (search) list = list.filter(m => `${m.firstName} ${m.lastName} ${m.email ?? ""} ${m.username ?? ""}`.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter !== "all") list = list.filter(m => m.type === typeFilter);
    if (ageFilter !== "all") list = list.filter(m => (m.ageGroup || "Adult") === ageFilter);
    return list;
  }, [segments, segmentTab, search, typeFilter, ageFilter]);

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    
    return [...filtered].sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      if (sortField === "name") {
        valA = `${a.firstName} ${a.lastName}`.toLowerCase();
        valB = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (sortField === "type") {
        valA = (a.type || "").toLowerCase();
        valB = (b.type || "").toLowerCase();
      } else if (sortField === "ageGroup") {
        valA = (a.ageGroup || "Adult").toLowerCase();
        valB = (b.ageGroup || "Adult").toLowerCase();
      } else if (sortField === "visits") {
        valA = a.attendance?.length || 0;
        valB = b.attendance?.length || 0;
      } else if (sortField === "lastVisit") {
        valA = a.attendance?.[0]?.attendanceDate ? new Date(a.attendance[0].attendanceDate).getTime() : 0;
        valB = b.attendance?.[0]?.attendanceDate ? new Date(b.attendance[0].attendanceDate).getTime() : 0;
      } else if (sortField === "ministries") {
        valA = a.ministries.map(m => m.ministry.name).join(", ").toLowerCase();
        valB = b.ministries.map(m => m.ministry.name).join(", ").toLowerCase();
      }
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortOrder]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const renderSortIndicator = (field: typeof sortField) => {
    if (sortField !== field) return " ↕";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setAdding(true); setAddErr("");
    const res = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setAddErr(data.error ?? "Failed"); setAdding(false); return; }
    setMembers(prev => [data.member ?? data, ...prev]);
    setShowAdd(false); setForm({ firstName: "", lastName: "", email: "", phone: "", joinDate: "", ageGroup: "Adult", type: "GrowingFriend", role: "member" });
    setAdding(false);
  }


  async function changeType(id: number, newType: string) {
    setUpdatingTypeIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, type: newType } : m));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTypeIds(prev => ({ ...prev, [id]: false }));
    }
  }

  async function changeAgeGroup(id: number, newAgeGroup: string) {
    setUpdatingAgeGroupIds(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageGroup: newAgeGroup }),
      });
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, ageGroup: newAgeGroup } : m));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAgeGroupIds(prev => ({ ...prev, [id]: false }));
    }
  }

  function promptDeleteMember(id: number, name: string) {
    setConfirmModal({
      open: true, title: "Delete Member",
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete", confirmColor: "#ef4444", loading: false,
      onConfirm: () => executeDeleteMember(id),
    });
  }

  async function executeDeleteMember(id: number) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setMembers(prev => prev.filter(m => m.id !== id));
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
  }

  async function handleImpersonate(id: number, name: string) {
    setConfirmModal({
      open: true,
      title: "Login As Member",
      message: `Are you sure you want to temporarily login as "${name}"?`,
      confirmLabel: "Login As",
      confirmColor: P,
      loading: false,
      onConfirm: () => executeImpersonate(id, name),
    });
  }

  async function executeImpersonate(id: number, name: string) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await update({ impersonateId: id });
      if (res) {
        setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
        router.push("/feed");
        router.refresh();
      } else {
        setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
      }
    } catch (err) {
      console.error(err);
      setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
    }
  }

  function handleResetPassword(id: number, name: string) {
    setConfirmModal({
      open: true,
      title: "Reset Password",
      message: `Are you sure you want to reset the password for "${name}"? This will invalidate their current password.`,
      confirmLabel: "Reset Password",
      confirmColor: "#4f46e5",
      loading: false,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        executeResetPassword(id, name);
      }
    });
  }

  async function executeResetPassword(id: number, name: string) {
    setResetDetails({ open: true, name, username: "", loading: true, copied: false, error: "" });
    try {
      const res = await fetch(`/api/members/${id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResetDetails(prev => ({ ...prev, loading: false, error: data.error ?? "Failed to reset password." }));
        return;
      }
      setResetDetails({
        open: true,
        name: data.name,
        username: data.username,
        password: data.password,
        loading: false,
        copied: false,
        error: ""
      });
      // Also update local list in case a new username was generated
      setMembers(prev => prev.map(m => m.id === id ? { ...m, username: data.username } : m));
    } catch (err) {
      console.error(err);
      setResetDetails(prev => ({ ...prev, loading: false, error: "An unexpected network error occurred." }));
    }
  }

  // Pre-formatted credentials template
  const shareText = `⛪ HGF Connect — Account Password Reset

Hi! Your account password has been reset successfully. Here are your temporary login credentials:

🔗 Login URL: https://connect.houseofgrace.ph/login
👤 Username: ${resetDetails.username}
🔑 Temporary Password: ${resetDetails.password}

Please log in at your earliest convenience. Once logged in, we highly encourage you to update your profile details and change your temporary password under your Account Profile settings.

Thank you and God bless!`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(shareText);
      setResetDetails(prev => ({ ...prev, copied: true }));
      setTimeout(() => {
        setResetDetails(prev => ({ ...prev, copied: false }));
      }, 2000);
    } catch (err) {
      console.error("Clipboard write error", err);
    }
  }

  const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" };
  const sel: React.CSSProperties = { ...inp };

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>👥 Members</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{members.length} total members</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ background: P, color: "white", border: "none", borderRadius: "8px", padding: "0.625rem 1.25rem", fontWeight: 700, cursor: "pointer", fontSize: "0.875rem" }}>
          ➕ Add Member
        </button>
      </div>

      {/* ── Segment Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {([
          { key: "active" as SegmentTab, label: "Active", count: segments.activeList.length, color: "#10b981", icon: "✅" },
          { key: "inactive" as SegmentTab, label: "Inactive", count: segments.inactiveList.length, color: "#f59e0b", icon: "💤" },
          { key: "guests" as SegmentTab, label: "Guests", count: segments.guestList.length, color: "#8b5cf6", icon: "👋" },
          { key: "archived" as SegmentTab, label: "Archived", count: segments.archivedList.length, color: "#64748b", icon: "📁" },
        ]).map(tab => {
          const isActive = segmentTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setSegmentTab(tab.key)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
              padding: "0.75rem 0.5rem", borderRadius: "12px", cursor: "pointer", transition: "all 0.2s",
              border: isActive ? `2px solid ${tab.color}` : "2px solid #e2e8f0",
              background: isActive ? `${tab.color}0D` : "white",
              boxShadow: isActive ? `0 2px 12px ${tab.color}25` : "none",
            }}>
              <span style={{ fontSize: "1.25rem" }}>{tab.icon}</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 900, color: isActive ? tab.color : "#475569", lineHeight: 1 }}>{tab.count}</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: isActive ? tab.color : "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search name or email…" style={{ ...inp, maxWidth: 280 }} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...sel, width: 160 }}>
          <option value="all">All types</option>
          <option value="FamilyMember">Family Member</option>
          <option value="GrowingFriend">Growing Friend</option>
          <option value="NewFriend">New Friend</option>
        </select>
        <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} style={{ ...sel, width: 140 }}>
          <option value="all">All ages</option>
          <option value="Adult">Adult</option>
          <option value="Youth">Youth</option>
          <option value="Kids">Kids</option>
        </select>
        <select
          value={sortField ? `${sortField}-${sortOrder}` : "none"}
          onChange={e => {
            if (e.target.value === "none") {
              setSortField(null);
            } else {
              const [field, order] = e.target.value.split("-") as [any, any];
              setSortField(field);
              setSortOrder(order);
            }
          }}
          style={{ ...sel, width: 160 }}
        >
          <option value="none">Sort by: Default</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="type-asc">Type (A-Z)</option>
          <option value="type-desc">Type (Z-A)</option>
          <option value="ageGroup-asc">Age Group (A-Z)</option>
          <option value="ageGroup-desc">Age Group (Z-A)</option>
          <option value="visits-desc">Visits (High-Low)</option>
          <option value="visits-asc">Visits (Low-High)</option>
          <option value="lastVisit-desc">Last Visit (Newest)</option>
          <option value="lastVisit-asc">Last Visit (Oldest)</option>
          <option value="ministries-asc">Ministries (A-Z)</option>
          <option value="ministries-desc">Ministries (Z-A)</option>
        </select>
        <span style={{ color: "#94a3b8", fontSize: "0.875rem", alignSelf: "center" }}>{sorted.length} shown</span>
      </div>

      {/* Add member modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: 800 }}>Add New Member</h2>
            <form onSubmit={handleAdd}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[["First Name*", "firstName"], ["Last Name*", "lastName"]].map(([l, k]) => (
                  <div key={k}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>{l}</label>
                    <input required style={inp} value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
                ))}
              </div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Email</label>
                <input type="email" style={inp} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Phone</label>
                <input style={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+63 917 000 0000" /></div>
              <div style={{ marginTop: "0.75rem" }}><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Join Date</label>
                <input type="date" style={inp} value={form.joinDate} onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Age Group</label>
                  <select style={sel} value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))}>
                    <option>Adult</option><option>Youth</option><option>Kids</option>
                  </select></div>
                <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Type</label>
                  <select style={sel} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="FamilyMember">Family Member</option>
                    <option value="GrowingFriend">Growing Friend</option>
                    <option value="NewFriend">New Friend</option>
                  </select></div>
                {isAdmin && <div><label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Role</label>
                  <select style={sel} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="member">Member</option><option value="usher">Usher</option>
                    <option value="moderator">Moderator</option><option value="admin">Admin</option>
                  </select></div>}
              </div>
              {addErr && <p style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem" }}>{addErr}</p>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: "0.625rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 700 }}>Cancel</button>
                <button type="submit" disabled={adding} style={{ flex: 2, padding: "0.625rem", border: "none", borderRadius: "8px", background: P, color: "white", cursor: "pointer", fontWeight: 700 }}>
                  {adding ? "Adding…" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Desktop View (Hidden on mobile) ── */}
      <div className="desktop-view" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {[
                  { label: "Member", field: "name" as const },
                  { label: "Contact", field: null },
                  { label: "Type", field: "type" as const },
                  { label: "Age Group", field: "ageGroup" as const },
                  { label: "Visits", field: "visits" as const },
                  { label: "Last Visit", field: "lastVisit" as const },
                  { label: "Status", field: null },
                  { label: "Role", field: null },
                  { label: "Ministries", field: "ministries" as const },
                  { label: "Username", field: null },
                  { label: "Actions", field: null }
                ].map(col => {
                  const isSortable = col.field !== null;
                  return (
                    <th
                      key={col.label}
                      onClick={() => isSortable && handleSort(col.field)}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "#64748b",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                        cursor: isSortable ? "pointer" : "default",
                        userSelect: "none",
                      }}
                    >
                      {col.label}
                      {isSortable && (
                        <span style={{ color: sortField === col.field ? P : "#cbd5e1", marginLeft: "0.25rem", fontSize: "0.7rem" }}>
                          {renderSortIndicator(col.field)}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => {
                const visitCount = m.attendance?.length || 0;
                const latestRecord = m.attendance?.[0] || null;
                const latestDate = latestRecord?.attendanceDate;
                const formattedDate = latestDate 
                  ? new Date(latestDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) 
                  : "Never";
                const latestEventTitle = latestRecord?.event?.title || "No event details";
                const autoSegment = getMemberAutoSegment(m);

                return (
                  <tr key={m.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <Link href={`/member/${m.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none" }}>{m.firstName} {m.lastName}</Link>
                      {m.joinDate && <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Since {new Date(m.joinDate).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}</div>}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      <div style={{ fontSize: "0.8rem" }}>{m.email ?? "—"}</div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{m.phone ?? "—"}</div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <select
                        value={m.type}
                        disabled={updatingTypeIds[m.id]}
                        onChange={(e) => changeType(m.id, e.target.value)}
                        style={{
                          fontSize: "0.75rem",
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontWeight: 600,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        <option value="FamilyMember">Family Member</option>
                        <option value="GrowingFriend">Growing Friend</option>
                        <option value="NewFriend">New Friend</option>
                      </select>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <select
                        value={m.ageGroup || "Adult"}
                        disabled={updatingAgeGroupIds[m.id]}
                        onChange={(e) => changeAgeGroup(m.id, e.target.value)}
                        style={{
                          fontSize: "0.75rem",
                          background: "#f1f5f9",
                          color: "#475569",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontWeight: 600,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        <option value="Adult">Adult</option>
                        <option value="Youth">Youth</option>
                        <option value="Kids">Kids</option>
                      </select>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        background: visitCount > 0 ? "#e0f7fb" : "#f1f5f9",
                        color: visitCount > 0 ? P : "#64748b",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "6px",
                        fontWeight: 700
                      }}>
                        {visitCount}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                      {visitCount > 0 ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          <span>{formattedDate}</span>
                          <button
                            onClick={() => setSelectedMemberForStats({ id: m.id, name: `${m.firstName} ${m.lastName}` })}
                            title="View Attendance History Graph"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              color: P,
                              padding: "0.15rem",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "transform 0.15s ease",
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.25)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            ℹ️
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>Never</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <select
                        value={m.status}
                        disabled={updatingStatusIds[m.id]}
                        onChange={(e) => changeStatus(m.id, e.target.value)}
                        style={{
                          fontSize: "0.75rem",
                          background: STATUS_COLOR[m.status] ? `${STATUS_COLOR[m.status]}18` : "#f1f5f9",
                          color: STATUS_COLOR[m.status] ?? "#475569",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                          textTransform: "capitalize"
                        }}
                      >
                        <option value="approved">Auto</option>
                        {(m.status === "active" || autoSegment !== "active") && <option value="active">Force Active</option>}
                        {(m.status === "inactive" || autoSegment !== "inactive") && <option value="inactive">Force Inactive</option>}
                        {(m.status === "guest" || autoSegment !== "guests") && <option value="guest">Force Guest</option>}
                        {(m.status === "archived" || autoSegment !== "archived") && <option value="archived">Force Archived</option>}
                        {m.status === "pending" && <option value="pending">Pending</option>}
                      </select>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}><span style={{ fontSize: "0.75rem", fontWeight: 700, color: ROLE_COLOR[m.role] ?? "#64748b" }}>{m.role}</span></td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
                        {m.ministries.map((mm, j) => (
                          <span key={j} style={{ fontSize: "0.7rem", background: P, color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                            {mm.ministry?.name || "Ministry"}
                          </span>
                        ))}
                        {isAdmin && (
                          <button
                            onClick={() => openMinistryManager(m.id, `${m.firstName} ${m.lastName}`, m.ministries)}
                            style={{
                              background: "#f1f5f9",
                              color: "#475569",
                              border: "1px dashed #cbd5e1",
                              borderRadius: "4px",
                              padding: "0.1rem 0.35rem",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            title="Manage Ministries"
                          >
                            + Manage
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <code style={{ fontSize: "0.8rem", background: "#f1f5f9", padding: "0.2rem 0.45rem", borderRadius: "4px", color: "#0f172a" }}>
                        {m.username ?? "—"}
                      </code>
                    </td>
                    <td style={{ padding: "0.75rem 0.5rem", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                        <Link href={`/member/${m.id}`} title="View Profile" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "8px", background: `${P}15`, color: P, textDecoration: "none", fontSize: "0.85rem" }}>👁</Link>
                        <button onClick={() => handleResetPassword(m.id, `${m.firstName} ${m.lastName}`)} title="Reset Password" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "8px", background: "#eef2ff", color: "#4f46e5", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>🔑</button>
                        {isStrictAdmin && (
                          <button onClick={() => handleImpersonate(m.id, `${m.firstName} ${m.lastName}`)} title="Login As" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "8px", background: `${P}15`, color: P, border: "none", cursor: "pointer", fontSize: "0.85rem" }}>🔄</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => promptDeleteMember(m.id, `${m.firstName} ${m.lastName}`)} title="Delete Member" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "8px", background: "#fef2f2", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={11} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No members found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile View (Cards) ── */}
      <div className="mobile-view" style={{ display: "none" }}>
        {sorted.map(m => {
          const visitCount = m.attendance?.length || 0;
          const latestRecord = m.attendance?.[0] || null;
          const latestDate = latestRecord?.attendanceDate;
          const formattedDate = latestDate 
            ? new Date(latestDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) 
            : "Never";
          const latestEventTitle = latestRecord?.event?.title || "No event details";
          const autoSegment = getMemberAutoSegment(m);

          return (
            <div key={m.id} style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", marginBottom: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
              {/* Header: Name & Status dropdowns */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.625rem" }}>
                <div>
                  <Link href={`/member/${m.id}`} style={{ fontWeight: 800, color: "#0f172a", textDecoration: "none", fontSize: "1.0625rem", lineHeight: 1.25 }}>
                    {m.firstName} {m.lastName}
                  </Link>
                  {m.joinDate && (
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                      Since {new Date(m.joinDate).toLocaleDateString("en-PH", { month: "short", year: "numeric" })}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                  <select
                    value={m.status}
                    disabled={updatingStatusIds[m.id]}
                    onChange={(e) => changeStatus(m.id, e.target.value)}
                    style={{
                      fontSize: "0.65rem",
                      background: STATUS_COLOR[m.status] ? `${STATUS_COLOR[m.status]}18` : "#f1f5f9",
                      color: STATUS_COLOR[m.status] ?? "#475569",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "6px",
                      border: "1px solid #e2e8f0",
                      fontWeight: 700,
                      cursor: "pointer",
                      outline: "none",
                      textTransform: "capitalize"
                    }}
                  >
                    <option value="approved">Auto</option>
                    {(m.status === "active" || autoSegment !== "active") && <option value="active">Force Active</option>}
                    {(m.status === "inactive" || autoSegment !== "inactive") && <option value="inactive">Force Inactive</option>}
                    {(m.status === "guest" || autoSegment !== "guests") && <option value="guest">Force Guest</option>}
                    {(m.status === "archived" || autoSegment !== "archived") && <option value="archived">Force Archived</option>}
                    {m.status === "pending" && <option value="pending">Pending</option>}
                  </select>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: ROLE_COLOR[m.role] ?? "#64748b", background: `${ROLE_COLOR[m.role] ?? "#64748b"}18`, padding: "0.2rem 0.5rem", borderRadius: "4px", textTransform: "capitalize" }}>
                    {m.role}
                  </span>
                </div>
              </div>

              {/* Badges: Type & Active Ministries */}
              <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={m.type}
                  disabled={updatingTypeIds[m.id]}
                  onChange={(e) => changeType(m.id, e.target.value)}
                  style={{
                    fontSize: "0.7rem",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="FamilyMember">Family Member</option>
                  <option value="GrowingFriend">Growing Friend</option>
                  <option value="NewFriend">New Friend</option>
                </select>
                <select
                  value={m.ageGroup || "Adult"}
                  disabled={updatingAgeGroupIds[m.id]}
                  onChange={(e) => changeAgeGroup(m.id, e.target.value)}
                  style={{
                    fontSize: "0.7rem",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "0.15rem 0.4rem",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontWeight: 600,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="Adult">Adult</option>
                  <option value="Youth">Youth</option>
                  <option value="Kids">Kids</option>
                </select>
                {m.ministries.map((mm, j) => (
                  <span key={j} style={{ fontSize: "0.7rem", background: P, color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 500 }}>
                    {mm.ministry.name}
                  </span>
                ))}
                {isAdmin && (
                  <button
                    onClick={() => openMinistryManager(m.id, `${m.firstName} ${m.lastName}`, m.ministries)}
                    style={{
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "4px",
                      padding: "0.15rem 0.4rem",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    + Manage
                  </button>
                )}
              </div>

              {/* Attendance Activity bar */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
                <span>📊</span>
                {visitCount > 0 ? (
                  <span>
                    <strong>{visitCount}</strong> {visitCount === 1 ? "visit" : "visits"}
                    {" • "}
                    Last: {formattedDate}
                    <button
                      onClick={() => setSelectedMemberForStats({ id: m.id, name: `${m.firstName} ${m.lastName}` })}
                      title="View Attendance History Graph"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        color: P,
                        padding: "0 0.2rem",
                        display: "inline-flex",
                        alignItems: "center",
                        verticalAlign: "middle",
                      }}
                    >
                      ℹ️
                    </button>
                  </span>
                ) : (
                  <span>No attendance recorded</span>
                )}
              </div>

            {/* Contact details & Username card */}
            <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.75rem", fontSize: "0.8rem", color: "#475569", marginBottom: "0.75rem", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", marginBottom: "0.35rem" }}>
                <span style={{ width: "80px", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>Email:</span>
                <span style={{ wordBreak: "break-all" }}>{m.email ?? "—"}</span>
              </div>
              <div style={{ display: "flex", marginBottom: "0.35rem" }}>
                <span style={{ width: "80px", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>Phone:</span>
                <span>{m.phone ?? "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ width: "80px", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>Username:</span>
                <code style={{ background: "#e2e8f0", color: "#0f172a", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {m.username ?? "—"}
                </code>
              </div>
            </div>

            {/* Responsive Actions bar */}
            <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.75rem" }}>
              <Link href={`/member/${m.id}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontSize: "0.75rem", color: P, background: "#e0f7fb", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, textDecoration: "none" }}>
                👁 View
              </Link>
              <button onClick={() => handleResetPassword(m.id, `${m.firstName} ${m.lastName}`)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#4f46e5", background: "#e0e7ff", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, cursor: "pointer" }}>
                🔑 Reset
              </button>
              {isStrictAdmin && (
                <button onClick={() => handleImpersonate(m.id, `${m.firstName} ${m.lastName}`)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontSize: "0.75rem", color: "white", background: P, border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, cursor: "pointer" }}>
                  🔄 Login As
                </button>
              )}
              {isAdmin && (
                <button onClick={() => promptDeleteMember(m.id, `${m.firstName} ${m.lastName}`)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", fontSize: "0.75rem", color: "#dc2626", background: "#fee2e2", border: "none", borderRadius: "6px", padding: "0.5rem 0", fontWeight: 700, cursor: "pointer" }}>
                  🗑️ Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
        {sorted.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>No members found.</div>
        )}
      </div>

      {/* ── Custom Password Reset Modal (Glassmorphic) ── */}
      {resetDetails.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.3)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.95)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: 440, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🔑</span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>Temporary Credentials</h2>
            </div>

            {resetDetails.loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 0" }}>
                <div className="spinner" style={{ width: "32px", height: "32px", border: "3px solid #f3f3f3", borderTop: `3px solid ${P}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <p style={{ marginTop: "1rem", color: "#64748b", fontSize: "0.875rem", fontWeight: 600 }}>Resetting account password...</p>
              </div>
            ) : resetDetails.error ? (
              <div>
                <p style={{ color: "#ef4444", fontSize: "0.9rem", margin: "1rem 0" }}>{resetDetails.error}</p>
                <button onClick={() => setResetDetails(prev => ({ ...prev, open: false }))} style={{ width: "100%", padding: "0.625rem", border: "none", borderRadius: "8px", background: "#f1f5f9", color: "#475569", fontWeight: 700, cursor: "pointer" }}>Close</button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
                  Password reset successfully for <strong style={{ color: "#0f172a" }}>{resetDetails.name}</strong>. Share the credentials package below:
                </p>

                {/* Details card */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "1rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Username:</span>
                    <strong style={{ color: "#0f172a" }}>{resetDetails.username}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Password:</span>
                    <code style={{ background: "#fef3c7", color: "#d97706", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700, fontSize: "0.875rem" }}>
                      {resetDetails.password}
                    </code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>Login Link:</span>
                    <a href="https://connect.houseofgrace.ph/login" target="_blank" rel="noreferrer" style={{ color: P, fontWeight: 700, textDecoration: "none" }}>
                      connect.houseofgrace.ph/login
                    </a>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "none",
                      borderRadius: "10px",
                      background: resetDetails.copied ? "#10b981" : P,
                      color: "white",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      transition: "background 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem"
                    }}
                  >
                    {resetDetails.copied ? "📋 Copied successfully! ✓" : "📋 Copy Account Info"}
                  </button>
                  <button
                    onClick={() => setResetDetails(prev => ({ ...prev, open: false }))}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: "10px",
                      background: "white",
                      color: "#475569",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "0.875rem"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {ministryManager && ministryManager.open && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            position: "relative"
          }}>
            <button
              onClick={() => setMinistryManager(null)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "30px",
                height: "30px",
                fontSize: "0.875rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b"
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              Manage Ministries
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Assign or remove ministries for <strong>{ministryManager.memberName}</strong>
            </p>

            {ministryManager.error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.5rem 0.75rem", fontSize: "0.8rem", color: "#b91c1c", marginBottom: "1rem", fontWeight: 500 }}>
                ⚠️ {ministryManager.error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto", padding: "2px", marginBottom: "1.5rem" }}>
              {ministries.map(min => {
                const isChecked = ministryManager.selectedIds.has(min.id);
                return (
                  <label key={min.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#334155", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const newIds = new Set(ministryManager.selectedIds);
                        if (isChecked) {
                          newIds.delete(min.id);
                        } else {
                          newIds.add(min.id);
                        }
                        setMinistryManager(prev => prev ? { ...prev, selectedIds: newIds } : null);
                      }}
                      style={{ width: "16px", height: "16px", accentColor: P }}
                    />
                    <span>{min.name}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setMinistryManager(null)}
                style={{
                  flex: 1,
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveMinistries}
                disabled={ministryManager.loading}
                style={{
                  flex: 1,
                  background: P,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.625rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  cursor: ministryManager.loading ? "not-allowed" : "pointer",
                  opacity: ministryManager.loading ? 0.7 : 1
                }}
              >
                {ministryManager.loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} confirmLabel={confirmModal.confirmLabel} confirmColor={confirmModal.confirmColor} loading={confirmModal.loading} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))} />

      <MemberAttendanceModal
        isOpen={!!selectedMemberForStats}
        onClose={() => setSelectedMemberForStats(null)}
        memberId={selectedMemberForStats?.id || 0}
        memberName={selectedMemberForStats?.name || ""}
      />

      {/* Responsive Styles Injection */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hgf-tooltip-container:hover .hgf-tooltip-content {
          opacity: 1 !important;
          transform: translateX(-50%) translateY(-2px) !important;
        }
        @media (max-width: 767px) {
          .desktop-view {
            display: none !important;
          }
          .mobile-view {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
