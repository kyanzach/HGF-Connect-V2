"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPrayerPage() {
  const router = useRouter();
  const [request, setRequest] = useState("");
  const [visibility, setVisibility] = useState("MEMBERS_ONLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request.trim()) {
      setError("Please write your prayer request.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request, visibility }),
      });
      if (!res.ok) throw new Error();
      router.push("/prayer");
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", fontSize: "1.125rem", cursor: "pointer", color: "#7c3aed" }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
            🙏 Submit Prayer Request
          </h1>
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
            The community will pray with you
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "1rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "0.5rem" }}>
            Your Prayer Request
          </label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Share your prayer request with the community... 

E.g. 'Please pray for my mother who is in the hospital. Thank you for your prayers and support.'"
            rows={8}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "0.9375rem",
              color: "#1e293b",
              lineHeight: 1.7,
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <div style={{ textAlign: "right", fontSize: "0.7rem", color: request.length > 500 ? "#ef4444" : "#94a3b8" }}>
            {request.length}/500
          </div>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569" }}>🔒 Visible to</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "0.3rem 0.625rem",
              fontSize: "0.8125rem",
              color: "#1e293b",
              outline: "none",
              background: "white",
            }}
          >
            <option value="MEMBERS_ONLY">Members Only</option>
            <option value="PUBLIC">Everyone</option>
            <option value="PRIVATE">Only Me (private journal)</option>
          </select>
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting || request.trim().length === 0}
          style={{
            padding: "0.875rem",
            background: submitting ? "#94a3b8" : "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "14px",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "🙏 Submit Prayer Request"}
        </button>

        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
          Your request will be visible on the Prayer Wall for the community to pray over.
        </p>
      </form>
    </div>
  );
}
