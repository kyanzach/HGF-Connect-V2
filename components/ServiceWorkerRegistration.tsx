"use client";

import { useEffect } from "react";

// Registers the service worker on mount — runs once client-side.
// Placed in root layout so it registers on every page.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
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
                // New version waiting — notify all clients
                navigator.serviceWorker.controller.postMessage({ type: "SW_UPDATED" });
              }
            });
          });
        })
        .catch((err) => console.warn("[HGF SW] Registration failed:", err));
    });
  }, []);

  return null;
}
