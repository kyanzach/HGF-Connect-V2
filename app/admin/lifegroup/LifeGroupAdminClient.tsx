"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

const PRIMARY = "#4eb1cb";

type Registration = {
  id: number;
  fullName: string;
  age: number;
  area: string;
  createdAt: string;
};

export default function LifeGroupAdminClient({
  initialRegistrations,
}: {
  initialRegistrations: Registration[];
}) {
  const [registrations] = useState<Registration[]>(initialRegistrations);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Extract unique areas for filtering dropdown
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    registrations.forEach((r) => {
      // Group standard ones to avoid cluttering, but add others verbatim
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
      return matchSearch && matchArea;
    });
  }, [registrations, searchQuery, areaFilter]);

  // UTF-8 CSV Export
  const handleExportCSV = () => {
    const headers = ["Date Registered", "Full Name", "Age", "Area"];
    const rows = filtered.map((r) => [
      new Date(r.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "2-digit", day: "2-digit" }),
      r.fullName,
      r.age,
      r.area,
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
          {/* Export Button */}
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

          {/* Present QR Code Button */}
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

      {/* Quick Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>{registrations.length}</div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>Total Registrations</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10b981" }}>{filtered.length}</div>
          <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "0.25rem" }}>Filtered Matches</div>
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
        <div style={{ width: "220px" }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            position: "relative",
            animation: "scaleIn 0.2s ease"
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
