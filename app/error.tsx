"use client";

import { useEffect } from "react";

const PRIMARY = "#4EB1CB";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console or error tracker
    console.error("Uncaught client-side application error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        padding: "1.5rem",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px",
          padding: "2.5rem 2rem",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          border: "1px solid #edf2f7",
          boxSizing: "border-box",
        }}
      >
        {/* Animated Refresh / Update icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "#eff6ff",
            color: PRIMARY,
            fontSize: "2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
            boxShadow: "0 8px 20px rgba(78, 177, 203, 0.15)",
          }}
        >
          🔄
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 0.75rem",
            letterSpacing: "-0.025em",
            lineHeight: 1.25,
          }}
        >
          App Update or Connection Issue
        </h1>

        <p
          style={{
            fontSize: "0.9375rem",
            color: "#64748b",
            lineHeight: 1.6,
            margin: "0 0 2rem",
          }}
        >
          An update was recently deployed or your network connection was briefly interrupted. Please reload the app to run the latest version.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Reload button */}
          <button
            onClick={() => {
              // Perform a full reload to clear cache and pull the new files
              window.location.reload();
            }}
            style={{
              width: "100%",
              background: `linear-gradient(135deg, ${PRIMARY} 0%, #3a95ad 100%)`,
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "0.875rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(78, 177, 203, 0.3)",
              transition: "transform 0.1s ease, opacity 0.15s ease",
              fontFamily: "inherit",
              outline: "none",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "none";
            }}
          >
            Reload App
          </button>

          {/* Go to home page button */}
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            style={{
              width: "100%",
              background: "white",
              color: "#475569",
              border: "1.5px solid #cbd5e1",
              borderRadius: "12px",
              padding: "0.75rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
              fontFamily: "inherit",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f8fafc";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
            }}
          >
            Go to Home Screen
          </button>
        </div>

        {/* Technical Error details drawer */}
        <details style={{ marginTop: "2rem", textAlign: "left" }}>
          <summary
            style={{
              fontSize: "0.75rem",
              color: "#94a3b8",
              cursor: "pointer",
              userSelect: "none",
              fontWeight: 600,
              outline: "none",
            }}
          >
            Technical Details
          </summary>
          <pre
            style={{
              marginTop: "0.5rem",
              background: "#f1f5f9",
              borderRadius: "8px",
              padding: "0.75rem",
              fontSize: "0.75rem",
              color: "#475569",
              overflowX: "auto",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {error.message || "Unknown client error"}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        </details>
      </div>
    </div>
  );
}
