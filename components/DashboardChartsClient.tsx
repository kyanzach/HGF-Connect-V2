"use client";

import React, { useState, useEffect } from "react";

const P = "#4EB1CB"; // HGF Teal

interface AttendancePoint {
  id: number;
  title: string;
  eventDate: string;
  count: number;
}

interface StatsData {
  activeAdults: number;
  activeYouth: number;
  activeKids: number;
  inactiveAdults: number;
  inactiveYouth: number;
  inactiveKids: number;
}

interface Props {
  attendanceTrend: AttendancePoint[];
  stats: StatsData;
}

const MONTHS_LIST = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function DashboardChartsClient({ attendanceTrend: initialTrend, stats }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number; data: AttendancePoint } | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<string | null>(null);

  // ── Trend Chart Filters ──
  const now = new Date();
  const [trendMode, setTrendMode] = useState<"month" | "year">("month");
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [trendData, setTrendData] = useState<AttendancePoint[]>(initialTrend);
  const [isLoadingTrend, setIsLoadingTrend] = useState<boolean>(false);

  // ── Donut Segment filter ──
  const [donutFilter, setDonutFilter] = useState<"all" | "active" | "inactive" >("all");

  // Fetch updated trend data dynamically on control updates
  const fetchTrendData = async (mode: "month" | "year", year: number, month: number) => {
    setIsLoadingTrend(true);
    try {
      const res = await fetch(`/api/admin/dashboard/attendance-trends?mode=${mode}&year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setTrendData(json.trend || []);
      }
    } catch (err) {
      console.error("Failed to load attendance trends:", err);
    } finally {
      setIsLoadingTrend(false);
    }
  };

  // Pre-fetch updates when mode/year/month state parameters change
  useEffect(() => {
    fetchTrendData(trendMode, selectedYear, selectedMonth);
  }, [trendMode, selectedYear, selectedMonth]);

  // Navigate Previous Month/Year
  const handlePrevPeriod = () => {
    if (trendMode === "month") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear(prev => prev - 1);
      } else {
        setSelectedMonth(prev => prev - 1);
      }
    } else {
      setSelectedYear(prev => prev - 1);
    }
  };

  // Navigate Next Month/Year
  const handleNextPeriod = () => {
    if (trendMode === "month") {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(prev => prev + 1);
      } else {
        setSelectedMonth(prev => prev + 1);
      }
    } else {
      setSelectedYear(prev => prev + 1);
    }
  };

  // ── Donut Chart Data ──
  const adultsCount = donutFilter === "all" ? (stats.activeAdults + stats.inactiveAdults) : (donutFilter === "active" ? stats.activeAdults : stats.inactiveAdults);
  const youthCount = donutFilter === "all" ? (stats.activeYouth + stats.inactiveYouth) : (donutFilter === "active" ? stats.activeYouth : stats.inactiveYouth);
  const kidsCount = donutFilter === "all" ? (stats.activeKids + stats.inactiveKids) : (donutFilter === "active" ? stats.activeKids : stats.inactiveKids);
  const grandTotal = adultsCount + youthCount + kidsCount;

  const donutSegments = [
    { label: "Adults", count: adultsCount, color: "#3b82f6" },
    { label: "Youth", count: youthCount, color: "#ec4899" },
    { label: "Kids", count: kidsCount, color: "#10b981" },
  ].filter(s => s.count > 0);

  const donutCircumference = 2 * Math.PI * 70; // r=70 -> 439.82
  let donutOffset = 0;

  // ── Line Chart Settings ──
  const chartWidth = 500;
  const chartHeight = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  // Calculate scales
  const maxAttendance = Math.max(...trendData.map(d => d.count), 50); // Min scale height of 50
  const points = trendData.map((d, i) => {
    const x = paddingLeft + (i * (plotWidth / Math.max(trendData.length - 1, 1)));
    const y = chartHeight - paddingBottom - ((d.count / maxAttendance) * plotHeight);
    return { x, y, data: d };
  });

  // SVG Area path string
  let areaPath = "";
  let linePath = "";
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
    areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;
  }

  // Format date label depending on mode
  const formatLabelDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (trendMode === "year") {
        return d.toLocaleDateString("en-PH", { month: "short" });
      }
      return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getMonthName = (m: number) => {
    return MONTHS_LIST.find(x => x.value === m)?.label || "";
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "1.5rem",
        marginBottom: "2.5rem",
      }}
      className="dashboard-charts-grid"
    >
      {/* CSS style overlay to handle responsive layout and animations */}
      <style jsx global>{`
        @media (max-width: 1024px) {
          .dashboard-charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes chart-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Attendance Area Chart Card */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Card Header with Selectors */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
              📈 Sunday Service Attendance Trends
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "0" }}>
              {trendMode === "month" 
                ? `Attendance breakdown for ${getMonthName(selectedMonth)} ${selectedYear}`
                : `Average attendance monthly breakdown for ${selectedYear}`}
            </p>
          </div>

          {/* Navigation Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* View Mode Toggle */}
            <select
              value={trendMode}
              onChange={(e) => setTrendMode(e.target.value as "month" | "year")}
              style={{
                padding: "0.35rem 0.5rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#334155",
                background: "#f8fafc",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>

            {/* Month Dropdown (Month Mode Only) */}
            {trendMode === "month" && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  padding: "0.35rem 0.5rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#334155",
                  background: "#ffffff",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {MONTHS_LIST.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            )}

            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: "0.35rem 0.5rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#334155",
                background: "#ffffff",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {[0, 1, 2].map(offset => {
                const yr = now.getFullYear() - offset;
                return <option key={yr} value={yr}>{yr}</option>;
              })}
            </select>

            {/* Navigation Arrows */}
            <div style={{ display: "inline-flex", borderRadius: "8px", border: "1px solid #cbd5e1", overflow: "hidden" }}>
              <button
                onClick={handlePrevPeriod}
                title={trendMode === "month" ? "Previous Month" : "Previous Year"}
                style={{
                  padding: "0.35rem 0.6rem",
                  border: "none",
                  background: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "background 0.15s ease"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                onMouseOut={(e) => e.currentTarget.style.background = "#ffffff"}
              >
                ‹
              </button>
              <div style={{ width: "1px", background: "#cbd5e1" }} />
              <button
                onClick={handleNextPeriod}
                title={trendMode === "month" ? "Next Month" : "Next Year"}
                style={{
                  padding: "0.35rem 0.6rem",
                  border: "none",
                  background: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: "bold",
                  color: "#334155",
                  cursor: "pointer",
                  transition: "background 0.15s ease"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                onMouseOut={(e) => e.currentTarget.style.background = "#ffffff"}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Loading Spinner / Graph Area */}
        <div style={{ position: "relative", width: "100%", flex: 1, minHeight: "180px", display: "flex", flexDirection: "column" }}>
          {isLoadingTrend && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  border: `3px solid ${P}`,
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "chart-spin 0.8s linear infinite",
                }}
              />

            </div>
          )}

          {trendData.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "180px", color: "#94a3b8", fontSize: "0.875rem" }}>
              No services or attendance records recorded for this period.
            </div>
          ) : (
            <div style={{ position: "relative", width: "100%", flex: 1, opacity: isLoadingTrend ? 0.4 : 1, transition: "opacity 0.2s ease" }}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                width="100%"
                height="100%"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={P} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = chartHeight - paddingBottom - ratio * plotHeight;
                  const value = Math.round(ratio * maxAttendance);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth="1.5"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3}
                        fill="#94a3b8"
                        fontSize="9"
                        fontWeight="600"
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* Chart Paths */}
                {points.length > 0 && (
                  <>
                    {/* Fill Area */}
                    <path d={areaPath} fill="url(#chartAreaGrad)" />

                    {/* Line */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke={P}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Interaction Dots */}
                    {points.map((p, i) => (
                      <g key={i}>
                        {/* Interactive hover target */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="12"
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => {
                            setHoveredPoint({
                              index: i,
                              x: p.x,
                              y: p.y,
                              data: p.data,
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        {/* Visible dot */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={hoveredPoint?.index === i ? "6" : "4"}
                          fill={hoveredPoint?.index === i ? "white" : P}
                          stroke={P}
                          strokeWidth="2.5"
                          style={{ transition: "all 0.15s ease", pointerEvents: "none" }}
                        />
                        {hoveredPoint?.index === i && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r="10"
                            fill="none"
                            stroke={P}
                            strokeWidth="1.5"
                            strokeOpacity="0.5"
                            style={{ pointerEvents: "none" }}
                          />
                        )}
                      </g>
                    ))}
                  </>
                )}

                {/* X Axis Labels */}
                {points.map((p, i) => (
                  <text
                    key={i}
                    x={p.x}
                    y={chartHeight - 12}
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {formatLabelDate(p.data.eventDate)}
                  </text>
                ))}
              </svg>

              {/* Custom Tooltip */}
              {hoveredPoint && (
                <div
                  style={{
                    position: "absolute",
                    left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                    top: `${(hoveredPoint.y / chartHeight) * 100 - 32}%`,
                    transform: "translate(-50%, -100%)",
                    background: "#0f172a",
                    color: "white",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.25)",
                    zIndex: 10,
                    whiteSpace: "normal",
                    minWidth: trendMode === "year" ? "240px" : "185px",
                    pointerEvents: "none",
                    transition: "left 0.1s ease, top 0.1s ease",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.725rem", color: P, marginBottom: "0.15rem", textTransform: "uppercase" }}>
                    {trendMode === "month" 
                      ? formatLabelDate(hoveredPoint.data.eventDate)
                      : `${new Date(hoveredPoint.data.eventDate).toLocaleDateString("en-US", { month: "long" })} ${selectedYear}`}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.75rem", marginBottom: "0.25rem", lineHeight: 1.2 }}>
                    {hoveredPoint.data.title}
                  </div>

                  {trendMode === "month" ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.675rem", color: "#cbd5e1", marginBottom: "0.15rem" }}>
                        <span>Preacher:</span>
                        <strong style={{ color: "white" }}>{(hoveredPoint.data as any).speaker || "Unknown Preacher"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.675rem", color: "#cbd5e1", marginBottom: "0.25rem" }}>
                        <span>Service:</span>
                        <strong style={{ color: "white" }}>{(hoveredPoint.data as any).eventType === "grace_night" ? "Grace Night (Wed)" : "Sunday Service (Sun)"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.25rem", fontSize: "0.675rem", color: "#cbd5e1" }}>
                        <span>Attendance:</span>
                        <strong style={{ color: "white" }}>{hoveredPoint.data.count} members</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.25rem", fontSize: "0.675rem", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                        <span>Monthly Average:</span>
                        <strong style={{ color: "white" }}>{hoveredPoint.data.count} members</strong>
                      </div>

                      {/* List of services in that month */}
                      {(hoveredPoint.data as any).events && (hoveredPoint.data as any).events.length > 0 ? (
                        <div 
                          className="custom-scrollbar"
                          style={{ 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "0.35rem", 
                            marginTop: "0.35rem", 
                            maxHeight: "150px", 
                            overflowY: "auto", 
                            borderTop: "1px solid rgba(255,255,255,0.15)", 
                            paddingTop: "0.35rem"
                          }}
                        >
                          {(hoveredPoint.data as any).events.map((ev: any, idx: number) => {
                            const evDate = new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                            return (
                              <div key={idx} style={{ fontSize: "0.65rem", display: "flex", flexDirection: "column", borderBottom: idx < (hoveredPoint.data as any).events.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", paddingBottom: "0.2rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ color: P, fontWeight: 700 }}>{evDate} ({ev.eventType === "grace_night" ? "Wed" : "Sun"})</span>
                                  <strong style={{ color: "white" }}>{ev.count} members</strong>
                                </div>
                                <div style={{ color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "210px" }} title={ev.title}>
                                  {ev.title}
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: "0.6rem" }}>
                                  Speaker: {ev.speaker}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8", textAlign: "center", padding: "0.25rem 0" }}>No services this month</div>
                      )}
                    </>
                  )}
                  {/* Pointer arrow */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "-4px",
                      left: "50%",
                      transform: "translateX(-50%) rotate(45deg)",
                      width: "8px",
                      height: "8px",
                      background: "#0f172a",
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Donut Chart Card */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Donut Card Header with toggles */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
              🥧 Age Distribution
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "0" }}>
              Breakdown of approved community members by age.
            </p>
          </div>

          {/* Active/Inactive segment filter toggler */}
          <select
            value={donutFilter}
            onChange={(e) => setDonutFilter(e.target.value as "all" | "active" | "inactive")}
            style={{
              padding: "0.35rem 0.5rem",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#334155",
              background: "#f8fafc",
              cursor: "pointer",
              outline: "none",
              alignSelf: "flex-start"
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {grandTotal === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "180px", color: "#94a3b8", fontSize: "0.875rem" }}>
            No demographic data matches current filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{ position: "relative", width: "150px", height: "150px", marginBottom: "1rem" }}>
              <svg viewBox="0 0 200 200" width="100%" height="100%">
                {donutSegments.map((seg, idx) => {
                  const percentage = seg.count / grandTotal;
                  const strokeLength = percentage * donutCircumference;
                  const strokeOffset = donutCircumference - donutOffset;
                  donutOffset += strokeLength;

                  const isHovered = hoveredDonut === seg.label;

                  return (
                    <circle
                      key={idx}
                      cx="100"
                      cy="100"
                      r="70"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth={isHovered ? "24" : "18"}
                      strokeDasharray={`${strokeLength} ${donutCircumference}`}
                      strokeDashoffset={strokeOffset}
                      transform="rotate(-90 100 100)"
                      style={{
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={() => setHoveredDonut(seg.label)}
                      onMouseLeave={() => setHoveredDonut(null)}
                    />
                  );
                })}
              </svg>

              {/* Total Members Center Label */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                {hoveredDonut ? (
                  <>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      {hoveredDonut}
                    </span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                      {donutSegments.find(s => s.label === hoveredDonut)?.count}
                    </span>
                    <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#94a3b8" }}>
                      {Math.round(((donutSegments.find(s => s.label === hoveredDonut)?.count || 0) / grandTotal) * 100)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      {donutFilter === "all" ? "Total" : (donutFilter === "active" ? "Active" : "Inactive")}
                    </span>
                    <span style={{ fontSize: "1.375rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>
                      {grandTotal}
                    </span>
                    <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#94a3b8" }}>
                      Members
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Legends */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {donutSegments.map((seg, idx) => {
                const isHovered = hoveredDonut === seg.label;
                const percentage = Math.round((seg.count / grandTotal) * 100);

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDonut(seg.label)}
                    onMouseLeave={() => setHoveredDonut(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.375rem 0.5rem",
                      borderRadius: "8px",
                      background: isHovered ? "#f8fafc" : "transparent",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: seg.color }} />
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#334155" }}>
                        {seg.label}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#0f172a" }}>
                        {seg.count}
                      </span>
                      <span style={{ fontSize: "0.6875rem", color: "#64748b", marginLeft: "0.25rem" }}>
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
