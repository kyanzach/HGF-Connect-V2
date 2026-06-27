"use client";

import React, { useState } from "react";

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

export default function DashboardChartsClient({ attendanceTrend, stats }: Props) {
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; x: number; y: number; data: AttendancePoint } | null>(null);
  const [hoveredDonut, setHoveredDonut] = useState<string | null>(null);

  // ── Donut Chart Data ──
  const adultsTotal = stats.activeAdults + stats.inactiveAdults;
  const youthTotal = stats.activeYouth + stats.inactiveYouth;
  const kidsTotal = stats.activeKids + stats.inactiveKids;
  const grandTotal = adultsTotal + youthTotal + kidsTotal;

  const donutSegments = [
    { label: "Adults", count: adultsTotal, color: "#3b82f6", active: stats.activeAdults, inactive: stats.inactiveAdults },
    { label: "Youth", count: youthTotal, color: "#ec4899", active: stats.activeYouth, inactive: stats.inactiveYouth },
    { label: "Kids", count: kidsTotal, color: "#10b981", active: stats.activeKids, inactive: stats.inactiveKids },
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
  const maxAttendance = Math.max(...attendanceTrend.map(d => d.count), 50); // Min scale height of 50
  const points = attendanceTrend.map((d, i) => {
    const x = paddingLeft + (i * (plotWidth / Math.max(attendanceTrend.length - 1, 1)));
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

  // Format date label
  const formatLabelDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
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
      {/* CSS style overlay to handle responsive layout */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .dashboard-charts-grid {
            grid-template-columns: 1fr !important;
          }
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
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
          📈 Sunday Service Attendance Trends
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "0 0 1.25rem 0" }}>
          Weekly attendance figures for the last 8 Sunday Service celebrations.
        </p>

        {attendanceTrend.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "180px", color: "#94a3b8", fontSize: "0.875rem" }}>
            No attendance data recorded yet.
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", flex: 1 }}>
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
                          const rect = e.currentTarget.getBoundingClientRect();
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
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.25)",
                  zIndex: 10,
                  whiteSpace: "normal",
                  minWidth: "160px",
                  pointerEvents: "none",
                  transition: "left 0.1s ease, top 0.1s ease",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.725rem", color: P, marginBottom: "0.15rem", textTransform: "uppercase" }}>
                  {formatLabelDate(hoveredPoint.data.eventDate)}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.75rem", marginBottom: "0.25rem", lineHeight: 1.2 }}>
                  {hoveredPoint.data.title}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "0.25rem", fontSize: "0.7rem", color: "#94a3b8" }}>
                  <span>Attendance:</span>
                  <strong style={{ color: "white" }}>{hoveredPoint.data.count} members</strong>
                </div>
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
        <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem 0" }}>
          🥧 Age Distribution
        </h3>
        <p style={{ color: "#64748b", fontSize: "0.8rem", margin: "0 0 1.25rem 0" }}>
          Breakdown of approved community members by age demographic.
        </p>

        {grandTotal === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "180px", color: "#94a3b8", fontSize: "0.875rem" }}>
            No demographic data available.
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
                      Total
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
