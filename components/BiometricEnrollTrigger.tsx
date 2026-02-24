"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import BiometricEnrollModal from "@/components/BiometricEnrollModal";
import PWAInstallModal from "@/components/PWAInstallModal";
import {
  isWebAuthnSupported,
  isEnrolled,
  isEnrollmentSnoozed,
  isPlatformAuthenticatorAvailable,
  isPWASnoozed,
} from "@/lib/webauthnService";

/**
 * Staggered modal trigger — mounts inside AppLayout (authenticated pages only).
 *
 * ORDER (user-first logic):
 *   1. PWA Install Modal  — prompts to bookmark/install the app first.
 *   2. Biometric Enrollment — after PWA is handled.
 *
 * Smart snooze behaviour (upgraded from legacy 24h):
 *   - "Remind me later"   → 1-minute snooze (pwa-snooze-until / hgf-webauthn-snooze)
 *   - "Remind me tomorrow" → next day 05:00 Asia/Manila
 *   - "I've installed" / "Enable" → permanent dismiss
 *
 * Re-surface triggers:
 *   - Route change (usePathname) — re-evaluates snooze on navigation
 *   - 60-second polling           — re-evaluates while user browses
 */
export default function BiometricEnrollTrigger() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [showPWA, setShowPWA] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [pwaDone, setPWADone] = useState(false);

  // ── Guard helpers ─────────────────────────────────────────────────────────
  const isPWAEligible = () => {
    if (typeof window === "undefined") return false;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return false;
    if (localStorage.getItem("pwa-installed") === "true") return false;
    if (isPWASnoozed()) return false;
    return true;
  };

  const isBiometricEligible = async () => {
    if (!session?.user) return false;
    if (!isWebAuthnSupported()) return false;
    const username = (session.user as any).username as string;
    if (isEnrolled(username)) return false;
    if (isEnrollmentSnoozed()) return false;
    return await isPlatformAuthenticatorAvailable();
  };

  // ── Initial trigger ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isPWAEligible()) {
      const timer = setTimeout(() => setShowPWA(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setPWADone(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Biometric: after PWA is handled ──────────────────────────────────────
  useEffect(() => {
    if (!pwaDone || !session?.user) return;
    isBiometricEligible().then((eligible) => {
      if (eligible) setTimeout(() => setShowBiometric(true), 900);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pwaDone, session]);

  // ── Route-change re-surface ───────────────────────────────────────────────
  useEffect(() => {
    if (showPWA || showBiometric) return; // already showing one
    if (isPWAEligible()) { setShowPWA(true); return; }
    if (pwaDone) {
      isBiometricEligible().then((eligible) => { if (eligible) setShowBiometric(true); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── 60-second polling ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (showPWA || showBiometric) return;
      if (isPWAEligible()) { setShowPWA(true); return; }
      if (pwaDone && (await isBiometricEligible())) setShowBiometric(true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPWA, showBiometric, pwaDone, session]);

  const username = ((session?.user as any)?.username as string) ?? "";

  const handlePWAClose = () => { setShowPWA(false); setPWADone(true); };
  const handleBiometricClose = () => {
    setShowBiometric(false);
    sessionStorage.removeItem("hgf-just-logged-in"); // keep legacy cleanup
  };

  if (showPWA) return <PWAInstallModal onClose={handlePWAClose} />;
  if (showBiometric) return <BiometricEnrollModal username={username} onClose={handleBiometricClose} />;
  return null;
}
