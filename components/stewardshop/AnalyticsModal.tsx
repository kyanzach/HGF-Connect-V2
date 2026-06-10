import { useEffect, useState } from "react";

const PRIMARY = "#4EB1CB";

interface LogEntry {
  id: number;
  event: string;
  eventLabel: string;
  time: string;
  maskedIp: string;
  location: string;
  device: string;
  isRepeat: boolean;
}

interface LocationEntry {
  name: string;
  count: number;
}

interface AnalyticsData {
  totalViews: number;
  uniqueViewers: number;
  repeatViewers: number;
  revealClicks: number;
  contactClicks: number;
  locationBreakdown: LocationEntry[];
  logs: LogEntry[];
}

export default function AnalyticsModal({
  listingId,
  listingTitle,
  onClose,
}: {
  listingId: number;
  listingTitle: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Add open body scroll lock class for mobilebottom sheets overlap safety
    document.body.classList.add("hgf-modal-open");

    fetch(`/api/marketplace/listings/${listingId}/analytics`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      document.body.classList.remove("hgf-modal-open");
    };
  }, [listingId]);

  function getRelativeTime(timeStr: string) {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Sheet Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "white",
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: "600px",
          height: "85vh",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box",
        }}
      >
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#cbd5e1" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "0 1.25rem 0.875rem", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                📊 Listing Analytics
              </h2>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                {listingTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "#f1f5f9",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "0.85rem",
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ border: `3px solid ${PRIMARY}20`, borderTop: `3px solid ${PRIMARY}`, borderRadius: "50%", width: "32px", height: "32px", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
              <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Loading analytics details...</p>
            </div>
          )}

          {error && (
            <div style={{ padding: "1rem", background: "#fef2f2", color: "#ef4444", borderRadius: "12px", textAlign: "center", fontSize: "0.85rem" }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && !error && data && (
            <div>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem", marginBottom: "1.25rem" }}>
                <div style={{ background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)", border: "1px solid #99f6e4", borderRadius: "14px", padding: "0.75rem", textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "1.35rem", fontWeight: 900, color: "#0d9488" }}>{data.totalViews}</span>
                  <span style={{ fontSize: "0.62rem", color: "#115e59", fontWeight: 700 }}>TOTAL VIEWS</span>
                </div>
                <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1px solid #bfdbfe", borderRadius: "14px", padding: "0.75rem", textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "1.35rem", fontWeight: 900, color: "#2563eb" }}>{data.uniqueViewers}</span>
                  <span style={{ fontSize: "0.62rem", color: "#1e40af", fontWeight: 700 }}>UNIQUE VIEWERS</span>
                </div>
                <div style={{ background: "linear-gradient(135deg, #fdf2f8, #fce7f3)", border: "1px solid #fbcfe8", borderRadius: "14px", padding: "0.75rem", textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: "1.35rem", fontWeight: 900, color: "#db2777" }}>{data.repeatViewers}</span>
                  <span style={{ fontSize: "0.62rem", color: "#9d174d", fontWeight: 700 }}>REPEAT VIEWERS</span>
                </div>
              </div>

              {/* conversion details */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "0.875rem", marginBottom: "1.25rem", display: "flex", gap: "1.5rem" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block", fontWeight: 600 }}>Discount Reveals</span>
                  <strong style={{ fontSize: "1rem", color: "#334155" }}>{data.revealClicks} clicks</strong>
                </div>
                <div style={{ flex: 1, borderLeft: "1px solid #e2e8f0", paddingLeft: "1.5rem" }}>
                  <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block", fontWeight: 600 }}>Seller Contact Requests</span>
                  <strong style={{ fontSize: "1rem", color: "#334155" }}>{data.contactClicks} requests</strong>
                </div>
              </div>

              {/* Geographic Breakdown */}
              <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem" }}>
                📍 Geolocation Breakdown
              </h3>
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "1rem", marginBottom: "1.5rem" }}>
                {data.locationBreakdown.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", margin: 0 }}>No location data captured yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {data.locationBreakdown.map((loc) => {
                      const percentage = data.totalViews > 0 ? Math.round((loc.count / data.totalViews) * 100) : 0;
                      return (
                        <div key={loc.name} style={{ fontSize: "0.8rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", color: "#334155", fontWeight: 600 }}>
                            <span>{loc.name || "Unknown Location"}</span>
                            <span>{loc.count} views ({percentage}%)</span>
                          </div>
                          <div style={{ width: "100%", height: "6px", background: "#f1f5f9", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${percentage}%`, height: "100%", background: PRIMARY, borderRadius: "3px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-time viewer logs */}
              <h3 style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.75rem" }}>
                🕒 Real-Time Viewer Log
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {data.logs.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.78rem", textAlign: "center", padding: "1rem" }}>No views recorded yet.</p>
                ) : (
                  data.logs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        background: "white",
                        border: "1px solid #f1f5f9",
                        borderRadius: "14px",
                        padding: "0.75rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", fontFamily: "monospace" }}>
                            {log.maskedIp}
                          </span>
                          {log.event === "impression" ? (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                background: log.isRepeat ? "#fdf2f8" : "#eff6ff",
                                color: log.isRepeat ? "#db2777" : "#2563eb",
                                border: log.isRepeat ? "1px solid #fbcfe8" : "1px solid #bfdbfe",
                              }}
                            >
                              {log.isRepeat ? "Repeat View" : "Unique View"}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                padding: "0.1rem 0.4rem",
                                borderRadius: "4px",
                                background: "#fef2f2",
                                color: "#ef4444",
                                border: "1px solid #fca5a5",
                              }}
                            >
                              {log.eventLabel}
                            </span>
                          )}
                        </div>
                        <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b", marginTop: "0.2rem" }}>
                          📍 {log.location} · {log.device}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>
                        {getRelativeTime(log.time)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
