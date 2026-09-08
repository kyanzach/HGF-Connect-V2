"use client";
import { useState, useEffect, useCallback } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

type PendingMember = {
  id: number; firstName: string; lastName: string; email: string | null; phone: string | null;
  type: string; ageGroup: string | null; joinDate: string | null; invitedBy: string | null;
  createdAt: string; address: string | null;
  ministries: { ministry: { name: string } }[];
};

type PendingMinistry = {
  id: number;
  memberId: number;
  ministryId: number;
  requestedAt: string | null;
  member: { id: number; firstName: string; lastName: string; email: string | null; phone: string | null };
  ministry: { id: number; name: string };
};

type HistoryItem = {
  id: number;
  kind: "registration" | "ministry";
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  memberType: string;
  ageGroup: string | null;
  address: string | null;
  invitedBy: string | null;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  details?: {
    ministryName?: string;
    ministryId?: number;
    memberMinistryId?: number;
    memberId?: number;
    ministries?: string[];
  };
  isDuplicate?: boolean;
  duplicateReasons?: string[];
};

export default function AdminReviewClient({
  pending: init,
  pendingMinistries: initMins,
}: {
  pending: PendingMember[];
  pendingMinistries: PendingMinistry[];
}) {
  const [pending, setPending] = useState(init);
  const [pendingMins, setPendingMins] = useState(initMins || []);
  const [activeTab, setActiveTab] = useState<"registrations" | "ministries" | "history">("registrations");
  const [processing, setProcessing] = useState<number | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [historyType, setHistoryType] = useState<"all" | "registrations" | "ministries">("all");
  const [historyStatus, setHistoryStatus] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [historySort, setHistorySort] = useState<"newest" | "oldest" | "duplicates" | "name_asc" | "name_desc" | "type" | "age">("newest");
  
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean; title: string; message: string | React.ReactNode; confirmLabel: string;
    confirmColor: string; loading: boolean; onConfirm: () => void;
  }>({ open: false, title: "", message: "", confirmLabel: "Confirm", confirmColor: "#ef4444", loading: false, onConfirm: () => {} });

  // ── Fetch History ────────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: "50",
        type: historyType,
        status: historyStatus,
        sort: historySort,
        search: historySearch.trim(),
      });
      const res = await fetch(`/api/admin/review/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data.items || []);
        setHistoryTotal(data.total || 0);
        setHistoryTotalPages(data.totalPages || 1);
      }
    } catch (e) {
      console.error("Failed to load review history:", e);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyType, historyStatus, historySort, historySearch]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // ── Registrations Actions ───────────────────────────────────────────────────
  async function approve(id: number) {
    setProcessing(id);
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    if (res.ok) {
      setPending(prev => prev.filter(m => m.id !== id));
      if (activeTab === "history") fetchHistory();
    }
    setProcessing(null);
  }

  function promptReject(id: number, name: string) {
    setConfirmModal({
      open: true,
      title: "Reject Registration",
      message: `Reject and delete the registration for "${name}"?`,
      confirmLabel: "Reject & Delete",
      confirmColor: "#ef4444",
      loading: false,
      onConfirm: () => executeDeleteMember(id),
    });
  }

  async function executeDeleteMember(id: number) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    setProcessing(id);
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPending(prev => prev.filter(m => m.id !== id));
      setHistoryItems(prev => prev.filter(item => !(item.kind === "registration" && item.id === id)));
      setHistoryTotal(prev => Math.max(0, prev - 1));
    }
    setProcessing(null);
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
  }

  function promptDeleteMember(id: number, name: string, isDuplicate?: boolean) {
    setConfirmModal({
      open: true,
      title: isDuplicate ? "Delete Duplicate Registration" : "Delete Member Record",
      message: (
        <div>
          <p style={{ margin: "0 0 0.5rem" }}>
            Are you sure you want to permanently delete the registration for <strong>&quot;{name}&quot;</strong>?
          </p>
          {isDuplicate && (
            <p style={{ margin: 0, fontSize: "0.825rem", color: "#dc2626", fontWeight: 600 }}>
              ⚠️ This will remove this duplicate entry from the database.
            </p>
          )}
        </div>
      ),
      confirmLabel: "Delete Permanently",
      confirmColor: "#dc2626",
      loading: false,
      onConfirm: () => executeDeleteMember(id),
    });
  }

  function promptRevertMember(id: number, name: string) {
    setConfirmModal({
      open: true,
      title: "Revert to Pending Review",
      message: `Put "${name}" back into Pending status? They will reappear in the Action Review Queue for re-evaluation.`,
      confirmLabel: "Revert to Pending",
      confirmColor: "#f59e0b",
      loading: false,
      onConfirm: () => executeRevertMember(id),
    });
  }

  async function executeRevertMember(id: number) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    setProcessing(id);
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    if (res.ok) {
      fetchHistory();
    }
    setProcessing(null);
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
  }

  function promptCancelMember(id: number, name: string) {
    setConfirmModal({
      open: true,
      title: "Cancel / Deactivate Registration",
      message: `Mark the account for "${name}" as Inactive?`,
      confirmLabel: "Mark Inactive",
      confirmColor: "#64748b",
      loading: false,
      onConfirm: () => executeCancelMember(id),
    });
  }

  async function executeCancelMember(id: number) {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    setProcessing(id);
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" }),
    });
    if (res.ok) {
      setPending(prev => prev.filter(m => m.id !== id));
      fetchHistory();
    }
    setProcessing(null);
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
  }

  // ── Ministry Requests Actions ──────────────────────────────────────────────
  async function approveMinistry(id: number) {
    setProcessing(id);
    const res = await fetch("/api/ministries/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    });
    if (res.ok) {
      setPendingMins(prev => prev.filter(m => m.id !== id));
      if (activeTab === "history") fetchHistory();
    }
    setProcessing(null);
  }

  function promptDenyMinistry(id: number, memberName: string, ministryName: string) {
    setConfirmModal({
      open: true,
      title: "Deny Ministry Request",
      message: `Deny the request for "${memberName}" to join the "${ministryName}" ministry?`,
      confirmLabel: "Deny",
      confirmColor: "#ef4444",
      loading: false,
      onConfirm: () => executeMinistryAction(id, "deny"),
    });
  }

  function promptRevertMinistry(id: number, memberName: string, ministryName: string) {
    setConfirmModal({
      open: true,
      title: "Revert Ministry Request",
      message: `Revert the request for "${memberName}" (${ministryName}) back to Pending status?`,
      confirmLabel: "Revert to Pending",
      confirmColor: "#f59e0b",
      loading: false,
      onConfirm: () => executeMinistryAction(id, "revert"),
    });
  }

  function promptCancelMinistry(id: number, memberName: string, ministryName: string) {
    setConfirmModal({
      open: true,
      title: "Cancel Ministry Assignment",
      message: `Mark the ministry assignment of "${memberName}" for "${ministryName}" as Inactive?`,
      confirmLabel: "Mark Inactive",
      confirmColor: "#64748b",
      loading: false,
      onConfirm: () => executeMinistryAction(id, "cancel"),
    });
  }

  function promptDeleteMinistry(id: number, memberName: string, ministryName: string) {
    setConfirmModal({
      open: true,
      title: "Delete Ministry Request Record",
      message: `Permanently delete this ministry record for "${memberName}" (${ministryName})?`,
      confirmLabel: "Delete Record",
      confirmColor: "#dc2626",
      loading: false,
      onConfirm: () => executeMinistryAction(id, "delete"),
    });
  }

  async function executeMinistryAction(id: number, action: "deny" | "revert" | "cancel" | "delete") {
    setConfirmModal(prev => ({ ...prev, loading: true }));
    setProcessing(id);
    const res = await fetch("/api/ministries/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setPendingMins(prev => prev.filter(m => m.id !== id));
      if (activeTab === "history") fetchHistory();
    }
    setProcessing(null);
    setConfirmModal(prev => ({ ...prev, open: false, loading: false }));
  }

  // Count duplicate items on current page
  const duplicateItemsCount = historyItems.filter(i => i.isDuplicate).length;

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>⏳ Action Review Queue</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
          Review pending registrations, ministry requests, and manage approval history &amp; duplicate entries
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("registrations")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "registrations" ? PRIMARY : "transparent",
            color: activeTab === "registrations" ? "white" : "#64748b",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.15s ease",
          }}
        >
          👥 Registrations ({pending.length})
        </button>
        <button
          onClick={() => setActiveTab("ministries")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "ministries" ? PRIMARY : "transparent",
            color: activeTab === "ministries" ? "white" : "#64748b",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.15s ease",
          }}
        >
          🤲 Ministry Requests ({pendingMins.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("history");
            setHistoryPage(1);
          }}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "history" ? PRIMARY : "transparent",
            color: activeTab === "history" ? "white" : "#64748b",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.15s ease",
          }}
        >
          📜 Review History
        </button>
      </div>

      {/* ── Tab 1: Registrations ── */}
      {activeTab === "registrations" && (
        pending.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>All caught up!</h2>
            <p style={{ color: "#64748b", margin: 0 }}>No pending member registrations.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pending.map(m => (
              <div key={m.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #fed7aa", padding: "1.25rem", borderLeft: "4px solid #f59e0b", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="registration-card-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>{m.firstName} {m.lastName}</h3>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#fef3c7", color: "#d97706", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{m.type}</span>
                      {m.ageGroup && <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{m.ageGroup}</span>}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.375rem", fontSize: "0.825rem", color: "#64748b" }}>
                      {m.email && <div>✉️ {m.email}</div>}
                      {m.phone && <div>📞 {m.phone}</div>}
                      {m.address && <div>📍 {m.address}</div>}
                      {m.invitedBy && <div>👥 Invited by {m.invitedBy}</div>}
                      {m.joinDate && <div>📅 Join date: {new Date(m.joinDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</div>}
                      <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Registered {new Date(m.createdAt).toLocaleDateString("en-PH")}</div>
                    </div>
                    {m.ministries.length > 0 && (
                      <div style={{ marginTop: "0.625rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {m.ministries.map((mm, i) => <span key={i} style={{ fontSize: "0.7rem", background: PRIMARY, color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>{mm.ministry.name}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="registration-actions" style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <Link href={`/member/${m.id}`} style={{ padding: "0.5rem 0.875rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", color: "#475569", textDecoration: "none", fontSize: "0.8rem", fontWeight: 700, display: "inline-block", textAlign: "center" }}>View</Link>
                    <button
                      onClick={() => approve(m.id)} disabled={processing === m.id}
                      style={{ padding: "0.5rem 0.875rem", border: "none", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: processing === m.id ? 0.6 : 1 }}>
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => promptReject(m.id, `${m.firstName} ${m.lastName}`)} disabled={processing === m.id}
                      style={{ padding: "0.5rem 0.875rem", border: "1.5px solid #fee2e2", borderRadius: "8px", background: "#fef2f2", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: processing === m.id ? 0.6 : 1 }}>
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tab 2: Ministries ── */}
      {activeTab === "ministries" && (
        pendingMins.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", background: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>All caught up!</h2>
            <p style={{ color: "#64748b", margin: 0 }}>No pending ministry requests.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pendingMins.map(m => (
              <div key={m.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #fed7aa", padding: "1.25rem", borderLeft: "4px solid #f59e0b", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div className="registration-card-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                        {m.member.firstName} {m.member.lastName}
                      </h3>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#fef3c7", color: "#d97706", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                        Ministry Request
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.375rem", fontSize: "0.825rem", color: "#64748b" }}>
                      <div>🤲 Requested: <span style={{ fontWeight: 700, color: PRIMARY }}>{m.ministry.name}</span></div>
                      {m.member.email && <div>✉️ {m.member.email}</div>}
                      {m.member.phone && <div>📞 {m.member.phone}</div>}
                      {m.requestedAt && (
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                          Requested {new Date(m.requestedAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="registration-actions" style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <Link href={`/member/${m.member.id}`} style={{ padding: "0.5rem 0.875rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", color: "#475569", textDecoration: "none", fontSize: "0.8rem", fontWeight: 700, display: "inline-block", textAlign: "center" }}>
                      View Profile
                    </Link>
                    <button
                      onClick={() => approveMinistry(m.id)} disabled={processing === m.id}
                      style={{ padding: "0.5rem 0.875rem", border: "none", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: processing === m.id ? 0.6 : 1 }}
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => promptDenyMinistry(m.id, `${m.member.firstName} ${m.member.lastName}`, m.ministry.name)} disabled={processing === m.id}
                      style={{ padding: "0.5rem 0.875rem", border: "1.5px solid #fee2e2", borderRadius: "8px", background: "#fef2f2", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: processing === m.id ? 0.6 : 1 }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Tab 3: History (All records with 50-item pagination & duplicate detection) ── */}
      {activeTab === "history" && (
        <div>
          {/* Controls Bar */}
          <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              {/* Search Box */}
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <input
                  type="text"
                  placeholder="🔍 Search name, phone, email, invited by..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.875rem",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    fontSize: "0.875rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {historySearch && (
                  <button
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryPage(1);
                    }}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: "none",
                      background: "transparent",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Type Filter */}
              <select
                value={historyType}
                onChange={(e) => {
                  setHistoryType(e.target.value as any);
                  setHistoryPage(1);
                }}
                style={{
                  padding: "0.55rem 0.875rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.875rem",
                  background: "white",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="all">👥 Registrations</option>
                <option value="ministries">🤲 Ministry Requests</option>
              </select>

              {/* Status Filter */}
              <select
                value={historyStatus}
                onChange={(e) => {
                  setHistoryStatus(e.target.value as any);
                  setHistoryPage(1);
                }}
                style={{
                  padding: "0.55rem 0.875rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.875rem",
                  background: "white",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">✅ Active / Approved</option>
                <option value="pending">⏳ Pending</option>
                <option value="inactive">📁 Inactive / Archived</option>
              </select>

              {/* Sorting Filter */}
              <select
                value={historySort}
                onChange={(e) => {
                  setHistorySort(e.target.value as any);
                  setHistoryPage(1);
                }}
                style={{
                  padding: "0.55rem 0.875rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.875rem",
                  background: "white",
                  color: "#334155",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="newest">📅 Newest to Oldest</option>
                <option value="oldest">📅 Oldest to Newest</option>
                <option value="duplicates">⚠️ Potential Duplicates First</option>
                <option value="name_asc">🔤 Name (A → Z)</option>
                <option value="name_desc">🔤 Name (Z → A)</option>
                <option value="type">👥 Member Type</option>
                <option value="age">🎂 Age Group</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchHistory()}
                disabled={historyLoading}
                style={{
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  border: "1.5px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#334155",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {/* Duplicate Notice Banner */}
            {duplicateItemsCount > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "0.65rem 0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", fontSize: "0.825rem", color: "#991b1b", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1rem" }}>⚠️</span>
                  <span>
                    <strong>{duplicateItemsCount} potential double entries</strong> detected on this page (matching phone, email, or full name).
                  </span>
                </div>
                <button
                  onClick={() => {
                    setHistorySort(historySort === "duplicates" ? "newest" : "duplicates");
                    setHistoryPage(1);
                  }}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #ef4444",
                    background: historySort === "duplicates" ? "#ef4444" : "white",
                    color: historySort === "duplicates" ? "white" : "#b91c1c",
                    fontWeight: 700,
                    fontSize: "0.775rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {historySort === "duplicates" ? "✓ Grouped by Duplicates (Reset)" : "🔍 Group & View Duplicates"}
                </button>
              </div>
            )}
          </div>

          {/* History Records List */}
          {historyLoading ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
              <p style={{ color: "#64748b", margin: 0 }}>Loading review history...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🔍</div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>No records found</h3>
              <p style={{ color: "#64748b", margin: 0, fontSize: "0.875rem" }}>
                {historySearch ? "Try clearing your search query or adjusting your filters." : "No requests in history yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "0.875rem" }}>
              {historyItems.map((item) => {
                const isMemberKind = item.kind === "registration";
                const isPending = item.status === "pending";
                const isActive = item.status === "active" || item.status === "approved";
                const isInactive = item.status === "inactive" || item.status === "archived";

                let statusBadgeColor = "#10b981";
                let statusBadgeBg = "#d1fae5";
                let statusLabel = "✅ Active";

                if (isPending) {
                  statusBadgeColor = "#d97706";
                  statusBadgeBg = "#fef3c7";
                  statusLabel = "⏳ Pending";
                } else if (isInactive) {
                  statusBadgeColor = "#64748b";
                  statusBadgeBg = "#f1f5f9";
                  statusLabel = "📁 Inactive";
                }

                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      border: item.isDuplicate ? "1.5px solid #fca5a5" : "1px solid #e2e8f0",
                      padding: "1.125rem 1.25rem",
                      borderLeft: item.isDuplicate
                        ? "4px solid #ef4444"
                        : isPending
                        ? "4px solid #f59e0b"
                        : isActive
                        ? "4px solid #10b981"
                        : "4px solid #94a3b8",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "box-shadow 0.15s ease",
                    }}
                  >
                    <div className="registration-card-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <div style={{ flex: 1 }}>
                        {/* Name & Badges */}
                        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                          <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                            {item.name}
                          </h3>

                          {/* Kind Badge */}
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, background: isMemberKind ? "#e0f2fe" : "#fdf4ff", color: isMemberKind ? "#0369a1" : "#a21caf", padding: "0.18rem 0.5rem", borderRadius: "4px" }}>
                            {isMemberKind ? `👥 ${item.memberType}` : `🤲 ${item.details?.ministryName || "Ministry"}`}
                          </span>

                          {/* Status Badge */}
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, background: statusBadgeBg, color: statusBadgeColor, padding: "0.18rem 0.5rem", borderRadius: "4px" }}>
                            {statusLabel}
                          </span>

                          {/* Duplicate Indicator */}
                          {item.isDuplicate && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 800, background: "#fee2e2", color: "#b91c1c", padding: "0.18rem 0.55rem", borderRadius: "4px", border: "1px solid #fca5a5" }}>
                              ⚠️ Double Entry ({item.duplicateReasons?.join(", ")})
                            </span>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.35rem", fontSize: "0.8125rem", color: "#64748b" }}>
                          {item.phone && <div>📞 {item.phone}</div>}
                          {item.email && <div>✉️ {item.email}</div>}
                          {item.address && <div>📍 {item.address}</div>}
                          {item.invitedBy && <div>👥 Invited by: <strong>{item.invitedBy}</strong></div>}
                          {item.ageGroup && <div>🎂 {item.ageGroup}</div>}
                          <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                            📅 {isMemberKind ? "Registered" : "Requested"} {new Date(item.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </div>

                        {/* Associated ministries for member */}
                        {isMemberKind && item.details?.ministries && item.details.ministries.length > 0 && (
                          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                            {item.details.ministries.map((minName, idx) => (
                              <span key={idx} style={{ fontSize: "0.7rem", background: PRIMARY, color: "white", padding: "0.12rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                                {minName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="registration-actions" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flexShrink: 0 }}>
                        {/* View Profile */}
                        <Link
                          href={`/member/${isMemberKind ? item.id : item.details?.memberId}`}
                          style={{
                            padding: "0.45rem 0.75rem",
                            border: "1.5px solid #e2e8f0",
                            borderRadius: "8px",
                            color: "#475569",
                            textDecoration: "none",
                            fontSize: "0.775rem",
                            fontWeight: 700,
                            display: "inline-block",
                            textAlign: "center",
                            background: "white",
                          }}
                        >
                          👁️ View
                        </Link>

                        {/* Approve (if pending) */}
                        {isPending && (
                          <button
                            onClick={() => (isMemberKind ? approve(item.id) : approveMinistry(item.id))}
                            disabled={processing === item.id}
                            style={{
                              padding: "0.45rem 0.75rem",
                              border: "none",
                              borderRadius: "8px",
                              background: "#10b981",
                              color: "white",
                              fontSize: "0.775rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              opacity: processing === item.id ? 0.6 : 1,
                            }}
                          >
                            ✅ Approve
                          </button>
                        )}

                        {/* Revert to Pending (if approved or inactive) */}
                        {!isPending && (
                          <button
                            onClick={() =>
                              isMemberKind
                                ? promptRevertMember(item.id, item.name)
                                : promptRevertMinistry(item.id, item.name, item.details?.ministryName || "")
                            }
                            disabled={processing === item.id}
                            title="Put back into Pending status for review queue"
                            style={{
                              padding: "0.45rem 0.75rem",
                              border: "1.5px solid #fed7aa",
                              borderRadius: "8px",
                              background: "#fffbeb",
                              color: "#b45309",
                              fontSize: "0.775rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              opacity: processing === item.id ? 0.6 : 1,
                            }}
                          >
                            ↩️ Revert to Pending
                          </button>
                        )}

                        {/* Cancel / Inactivate (if active) */}
                        {isActive && (
                          <button
                            onClick={() =>
                              isMemberKind
                                ? promptCancelMember(item.id, item.name)
                                : promptCancelMinistry(item.id, item.name, item.details?.ministryName || "")
                            }
                            disabled={processing === item.id}
                            style={{
                              padding: "0.45rem 0.75rem",
                              border: "1.5px solid #e2e8f0",
                              borderRadius: "8px",
                              background: "#f8fafc",
                              color: "#64748b",
                              fontSize: "0.775rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              opacity: processing === item.id ? 0.6 : 1,
                            }}
                          >
                            🚫 Cancel / Inactivate
                          </button>
                        )}

                        {/* Delete Record (especially for duplicate entries) */}
                        <button
                          onClick={() =>
                            isMemberKind
                              ? promptDeleteMember(item.id, item.name, item.isDuplicate)
                              : promptDeleteMinistry(item.id, item.name, item.details?.ministryName || "")
                          }
                          disabled={processing === item.id}
                          title="Permanently remove duplicate or mistaken record"
                          style={{
                            padding: "0.45rem 0.75rem",
                            border: "1.5px solid #fee2e2",
                            borderRadius: "8px",
                            background: "#fef2f2",
                            color: "#dc2626",
                            fontSize: "0.775rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            opacity: processing === item.id ? 0.6 : 1,
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 50-Item Pagination Controls */}
          {historyTotalPages > 1 && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                Showing <strong>{(historyPage - 1) * 50 + 1}</strong>–
                <strong>{Math.min(historyPage * 50, historyTotal)}</strong> of <strong>{historyTotal}</strong> records
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button
                  onClick={() => setHistoryPage(1)}
                  disabled={historyPage === 1 || historyLoading}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: "1.5px solid #e2e8f0",
                    background: "white",
                    color: historyPage === 1 ? "#cbd5e1" : "#334155",
                    cursor: historyPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  ⏮ First
                </button>
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage === 1 || historyLoading}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: "1.5px solid #e2e8f0",
                    background: "white",
                    color: historyPage === 1 ? "#cbd5e1" : "#334155",
                    cursor: historyPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  ‹ Previous
                </button>

                <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", padding: "0 0.5rem" }}>
                  Page {historyPage} of {historyTotalPages}
                </span>

                <button
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: "1.5px solid #e2e8f0",
                    background: "white",
                    color: historyPage >= historyTotalPages ? "#cbd5e1" : "#334155",
                    cursor: historyPage >= historyTotalPages ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  Next ›
                </button>
                <button
                  onClick={() => setHistoryPage(historyTotalPages)}
                  disabled={historyPage >= historyTotalPages || historyLoading}
                  style={{
                    padding: "0.4rem 0.75rem",
                    borderRadius: "6px",
                    border: "1.5px solid #e2e8f0",
                    background: "white",
                    color: historyPage >= historyTotalPages ? "#cbd5e1" : "#334155",
                    cursor: historyPage >= historyTotalPages ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}
                >
                  Last ⏭
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

      <style>{`
        @media (max-width: 767px) {
          .registration-card-inner {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .registration-actions {
            margin-top: 0.75rem !important;
            width: 100% !important;
          }
          .registration-actions > * {
            flex: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
