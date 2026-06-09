"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const impersonator = (session as any)?.impersonator;
  if (!impersonator) return null;

  const targetName = `${session?.user?.firstName ?? ""} ${session?.user?.lastName ?? ""}`.trim() || session?.user?.name || "Member";
  const adminName = `${impersonator.firstName ?? ""} ${impersonator.lastName ?? ""}`.trim() || impersonator.name || "Admin";

  async function handleStopImpersonating() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await update({ stopImpersonating: true });
      if (res) {
        // Redirect back to members management console
        router.push("/admin/members");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to stop impersonating:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="impersonation-banner-container"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "14px",
        padding: "0.75rem 1rem",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        color: "#f8fafc",
        fontFamily: "var(--font-inter), -apple-system, sans-serif",
        fontSize: "0.875rem",
        animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @media (max-width: 767px) {
          .impersonation-banner-container {
            bottom: calc(68px + env(safe-area-inset-bottom)) !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            width: calc(100% - 32px) !important;
            max-width: 440px !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>🕵️‍♂️</span>
          <div style={{ minWidth: 0 }}>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", display: "block", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>Session Impersonation</span>
            <span style={{ fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              Active: <strong style={{ color: "#4EB1CB" }}>{targetName}</strong>
            </span>
          </div>
        </div>
        <button
          onClick={handleStopImpersonating}
          disabled={loading}
          style={{
            background: "#4EB1CB",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "0.45rem 0.85rem",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 10px rgba(78, 177, 203, 0.3)",
          }}
        >
          {loading ? (
            "Switching..."
          ) : (
            <>
              <span>↩️</span> Back to {adminName.split(" ")[0]}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
