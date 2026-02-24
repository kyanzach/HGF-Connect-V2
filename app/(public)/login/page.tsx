"use client";

import { useState, useEffect, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  hasAnyEnrolledDevice,
  getBiometricLabel,
  isPlatformAuthenticatorAvailable,
  authenticatePasskey,
} from "@/lib/webauthnService";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  // Show passkey button if: device supports biometrics AND has an enrolled credential
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Face ID / Touch ID");

  useEffect(() => {
    async function checkBiometric() {
      if (typeof window === "undefined") return;
      const available = await isPlatformAuthenticatorAvailable();
      const enrolled = hasAnyEnrolledDevice();
      setShowBiometric(available && enrolled);
      setBiometricLabel(getBiometricLabel());
    }
    checkBiometric();
  }, []);

  // ── Usernameless passkey login — no username needed ────────────────────────
  async function handleBiometric() {
    setBioLoading(true);
    setError("");
    try {
      const { verified, memberId } = await authenticatePasskey();
      if (!verified) throw new Error("Biometric verification failed");

      const result = await signIn("credentials", {
        memberId: String(memberId),
        biometricVerified: "true",
        redirect: false,
      });
      if (result?.error) throw new Error("Sign-in failed after biometric");

      sessionStorage.setItem("hgf-just-logged-in", "1");
      router.push("/feed");
    } catch (err: unknown) {
      // Two-case error handling:
      // 1. User explicitly cancelled (NotAllowedError) → show a brief message
      // 2. Any other error (credential not found, hardware error, etc.)
      //    → silent fallback: hide biometric button, let password form shine
      const isUserCancelled =
        (err instanceof Error && err.name === "NotAllowedError") ||
        (err instanceof Error && (err.message.includes("cancelled") || err.message.includes("NotAllowed")));

      if (isUserCancelled) {
        setError("Biometric cancelled. Use your password below.");
      } else {
        // Silent fallback — don't show a cryptic WebAuthn error
        setShowBiometric(false);
        setError(""); // clear any previous error
      }
    } finally {
      setBioLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password. Please try again.");
      return;
    }

    // Set flag so BiometricEnrollTrigger shows modals (PWA first, then biometrics)
    sessionStorage.setItem("hgf-just-logged-in", "1");

    // Go straight to /feed — AppLayout territory, where modals fire
    router.push("/feed");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 50%, #1f6477 100%)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4eb1cb 0%, #3a95ad 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <span style={{ color: "white", fontWeight: 800, fontSize: "1.5rem" }}>
              H
            </span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
            Welcome back
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9375rem" }}>
            Sign in to HGF Connect
          </p>
        </div>
        {/* ── Passkey / Face ID button — FIRST if enrolled ── */}
        {showBiometric && (
          <>
            <button
              type="button"
              onClick={handleBiometric}
              disabled={bioLoading}
              style={{
                width: "100%",
                padding: "0.9rem",
                background: bioLoading
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #4eb1cb, #3a95ad)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: bioLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontFamily: "inherit",
                marginBottom: "0.25rem",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>🔐</span>
              {bioLoading ? "Authenticating..." : `Sign in with ${biometricLabel}`}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "1rem 0" }}>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>or sign in with password</span>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            </div>
          </>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#ef4444",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}
            >
              Username or Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              placeholder="username or email@example.com"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4eb1cb")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>

          <div>
            <label
              style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.375rem" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4eb1cb")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.875rem",
              background: loading
                ? "#94a3b8"
                : "linear-gradient(135deg, #4eb1cb, #3a95ad)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.25rem",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>


        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{ color: "#4eb1cb", fontWeight: 600, textDecoration: "none" }}
            >
              Register here
            </Link>
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              marginTop: "0.75rem",
              color: "#94a3b8",
              fontSize: "0.8125rem",
              textDecoration: "none",
            }}
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
