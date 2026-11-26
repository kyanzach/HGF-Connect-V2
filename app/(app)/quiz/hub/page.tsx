"use client";

/**
 * Quiz for Christ — Thanksgiving Mystery Prize Hub & Open Quiz Explorer
 *
 * - Thanksgiving Party Mystery Prize teaser (1 Mystery Grand Prize + 4 Surprise Prizes, zero spoilers)
 * - Open Access by default: play any Sunday quiz and any of its 7 items immediately (no drip / no 1-quiz lock)
 * - Expandable 7-item preview + quick-jump item strip on every sermon quiz card
 * - Respects Admin "Drip Delay & 1-Quiz Limit" toggle if re-enabled in /quiz/admin
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ImageLightbox from "@/components/ImageLightbox";
import ConfirmModal from "@/components/ConfirmModal";
import HubLoading from "./loading";

const PRIMARY = "#4EB1CB";

interface LeaderboardEntry {
  member: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture: string | null;
  };
  score: number;
}

interface QuizItemPreview {
  questionId: number;
  dayNumber: number;
  questionType: string;
  typeLabel: string;
  difficulty: string;
  previewText: string;
  answered: boolean;
  isCorrect: boolean | null;
}

interface QuizHistoryEntry {
  id: number;
  title: string;
  sermonDate: string;
  status: string;
  played: boolean;
  score: number;
  tier: string | null;
  submissionsCount: number;
  isExpired: boolean;
  openAccess?: boolean;
  catchupStatus?: "none" | "active" | "completed" | "expired";
  catchupExpiresAt?: string | null;
  hasVideo?: boolean;
  items?: QuizItemPreview[];
}

type QuizFilter = "all" | "open" | "in_progress" | "completed";

export default function QuizHubPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"quizzes" | "leaderboard">("quizzes");
  const [quizFilter, setQuizFilter] = useState<QuizFilter>("all");
  const [expandedQuizIds, setExpandedQuizIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Leaderboard data
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);

  // Quiz list & access mode
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEntry[]>([]);
  const [openAccess, setOpenAccess] = useState<boolean>(true);

  // Catch-up briefing modal (only used when Admin enables Drip Mode)
  const [catchupModal, setCatchupModal] = useState<{
    open: boolean;
    quiz: QuizHistoryEntry | null;
    loading: boolean;
  }>({ open: false, quiz: null, loading: false });

  // Conflict modal (only used when Admin enables Drip Mode)
  const [conflictModal, setConflictModal] = useState<{
    open: boolean;
    message: string;
    activeQuizId?: number;
  }>({ open: false, message: "", activeQuizId: undefined });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "leaderboard") {
        setActiveTab("leaderboard");
      } else {
        setActiveTab("quizzes");
      }
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      Promise.all([
        fetch("/api/quiz/leaderboard").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/quiz/history").then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([leaderData, historyData]) => {
          if (leaderData) {
            setWeeklyLeaders(leaderData.weekly || []);
            setAllTimeLeaders(leaderData.allTime || []);
          }
          if (Array.isArray(historyData)) {
            setQuizHistory(historyData);
            if (historyData.length > 0 && typeof historyData[0].openAccess === "boolean") {
              setOpenAccess(historyData[0].openAccess);
            }
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load hub data:", err);
          setLoading(false);
        });
    }
  }, [authStatus]);

  // Deep link: /quiz/hub?tab=archive&quizId=N
  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const qid = Number(new URLSearchParams(window.location.search).get("quizId"));
    if (!qid) return;
    const match = quizHistory.find((w) => w.id === qid);
    if (match) {
      setActiveTab("quizzes");
      if (openAccess || !match.isExpired || match.catchupStatus === "active" || (match.submissionsCount ?? 0) >= 7) {
        router.push(`/quiz?quizId=${match.id}`);
      } else {
        setCatchupModal({ open: true, quiz: match, loading: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  if (authStatus === "loading" || loading) {
    return <HubLoading />;
  }

  function getInitials(fn: string, ln: string) {
    return `${fn[0] || ""}${ln[0] || ""}`.toUpperCase();
  }

  function toggleExpand(quizId: number) {
    setExpandedQuizIds((prev) => ({ ...prev, [quizId]: !prev[quizId] }));
  }

  function handleOpenQuiz(week: QuizHistoryEntry, dayNumber?: number) {
    const subCount = week.submissionsCount ?? 0;
    const isCompleted = subCount >= 7;
    const canEnterDirectly =
      openAccess || !week.isExpired || week.catchupStatus === "active" || isCompleted;

    if (canEnterDirectly) {
      const target = dayNumber
        ? `/quiz?quizId=${week.id}&day=${dayNumber}`
        : `/quiz?quizId=${week.id}`;
      router.push(target);
    } else {
      setCatchupModal({ open: true, quiz: week, loading: false });
    }
  }

  async function handleConfirmCatchup() {
    if (!catchupModal.quiz) return;
    setCatchupModal((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch("/api/quiz/catchup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: catchupModal.quiz.id }),
      });
      const data = await res.json();

      if (res.status === 409) {
        const activeId = data.activeQuizId;
        const msg =
          data.message ||
          "Finish your current active quiz first, then you can take another Sunday quiz right after.";
        setCatchupModal({ open: false, quiz: null, loading: false });
        setConflictModal({ open: true, message: msg, activeQuizId: activeId });
        return;
      }

      if (!res.ok) {
        setCatchupModal({ open: false, quiz: null, loading: false });
        setConflictModal({ open: true, message: data.error || "Unable to start quiz session." });
        return;
      }

      const targetQuizId = catchupModal.quiz.id;
      setCatchupModal({ open: false, quiz: null, loading: false });
      router.push(`/quiz?quizId=${targetQuizId}`);
    } catch (err) {
      console.error("Failed to start catchup:", err);
      setCatchupModal({ open: false, quiz: null, loading: false });
    }
  }

  // Personal stats across all quizzes
  const totalUserPoints = quizHistory.reduce((sum, q) => sum + (q.score || 0), 0);
  const totalAnswered = quizHistory.reduce((sum, q) => sum + (q.submissionsCount || 0), 0);
  const completedCount = quizHistory.filter((q) => (q.submissionsCount ?? 0) >= 7).length;
  const inProgressCount = quizHistory.filter(
    (q) => (q.submissionsCount ?? 0) > 0 && (q.submissionsCount ?? 0) < 7
  ).length;
  const openCount = quizHistory.filter((q) => (q.submissionsCount ?? 0) < 7).length;

  const filteredQuizzes = quizHistory.filter((week) => {
    const subCount = week.submissionsCount ?? 0;
    const isCompleted = subCount >= 7;
    const isInProgress = subCount > 0 && !isCompleted;
    if (quizFilter === "open") return !isCompleted;
    if (quizFilter === "in_progress") return isInProgress;
    if (quizFilter === "completed") return isCompleted;
    return true;
  });

  const TIER_LABELS: Record<string, string> = {
    PERFECT: "Perfect",
    EXCELLENT: "Excellent",
    GOOD: "Good Job",
    PARTICIPANT: "Participant",
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "0 0 100px", paddingTop: 0 }}>
      {/* Brand Cover Banner */}
      <div
        onClick={() => setActiveLightboxImg("/quiz-cover-banner.png")}
        style={{
          backgroundImage: "url('/quiz-cover-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
          height: "170px",
          position: "relative",
          cursor: "pointer",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push("/feed");
          }}
          aria-label="Back to Feed"
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            background: "rgba(15,23,42,0.5)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            color: "white",
            fontSize: "1.1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ←
        </button>
      </div>

      {/* Thanksgiving Mystery Prize Hero Card */}
      <div style={{ padding: "0 16px", marginTop: "-32px", position: "relative", zIndex: 2 }}>
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #0e7490 65%, #155e75 100%)",
            borderRadius: "20px",
            padding: "18px",
            color: "white",
            boxShadow: "0 10px 28px rgba(15, 23, 42, 0.18)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
            <span
              style={{
                background: "rgba(245, 158, 11, 0.22)",
                color: "#fde68a",
                border: "1px solid rgba(251, 191, 36, 0.4)",
                fontSize: "0.7rem",
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: "999px",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              THANKSGIVING PARTY SPECIAL
            </span>
            {openAccess && (
              <span
                style={{
                  background: "rgba(255,255,255,0.14)",
                  color: "#cffafe",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                }}
              >
                All Quizzes Unlocked
              </span>
            )}
          </div>

          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 4px", lineHeight: 1.25 }}>
            Mystery Prize Quiz Challenge
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#cffafe", margin: "0 0 14px", lineHeight: 1.45 }}>
            Take any Sunday quiz right now and boost your score before the Thanksgiving Party.
          </p>

          {/* 2-Tier Mystery Prize Cards (Zero Spoilers) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                borderRadius: "14px",
                padding: "11px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fde68a", whiteSpace: "nowrap" }}>
                  1 Grand Prize
                </span>
              </div>
              <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "white", marginBottom: "2px" }}>
                Mystery Grand Prize
              </div>
              <div style={{ fontSize: "0.7rem", color: "#e0f2fe", lineHeight: 1.35 }}>
                Qualifiers face off in a live tie-breaker game at the party.
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "14px",
                padding: "11px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#a5f3fc", whiteSpace: "nowrap" }}>
                  4 Winners
                </span>
              </div>
              <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "white", marginBottom: "2px" }}>
                Surprise Prizes
              </div>
              <div style={{ fontSize: "0.7rem", color: "#e0f2fe", lineHeight: 1.35 }}>
                4 more top scorers win secret rewards revealed live.
              </div>
            </div>
          </div>

          {/* Personal Score Strip */}
          <div
            style={{
              display: "flex",
              background: "rgba(15, 23, 42, 0.36)",
              borderRadius: "12px",
              padding: "10px 8px",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <div style={{ flex: 1, borderRight: "1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ display: "block", fontSize: "1.05rem", fontWeight: 800, color: "#fde68a" }}>
                {totalUserPoints}
              </span>
              <span style={{ fontSize: "0.66rem", color: "#cbd5e1", fontWeight: 600 }}>Your Points</span>
            </div>
            <div style={{ flex: 1, borderRight: "1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ display: "block", fontSize: "1.05rem", fontWeight: 800, color: "#67e8f9" }}>
                {totalAnswered}
              </span>
              <span style={{ fontSize: "0.66rem", color: "#cbd5e1", fontWeight: 600 }}>Items Done</span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: "1.05rem", fontWeight: 800, color: "white" }}>
                {completedCount}/{quizHistory.length}
              </span>
              <span style={{ fontSize: "0.66rem", color: "#cbd5e1", fontWeight: 600 }}>Quizzes Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        id="past-quizzes-section"
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 16px",
          marginTop: "14px",
          background: "white",
          position: "sticky",
          top: "calc(56px + env(safe-area-inset-top))",
          zIndex: 10,
          scrollMarginTop: "calc(56px + env(safe-area-inset-top) + 4px)",
        }}
      >
        <button
          onClick={() => {
            setActiveTab("quizzes");
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", "/quiz/hub?tab=quizzes");
            }
          }}
          style={{
            flex: 1,
            padding: "13px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "quizzes" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            color: activeTab === "quizzes" ? PRIMARY : "#64748b",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          All Quizzes ({quizHistory.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("leaderboard");
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", "/quiz/hub?tab=leaderboard");
            }
          }}
          style={{
            flex: 1,
            padding: "13px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "leaderboard" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            color: activeTab === "leaderboard" ? PRIMARY : "#64748b",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Leaderboard
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ padding: "14px 16px" }}>
        {activeTab === "quizzes" ? (
          <div>
            {/* Filter Pills */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                overflowX: "auto",
                paddingBottom: "12px",
                scrollbarWidth: "none",
              }}
            >
              {(
                [
                  { id: "all", label: `All (${quizHistory.length})` },
                  { id: "open", label: `Open (${openCount})` },
                  { id: "in_progress", label: `In Progress (${inProgressCount})` },
                  { id: "completed", label: `Completed (${completedCount})` },
                ] as { id: QuizFilter; label: string }[]
              ).map((chip) => {
                const isActive = quizFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setQuizFilter(chip.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "999px",
                      border: isActive ? `1.5px solid ${PRIMARY}` : "1px solid #e2e8f0",
                      background: isActive ? "#ecfeff" : "white",
                      color: isActive ? "#0e7490" : "#475569",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Quiz List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredQuizzes.length === 0 ? (
                <div
                  style={{
                    background: "white",
                    borderRadius: "16px",
                    padding: "28px 16px",
                    textAlign: "center",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
                    No quizzes match this filter yet.
                  </p>
                </div>
              ) : (
                filteredQuizzes.map((week) => {
                  const score = week.score;
                  const tier = week.tier;
                  const subCount = week.submissionsCount ?? 0;
                  const isCompleted = subCount >= 7;
                  const isLiveWeek = !week.isExpired;
                  const isExpanded = Boolean(expandedQuizIds[week.id]);
                  const cleanTitle = week.title.split(/ — | - /)[0];
                  const items = week.items || [];

                  return (
                    <div
                      key={week.id}
                      style={{
                        background: "white",
                        borderRadius: "16px",
                        padding: "14px 16px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        border: isLiveWeek
                          ? `1.5px solid ${PRIMARY}`
                          : isCompleted
                            ? "1px solid #bbf7d0"
                            : "1px solid #e2e8f0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* Title & Status Row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: "0.95rem", color: "#0f172a", display: "block", lineHeight: 1.35 }}>
                            {cleanTitle}
                          </strong>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                              {new Date(week.sermonDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {isLiveWeek && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  color: "#0e7490",
                                  background: "#ecfeff",
                                  border: `1px solid ${PRIMARY}`,
                                  borderRadius: "6px",
                                  padding: "1px 6px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Latest Sunday
                              </span>
                            )}
                            {week.hasVideo && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  color: "#0369a1",
                                  background: "#f0f9ff",
                                  border: "1px solid #bae6fd",
                                  borderRadius: "6px",
                                  padding: "1px 6px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Video Replay
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {isCompleted ? (
                            <span
                              style={{
                                background: "#f0fdf4",
                                color: "#15803d",
                                border: "1px solid #bbf7d0",
                                borderRadius: "999px",
                                padding: "3px 9px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {score}/7{tier ? ` · ${TIER_LABELS[tier] || tier}` : ""}
                            </span>
                          ) : subCount > 0 ? (
                            <span
                              style={{
                                background: "#f0f9ff",
                                color: "#0369a1",
                                border: "1px solid #7dd3fc",
                                borderRadius: "999px",
                                padding: "3px 9px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {subCount}/7 Done
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "#f0fdfa",
                                color: "#0f766e",
                                border: "1px solid #99f6e4",
                                borderRadius: "999px",
                                padding: "3px 9px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Open
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 7-Item Quick-Jump Strip */}
                      {items.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {items.map((item) => {
                            const bg = item.answered
                              ? item.isCorrect
                                ? "#dcfce7"
                                : "#f1f5f9"
                              : "#ecfeff";
                            const border = item.answered
                              ? item.isCorrect
                                ? "#86efac"
                                : "#cbd5e1"
                              : "#bae6fd";
                            const color = item.answered
                              ? item.isCorrect
                                ? "#15803d"
                                : "#475569"
                              : "#0e7490";

                            return (
                              <button
                                key={item.questionId}
                                type="button"
                                onClick={() => handleOpenQuiz(week, item.dayNumber)}
                                title={`Item ${item.dayNumber}: ${item.typeLabel}`}
                                style={{
                                  flex: 1,
                                  height: "32px",
                                  borderRadius: "8px",
                                  border: `1px solid ${border}`,
                                  background: bg,
                                  color,
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.answered ? (item.isCorrect ? "✓" : "·") : item.dayNumber}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Expandable 7-Item Preview List */}
                      {isExpanded && items.length > 0 && (
                        <div
                          style={{
                            background: "#f8fafc",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            padding: "8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {items.map((item) => (
                            <div
                              key={item.questionId}
                              style={{
                                background: "white",
                                borderRadius: "10px",
                                border: "1px solid #f1f5f9",
                                padding: "9px 11px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#0e7490", whiteSpace: "nowrap" }}>
                                    Item {item.dayNumber}
                                  </span>
                                  <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
                                    · {item.typeLabel}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#334155",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {item.previewText}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenQuiz(week, item.dayNumber)}
                                style={{
                                  background: item.answered ? "#f1f5f9" : PRIMARY,
                                  color: item.answered ? "#475569" : "white",
                                  border: item.answered ? "1px solid #e2e8f0" : "none",
                                  borderRadius: "8px",
                                  padding: "6px 12px",
                                  fontSize: "0.76rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}
                              >
                                {item.answered ? (item.isCorrect ? "Correct" : "Review") : "Play"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          paddingTop: "6px",
                          borderTop: "1px solid #f1f5f9",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(week.id)}
                          style={{
                            background: "#f8fafc",
                            color: "#334155",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "7px 12px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isExpanded ? "Hide Items" : "Preview 7 Items"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenQuiz(week)}
                          style={{
                            background: isCompleted ? "#f1f5f9" : PRIMARY,
                            color: isCompleted ? "#334155" : "white",
                            border: isCompleted ? "1px solid #e2e8f0" : "none",
                            borderRadius: "10px",
                            padding: "8px 16px",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isCompleted
                            ? "Review Answers"
                            : subCount > 0
                              ? `Continue (${subCount}/7)`
                              : "Take Quiz"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* All-Time Standings First (for Thanksgiving Qualifiers!) */}
            <div
              style={{
                background: "white",
                borderRadius: "18px",
                padding: "16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                border: "1px solid #f1f5f9",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ fontSize: "0.94rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                Thanksgiving Qualifiers — All-Time Standings
              </h3>
              <p style={{ fontSize: "0.76rem", color: "#64748b", margin: "0 0 12px" }}>
                Every correct answer counts toward the Mystery Grand Prize &amp; 4 Surprise Prizes.
              </p>
              {allTimeLeaders.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0, textAlign: "center", padding: "16px" }}>
                  Standings are updating. Take a quiz to get on the board!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {allTimeLeaders.map((entry, index) => (
                    <div
                      key={entry.member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: index < allTimeLeaders.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color:
                              index === 0 ? "#eab308" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "#64748b",
                            width: "22px",
                          }}
                        >
                          {index + 1}
                        </span>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: PRIMARY,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {entry.member.profilePicture ? (
                            <img
                              src={`/uploads/profile_pictures/${entry.member.profilePicture}`}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ color: "white", fontSize: "0.8rem", fontWeight: 700 }}>
                              {getInitials(entry.member.firstName, entry.member.lastName)}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>
                          {entry.member.firstName} {entry.member.lastName}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.82rem", color: "#64748b", whiteSpace: "nowrap" }}>
                        <strong style={{ color: PRIMARY, fontSize: "0.9rem" }}>{entry.score}</strong> pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Leaderboard */}
            <div
              style={{
                background: "white",
                borderRadius: "18px",
                padding: "16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                border: "1px solid #f1f5f9",
              }}
            >
              <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>
                This Week&apos;s Top Scorers
              </h3>
              {weeklyLeaders.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0, textAlign: "center", padding: "16px" }}>
                  No participants yet this week. Take this week&apos;s quiz to place!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {weeklyLeaders.map((entry, index) => (
                    <div
                      key={entry.member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: index < weeklyLeaders.length - 1 ? "1px solid #f1f5f9" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color:
                              index === 0 ? "#eab308" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "#64748b",
                            width: "22px",
                          }}
                        >
                          {index + 1}
                        </span>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: PRIMARY,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {entry.member.profilePicture ? (
                            <img
                              src={`/uploads/profile_pictures/${entry.member.profilePicture}`}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ color: "white", fontSize: "0.8rem", fontWeight: 700 }}>
                              {getInitials(entry.member.firstName, entry.member.lastName)}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>
                          {entry.member.firstName} {entry.member.lastName}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: PRIMARY }}>
                        {entry.score}/7
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Start Quiz Pass Modal (only triggered if Admin enables Drip Mode) */}
      <ConfirmModal
        open={catchupModal.open}
        title={catchupModal.quiz ? `Start Quiz: ${catchupModal.quiz.title.split(/ — | - /)[0]}` : "Start Quiz"}
        message={
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
            <p style={{ margin: 0, color: "#334155", fontSize: "0.9rem", lineHeight: 1.5 }}>
              All 7 challenges unlock immediately for 7 days and count toward your All-Time score.
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
              You can have one active quiz at a time.
            </p>
          </div>
        }
        confirmLabel="Start Quiz"
        cancelLabel="Cancel"
        confirmColor={PRIMARY}
        loading={catchupModal.loading}
        onConfirm={handleConfirmCatchup}
        onCancel={() => setCatchupModal({ open: false, quiz: null, loading: false })}
      />

      {/* Conflict Modal (only triggered if Admin enables Drip Mode) */}
      <ConfirmModal
        open={conflictModal.open}
        title="One Quiz at a Time"
        message={
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", textAlign: "left" }}>
            <p style={{ margin: 0, color: "#1e293b", fontSize: "0.9rem", lineHeight: 1.5 }}>
              {conflictModal.message}
            </p>
          </div>
        }
        confirmLabel={conflictModal.activeQuizId ? "Go to Active Quiz" : "OK"}
        cancelLabel={conflictModal.activeQuizId ? "Close" : null}
        confirmColor={PRIMARY}
        onConfirm={() => {
          const activeId = conflictModal.activeQuizId;
          setConflictModal({ open: false, message: "", activeQuizId: undefined });
          if (activeId) {
            router.push(`/quiz?quizId=${activeId}`);
          }
        }}
        onCancel={() => setConflictModal({ open: false, message: "", activeQuizId: undefined })}
      />

      {activeLightboxImg && (
        <ImageLightbox src={activeLightboxImg} onClose={() => setActiveLightboxImg(null)} />
      )}
    </div>
  );
}
