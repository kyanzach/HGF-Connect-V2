"use client";

import React, { useState } from "react";
import Link from "next/link";

const PRIMARY = "#4eb1cb";

export default function JoinFormClient() {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [rolePreference, setRolePreference] = useState<"discipled" | "discipler">("discipled");
  const [areaOption, setAreaOption] = useState("");
  const [otherArea, setOtherArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const inviteText = `I'd like to invite you to join a LIFE Group with me!\nIt's a wonderful space to grow in faith, find encouragement, and do LIFE together with a loving community. Let's walk this journey together!\n\nRegister here:\nconnect.houseofgrace.ph/lifegroup/join`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!age) return setError("Please enter your age.");
    if (!phone.trim()) return setError("Please enter your contact mobile number.");
    if (!rolePreference) return setError("Please select your goal in LIFE Group.");
    if (!areaOption) return setError("Please select your area.");

    const finalArea = areaOption === "Others" ? otherArea : areaOption;
    if (areaOption === "Others" && !otherArea.trim()) {
      return setError("Please specify your area details.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/lifegroup/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          age: parseInt(age, 10),
          phone: phone.trim(),
          rolePreference,
          area: finalArea,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit registration.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: "20px", padding: "2.5rem 2rem", maxWidth: "450px", width: "100%", textAlign: "center", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "2rem" }}>
            ✨
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.75rem", letterSpacing: "-0.025em" }}>
            Registration Submitted!
          </h2>
          <p style={{ color: "#475569", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Thank you for registering, <strong>{fullName}</strong>! Our LIFE Group coordinator will review your application and get in touch with you shortly.
          </p>
          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "1rem", textAlign: "left", marginBottom: "1.5rem", fontSize: "0.85rem", color: "#64748b", border: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <span>🎯</span>
              <span><strong>Your Goal:</strong> {rolePreference === "discipler" ? "📖 I want to be a discipler" : "🌱 I want to be discipled"}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <span>📍</span>
              <span><strong>Area Assigned:</strong> {areaOption === "Others" ? otherArea : areaOption}</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span>👥</span>
              <span><strong>Next Step:</strong> {rolePreference === "discipler" ? "A pastor will connect with you regarding leadership and cell group facilitation." : "You will be connected to a loving local community group."}</span>
            </div>
          </div>

          {/* Share with loved ones / friends */}
          <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "16px", padding: "1.25rem 1rem", textAlign: "left", marginBottom: "1.5rem" }}>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 800, color: "#166534", margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📢</span> Share the Blessing!
            </h4>
            <p style={{ color: "#166534", fontSize: "0.8125rem", lineHeight: 1.5, margin: "0 0 0.75rem" }}>
              Invite your friends and family to join a LIFE Group too! Copy this message and send it to them:
            </p>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "0.75rem", fontSize: "0.8rem", color: "#334155", fontStyle: "italic", whiteSpace: "pre-line", marginBottom: "0.75rem", lineHeight: 1.4 }}>
              {inviteText}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteText);
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 2000);
              }}
              style={{
                width: "100%",
                background: copiedInvite ? "#15803d" : "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.625rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none"
              }}
            >
              {copiedInvite ? "✅ Copied Invitation!" : "📋 Copy Invitation Message"}
            </button>
          </div>

          <Link href="/" style={{ display: "inline-block", background: PRIMARY, color: "white", textDecoration: "none", padding: "0.75rem 1.5rem", borderRadius: "10px", fontWeight: 700, fontSize: "0.875rem", width: "100%", boxSizing: "border-box", transition: "background 0.2s" }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "450px", width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#0f172a", marginBottom: "0.5rem", letterSpacing: "-0.025em" }}>
            LIFE Group Registration
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9375rem", margin: 0 }}>
            Connect, grow, and build meaningful relationships with our church family.
          </p>
        </div>

        {/* Form Card */}
        <div style={{ background: "white", borderRadius: "20px", padding: "2.25rem 2rem", boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#b91c1c", marginBottom: "1.25rem", fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Age
              </label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                required
                min="1"
                max="120"
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label htmlFor="phone" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Mobile Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 09171234567"
                required
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
              />
            </div>

            {/* LIFE Group Goal / Preference Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                My Goal in LIFE Group
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {/* Option 1: Want to be discipled */}
                <div
                  onClick={() => setRolePreference("discipled")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRolePreference("discipled"); } }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                    padding: "0.875rem 1rem",
                    borderRadius: "12px",
                    border: rolePreference === "discipled" ? `2px solid ${PRIMARY}` : "1.5px solid #e2e8f0",
                    background: rolePreference === "discipled" ? "#f0fbfd" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: rolePreference === "discipled" ? "0 2px 8px rgba(78, 177, 203, 0.12)" : "none",
                    userSelect: "none"
                  }}
                >
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: rolePreference === "discipled" ? `6px solid ${PRIMARY}` : "2px solid #cbd5e1",
                    background: "white",
                    marginTop: "2px",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                    boxSizing: "border-box"
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "1.05rem" }}>🌱</span>
                      <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: rolePreference === "discipled" ? "#0f172a" : "#334155" }}>
                        I want to be discipled
                      </span>
                    </div>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                      I want to learn, grow in faith, and be mentored in a small group.
                    </p>
                  </div>
                </div>

                {/* Option 2: Want to be a discipler */}
                <div
                  onClick={() => setRolePreference("discipler")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setRolePreference("discipler"); } }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.875rem",
                    padding: "0.875rem 1rem",
                    borderRadius: "12px",
                    border: rolePreference === "discipler" ? `2px solid ${PRIMARY}` : "1.5px solid #e2e8f0",
                    background: rolePreference === "discipler" ? "#f0fbfd" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: rolePreference === "discipler" ? "0 2px 8px rgba(78, 177, 203, 0.12)" : "none",
                    userSelect: "none"
                  }}
                >
                  <div style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: rolePreference === "discipler" ? `6px solid ${PRIMARY}` : "2px solid #cbd5e1",
                    background: "white",
                    marginTop: "2px",
                    flexShrink: 0,
                    transition: "all 0.15s ease",
                    boxSizing: "border-box"
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "1.05rem" }}>📖</span>
                      <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: rolePreference === "discipler" ? "#0f172a" : "#334155" }}>
                        I want to be a discipler
                      </span>
                    </div>
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                      I want to mentor, facilitate, and help disciple others in their walk.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Area Dropdown */}
            <div>
              <label htmlFor="area" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Area
              </label>
              <select
                id="area"
                value={areaOption}
                onChange={(e) => setAreaOption(e.target.value)}
                required
                style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9375rem", outline: "none", background: "white", boxSizing: "border-box", transition: "border-color 0.2s" }}
              >
                <option value="">Select your area</option>
                <option value="Central Davao (Bajada, Boulevard, Lanang)">Central Davao (Bajada, Boulevard, Lanang)</option>
                <option value="North Davao (Agdao, Buhangin, Bunawan, & Rural North)">North Davao (Agdao, Buhangin, Bunawan, & Rural North)</option>
                <option value="South & West Davao (Toril, Mintal, Calinan, & Highlands)">South & West Davao (Toril, Mintal, Calinan, & Highlands)</option>
                <option value="Others">Others (Please specify below)</option>
              </select>
            </div>

            {/* Others Input */}
            {areaOption === "Others" && (
              <div style={{ transition: "all 0.2s" }}>
                <label htmlFor="otherArea" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Specify Area Details
                </label>
                <input
                  id="otherArea"
                  type="text"
                  value={otherArea}
                  onChange={(e) => setOtherArea(e.target.value)}
                  placeholder="e.g. Maa, Matina, Shrine Hills"
                  required
                  style={{ width: "100%", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9375rem", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", background: PRIMARY, color: "white", padding: "0.875rem", borderRadius: "10px", border: "none", fontSize: "0.9375rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem", transition: "opacity 0.2s" }}
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
