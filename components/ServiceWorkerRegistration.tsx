"use client";

import { useEffect } from "react";

// Registers the service worker and captures the beforeinstallprompt event
// so PWAInstallModal can trigger the native Android/desktop install prompt.
// Placed in root layout so it runs on every page load.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // ── Capture install prompt for Android / Desktop Chrome ──────────────────
    // Must be captured at the top level (before any user interaction).
    // PWAInstallModal reads this via window.__pwaInstallPrompt.
    (window as any).__pwaInstallPrompt = null;
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);

    // ── Service Worker registration ──────────────────────────────────────────
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => {
          console.log("[HGF SW] Registered:", reg.scope);

          // Watch for new waiting SW (background update)
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: "SW_UPDATED" });
              }
            });
          });
        })
        .catch((err) => console.warn("[HGF SW] Registration failed:", err));
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
    };
  }, []);

  return null;
}
