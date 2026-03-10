"use client";
import React from "react";

const P = "#4EB1CB";

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "#ef4444",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "1.75rem",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          animation: "cmFadeIn 0.15s ease-out",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.125rem",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 1.5rem",
            fontSize: "0.9rem",
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.625rem",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "#374151",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.625rem",
              border: "none",
              borderRadius: "8px",
              background: confirmColor,
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "0.875rem",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes cmFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
