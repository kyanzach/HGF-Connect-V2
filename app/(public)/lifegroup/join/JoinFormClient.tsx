"use client";

import React, { useState } from "react";
import Link from "next/link";

const PRIMARY = "#4eb1cb";

export default function JoinFormClient() {
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [areaOption, setAreaOption] = useState("");
  const [otherArea, setOtherArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!age) return setError("Please enter your age.");
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
              <span>📍</span>
              <span><strong>Area Assigned:</strong> {areaOption === "Others" ? otherArea : areaOption}</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span>👥</span>
              <span><strong>Next Step:</strong> You will be added to a local community group.</span>
            </div>
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
