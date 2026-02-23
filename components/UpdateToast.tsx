"use client";

import { useState, useEffect } from "react";

export default function UpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SW_UPDATED") setShow(true);
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  if (!show) return null;

  function handleUpdate() {
    navigator.serviceWorker.controller?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(72px + env(safe-area-inset-bottom))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#1e293b",
        color: "white",
        borderRadius: "999px",
        padding: "0.75rem 1.25rem",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span>🆕 Update available</span>
      <button
        onClick={handleUpdate}
        style={{
          background: "#4EB1CB",
          color: "white",
          border: "none",
          borderRadius: "999px",
          padding: "0.35rem 0.875rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Reload
      </button>
    </div>
  );
}
