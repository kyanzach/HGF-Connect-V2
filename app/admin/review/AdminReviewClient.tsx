"use client";
import { useState } from "react";
import Link from "next/link";

const P = "#4EB1CB";

type PendingMember = {
  id: number; firstName: string; lastName: string; email: string | null; phone: string | null;
  type: string; ageGroup: string | null; joinDate: string | null; invitedBy: string | null;
  createdAt: string; address: string | null;
  ministries: { ministry: { name: string } }[];
};

export default function AdminReviewClient({ pending: init }: { pending: PendingMember[] }) {
  const [pending, setPending] = useState(init);
  const [processing, setProcessing] = useState<number | null>(null);

  async function approve(id: number) {
    setProcessing(id);
    const res = await fetch(`/api/members/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) });
    if (res.ok) setPending(prev => prev.filter(m => m.id !== id));
    setProcessing(null);
  }

  async function reject(id: number) {
    if (!confirm("Reject and delete this registration?")) return;
    setProcessing(id);
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) setPending(prev => prev.filter(m => m.id !== id));
    setProcessing(null);
  }

  if (pending.length === 0) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>All caught up!</h2>
        <p style={{ color: "#64748b" }}>No pending member registrations.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>⏳ Review Pending</h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{pending.length} registration{pending.length !== 1 ? "s" : ""} awaiting approval</p>
      </div>
      <div style={{ display: "grid", gap: "1rem" }}>
        {pending.map(m => (
          <div key={m.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #fed7aa", padding: "1.25rem", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>{m.firstName} {m.lastName}</h3>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#fef3c7", color: "#d97706", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{m.type}</span>
                  {m.ageGroup && <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{m.ageGroup}</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.375rem", fontSize: "0.825rem", color: "#64748b" }}>
                  {m.email && <div>✉️ {m.email}</div>}
                  {m.phone && <div>📞 {m.phone}</div>}
                  {m.address && <div>📍 {m.address}</div>}
                  {m.invitedBy && <div>👥 Invited by {m.invitedBy}</div>}
                  {m.joinDate && <div>📅 Join date: {new Date(m.joinDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</div>}
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Registered {new Date(m.createdAt).toLocaleDateString("en-PH")}</div>
                </div>
                {m.ministries.length > 0 && (
                  <div style={{ marginTop: "0.625rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                    {m.ministries.map((mm, i) => <span key={i} style={{ fontSize: "0.7rem", background: P, color: "white", padding: "0.15rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>{mm.ministry.name}</span>)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <Link href={`/member/${m.id}`} style={{ padding: "0.5rem 0.875rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", color: "#475569", textDecoration: "none", fontSize: "0.8rem", fontWeight: 700 }}>View</Link>
                <button
                  onClick={() => approve(m.id)} disabled={processing === m.id}
                  style={{ padding: "0.5rem 0.875rem", border: "none", borderRadius: "8px", background: "#10b981", color: "white", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: processing === m.id ? 0.6 : 1 }}>
                  ✅ Approve
                </button>
                <button
                  onClick={() => reject(m.id)} disabled={processing === m.id}
                  style={{ padding: "0.5rem 0.875rem", border: "1.5px solid #fee2e2", borderRadius: "8px", background: "#fef2f2", color: "#ef4444", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", opacity: processing === m.id ? 0.6 : 1 }}>
                  ✗ Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
