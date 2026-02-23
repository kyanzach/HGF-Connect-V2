"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import BiometricEnrollModal from "@/components/BiometricEnrollModal";
import PWAInstallModal from "@/components/PWAInstallModal";
import {
  isWebAuthnSupported,
  isEnrolled,
  isEnrollmentDismissed,
  isPlatformAuthenticatorAvailable,
} from "@/lib/webauthnService";

/**
 * Staggered modal trigger — mounts inside AppLayout (authenticated pages only).
 *
 * ORDER (user-first logic):
 *   1. PWA Install Modal  — first, so user bookmarks/installs the app before anything else.
 *      They must have the app saved before we ask about biometrics.
 *   2. Biometric Enrollment — after PWA is handled (enrolled, dismissed, or already installed).
 *      Only fires on fresh password logins (sessionStorage flag).
 *
 * Only ONE modal visible at a time. No stacking.
 *
 * PWA modal fires:
 *   - Always on fresh login (if not already installed/dismissed)
 *   - Also on any app page visit if not installed/dismissed (1.5s delay)
 *
 * Biometric modal fires:
 *   - Only if sessionStorage("hgf-just-logged-in") is set (fresh password login)
 *   - And device supports platform authenticator (Face ID / Fingerprint)
 *   - And this username is not already enrolled on this device
 */
export default function BiometricEnrollTrigger() {
  const { data: session } = useSession();
  const [showPWA, setShowPWA] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [pwaDone, setPWADone] = useState(false);

  // ── Step 1: PWA Install Modal (always first) ──────────────────────────────
  useEffect(() => {
    // Already installed as PWA? Skip entirely.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) { setPWADone(true); return; }

    // Permanently dismissed?
    if (localStorage.getItem("pwa-installed") === "true") { setPWADone(true); return; }

    // Temporary dismiss (1-day cooldown)?
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      setPWADone(true);
      return;
    }

    // Show PWA modal after short delay (let page render first)
    const timer = setTimeout(() => setShowPWA(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // ── Step 2: Biometric Enrollment (only after PWA is handled) ─────────────
  useEffect(() => {
    if (!pwaDone) return;
    if (!session?.user) return;

    // Only fire on fresh password logins
    const justLoggedIn = sessionStorage.getItem("hgf-just-logged-in");
    if (!justLoggedIn) return;

    const username = (session.user as any).username as string;

    async function check() {
      if (!isWebAuthnSupported()) return;
      const available = await isPlatformAuthenticatorAvailable();
      if (!available) return;
      if (isEnrolled(username)) return;
      if (isEnrollmentDismissed()) return;

      setTimeout(() => setShowBiometric(true), 900);
    }
    check();
  }, [pwaDone, session]);

  const username = ((session?.user as any)?.username as string) ?? "";

  const handlePWAClose = () => {
    setShowPWA(false);
    setPWADone(true); // Trigger biometric check
  };

  const handleBiometricClose = () => {
    setShowBiometric(false);
    sessionStorage.removeItem("hgf-just-logged-in");
  };

  // Only one modal at a time
  if (showPWA) {
    return <PWAInstallModal onClose={handlePWAClose} />;
  }

  if (showBiometric) {
    return <BiometricEnrollModal username={username} onClose={handleBiometricClose} />;
  }

  return null;
}
