"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";

interface Props {
  onEnrolled: () => void;
  onClose: () => void;
}

const PRIMARY = "#4EB1CB";

export default function BiometricEnrollModal({ onEnrolled, onClose }: Props) {
  const [step, setStep] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleEnroll() {
    setStep("loading");
    setMsg("");
    try {
      // 1. Get registration options
      const optRes = await fetch("/api/auth/webauthn/register-options", { method: "POST" });
      if (!optRes.ok) throw new Error((await optRes.json()).error ?? "Failed to get options");
      const options = await optRes.json();

      // 2. Trigger platform authenticator (FaceID / TouchID / Windows Hello)
      const attResp = await startRegistration(options);

      // 3. Verify on server
      const verRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attResp, deviceName: navigator.userAgent.slice(0, 50) }),
      });
      if (!verRes.ok) throw new Error((await verRes.json()).error ?? "Verification failed");

      setStep("success");
      setTimeout(onEnrolled, 1500);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setMsg("Biometric prompt was cancelled. Try again.");
      } else {
        setMsg(err instanceof Error ? err.message : "Something went wrong");
      }
      setStep("error");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "24px 24px 0 0",
          padding: "2rem 1.5rem 2.5rem",
          width: "100%",
          maxWidth: "480px",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 1.5rem" }} />

        {step === "success" ? (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#16a34a" }}>Biometrics Enabled!</h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem" }}>You can now log in with your fingerprint or Face ID.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: "3rem", marginBottom: "0.875rem" }}>
              {step === "loading" ? "⏳" : "🔐"}
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#1e293b", marginBottom: "0.5rem" }}>
              Enable Biometric Login
            </h2>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Use Face ID, Touch ID, or Windows Hello to log in instantly — no password needed.
            </p>

            {msg && (
              <p style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: "1rem" }}>{msg}</p>
            )}

            <button
              onClick={handleEnroll}
              disabled={step === "loading"}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: step === "loading" ? "#94a3b8" : PRIMARY,
                color: "white",
                border: "none",
                borderRadius: "14px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: step === "loading" ? "not-allowed" : "pointer",
                marginBottom: "0.75rem",
              }}
            >
              {step === "loading" ? "Setting up..." : "🔐 Set Up Biometrics"}
            </button>

            <button
              onClick={onClose}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "transparent",
                color: "#94a3b8",
                border: "none",
                borderRadius: "14px",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Not now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
