"use client";

import { useState } from "react";
import {
  registerBiometric,
  getBiometricLabel,
  setEnrolled,
  dismissEnrollment,
  isWebAuthnSupported,
} from "@/lib/webauthnService";

interface Props {
  username: string;
  onClose: () => void;
}

export default function BiometricEnrollModal({ username, onClose }: Props) {
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isWebAuthnSupported()) return null;

  const label = getBiometricLabel();

  async function handleEnroll() {
    setEnrolling(true);
    setError("");
    try {
      await registerBiometric(label);
      setEnrolled(username);
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enable biometric login";
      const name = err instanceof Error ? (err as any).name : "";
      if (name === "InvalidStateError") {
        // Credential already exists (e.g., synced via iCloud) — treat as success
        setEnrolled(username);
        setSuccess(true);
        setTimeout(() => onClose(), 2000);
      } else if (name === "NotAllowedError") {
        setError("Biometric was cancelled or denied. You can enable it later from settings.");
      } else {
        setError(msg);
      }
    } finally {
      setEnrolling(false);
    }
  }

  function handleDismiss() {
    dismissEnrollment(); // 24h cooldown
    onClose();
  }

  if (success) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "24px", padding: "2.5rem 2rem", textAlign: "center", maxWidth: 340, width: "100%", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", marginBottom: "0.375rem" }}>
            {label} Enabled!
          </h2>
          <p style={{ fontSize: "0.875rem", color: "#64748b" }}>You can now sign in instantly next time.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "1.5rem" }}>
      <div style={{ background: "white", borderRadius: "24px", maxWidth: 360, width: "100%", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0f2d3d, #1f6477)", padding: "2.5rem 1.5rem 2rem", textAlign: "center" }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", margin: "0 auto 1rem" }}>
            🔐
          </div>
          <h2 style={{ color: "white", fontSize: "1.375rem", fontWeight: 800, marginBottom: "0.25rem" }}>
            Enable {label}?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
            Sign in faster on this device
          </p>
        </div>

        {/* Benefits */}
        <div style={{ padding: "1.5rem 1.5rem 0" }}>
          {[
            ["⚡", "Instant login — no password needed"],
            ["🔒", "Secured by your device's biometrics"],
            ["📱", "Only works on this device"],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "0.875rem" }}>
              <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: "0.875rem", color: "#374151", fontWeight: 500 }}>{text}</span>
            </div>
          ))}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "0.75rem", fontSize: "0.8rem", color: "#ef4444", marginTop: "0.5rem" }}>
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ padding: "1.25rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            style={{ width: "100%", padding: "0.875rem", background: enrolling ? "#94a3b8" : "linear-gradient(135deg, #4EB1CB, #3a8fa8)", color: "white", border: "none", borderRadius: "999px", fontSize: "1rem", fontWeight: 700, cursor: enrolling ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
          >
            {enrolling ? "Setting up…" : `Enable ${label}`}
          </button>
          <button
            onClick={handleDismiss}
            style={{ width: "100%", padding: "0.75rem", background: "transparent", color: "#94a3b8", border: "none", borderRadius: "999px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Not now
          </button>
          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#cbd5e1" }}>
            Your biometric data never leaves your device
          </p>
        </div>
      </div>
    </div>
  );
}
