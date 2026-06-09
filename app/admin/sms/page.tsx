import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "SMS Logs — Admin" };

export default async function AdminSmsPage() {
  const session = await auth();
  if (!session || !["admin", "moderator"].includes(session.user.role)) redirect("/login");

  const logs = await db.appLog.findMany({
    where: { actionType: { in: ["sms_sent", "sms_failed", "sms_queued", "SMS_SENT", "SMS_FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const allLogs = await db.appLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="smslogs-container" style={{ padding: "1.5rem 2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>📋 SMS Logs</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>Activity and audit history</p>
      </div>

      <div className="smslogs-desktop-table" style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {allLogs.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#94a3b8" }}>No log entries yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {["Time", "Action", "Description", "Performed By", "Target"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allLogs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < allLogs.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "#94a3b8", fontSize: "0.8rem" }}>
                      {new Date(log.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f1f5f9", color: "#64748b" }}>{log.actionType}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "#374151", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.description}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#475569", whiteSpace: "nowrap" }}>{log.performedByName ?? "—"}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontSize: "0.8rem" }}>{log.targetName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile view card listing */}
      {allLogs.length > 0 && (
        <div className="smslogs-mobile-cards" style={{ display: "none", flexDirection: "column", gap: "1rem" }}>
          {allLogs.map((log) => (
            <div key={log.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#f1f5f9", color: "#64748b" }}>
                  {log.actionType}
                </span>
                <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                  {new Date(log.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" })}
                </span>
              </div>
              <div style={{ fontSize: "0.875rem", color: "#374151", margin: "0.5rem 0", lineHeight: 1.4 }}>
                {log.description}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem", marginTop: "0.5rem", fontSize: "0.75rem" }}>
                <span style={{ color: "#64748b" }}>By: <strong>{log.performedByName ?? "—"}</strong></span>
                <span style={{ color: "#94a3b8" }}>Target: {log.targetName ?? "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .smslogs-container {
            padding: 1rem !important;
          }
          .smslogs-desktop-table {
            display: none !important;
          }
          .smslogs-mobile-cards {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
