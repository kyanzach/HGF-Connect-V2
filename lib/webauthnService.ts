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
  if (/iPad|iPhone|iPod/.test(ua)) return "face-id";   // Most modern iPhones
  if (/Macintosh/.test(ua)) return "touch-id";
  return "fingerprint";   // Android / Windows Hello
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

export function dismissEnrollment(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  } catch {}
}

export function isEnrollmentDismissed(): boolean {
  try {
    const t = localStorage.getItem(DISMISSED_KEY);
    if (!t) return false;
    return Date.now() - parseInt(t) < 24 * 60 * 60 * 1000; // 24 hours
  } catch {
    return false;
  }
}

// ── Registration (call after login, requires active NextAuth session) ──────────
// RP verify endpoint uses the session cookie — no Bearer token needed (NextAuth)
export async function registerBiometric(deviceName?: string): Promise<void> {
  // Step 1: Get registration options from server
  const optRes = await fetch("/api/auth/webauthn/register-options", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!optRes.ok) {
    const d = await optRes.json().catch(() => ({}));
    throw new Error(d.error ?? "Failed to get registration options");
  }
  const options = await optRes.json();

  // Step 2: Platform authenticator creates credential (triggers Face ID / Touch ID)
  const credential = await startRegistration(options);

  // Step 3: Verify and store on server
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

// ── Authentication (public — pass username, returns { verified, memberId }) ────
export async function authenticateWithBiometric(
  username: string
): Promise<{ verified: boolean; memberId: number }> {
  // Step 1: Get login options
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

  // Step 2: Device authenticates with biometric
  const assertion = await startAuthentication(options);

  // Step 3: Verify on server
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

// ── Cross-device check — show biometric button even on new devices ─────────────
export async function checkServerCredentials(username: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/auth/webauthn/has-credentials?username=${encodeURIComponent(username)}`
    );
    const d = await res.json();
    return !!d.hasCredentials;
  } catch {
    return false; // Never throw — biometric is an optional enhancement
  }
}
