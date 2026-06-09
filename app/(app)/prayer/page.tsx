"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PrayCommitModal from "@/components/prayer/PrayCommitModal";
import ConfirmModal from "@/components/ConfirmModal";

const PRIMARY = "#4EB1CB";

interface PrayerRequest {
  id: number;
  request: string;
  isAnswered: boolean;
  prayerCount: number;
  createdAt: string;
  author: { id: number; firstName: string; lastName: string; profilePicture?: string | null };
  _count: { responses: number };
  photos?: { id: number; photoPath: string; sortOrder: number }[];
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PrayerWallContent() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ? parseInt(session.user.id) : null;
  const searchParams = useSearchParams();
  const mine = searchParams.get("mine") === "true";

  const [tab, setTab] = useState<"active" | "answered">("active");
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // Deletion Modal State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<PrayerRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pray Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PrayerRequest | null>(null);

  const highlightParam = searchParams.get("highlight");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const load = useCallback(async (t: "active" | "answered") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prayer?tab=${t}${mine ? "&mine=true" : ""}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [mine]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const prayId = searchParams.get("pray");
  const hasAutoOpened = useRef(false);

  useEffect(() => {
    if (prayId && !hasAutoOpened.current) {
      const id = parseInt(prayId);
      if (!isNaN(id)) {
        const found = requests.find((r) => r.id === id);
        if (found) {
          hasAutoOpened.current = true;
          setSelectedRequest(found);
          setModalOpen(true);
          const url = new URL(window.location.href);
          url.searchParams.delete("pray");
          window.history.replaceState({}, "", url.toString());
        } else if (!loading) {
          hasAutoOpened.current = true;
          fetch(`/api/prayer/${id}`)
            .then((res) => {
              if (!res.ok) throw new Error();
              return res.json();
            })
            .then((data) => {
              if (data.prayer) {
                setSelectedRequest(data.prayer);
                setModalOpen(true);
              }
              const url = new URL(window.location.href);
              url.searchParams.delete("pray");
              window.history.replaceState({}, "", url.toString());
            })
            .catch((err) => {
              console.error("Failed to load deep-linked prayer request", err);
              const url = new URL(window.location.href);
              url.searchParams.delete("pray");
              window.history.replaceState({}, "", url.toString());
            });
        }
      }
    }
  }, [prayId, requests, loading]);

  useEffect(() => {
    if (highlightParam) {
      const id = parseInt(highlightParam, 10);
      if (!isNaN(id)) {
        setHighlightedId(id);
        const url = new URL(window.location.href);
        url.searchParams.delete("highlight");
        window.history.replaceState({}, "", url.toString());

        // Attempt scrolling
        setTimeout(() => {
          const element = document.getElementById(`prayer-req-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);

        const timer = setTimeout(() => {
          setHighlightedId(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [highlightParam]);

  // Handle marking request as answered / active toggle
  async function handleToggleAnswered(req: PrayerRequest) {
    try {
      const newStatus = !req.isAnswered;
      const res = await fetch(`/api/prayer/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnswered: newStatus }),
      });
      if (res.ok) {
        // Remove from list since the tab switched
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    }
  }

  // Handle saving the updated request text
  async function handleSaveEdit(id: number) {
    if (!editingText.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/prayer/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: editingText }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, request: editingText } : r))
        );
        setEditingId(null);
      } else {
        alert("Failed to save changes.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setSavingId(null);
    }
  }

  // Handle deleting the request
  async function handleDeleteConfirm() {
    if (!requestToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/prayer/${requestToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestToDelete.id));
        setDeleteConfirmOpen(false);
        setRequestToDelete(null);
      } else {
        alert("Failed to delete request.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setDeleting(false);
    }
  }

  function openPrayModal(req: PrayerRequest) {
    setSelectedRequest(req);
    setModalOpen(true);
  }

  function handlePrayed() {
    if (selectedRequest) {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, prayerCount: r.prayerCount + 1, _count: { responses: r._count.responses + 1 } }
            : r
        )
      );
    }
  }

  return (
    <div style={{ paddingBottom: "1rem" }}>
      <style>{`
        @keyframes glow-pulsate {
          0% {
            box-shadow: 0 0 5px rgba(168, 85, 247, 0.4), 0 1px 4px rgba(0,0,0,0.07);
            border-color: rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.8), 0 1px 4px rgba(0,0,0,0.07);
            border-color: rgba(168, 85, 247, 0.8);
            background-color: rgba(168, 85, 247, 0.05);
          }
          100% {
            box-shadow: 0 0 5px rgba(168, 85, 247, 0.4), 0 1px 4px rgba(0,0,0,0.07);
            border-color: rgba(168, 85, 247, 0.4);
          }
        }
        .prayer-highlighted {
          animation: glow-pulsate 1.5s infinite ease-in-out;
          border: 2px solid #a855f7 !important;
        }
      `}</style>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
          padding: "1.25rem 1rem",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.25rem" }}>🙏</div>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 800, margin: "0 0 0.25rem" }}>
          {mine ? "My Prayer Requests" : "Prayer Wall"}
        </h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: 0 }}>
          {mine ? "Manage your personal active and answered prayer requests" : "Stand together in prayer for one another"}
        </p>
        <Link
          href="/feed/create?tab=prayer"
          style={{
            display: "inline-block",
            marginTop: "0.875rem",
            background: "white",
            color: "#7c3aed",
            padding: "0.45rem 1.25rem",
            borderRadius: "999px",
            fontSize: "0.8125rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Submit Prayer Request
        </Link>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {(["active", "answered"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "none",
              borderBottom: tab === t ? `2.5px solid #7c3aed` : "2.5px solid transparent",
              background: "none",
              fontSize: "0.875rem",
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "#7c3aed" : "#64748b",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t === "active" ? "🔴 Active" : "✅ Answered"}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "0.875rem 1rem 0" }}>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "1rem",
                marginBottom: "0.75rem",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, marginBottom: 8, width: "40%" }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, marginBottom: 6 }} />
              <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "70%" }} />
            </div>
          ))
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🙏</div>
            <p style={{ fontSize: "0.9rem" }}>
              {mine
                ? (tab === "active" ? "You have no active prayer requests." : "You have no answered prayer requests yet.")
                : (tab === "active" ? "No active prayer requests. Be the first to share!" : "No answered prayers yet. Keep praying!")
              }
            </p>
          </div>
        ) : (
          requests.map((req) => {
            const isMine = currentUserId !== null && req.author.id === currentUserId;
            const isEditing = editingId === req.id;

            const isHighlighted = highlightedId === req.id;

            return (
              <div
                key={req.id}
                id={`prayer-req-${req.id}`}
                className={isHighlighted ? "prayer-highlighted" : ""}
                style={{
                  background: "white",
                  borderRadius: "16px",
                  marginBottom: "0.75rem",
                  padding: "1rem",
                  boxShadow: isHighlighted ? "0 0 20px rgba(168, 85, 247, 0.8), 0 1px 4px rgba(0,0,0,0.07)" : "0 1px 4px rgba(0,0,0,0.07)",
                  border: isHighlighted ? "2px solid #a855f7" : "2px solid transparent",
                  transition: "all 0.3s ease-in-out",
                }}
              >
                {/* Author + time */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
                  {req.author.profilePicture ? (
                    <img
                      src={`/uploads/profile_pictures/${req.author.profilePicture}`}
                      alt=""
                      style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: "50%", background: "#a855f7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontSize: "0.8rem", fontWeight: 700, flexShrink: 0,
                      }}
                    >
                      {req.author.firstName[0]}{req.author.lastName[0]}
                    </div>
                  )}
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>
                      {req.author.firstName} {req.author.lastName}
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginLeft: "0.5rem" }}>
                      {timeAgo(req.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Prayer request text or editor */}
                {isEditing ? (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%",
                        border: "1.5px solid #a855f7",
                        borderRadius: "10px",
                        padding: "0.625rem",
                        fontSize: "0.9rem",
                        fontFamily: "inherit",
                        resize: "none",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button
                        onClick={() => handleSaveEdit(req.id)}
                        disabled={savingId === req.id}
                        style={{
                          padding: "0.45rem 1rem",
                          background: PRIMARY,
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {savingId === req.id ? "Saving..." : "💾 Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={savingId === req.id}
                        style={{
                          padding: "0.45rem 1rem",
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.65, margin: "0 0 0.75rem", whiteSpace: "pre-line" }}>
                    {req.request}
                  </p>
                )}

                {/* Photos */}
                {req.photos && req.photos.length > 0 && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          req.photos.length === 1
                            ? "1fr"
                            : req.photos.length === 2
                            ? "1fr 1fr"
                            : "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: "0.5rem",
                        borderRadius: "12px",
                        overflow: "hidden",
                      }}
                    >
                      {req.photos.map((photo: any, i: number) => (
                        <div
                          key={photo.id}
                          style={{
                            aspectRatio: req.photos?.length === 1 ? "16/10" : "1/1",
                            background: "#f1f5f9",
                            overflow: "hidden",
                            position: "relative",
                          }}
                        >
                          <img
                            src={
                              photo.photoPath.startsWith("http") || photo.photoPath.startsWith("/")
                                ? photo.photoPath
                                : `/uploads/posts/${photo.photoPath}`
                            }
                            alt={`Prayer photo ${i + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", flexWrap: "wrap" }}>
                  {isMine ? (
                    <>
                      {/* Flag as Answered/Active Toggle */}
                      <button
                        onClick={() => handleToggleAnswered(req)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.375rem",
                          padding: "0.45rem 0.875rem", background: req.isAnswered ? "#f1f5f9" : "#f0fdf4",
                          border: `1px solid ${req.isAnswered ? "#cbd5e1" : "#bbf7d0"}`, borderRadius: "999px",
                          fontSize: "0.8125rem", color: req.isAnswered ? "#475569" : "#16a34a",
                          fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        {req.isAnswered ? "🔴 Active" : "🎉 Mark Answered"}
                      </button>

                      {/* Edit Button */}
                      {!isEditing && (
                        <button
                          onClick={() => { setEditingId(req.id); setEditingText(req.request); }}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.375rem",
                            padding: "0.45rem 0.875rem", background: "#fef8e7",
                            border: "1px solid #fde68a", borderRadius: "999px",
                            fontSize: "0.8125rem", color: "#d97706",
                            fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          ✏️ Edit
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => { setRequestToDelete(req); setDeleteConfirmOpen(true); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.375rem",
                          padding: "0.45rem 0.875rem", background: "#fef2f2",
                          border: "1px solid #fecaca", borderRadius: "999px",
                          fontSize: "0.8125rem", color: "#dc2626",
                          fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => openPrayModal(req)}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.375rem",
                        padding: "0.45rem 0.875rem", background: "#f5f3ff",
                        border: "1px solid #e9d5ff", borderRadius: "999px",
                        fontSize: "0.8125rem", color: "#7c3aed", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      🙏 Pray {req.prayerCount > 0 && `· ${req.prayerCount}`}
                    </button>
                  )}
                  <Link
                    href={`/prayer/${req.id}`}
                    style={{
                      fontSize: "0.75rem", color: "#7c3aed",
                      textDecoration: "none", fontWeight: 500,
                    }}
                  >
                    💬 {req._count.responses} responses →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Prayer commit modal */}
      {selectedRequest && (
        <PrayCommitModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onPrayed={handlePrayed}
          requestId={selectedRequest.id}
          authorName={`${selectedRequest.author.firstName} ${selectedRequest.author.lastName}`}
          requestText={selectedRequest.request}
        />
      )}

      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <ConfirmModal
          open={deleteConfirmOpen}
          title="Delete Prayer Request"
          message="Are you sure you want to permanently delete this prayer request? This action cannot be undone."
          confirmLabel="Delete"
          confirmColor="#ef4444"
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteConfirmOpen(false); setRequestToDelete(null); }}
        />
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </div>
  );
}

export default function PrayerWallPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading page...</div>}>
      <PrayerWallContent />
    </Suspense>
  );
}
