"use client";

import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "@/lib/version";

/**
 * VersionGuard — Shows a polite update modal when a new version is deployed.
 *
 * How it works:
 * 1. Polls `/api/version` every 60s (only when tab is visible + online)
 * 2. Compares server version vs the bundled APP_VERSION
 * 3. If mismatch: shows a non-intrusive modal with "Update Now" and "Later"
 * 4. "Update Now" → clears caches, forces SW update, reloads
 * 5. "Later" → dismisses for this session (won't nag again until next session)
 *
 * Why NOT auto-reload:
 * - User may be mid-typing a post, filling a form, or composing a message
 * - Auto-reload would lose their unsaved work → terrible UX
 */
const CHECK_INTERVAL_MS = 60_000; // 60 seconds
const DISMISSED_KEY = "hgf_update_dismissed_version";

export default function VersionGuard() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isChecking = useRef(false);
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function checkVersion() {
      // Don't check if already checking, offline, or tab is hidden
      if (
        isChecking.current || 
        !navigator.onLine || 
        document.visibilityState !== "visible"
      ) {
        return;
      }
      
      isChecking.current = true;

      try {
        const res = await fetch("/api/version", {
          cache: "no-store",
          headers: { 
            "Cache-Control": "no-cache",
            "Pragma": "no-cache" 
          },
        });
        if (!res.ok) return;

        const data = await res.json();
        const serverVersion = String(data?.version || "").trim();

        if (!serverVersion || serverVersion === APP_VERSION) return;

        // Check if user already dismissed this version in this session
        const dismissed = sessionStorage.getItem(DISMISSED_KEY);
        if (dismissed === serverVersion) return;

        console.log(`[VersionGuard] Update available: ${APP_VERSION} → ${serverVersion}`);
        setPendingVersion(serverVersion);
      } catch {
        // Network error — silently ignore
      } finally {
        isChecking.current = false;
      }
    }

    const initialTimeout = setTimeout(checkVersion, 3000);

    function startPolling() {
      if (timerRef.current) return;
      timerRef.current = setInterval(checkVersion, CHECK_INTERVAL_MS);
    }

    function stopPolling() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkVersion();
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", checkVersion);

    if (document.visibilityState === "visible") startPolling();

    return () => {
      clearTimeout(initialTimeout);
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", checkVersion);
    };
  }, []);

  async function handleUpdate() {
    if (updating) return;
    setUpdating(true);

    try {
      // 1. Force service worker update if available
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          // Prepare to wait for the new controller to take over
          const controllerChangePromise = new Promise<void>((resolve) => {
            const handler = () => {
              navigator.serviceWorker.removeEventListener("controllerchange", handler);
              resolve();
            };
            navigator.serviceWorker.addEventListener("controllerchange", handler);
            // Safety timeout: don't hang the UI forever if SW fails to take control
            setTimeout(resolve, 2000);
          });

          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
            await controllerChangePromise;
          }
        }
      }

      // 2. Clear all caches if available
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (err) {
      console.error("[VersionGuard] Update process failed:", err);
    } finally {
      // 3. Force reload from server
      window.location.reload();
    }
  }

  function handleLater() {
    if (pendingVersion) {
      sessionStorage.setItem(DISMISSED_KEY, pendingVersion);
    }
    setPendingVersion(null);
  }

  if (!pendingVersion) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
        }}
        onClick={handleLater}
      />
      <div
        style={{
          position: "relative",
          background: "white",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "380px",
          padding: "2rem 1.5rem 1.5rem",
          textAlign: "center",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          animation: "vgFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🚀</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, color: "#1e293b" }}>
          Application Update
        </h2>
        <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>
          v{APP_VERSION} → v{pendingVersion}
        </p>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.4 }}>
          A new version is available with latest features and performance improvements.
        </p>

        <button
          onClick={handleUpdate}
          disabled={updating}
          style={{
            display: "block",
            width: "100%",
            padding: "0.875rem",
            background: updating ? "#94a3b8" : "#4EB1CB",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "0.95rem",
            fontWeight: 700,
            cursor: updating ? "wait" : "pointer",
            fontFamily: "inherit",
            marginBottom: "0.75rem",
            transition: "all 0.2s ease",
          }}
        >
          {updating ? "Updating..." : "Update Now"}
        </button>
        <button
          onClick={handleLater}
          disabled={updating}
          style={{
            display: "block",
            width: "100%",
            padding: "0.5rem",
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: "0.85rem",
            fontWeight: 500,
            cursor: updating ? "default" : "pointer",
            fontFamily: "inherit",
            opacity: updating ? 0.5 : 1,
          }}
        >
          Later
        </button>
      </div>
      <style>{`
        @keyframes vgFadeIn { 
          from { transform: scale(0.95) translateY(10px); opacity: 0; } 
          to { transform: scale(1) translateY(0); opacity: 1; } 
        }
      `}</style>
    </div>
  );
}
