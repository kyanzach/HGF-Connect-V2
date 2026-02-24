"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    ageGroup: "Adult",
    type: "Growing Friend",
    invitedBy: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        ageGroup: form.ageGroup,
        type: form.type,
        invitedBy: form.invitedBy,
      }),
    });
    setLoading(false);

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed. Please try again.");
      return;
    }

    setSuccess(
      `Welcome to HGF Connect, ${form.firstName}! Your account is pending approval from an admin. You can now sign in.`
    );
    setTimeout(() => router.push("/login"), 4000);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f2d3d 0%, #1a4a5e 50%, #1f6477 100%)",
        padding: "2rem 1.5rem",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2.5rem",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
        }}
      >
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
            <span style={{ color: "white", fontWeight: 800, fontSize: "1.5rem" }}>H</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
            Join HGF Connect
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9375rem" }}>
            Create your member account
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
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              color: "#16a34a",
              fontSize: "0.875rem",
            }}
          >
            ✅ {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <InputField label="First Name" value={form.firstName} onChange={(v) => set("firstName", v)} required />
            <InputField label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} required />
          </div>

          <InputField label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
          <InputField label="Mobile Number" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="09XXXXXXXXX" />

          <div>
            <label style={labelStyle}>Age Group</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["Adult", "Youth", "Kids"].map((g) => (
                <label
                  key={g}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    padding: "0.5rem 1rem",
                    border: `1px solid ${form.ageGroup === g ? "#4eb1cb" : "#d1d5db"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    background: form.ageGroup === g ? "#e0f5f9" : "white",
                    color: form.ageGroup === g ? "#1a6b82" : "#374151",
                    fontWeight: form.ageGroup === g ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="ageGroup"
                    value={g}
                    checked={form.ageGroup === g}
                    onChange={() => set("ageGroup", g)}
                    style={{ display: "none" }}
                  />
                  {g === "Adult" ? "👔" : g === "Youth" ? "🎓" : "👧"} {g}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>I am a…</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.9375rem",
                background: "white",
              }}
            >
              <option value="Family Member">Family Member — faithfully attending and serving</option>
              <option value="Growing Friend">Growing Friend — consistently attending</option>
              <option value="New Friend">New Friend — recently joined HGF</option>
            </select>
          </div>

          <InputField
            label="Invited by (optional)"
            value={form.invitedBy}
            onChange={(v) => set("invitedBy", v)}
            placeholder="Name of the person who invited you"
          />

          <InputField
            label="Password"
            type="password"
            value={form.password}
            onChange={(v) => set("password", v)}
            required
            placeholder="Minimum 8 characters"
          />
          <InputField
            label="Confirm Password"
            type="password"
            value={form.confirmPassword}
            onChange={(v) => set("confirmPassword", v)}
            required
            placeholder="Re-enter your password"
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.875rem",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #4eb1cb, #3a95ad)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.25rem",
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#4eb1cb", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.375rem",
};

function InputField({
  label,
  type = "text",
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          fontSize: "0.9375rem",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#4eb1cb")}
        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
      />
    </div>
  );
}
