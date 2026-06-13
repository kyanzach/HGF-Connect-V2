import { signOut } from "next-auth/react";

/**
 * Helper to clear all browser Cache Storage stores.
 * Prevents stale app shells (like logged-in shells on logout, or logged-out shells on login)
 * from being served by the PWA service worker after session changes.
 */
export async function clearBrowserCaches() {
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      console.log("[PWA] Caches cleared successfully.");
    } catch (err) {
      console.error("[PWA] Error clearing caches:", err);
    }
  }
}

/**
 * Triggers a secure, immediate logout process.
 * Dispatches a global event to show the logout overlay, clears the PWA caches,
 * clears local session states, and calls NextAuth's signOut to delete cookies
 * and perform a safe redirect to the home page.
 */
export async function triggerLogout() {
  // 1. Dispatch custom event to show the fullscreen loading overlay
  if (typeof window !== "undefined") {
    const event = new CustomEvent("hgf-logout-start");
    window.dispatchEvent(event);
  }

  // 2. Clear PWA cache storage immediately to prevent stale app shell loads
  await clearBrowserCaches();

  // 3. Clear relevant client-side session states
  try {
    sessionStorage.removeItem("hgf-just-logged-in");
  } catch (e) {
    console.error("Error clearing session storage:", e);
  }

  // 4. Initiate NextAuth signOut with standard callback redirect.
  // This ensures the browser waits for the HttpOnly cookie clearing headers
  // to be processed before navigating away, avoiding aborted requests.
  await signOut({ callbackUrl: "/" });
}
