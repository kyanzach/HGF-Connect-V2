"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

const PRIMARY = "#4eb1cb";

type CandidateLeader = {
  id: number;
  firstName: string;
  lastName: string;
};

type Registration = {
  id: number;
  fullName: string;
  age: number;
  area: string;
  createdAt: string;
  status: string;
  assignedLeaderId: number | null;
  assignedLeader: { id: number; firstName: string; lastName: string } | null;
};

export default function LifeGroupAdminClient({
  initialRegistrations,
  candidateLeaders,
}: {
  initialRegistrations: Registration[];
  candidateLeaders: CandidateLeader[];
}) {
  const [registrations, setRegistrations] = useState<Registration[]>(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Edit State
  const [editingRegistrant, setEditingRegistrant] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", age: "", areaOption: "", otherArea: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Extract unique areas for filtering dropdown
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    registrations.forEach((r) => {
      if (r.area.startsWith("Central Davao")) {
        areas.add("Central Davao");
      } else if (r.area.startsWith("North Davao")) {
        areas.add("North Davao");
      } else if (r.area.startsWith("South & West Davao")) {
        areas.add("South & West Davao");
      } else {
        areas.add(r.area);
      }
    });
    return Array.from(areas).sort();
  }, [registrations]);

  // Filter registrations
  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      const matchSearch = r.fullName.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchArea = true;
      if (areaFilter) {
        if (areaFilter === "Central Davao" || areaFilter === "North Davao" || areaFilter === "South & West Davao") {
          matchArea = r.area.startsWith(areaFilter);
        } else {
          matchArea = r.area === areaFilter;
        }
      }

      let matchStatus = true;
      if (statusFilter) {
        matchStatus = r.status === statusFilter;
      }

      return matchSearch && matchArea && matchStatus;
    });
  }, [registrations, searchQuery, areaFilter, statusFilter]);

  // Dynamic distribution stats
  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter(r => r.status === "pending").length;
    const appointed = registrations.filter(r => r.status === "appointed").length;

    let central = 0;
    let north = 0;
    let southWest = 0;
    let others = 0;

    registrations.forEach(r => {
      if (r.area.startsWith("Central Davao")) central++;
      else if (r.area.startsWith("North Davao")) north++;
      else if (r.area.startsWith("South & West Davao")) southWest++;
      else others++;
    });

    return { total, pending, appointed, central, north, southWest, others };
  }, [registrations]);

  // Actions: Assign Leader
  const handleAssignLeader = async (id: number, leaderIdStr: string) => {
    const leaderId = leaderIdStr ? parseInt(leaderIdStr, 10) : null;
    const newStatus = leaderId ? "appointed" : "pending";

    // Optimistic UI update
    const previous = [...registrations];
    const updatedList = registrations.map(r => {
      if (r.id === id) {
        const found = candidateLeaders.find(l => l.id === leaderId);
        return {
          ...r,
          assignedLeaderId: leaderId,
          assignedLeader: found ? { id: found.id, firstName: found.firstName, lastName: found.lastName } : null,
          status: newStatus
        };
      }
      return r;
    });
    setRegistrations(updatedList);

    try {
      const res = await fetch(`/api/admin/lifegroup/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedLeaderId: leaderId,
          status: newStatus
        })
      });

      if (!res.ok) {
        throw new Error("Failed to assign leader");
      }
    } catch (err) {
      console.error(err);
      // Revert on failure
      setRegistrations(previous);
    }
  };

  // Actions: Edit Init
  const startEdit = (r: Registration) => {
    let opt = "Others";
    let spec = r.area;
    if (r.area.startsWith("Central Davao")) {
      opt = "Central Davao (Bajada, Boulevard, Lanang)";
      spec = "";
    } else if (r.area.startsWith("North Davao")) {
      opt = "North Davao (Agdao, Buhangin, Bunawan, & Rural North)";
      spec = "";
    } else if (r.area.startsWith("South & West Davao")) {
      opt = "South & West Davao (Toril, Mintal, Calinan, & Highlands)";
      spec = "";
    }

    setEditForm({
      fullName: r.fullName,
      age: String(r.age),
      areaOption: opt,
      otherArea: spec
    });
    setEditError("");
    setEditingRegistrant(r);
  };

  // Actions: Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegistrant) return;
    setEditError("");

    if (!editForm.fullName.trim()) return setEditError("Full name is required.");
    if (!editForm.age.trim() || isNaN(parseInt(editForm.age))) return setEditError("Please enter a valid age.");
    if (!editForm.areaOption) return setEditError("Please select an area.");

    const finalArea = editForm.areaOption === "Others" ? editForm.otherArea : editForm.areaOption;
    if (editForm.areaOption === "Others" && !editForm.otherArea.trim()) {
      return setEditError("Please specify area details.");
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/lifegroup/${editingRegistrant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editForm.fullName,
          age: parseInt(editForm.age, 10),
          area: finalArea
        })
      });

      const data = await res.ok ? await res.json() : null;
      if (!res.ok || !data?.success) {
        setEditError(data?.error || "Failed to save updates.");
      } else {
        setRegistrations(prev => prev.map(r => r.id === editingRegistrant.id ? data.registration : r));
        setEditingRegistrant(null);
      }
    } catch (err) {
      console.error(err);
      setEditError("An unexpected error occurred.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Actions: Delete
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/lifegroup/${deleteConfirmId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== deleteConfirmId));
        setDeleteConfirmId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete registration.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during deletion.");
    } finally {
      setDeleting(false);
    }
  };

  // UTF-8 CSV Export
  const handleExportCSV = () => {
    const headers = ["Date Registered", "Full Name", "Age", "Area", "Status", "Assigned Leader"];
    const rows = filtered.map((r) => [
      new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "2-digit", day: "2-digit" }),
      r.fullName,
      r.age,
      r.area,
      r.status,
      r.assignedLeader ? `${r.assignedLeader.firstName} ${r.assignedLeader.lastName}` : "Unassigned"
    ]);

    const csvString = [headers.join(","), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lifegroup_registrations_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const signupUrl = "https://connect.houseofgrace.ph/lifegroup/join";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(signupUrl)}`;

  return (
    <div style={{ padding: "1.5rem 2rem", minHeight: "100vh", background: "#f8fafc" }}>
      {/* Back Button & Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <Link href="/admin" style={{ color: PRIMARY, textDecoration: "none", fontSize: "0.875rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "0.5rem" }}>
            ← Back to Admin Dashboard
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            👥 LIFE Group Registrations
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            Manage list of members registering for cell groups
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            style={{
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.625rem 1.125rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: filtered.length === 0 ? "not-allowed" : "pointer",
              opacity: filtered.length === 0 ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            📥 Export to CSV
          </button>

          <button
            onClick={() => setQrModalOpen(true)}
            style={{
              background: PRIMARY,
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.625rem 1.125rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
          >
            📱 Project QR Code
          </button>
        </div>
      </div>

      {/* Analytics Widgets Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Total Signups */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>{stats.total}</span>
            <span style={{ fontSize: "1.5rem" }}>📋</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>Total Registrations</div>
        </div>

        {/* Pending Assignment */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#d97706" }}>{stats.pending}</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#fef3c7", color: "#d97706", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>Action Needed</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>Pending Assignment</div>
        </div>

        {/* Appointed Leaders */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", borderLeft: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "#059669" }}>{stats.appointed}</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "#ecfdf5", color: "#059669", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>Assigned</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>Appointed / Grouped</div>
        </div>

        {/* Area Distribution Summary */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem" }}>Area Segments</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem", fontSize: "0.72rem", color: "#64748b" }}>
            <div>Central: <strong>{stats.central}</strong></div>
            <div>North: <strong>{stats.north}</strong></div>
            <div>South/West: <strong>{stats.southWest}</strong></div>
            <div>Others: <strong>{stats.others}</strong></div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", outline: "none" }}
          />
        </div>
        <div style={{ width: "200px" }}>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", outline: "none", background: "white" }}
          >
            <option value="">All Areas</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
        <div style={{ width: "180px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.875rem", outline: "none", background: "white" }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Assignment</option>
            <option value="appointed">Appointed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>No registrations found</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {registrations.length === 0 ? "No anyone has registered for LIFE Groups yet." : "Try adjusting your filter search."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700 }}>Date Registered</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700 }}>Full Name</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700 }}>Age</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700 }}>Area</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700 }}>Status</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700 }}>Assigned Pastor / Leader</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 700, textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "1rem", color: "#64748b" }}>
                      {new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </td>
                    <td style={{ padding: "1rem", fontWeight: 600, color: "#0f172a" }}>
                      {r.fullName}
                    </td>
                    <td style={{ padding: "1rem", color: "#0f172a" }}>
                      {r.age}
                    </td>
                    <td style={{ padding: "1rem", color: "#475569" }}>
                      {r.area}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        background: r.status === "appointed" ? "#ecfdf5" : "#fef3c7",
                        color: r.status === "appointed" ? "#059669" : "#d97706"
                      }}>
                        {r.status === "appointed" ? "Appointed" : "Pending"}
                      </span>
                    </td>
                    {/* Leader assignment select */}
                    <td style={{ padding: "1rem" }}>
                      <select
                        value={r.assignedLeaderId || ""}
                        onChange={(e) => handleAssignLeader(r.id, e.target.value)}
                        style={{
                          padding: "0.35rem 0.625rem",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.825rem",
                          background: "white",
                          outline: "none",
                          cursor: "pointer",
                          width: "180px",
                          fontWeight: r.assignedLeaderId ? 600 : 400,
                          color: r.assignedLeaderId ? "#0f172a" : "#64748b"
                        }}
                      >
                        <option value="">Unassigned</option>
                        {candidateLeaders.map(l => (
                          <option key={l.id} value={l.id}>{l.firstName} {l.lastName}</option>
                        ))}
                      </select>
                    </td>
                    {/* Edit & Delete Buttons */}
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "0.375rem" }}>
                        <button
                          onClick={() => startEdit(r)}
                          title="Edit Info"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#eff6ff",
                            color: "#2563eb",
                            cursor: "pointer",
                            fontSize: "0.9rem"
                          }}
                        >
                          📝
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(r.id)}
                          title="Delete Registration"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#fef2f2",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.9rem"
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Registrant Info Modal */}
      {editingRegistrant && (
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
            maxWidth: "450px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            position: "relative"
          }}>
            <button
              onClick={() => setEditingRegistrant(null)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
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

            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
              Edit Registrant
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Update registration details for cell group assignment
            </p>

            {editError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#b91c1c", marginBottom: "1.25rem", fontWeight: 500 }}>
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                  Age
                </label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm(prev => ({ ...prev, age: e.target.value }))}
                  required
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                  Area
                </label>
                <select
                  value={editForm.areaOption}
                  onChange={(e) => setEditForm(prev => ({ ...prev, areaOption: e.target.value }))}
                  required
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", background: "white" }}
                >
                  <option value="Central Davao (Bajada, Boulevard, Lanang)">Central Davao (Bajada, Boulevard, Lanang)</option>
                  <option value="North Davao (Agdao, Buhangin, Bunawan, & Rural North)">North Davao (Agdao, Buhangin, Bunawan, & Rural North)</option>
                  <option value="South & West Davao (Toril, Mintal, Calinan, & Highlands)">South & West Davao (Toril, Mintal, Calinan, & Highlands)</option>
                  <option value="Others">Others (Specify below)</option>
                </select>
              </div>

              {editForm.areaOption === "Others" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                    Area Details
                  </label>
                  <input
                    type="text"
                    value={editForm.otherArea}
                    onChange={(e) => setEditForm(prev => ({ ...prev, otherArea: e.target.value }))}
                    placeholder="Specify location"
                    required
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingRegistrant(null)}
                  style={{ flex: 1, padding: "0.75rem", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ flex: 1, padding: "0.75rem", background: PRIMARY, color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: savingEdit ? "not-allowed" : "pointer", opacity: savingEdit ? 0.7 : 1 }}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Connect standard modal format) */}
      {deleteConfirmId && (
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
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.5rem" }}>
              Delete Registration
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              Are you sure you want to permanent delete this LIFE Group registration? This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{ flex: 1, padding: "0.75rem", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, padding: "0.75rem", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Presentation Modal */}
      {qrModalOpen && (
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
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            position: "relative"
          }}>
            <button
              onClick={() => setQrModalOpen(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                fontSize: "1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748b"
              }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
              LIFE Group QR Code
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Project or flash this on the sanctuary screen for members to join
            </p>

            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "1.5rem",
              display: "inline-block",
              marginBottom: "1.5rem"
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="Scan to Join LIFE Group"
                style={{ width: "260px", height: "260px", display: "block" }}
              />
            </div>

            <div style={{ background: "#f0fdfa", border: "1px solid #ccfbf1", borderRadius: "12px", padding: "0.75rem 1rem", fontSize: "0.8125rem", color: "#0f766e", fontWeight: 500, marginBottom: "1.5rem" }}>
              🔗 <strong>Form Link:</strong> <span style={{ textDecoration: "underline" }}>connect.houseofgrace.ph/lifegroup/join</span>
            </div>

            <button
              onClick={() => setQrModalOpen(false)}
              style={{
                background: PRIMARY,
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "0.75rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                width: "100%"
              }}
            >
              Close Presentation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
