"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    // Redirect based on role
    router.refresh();
    router.push("/");
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
              placeholder="your.username or email@example.com"
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
