"use client";

import { useEffect, useRef } from "react";
import { APP_VERSION } from "@/lib/version";

/**
 * VersionGuard — Proactive auto-refresh when a new version is deployed.
 *
 * How it works:
 * 1. Polls `/api/version` every 60s (only when tab is visible)
 * 2. Compares server version vs the bundled APP_VERSION
 * 3. If mismatch detected:
 *    a. Forces service worker to update & activate immediately
 *    b. Clears all old caches
 *    c. Hard-reloads the page
 * 4. Uses sessionStorage to prevent infinite reload loops:
 *    - Stores "hgf_reloaded_for_version" = new version
 *    - If we already reloaded for this version, DON'T reload again
 *
 * Why this works:
 * - The prebuild script stamps APP_VERSION into both lib/version.ts
 *   and public/service-worker.js at build time
 * - After deploy, the server returns the NEW version from /api/version
 * - Clients running the OLD version see a mismatch → clean reload
 * - After reload, the client loads the NEW bundle → versions match → no loop
 */
const CHECK_INTERVAL_MS = 60_000; // 60 seconds
const STORAGE_KEY = "hgf_reloaded_for_version";

export default function VersionGuard() {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isChecking = useRef(false);

  useEffect(() => {
    // Don't run during SSR or if no SW support
    if (typeof window === "undefined") return;

    async function checkVersion() {
      if (isChecking.current || !navigator.onLine) return;
      isChecking.current = true;

      try {
        const res = await fetch("/api/version", { 
          cache: "no-store",
          headers: { "Pragma": "no-cache" }
        });
        if (!res.ok) return;

        const data = await res.json();
        const serverVersion = data?.version?.trim();
        
        if (!serverVersion || serverVersion === APP_VERSION) return;

        // Version mismatch detected!
        console.log(
          `[VersionGuard] Update detected: ${APP_VERSION} → ${serverVersion}`
        );

        // Loop protection: check if we already reloaded for this version
        const alreadyReloaded = sessionStorage.getItem(STORAGE_KEY);
        if (alreadyReloaded === serverVersion) {
          console.log("[VersionGuard] Already reloaded for this version, skipping");
          return;
        }

        // Mark that we're about to reload for this version
        sessionStorage.setItem(STORAGE_KEY, serverVersion);

        // 1. Force service worker update
        if ("serviceWorker" in navigator) {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
              await reg.update();
              // If a waiting worker exists, tell it to activate immediately
              if (reg.waiting) {
                reg.waiting.postMessage({ type: "SKIP_WAITING" });
              }
            }
          } catch (swErr) {
            console.error("[VersionGuard] SW update failed", swErr);
          }
        }

        // 2. Clear all caches (old versioned caches)
        if ("caches" in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
            console.log("[VersionGuard] Cleared", keys.length, "cache(s)");
          } catch (cacheErr) {
            console.error("[VersionGuard] Cache clearing failed", cacheErr);
          }
        }

        // 3. Hard reload (bypass browser cache)
        console.log("[VersionGuard] Reloading to", serverVersion);
        window.location.reload();
      } catch (err) {
        // Network error — silently ignore (offline, etc.)
      } finally {
        isChecking.current = false;
      }
    }

    // Check once after initial load (with small delay to not block hydration)
    const initialTimeout = setTimeout(checkVersion, 3000);

    // Then check periodically, but only when tab is visible
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
        checkVersion(); // Check immediately when tab becomes visible
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    if (document.visibilityState === "visible") startPolling();

    return () => {
      clearTimeout(initialTimeout);
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null; // This is a behavior-only component, no UI
}
