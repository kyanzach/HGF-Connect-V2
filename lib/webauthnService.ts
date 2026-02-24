// lib/webauthnService.ts  — client-side WebAuthn helpers for HGF Connect
// Used by: LoginPage (biometric button), BiometricEnrollModal
// Server-side logic lives in app/api/auth/webauthn/*

import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

// ── Support detection ──────────────────────────────────────────────────────────
export function isWebAuthnSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === "function"
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!isWebAuthnSupported()) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ── Device-type detection ──────────────────────────────────────────────────────
export function getBiometricType(): "face-id" | "touch-id" | "fingerprint" {
  if (typeof navigator === "undefined") return "fingerprint";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "face-id";
  if (/Macintosh/.test(ua)) return "touch-id";
  return "fingerprint";
}

export function getBiometricLabel(): string {
  const t = getBiometricType();
  return t === "face-id" ? "Face ID" : t === "touch-id" ? "Touch ID" : "Fingerprint";
}

// ── localStorage helpers ───────────────────────────────────────────────────────
const ENROLLED_KEY = "hgf-webauthn-enrolled";
const DISMISSED_KEY = "hgf-webauthn-dismissed";

export function setEnrolled(username: string): void {
  try {
    const enrolled: Record<string, boolean> = JSON.parse(
      localStorage.getItem(ENROLLED_KEY) ?? "{}"
    );
    enrolled[username] = true;
    localStorage.setItem(ENROLLED_KEY, JSON.stringify(enrolled));
  } catch {}
}

export function isEnrolled(username: string | undefined): boolean {
  if (!username) return false;
  try {
    const enrolled: Record<string, boolean> = JSON.parse(
      localStorage.getItem(ENROLLED_KEY) ?? "{}"
    );
    return !!enrolled[username];
  } catch {
    return false;
  }
}

/**
 * Returns true if ANY username on this device has been enrolled.
 * Used by the login page to decide whether to show the passkey button
 * WITHOUT requiring the user to type a username first.
 */
export function hasAnyEnrolledDevice(): boolean {
  try {
    const enrolled: Record<string, boolean> = JSON.parse(
      localStorage.getItem(ENROLLED_KEY) ?? "{}"
    );
    return Object.values(enrolled).some(Boolean);
  } catch {
    return false;
  }
}

export function dismissEnrollment(): void {
  try {
    dismissEnrollmentLater(); // map to 1-min snooze (back-compat)
  } catch {}
}

export function isEnrollmentDismissed(): boolean {
  return isEnrollmentSnoozed(); // alias (back-compat)
}

// ── Smart Snooze (biometric) ─────────────────────────────────────────────
const SNOOZE_KEY = "hgf-webauthn-snooze";

/** Snooze biometric for 1 minute ("Remind me later") */
export function dismissEnrollmentLater(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, (Date.now() + 60 * 1000).toString());
  } catch {}
}

/** Snooze until next day at 05:00 Asia/Manila ("Remind me tomorrow") */
export function dismissEnrollmentTomorrow(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, _nextDayAt5amPH().toString());
  } catch {}
}

function _nextDayAt5amPH(): number {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(now).filter((p) => p.type !== "literal").map((p) => [p.type, p.value])
  );
  const d = new Date(`${parts.year}-${parts.month}-${parts.day}T05:00:00+08:00`);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** True if biometric is currently snoozed */
export function isEnrollmentSnoozed(): boolean {
  try {
    const snooze = localStorage.getItem(SNOOZE_KEY);
    if (!snooze) return false;
    return Date.now() < parseInt(snooze);
  } catch { return false; }
}

// ── PWA Snooze (mirrors biometric pattern) ───────────────────────────────
export function snoozePWALater(): void {
  try {
    localStorage.setItem("pwa-snooze-until", (Date.now() + 60 * 1000).toString());
  } catch {}
}

export function snoozePWATomorrow(): void {
  try {
    localStorage.setItem("pwa-snooze-until", _nextDayAt5amPH().toString());
  } catch {}
}

export function isPWASnoozed(): boolean {
  try {
    const snooze = localStorage.getItem("pwa-snooze-until");
    if (!snooze) return false;
    return Date.now() < parseInt(snooze);
  } catch { return false; }
}

// ── Registration (call after login, requires active NextAuth session) ──────────
export async function registerBiometric(deviceName?: string): Promise<void> {
  const optRes = await fetch("/api/auth/webauthn/register-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!optRes.ok) {
    const d = await optRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Failed to get registration options");
  }
  const options = await optRes.json();

  const credential = await startRegistration(options);

  const verRes = await fetch("/api/auth/webauthn/register-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...credential, deviceName: deviceName ?? getBiometricLabel() }),
  });
  if (!verRes.ok) {
    const d = await verRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Verification failed");
  }
}

// ── Usernameless Passkey Authentication ────────────────────────────────────────
// No username required — device discovers its own resident credential.
// Returns { verified, memberId } so caller can sign in via NextAuth.
export async function authenticatePasskey(): Promise<{ verified: boolean; memberId: number }> {
  // Step 1: Get options (no username sent)
  const optRes = await fetch("/api/auth/webauthn/login-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}), // empty body = usernameless mode
  });
  if (!optRes.ok) {
    const d = await optRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Failed to get login options");
  }
  const { sessionToken, ...options } = await optRes.json();

  // Step 2: Device picks credential and authenticates (triggers Face ID / Touch ID)
  const assertion = await startAuthentication(options);

  // Step 3: Verify — send sessionToken so server can look up the challenge
  const verRes = await fetch("/api/auth/webauthn/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionToken, ...assertion }),
  });
  if (!verRes.ok) {
    const d = await verRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Biometric verification failed");
  }
  return await verRes.json();
}

// ── Username-first Authentication (kept for legacy fallback) ───────────────────
export async function authenticateWithBiometric(
  username: string
): Promise<{ verified: boolean; memberId: number }> {
  const optRes = await fetch("/api/auth/webauthn/login-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!optRes.ok) {
    const d = await optRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Failed to get login options");
  }
  const { memberId, ...options } = await optRes.json();

  const assertion = await startAuthentication(options);

  const verRes = await fetch("/api/auth/webauthn/login-verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, ...assertion }),
  });
  if (!verRes.ok) {
    const d = await verRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Biometric verification failed");
  }
  return await verRes.json();
}

// ── Cross-device check ─────────────────────────────────────────────────────────
export async function checkServerCredentials(username: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/auth/webauthn/has-credentials?username=${encodeURIComponent(username)}`
    );
    const d = await res.json();
    return !!d.hasCredentials;
  } catch {
    return false;
  }
}
