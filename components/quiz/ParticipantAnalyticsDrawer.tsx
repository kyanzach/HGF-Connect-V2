"use client";

import React, { useState, useEffect, useMemo } from "react";

interface DayProgress {
  dayNumber: number;
  completed: boolean;
  isCorrect: boolean;
  score: number;
  submittedAt: string | null;
}

interface Participant {
  memberId: number;
  name: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  maskedPhone: string;
  ministries: string[];
  daysCompleted: number;
  isCompleted: boolean;
  totalScore: number;
  rewardTier: "PERFECT" | "EXCELLENT" | "GOOD" | "PARTICIPANT";
  dayProgress: DayProgress[];
  firstSubmittedAt: string | null;
  lastSubmittedAt: string | null;
  isCatchup: boolean;
  claimStatus: string;
}

interface QuizAnalyticsData {
  quiz: {
    id: number;
    title: string;
    sermonDate: string;
    status: string;
    totalQuestions: number;
  };
  summary: {
    totalParticipants: number;
    totalSubmissions: number;
    completedCount: number;
    completionRate: number;
    perfectScoreCount: number;
    averageScore: number;
    tierDistribution: {
      PERFECT: number;
      EXCELLENT: number;
      GOOD: number;
      PARTICIPANT: number;
    };
    dayDropoff: Array<{
      dayNumber: number;
      participants: number;
      correctCount: number;
      accuracyRate: number;
    }>;
  };
  participants: Participant[];
}

interface Props {
  quizId: number | null;
  quizTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  PERFECT: { bg: "#fef3c7", text: "#b45309", border: "#fde68a", emoji: "🏆" },
  EXCELLENT: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", emoji: "🌟" },
  GOOD: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0", emoji: "👏" },
  PARTICIPANT: { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb", emoji: "🙏" },
};

export default function ParticipantAnalyticsDrawer({ quizId, quizTitle, isOpen, onClose }: Props) {
  const [data, setData] = useState<QuizAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "PERFECT">("ALL");
  const [nudging, setNudging] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const [nudgingMemberId, setNudgingMemberId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !quizId) return;

    setLoading(true);
    setError(null);
    setNudgeMessage(null);

    fetch(`/api/quiz/admin/participants?quizId=${quizId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load participant data");
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        console.error("Error loading analytics:", err);
        setError(err.message || "Could not fetch participants");
      })
      .finally(() => setLoading(false));
  }, [isOpen, quizId]);

  // Lock body scroll on mount
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("hgf-modal-open");
    } else {
      document.body.classList.remove("hgf-modal-open");
    }
    return () => {
      document.body.classList.remove("hgf-modal-open");
    };
  }, [isOpen]);

  const filteredParticipants = useMemo(() => {
    if (!data?.participants) return [];
    return data.participants.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.ministries.some((m) => m.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (filterTab === "COMPLETED") return p.isCompleted;
      if (filterTab === "IN_PROGRESS") return !p.isCompleted;
      if (filterTab === "PERFECT") return p.totalScore >= (data.quiz.totalQuestions || 7);

      return true;
    });
  }, [data, search, filterTab]);

  const inProgressCount = useMemo(() => {
    if (!data?.participants) return 0;
    return data.participants.filter((p) => !p.isCompleted).length;
  }, [data]);

  async function handleNudge(targetMemberId?: number) {
    if (!quizId) return;
    if (targetMemberId) {
      setNudgingMemberId(targetMemberId);
    } else {
      setNudging(true);
    }
    setNudgeMessage(null);

    try {
      const res = await fetch("/api/quiz/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          targetMemberId: targetMemberId || null,
          nudgeAllInProgress: !targetMemberId,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to send nudge");
      setNudgeMessage(`✅ ${resData.message}`);
      setTimeout(() => setNudgeMessage(null), 4000);
    } catch (err: any) {
      setNudgeMessage(`❌ Error: ${err.message}`);
    } finally {
      setNudging(false);
      setNudgingMemberId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "stretch",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          background: "#ffffff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 25px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  background: "rgba(78, 177, 203, 0.2)",
                  color: "#4EB1CB",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                📊 Participant Analytics
              </span>
              {data?.quiz.status && (
                <span
                  style={{
                    background: data.quiz.status === "published" ? "#10b981" : "#64748b",
                    color: "#ffffff",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {data.quiz.status}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#f8fafc" }}>
              {quizTitle || data?.quiz.title || "Quiz for Christ"}
            </h2>
            {data?.quiz.sermonDate && (
              <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Sermon Date: {new Date(data.quiz.sermonDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#e2e8f0",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            title="Close Drawer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", background: "#f8fafc" }}>
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#64748b" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #e2e8f0",
                  borderTopColor: "#4EB1CB",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 16px",
                }}
              />
              <div style={{ fontWeight: 600 }}>Loading participant breakdown & score progression...</div>
            </div>
          ) : error ? (
            <div
              style={{
                padding: "20px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                color: "#b91c1c",
                fontSize: "0.9rem",
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          ) : !data ? null : (
            <>
              {/* Notification Message Alert */}
              {nudgeMessage && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: nudgeMessage.startsWith("✅") ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${nudgeMessage.startsWith("✅") ? "#a7f3d0" : "#fecaca"}`,
                    color: nudgeMessage.startsWith("✅") ? "#047857" : "#b91c1c",
                    borderRadius: "10px",
                    marginBottom: "16px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {nudgeMessage}
                </div>
              )}

