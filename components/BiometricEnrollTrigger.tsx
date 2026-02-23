"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import BiometricEnrollModal from "@/components/BiometricEnrollModal";
import {
  isWebAuthnSupported,
  isEnrolled,
  isEnrollmentDismissed,
  isPlatformAuthenticatorAvailable,
} from "@/lib/webauthnService";

// Client component — sits inside AppLayout (server component) to add the
// biometric enrollment modal without making the whole layout a client component.
export default function BiometricEnrollTrigger() {
  const { data: session } = useSession();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!session?.user) return;

    // Only show modal if:
    // 1. User just logged in (set by login page handleSubmit on success)
    // 2. WebAuthn is supported on this browser
    // 3. Platform authenticator is available (Touch ID / Face ID hardware)
    // 4. This username is not already enrolled on this device
    // 5. User hasn't dismissed the modal in the last 24h
    const justLoggedIn = sessionStorage.getItem("hgf-just-logged-in");
    if (!justLoggedIn) return;

    const username = (session.user as any).username as string;

    async function check() {
      if (!isWebAuthnSupported()) return;
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) return;
      if (isEnrolled(username)) return;
      if (isEnrollmentDismissed()) return;

      // Small delay so the dashboard renders first — feels less intrusive
      setTimeout(() => setShowModal(true), 900);
    }
    check();
  }, [session]);

  const username = ((session?.user as any)?.username as string) ?? "";

  if (!showModal) return null;

  return (
    <BiometricEnrollModal
      username={username}
      onClose={() => {
        setShowModal(false);
        sessionStorage.removeItem("hgf-just-logged-in");
      }}
    />
  );
}
