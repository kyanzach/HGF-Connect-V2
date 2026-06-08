"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

const PRIMARY = "#4EB1CB";

interface MatchedAccount {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  birthdate: string | null;
  profilePicture: string | null;
}

export default function AiHelpPage() {
  const router = useRouter();
  
  // Wizard steps: 'input' | 'select' | 'otp' | 'success'
  const [step, setStep] = useState<"input" | "select" | "otp" | "success">("input");
  
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  // Backend search results
  const [accounts, setAccounts] = useState<MatchedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MatchedAccount | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Temporary credentials returned on success
  const [recoveredUsername, setRecoveredUsername] = useState("");

  // Step 1: Search Accounts
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !birthdate) {
      setError("Please fill out your first name, last name, and birthdate.");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/retrieve-account/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, birthdate, phone }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      
      const found = data.accounts || [];
      setAccounts(found);
      
      if (found.length === 0) {
        setError("No matching accounts found. Please double-check your spelling and birthday.");
      } else if (found.length === 1) {
        // Only one account matches, select it and move to OTP step
        setSelectedAccount(found[0]);
        setStep("otp");
      } else {
        // Multiple matches, let user select
        setStep("select");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while searching. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: User selects their account
  function selectAccount(account: MatchedAccount) {
    setSelectedAccount(account);
    setStep("otp");
  }

  // Step 3: Trigger OTP SMS
  async function sendOtp() {
    if (!selectedAccount) return;
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/auth/retrieve-account/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedAccount.id }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP.");
      
      // Move to entering OTP
      setError("");
    } catch (err: any) {
      setError(err.message || "Could not send OTP code. Please verify your mobile number.");
    } finally {
      setLoading(false);
    }
  }

  // Step 4: Verify OTP & Perform Merge & Reset Password
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || !selectedAccount) return;
    
    setError("");
    setLoading(true);
    
    try {
      // Find duplicate IDs to merge (all matched accounts except the selected one)
      const duplicateIds = accounts
        .filter(acc => acc.id !== selectedAccount.id)
        .map(acc => acc.id);

      const res = await fetch("/api/auth/retrieve-account/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedAccount.id,
          otpCode,
          duplicateIds,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      
      setRecoveredUsername(data.username || selectedAccount.username);
      
      // Successfully reset and merged, now trigger auto-login
      const loginRes = await signIn("credentials", {
        memberId: String(selectedAccount.id),
        otpVerified: "true",
        redirect: false,
      });
      
      if (loginRes?.error) {
        throw new Error("Reset succeeded, but automatic login failed. Please sign in manually.");
      }
      
      // Save PWA just-logged-in flag
      sessionStorage.setItem("hgf-just-logged-in", "1");
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Invalid OTP code. Please check and try again.");
    } finally {
      setLoading(false);
    }
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
          padding: "2.25rem",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
        }}
      >
        {/* Assistant Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#ecfeff",
              border: `2px solid ${PRIMARY}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 0.75rem",
              fontSize: "1.5rem",
            }}
          >
            🤖
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 800, color: "#0f172a", marginBottom: "0.25rem" }}>
            AI Account Recovery
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.4 }}>
            {step === "input" && "Hi! Let me help you retrieve your credentials. Enter your personal details below to locate your account."}
            {step === "select" && "I found multiple matching accounts. Please select which one represents your actual profile."}
            {step === "otp" && "We need to send a secure verification code to confirm your ownership."}
            {step === "success" && "Fantastic! Your account has been verified and duplicates have been successfully merged."}
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
              fontSize: "0.85rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Input Form */}
        {step === "input" && (
          <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="e.g. Juan"
                style={inputStyle}
              />
            </div>
            
            <div>
              <label style={labelStyle}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="e.g. Dela Cruz"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Birthdate</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Mobile Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 09171234567"
                style={inputStyle}
              />
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "0.25rem" }}>
                Enter this to help us match and verify your account.
              </span>
            </div>

            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? "Searching profiles..." : "Find My Account"}
            </button>
          </form>
        )}

        {/* Step 2: Duplicate / Multiple selection */}
        {step === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {accounts.map((acc) => (
              <div
                key={acc.id}
                onClick={() => selectAccount(acc)}
                style={{
                  padding: "1rem",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = PRIMARY;
                  e.currentTarget.style.background = "#f0fdfa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.background = "white";
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: `${PRIMARY}20`,
                    color: PRIMARY,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.95rem",
                    overflow: "hidden",
                  }}
                >
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  ) : (
                    `${acc.firstName[0]}${acc.lastName[0]}`.toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                    {acc.firstName} {acc.lastName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.15rem" }}>
                    Username: {acc.username ? `${acc.username.slice(0, 2)}***` : "Not set"} · Mobile: {acc.phone ? `${acc.phone.slice(0, 4)}***${acc.phone.slice(-3)}` : "None"}
                  </div>
                </div>
                <span style={{ fontSize: "1.2rem", color: PRIMARY }}>➔</span>
              </div>
            ))}
            
            <button
              onClick={() => {
                setStep("input");
                setAccounts([]);
                setError("");
              }}
              style={{
                marginTop: "0.5rem",
                background: "transparent",
                border: "1.5px solid #cbd5e1",
                color: "#64748b",
                borderRadius: "8px",
                padding: "0.75rem",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              Back & Try Search Again
            </button>
          </div>
        )}

        {/* Step 3 & 4: OTP Verification */}
        {step === "otp" && selectedAccount && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "1rem", border: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>
                Selected Account:
              </div>
              <div style={{ fontSize: "0.9rem", color: "#475569", marginTop: "0.25rem" }}>
                {selectedAccount.firstName} {selectedAccount.lastName}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem" }}>
                Phone number: {selectedAccount.phone ? `${selectedAccount.phone.slice(0, 4)}*******${selectedAccount.phone.slice(-3)}` : "None"}
              </div>
            </div>

            {!selectedAccount.phone ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                  ⚠️ Mobile Number Missing
                </div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4, margin: "0 0 1rem" }}>
                  This profile does not have a mobile number linked. We cannot send an OTP code for verification. Please contact your church administrator to manually recover this account.
                </p>
                <button
                  onClick={() => { setStep("input"); setSelectedAccount(null); }}
                  style={{ width: "100%", padding: "0.75rem", background: PRIMARY, color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
                >
                  Search Again
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    onClick={sendOtp}
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      background: loading ? "#cbd5e1" : PRIMARY,
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Sending Code..." : "✉️ Send OTP to Mobile"}
                  </button>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                    <label style={labelStyle}>Enter 6-Digit OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      required
                      placeholder="e.g. 123456"
                      style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.5rem", fontSize: "1.25rem", fontWeight: 800 }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      background: loading || otpCode.length !== 6 ? "#94a3b8" : "linear-gradient(135deg, #10b981, #059669)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      cursor: loading || otpCode.length !== 6 ? "not-allowed" : "pointer",
                    }}
                  >
                    {loading ? "Verifying & Merging..." : "Confirm Code & Access Account"}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Step 5: Success Screen */}
        {step === "success" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", margin: "0.5rem 0" }}>🎉</div>
            
            <div style={{ background: "#ecfeff", border: `1px solid ${PRIMARY}30`, borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                Your Recovered Username
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: "0.25rem 0 0.75rem" }}>
                {recoveredUsername}
              </div>
              
              <div style={{ fontSize: "0.8rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                Temporary Password Set
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#10b981", margin: "0.25rem 0" }}>
                Godisgood
              </div>
            </div>

            <p style={{ fontSize: "0.825rem", color: "#64748b", lineHeight: 1.4 }}>
              You are now **automatically logged in**! Any duplicate accounts found with your name have been merged. Your posts, comments, likes, and listings are fully preserved.
            </p>

            <Link
              href="/profile/edit?tab=security"
              style={{
                display: "block",
                width: "100%",
                padding: "0.9rem",
                background: PRIMARY,
                color: "white",
                borderRadius: "8px",
                fontWeight: 700,
                textDecoration: "none",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              🔒 Change Password Now
            </Link>
          </div>
        )}

        {/* Footer */}
        {step !== "success" && (
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <Link href="/login" style={{ color: "#94a3b8", fontSize: "0.8125rem", textDecoration: "none" }}>
              ← Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "0.375rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.9375rem",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem",
  background: `linear-gradient(135deg, ${PRIMARY}, #3a95ad)`,
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "1rem",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: "0.5rem",
};
