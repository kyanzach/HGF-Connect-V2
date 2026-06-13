import { signOut } from "next-auth/react";

/**
 * Triggers a secure, immediate logout process.
 * Dispatches a global event to show the logout overlay, calls NextAuth's signOut,
 * clears local session states, and ensures the user is redirected to the home/login
 * screen within 1.2 seconds, even on flaky 5G/LTE networks.
 */
export async function triggerLogout() {
  // 1. Dispatch custom event to show the fullscreen loading overlay
  if (typeof window !== "undefined") {
    const event = new CustomEvent("hgf-logout-start");
    window.dispatchEvent(event);
  }

  // 2. Clear relevant client-side session states
  try {
    sessionStorage.removeItem("hgf-just-logged-in");
    // Clear any temporary caches if needed
  } catch (e) {
    console.error("Error clearing session storage:", e);
  }

  // 3. Initiate NextAuth signOut (asynchronous HttpOnly cookie deletion)
  const signOutPromise = signOut({ redirect: false });

  // 4. Force redirection after a maximum timeout of 1.2s OR when signOut resolves
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(resolve, 1200);
  });

  await Promise.race([signOutPromise, timeoutPromise]);

  // 5. Perform a hard redirect to the home page to reset the client state completely
  if (typeof window !== "undefined") {
    window.location.href = "/";
  }
}