              {/* Top Stats Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "12px",
                  marginBottom: "20px",
                }}
              >
                <div style={statCardStyle}>
                  <div style={statLabelStyle}>👥 Participants</div>
                  <div style={statValueStyle}>{data.summary.totalParticipants}</div>
                  <div style={statSubStyle}>{data.summary.totalSubmissions} answers total</div>
                </div>

                <div style={statCardStyle}>
                  <div style={statLabelStyle}>🏁 Completed (7/7)</div>
                  <div style={{ ...statValueStyle, color: "#10b981" }}>
                    {data.summary.completedCount}
                  </div>
                  <div style={statSubStyle}>{data.summary.completionRate}% completion rate</div>
                </div>

                <div style={statCardStyle}>
                  <div style={statLabelStyle}>🏆 Perfect Scores</div>
                  <div style={{ ...statValueStyle, color: "#f59e0b" }}>
                    {data.summary.perfectScoreCount}
                  </div>
                  <div style={statSubStyle}>7/7 correct answers</div>
                </div>

                <div style={statCardStyle}>
                  <div style={statLabelStyle}>📊 Avg. Score</div>
                  <div style={statValueStyle}>
                    {data.summary.averageScore} <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>/ 7</span>
                  </div>
                  <div style={statSubStyle}>overall performance</div>
                </div>
              </div>

              {/* Day-by-Day Drop-off & Funnel */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "16px 20px",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#1e293b" }}>
                      📅 Day-by-Day Participation & Accuracy
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      How many members answered each daily challenge and their accuracy rate
                    </span>
                  </div>
                  {inProgressCount > 0 && (
                    <button
                      onClick={() => handleNudge()}
                      disabled={nudging}
                      style={{
                        background: "linear-gradient(135deg, #4EB1CB 0%, #38A89D 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "7px 13px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: nudging ? "not-allowed" : "pointer",
                        opacity: nudging ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(78, 177, 203, 0.25)",
                      }}
                      title="Send in-app reminder to members with unfinished quizzes"
                    >
                      <span>🔔</span>
                      <span>{nudging ? "Sending..." : `Nudge In-Progress (${inProgressCount})`}</span>
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "8px",
                    textAlign: "center",
                  }}
                >
                  {data.summary.dayDropoff.map((d) => {
                    const maxCount = Math.max(...data.summary.dayDropoff.map((item) => item.participants), 1);
                    const barHeightPct = Math.max(Math.round((d.participants / maxCount) * 100), 12);
                    return (
                      <div
                        key={d.dayNumber}
                        style={{
                          background: "#f8fafc",
                          borderRadius: "10px",
                          padding: "10px 6px",
                          border: "1px solid #edf2f7",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "space-between",
                          minHeight: "125px",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#475569" }}>
                          Day {d.dayNumber}
                        </span>

                        {/* Bar representation */}
                        <div
                          style={{
                            width: "100%",
                            height: "55px",
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center",
                            margin: "4px 0",
                          }}
                        >
                          <div
                            style={{
                              width: "18px",
                              height: `${barHeightPct}%`,
                              background: "linear-gradient(180deg, #4EB1CB 0%, #38A89D 100%)",
                              borderRadius: "4px 4px 0 0",
                              transition: "height 0.4s ease",
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>
                            {d.participants}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: d.accuracyRate >= 70 ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                            {d.accuracyRate}% acc
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Roster & Participant Breakdown */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  padding: "18px 20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {/* Search & Filter Tabs */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {[
                      { key: "ALL", label: `All (${data.summary.totalParticipants})` },
                      { key: "COMPLETED", label: `Completed (${data.summary.completedCount})` },
                      { key: "IN_PROGRESS", label: `In Progress (${inProgressCount})` },
                      { key: "PERFECT", label: `🏆 Perfect (${data.summary.perfectScoreCount})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setFilterTab(tab.key as any)}
                        style={{
                          background: filterTab === tab.key ? "#0f172a" : "#f1f5f9",
                          color: filterTab === tab.key ? "#ffffff" : "#475569",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ position: "relative", minWidth: "220px", flex: "1 1 200px" }}>
                    <input
                      type="text"
                      placeholder="Search member name or ministry..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 12px 7px 32px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        outline: "none",
                      }}
                    />
                    <span style={{ position: "absolute", left: "10px", top: "7px", fontSize: "0.85rem", color: "#94a3b8" }}>
                      🔍
                    </span>
                  </div>
                </div>

                {/* Table of Members */}
                {filteredParticipants.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                    No participants found matching the selected filter.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                          <th style={{ padding: "10px 8px", fontWeight: 700 }}>MEMBER</th>
                          <th style={{ padding: "10px 8px", fontWeight: 700, textAlign: "center" }}>DAY PROGRESS</th>
                          <th style={{ padding: "10px 8px", fontWeight: 700, textAlign: "center" }}>SCORE</th>
                          <th style={{ padding: "10px 8px", fontWeight: 700, textAlign: "center" }}>TIER</th>
                          <th style={{ padding: "10px 8px", fontWeight: 700, textAlign: "center" }}>LAST ACTIVE</th>
                          <th style={{ padding: "10px 8px", fontWeight: 700, textAlign: "right" }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredParticipants.map((p) => {
                          const tier = TIER_COLORS[p.rewardTier] || TIER_COLORS.PARTICIPANT;
                          return (
                            <tr
                              key={p.memberId}
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                transition: "background 0.15s ease",
                              }}
                            >
                              {/* Member Info */}
                              <td style={{ padding: "12px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  {p.photoUrl ? (
                                    <img
                                      src={p.photoUrl.startsWith("http") ? p.photoUrl : `/uploads/${p.photoUrl}`}
                                      alt={p.name}
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                        border: "1px solid #cbd5e1",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, #4EB1CB 0%, #38A89D 100%)",
                                        color: "#ffffff",
                                        fontWeight: 800,
                                        fontSize: "0.85rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      {p.firstName[0] || "M"}
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                                      {p.name}
                                      {p.isCatchup && (
                                        <span
                                          style={{
                                            marginLeft: "6px",
                                            background: "#f1f5f9",
                                            color: "#475569",
                                            fontSize: "0.68rem",
                                            padding: "2px 5px",
                                            borderRadius: "4px",
                                            fontWeight: 600,
                                          }}
                                        >
                                          Catch-Up
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                      {p.ministries.length > 0 ? p.ministries.join(", ") : p.maskedPhone || "Member"}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Day Progress Visual Dots */}
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                <div style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                                  {p.dayProgress.map((dp) => {
                                    let bg = "#e2e8f0";
                                    let text = "○";
                                    let color = "#94a3b8";

                                    if (dp.completed) {
                                      if (dp.isCorrect) {
                                        bg = "#dcfce7";
                                        text = "✓";
                                        color = "#16a34a";
                                      } else {
                                        bg = "#fee2e2";
                                        text = "✕";
                                        color = "#dc2626";
                                      }
                                    }

                                    return (
                                      <div
                                        key={dp.dayNumber}
                                        style={{
                                          width: "22px",
                                          height: "22px",
                                          borderRadius: "6px",
                                          background: bg,
                                          color: color,
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "0.72rem",
                                          fontWeight: 800,
                                        }}
                                        title={`Day ${dp.dayNumber}: ${
                                          dp.completed
                                            ? dp.isCorrect
                                              ? "Correct (1 pt)"
                                              : "Incorrect (0 pt)"
                                            : "Pending"
                                        }`}
                                      >
                                        {text}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                                  {p.daysCompleted}/{data.quiz.totalQuestions} Days
                                </div>
                              </td>

                              {/* Total Score */}
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                                  {p.totalScore}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                  /{data.quiz.totalQuestions}
                                </span>
                              </td>

                              {/* Tier Badge */}
                              <td style={{ padding: "12px 8px", textAlign: "center" }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "3px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    background: tier.bg,
                                    color: tier.text,
                                    border: `1px solid ${tier.border}`,
                                  }}
                                >
                                  {tier.emoji} {p.rewardTier}
                                </span>
                              </td>

                              {/* Last Active Date */}
                              <td style={{ padding: "12px 8px", textAlign: "center", color: "#64748b", fontSize: "0.75rem" }}>
                                {p.lastSubmittedAt ? (
                                  new Date(p.lastSubmittedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })
                                ) : (
                                  "—"
                                )}
                              </td>

                              {/* Action Button */}
                              <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                {!p.isCompleted ? (
                                  <button
                                    onClick={() => handleNudge(p.memberId)}
                                    disabled={nudgingMemberId === p.memberId}
                                    style={{
                                      background: "#f1f5f9",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: "6px",
                                      padding: "4px 8px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      color: "#334155",
                                      cursor: "pointer",
                                    }}
                                    title="Send in-app reminder to continue"
                                  >
                                    {nudgingMemberId === p.memberId ? "..." : "🔔 Nudge"}
                                  </button>
                                ) : (
                                  <span style={{ color: "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                                    ✓ Done
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "14px 16px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.3px",
  marginBottom: "4px",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "1.4rem",
  fontWeight: 900,
  color: "#0f172a",
  lineHeight: 1.1,
  marginBottom: "4px",
};

const statSubStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#94a3b8",
};
