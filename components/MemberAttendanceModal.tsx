"use client";

import React, { useState, useEffect, useRef } from "react";

const P = "#4EB1CB"; // HGF Teal

interface HistoryItem {
  eventId: number;
  title: string;
  eventDate: string;
  eventType: string;
  speaker: string;
  attended: boolean;
}

interface SpeakerStat {
  name: string;
  attended: number;
  total: number;
  rate: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  memberId: number;
  memberName: string;
}

export default function MemberAttendanceModal({ isOpen, onClose, memberId, memberName }: Props) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerStat[]>([]);
  const [totalServices, setTotalServices] = useState<number>(0);
  const [totalAttended, setTotalAttended] = useState<number>(0);
  const [attendanceRate, setAttendanceRate] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [selectedService, setSelectedService] = useState<HistoryItem | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // compliance with rule 13: toggle hgf-modal-open on body
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("hgf-modal-open");
    } else {
      document.body.classList.remove("hgf-modal-open");
    }
    return () => {
      document.body.classList.remove("hgf-modal-open");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchStats = async () => {
      setIsLoading(true);
      setSelectedService(null);
      setHoveredNodeId(null);
      try {
        const res = await fetch(`/api/members/${memberId}/attendance-stats?year=${selectedYear}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
          setSpeakers(data.speakers || []);
          setTotalServices(data.totalServices || 0);
          setTotalAttended(data.totalAttended || 0);
          setAttendanceRate(data.attendanceRate || 0);
        }
      } catch (err) {
        console.error("Error fetching member attendance stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isOpen, memberId, selectedYear]);

  if (!isOpen) return null;

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const getRateColor = (rate: number) => {
    if (rate >= 80) return "#10b981"; // Green
    if (rate >= 50) return "#eab308"; // Orange/Yellow
    return "#ef4444"; // Red
  };

  // Group the services of the year by month (0 = Jan, 11 = Dec)
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const monthServices = history.filter(item => {
      const d = new Date(item.eventDate);
      return d.getUTCMonth() === i;
    });
    const attendedInMonth = monthServices.filter(s => s.attended).length;
    return {
      monthIndex: i,
      monthName: new Date(2026, i, 1).toLocaleDateString("en-US", { month: "short" }),
      services: monthServices,
      attendedCount: attendedInMonth,
      totalCount: monthServices.length,
    };
  });

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        ref={modalRef}
        style={{
          background: "white",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "700px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "modal-fade-in 0.2s ease-out",
        }}
      >
        <style jsx>{`
          @keyframes modal-fade-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              📅 Attendance History
            </h3>
            <span style={{ fontSize: "0.85rem", color: P, fontWeight: 700 }}>
              {memberName}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "1.1rem",
              color: "#64748b",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#e2e8f0";
              e.currentTarget.style.color = "#0f172a";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#f1f5f9";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="custom-scrollbar"
          style={{
            padding: "1.5rem",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            flex: 1,
          }}
        >
          {/* Year Navigator Control */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#475569" }}>
              Select Year
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "8px", overflow: "hidden" }}>
              <button
                onClick={() => setSelectedYear(prev => prev - 1)}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: "#334155"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseOut={(e) => e.currentTarget.style.background = "white"}
              >
                ‹
              </button>
              <div style={{ padding: "0.4rem 1rem", fontSize: "0.875rem", fontWeight: 800, color: "#0f172a", background: "#f8fafc" }}>
                {selectedYear}
              </div>
              <button
                onClick={() => setSelectedYear(prev => prev + 1)}
                style={{
                  padding: "0.4rem 0.75rem",
                  background: "white",
                  border: "none",
                  fontWeight: "bold",
                  cursor: "pointer",
                  color: "#334155"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f8fafc"}
                onMouseOut={(e) => e.currentTarget.style.background = "white"}
              >
                ›
              </button>
            </div>
          </div>

          {isLoading ? (
            /* Loading State Skeleton */
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "2rem 0" }}>
              <div style={{ height: "16px", background: "#f1f5f9", borderRadius: "4px", width: "40%", animation: "pulse 1.5s infinite" }} />
              <div style={{ height: "100px", background: "#f8fafc", borderRadius: "8px", animation: "pulse 1.5s infinite" }} />
              <div style={{ height: "40px", background: "#f1f5f9", borderRadius: "4px", animation: "pulse 1.5s infinite" }} />

            </div>
          ) : (
            <>
              {/* Summary Stats Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    Attendance Rate
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: getRateColor(attendanceRate) }}>
                    {attendanceRate}%
                  </div>
                </div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    Services Attended
                  </div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                    {totalAttended} / {totalServices}
                  </div>
                </div>
                            {/* Yearly Service Attendance Grid */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem", position: "relative" }}>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155", margin: "0 0 0.25rem 0" }}>
                  📅 Yearly Attendance Grid
                </h4>
                <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 1rem 0" }}>
                  A visual calendar of all scheduled services grouped by month. Hover nodes for info, click to pin details.
                </p>

                {history.length === 0 ? (
                  <div style={{ padding: "1.5rem 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                    No services scheduled for {selectedYear} yet.
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))",
                      gap: "0.75rem",
                    }}>
                      {monthsData.map((m) => {
                        const isLeftColumn = [0, 4, 8].includes(m.monthIndex);
                        const isRightColumn = [3, 7, 11].includes(m.monthIndex);
                        const tooltipTransform = isLeftColumn 
                          ? "translateX(-15%)" 
                          : (isRightColumn ? "translateX(-85%)" : "translateX(-50%)");
                        const arrowLeft = isLeftColumn 
                          ? "15%" 
                          : (isRightColumn ? "85%" : "50%");

                        return (
                          <div 
                            key={m.monthIndex} 
                            style={{ 
                              background: "#f8fafc", 
                              border: "1px solid #e2e8f0", 
                              borderRadius: "12px", 
                              padding: "0.6rem", 
                              display: "flex", 
                              flexDirection: "column", 
                              gap: "0.35rem" 
                            }}
                          >
                            <div style={{ 
                              fontSize: "0.65rem", 
                              fontWeight: 800, 
                              color: "#475569", 
                              textTransform: "uppercase", 
                              letterSpacing: "0.05em", 
                              borderBottom: "1px solid #e2e8f0", 
                              paddingBottom: "0.2rem", 
                              display: "flex", 
                              justifyContent: "space-between" 
                            }}>
                              <span>{m.monthName}</span>
                              <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                                {m.totalCount > 0 ? `${m.attendedCount}/${m.totalCount}` : "—"}
                              </span>
                            </div>
                            
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "0.15rem" }}>
                              {m.services.map((item) => (
                                <div
                                  key={item.eventId}
                                  style={{
                                    position: "relative",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontSize: "8px",
                                    fontWeight: "800",
                                    transition: "transform 0.15s ease",
                                    transform: hoveredNodeId === item.eventId ? "scale(1.15)" : "scale(1)",
                                    background: item.attended ? P : "#f1f5f9",
                                    color: item.attended ? "white" : "#94a3b8",
                                    border: item.attended ? "none" : "1.5px dashed #cbd5e1",
                                    boxShadow: hoveredNodeId === item.eventId ? "0 4px 6px -1px rgba(0,0,0,0.15)" : "none",
                                  }}
                                  onMouseEnter={() => setHoveredNodeId(item.eventId)}
                                  onMouseLeave={() => setHoveredNodeId(null)}
                                  onClick={() => setSelectedService(item)}
                                >
                                  {item.eventType === "grace_night" ? "M" : (item.eventType === "special_event" ? "Sp" : "S")}

                                  {/* Hover Tooltip floating relative to the grid node */}
                                  {hoveredNodeId === item.eventId && (
                                    <div
                                      style={{
                                        position: "absolute",
                                        bottom: "135%",
                                        left: "50%",
                                        transform: tooltipTransform,
                                        background: "#0f172a",
                                        color: "white",
                                        padding: "0.5rem 0.75rem",
                                        borderRadius: "8px",
                                        fontSize: "0.725rem",
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                                        zIndex: 50,
                                        minWidth: "190px",
                                        whiteSpace: "normal",
                                        pointerEvents: "none",
                                        textAlign: "left",
                                      }}
                                    >
                                      <div style={{ fontWeight: 800, color: item.attended ? P : "#94a3b8", display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", gap: "0.5rem" }}>
                                        <span>{new Date(item.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                        <span>{item.attended ? "✅ Attended" : "❌ Missed"}</span>
                                      </div>
                                      <div style={{ fontWeight: 700, color: "white", marginBottom: "0.25rem", lineHeight: 1.2, wordBreak: "break-word" }}>
                                        {item.title}
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#cbd5e1", marginBottom: "0.25rem" }}>
                                        <span>Service:</span>
                                        <strong style={{ color: "white" }}>
                                          {item.eventType === "grace_night" ? "Grace Night" : (item.eventType === "special_event" ? "Special Event" : "Sunday Service")}
                                        </strong>
                                      </div>
                                      <div style={{ fontSize: "0.65rem", color: "#cbd5e1", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.25rem" }}>
                                        Speaker: <strong>{item.speaker || "Guest Speaker"}</strong>
                                      </div>
                                      {/* pointer arrow */}
                                      <div
                                        style={{
                                          position: "absolute",
                                          bottom: "-4px",
                                          left: arrowLeft,
                                          transform: "translateX(-50%) rotate(45deg)",
                                          width: "8px",
                                          height: "8px",
                                          background: "#0f172a",
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                              {m.services.length === 0 && (
                                <div style={{ fontSize: "0.6rem", color: "#94a3b8", fontStyle: "italic", padding: "0.2rem 0" }}>
                                  No services
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Service Detail Panel */}
                    {selectedService ? (
                      <div style={{ 
                        marginTop: "1rem", 
                        padding: "0.75rem 1rem", 
                        background: "#f0f9ff", 
                        border: "1px solid #bae6fd", 
                        borderRadius: "12px", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "0.25rem" 
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 800, color: P, textTransform: "uppercase" }}>
                            📌 Pinned Service Details
                          </span>
                          <span style={{ fontSize: "0.725rem", fontWeight: 700, color: selectedService.attended ? "#10b981" : "#ef4444" }}>
                            {selectedService.attended ? "✅ Attended" : "❌ Missed"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", marginTop: "0.15rem" }}>
                          {selectedService.title}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.25rem", fontSize: "0.7rem", color: "#64748b" }}>
                          <span>Date: <strong style={{ color: "#334155" }}>{new Date(selectedService.eventDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</strong></span>
                          <span>Speaker: <strong style={{ color: "#334155" }}>{selectedService.speaker || "Guest Speaker"}</strong></span>
                          <span>Type: <strong style={{ color: "#334155" }}>{selectedService.eventType === "grace_night" ? "Grace Night (Midweek)" : (selectedService.eventType === "special_event" ? "Special Service" : "Sunday Service")}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        marginTop: "1rem", 
                        padding: "0.6rem", 
                        textAlign: "center", 
                        background: "#f8fafc", 
                        border: "1px dashed #cbd5e1", 
                        borderRadius: "12px", 
                        color: "#64748b", 
                        fontSize: "0.725rem" 
                      }}>
                        💡 Tip: Click any service node in the grid above to pin its sermon and speaker details here.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Preacher Attendance Statistics */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1.25rem" }}>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#334155", margin: "0 0 0.25rem 0" }}>
                  🎙️ Sermon Attendance Correlation
                </h4>
                <p style={{ color: "#64748b", fontSize: "0.75rem", margin: "0 0 1rem 0" }}>
                  Calculates attendance ratios grouped by speaker/preacher for {selectedYear}.
                </p>

                {speakers.length === 0 ? (
                  <div style={{ padding: "0.5rem 0", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                    No preacher metrics available.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {speakers.map((sp, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                          <span style={{ fontWeight: 700, color: "#334155" }}>
                            {sp.name === "Unknown Preacher" ? "Guest / Unspecified Speaker" : sp.name}
                          </span>
                          <span style={{ fontWeight: 800, color: getRateColor(sp.rate) }}>
                            {sp.rate}% <span style={{ color: "#64748b", fontWeight: 500 }}>({sp.attended} of {sp.total} attended)</span>
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${sp.rate}%`,
                              height: "100%",
                              background: getRateColor(sp.rate),
                              borderRadius: "3px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f1f5f9", background: "#f8fafc", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#334155",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
            onMouseOut={(e) => e.currentTarget.style.background = "white"}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
