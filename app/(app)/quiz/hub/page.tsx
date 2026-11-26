"use client";

/**
 * Quiz for Christ — Quizzes & Leaderboard Hub
 *
 * Reframed so every Sunday sermon quiz is immediately visible and clearly open to take:
 * - Default tab: All Quizzes (with Open / In Progress / Completed filters)
 * - Featured active weekly quiz hero card
 * - 7-day personal pass for any previous Sunday quiz
 * - Weekly & All-Time Leaderboard tab
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
  catchupStatus?: "none" | "active" | "completed" | "expired";
  catchupExpiresAt?: string | null;
  hasVideo?: boolean;
}

type QuizFilter = "all" | "open" | "in_progress" | "completed";

export default function QuizHubPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"quizzes" | "leaderboard">("quizzes");
  const [quizFilter, setQuizFilter] = useState<QuizFilter>("all");
  const [loading, setLoading] = useState(true);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Leaderboard data
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);

  // Quiz list data
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEntry[]>([]);

  // Catch-up briefing modal state
  const [catchupModal, setCatchupModal] = useState<{
    open: boolean;
    quiz: QuizHistoryEntry | null;
    loading: boolean;
  }>({ open: false, quiz: null, loading: false });

  // Polite conflict modal state
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
    if (loading) return;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      const hasHash = window.location.hash.includes("past-quizzes");
      if (tabParam === "archive" || tabParam === "past" || tabParam === "catchup" || hasHash) {
        setActiveTab("quizzes");
        const scrollToSection = () => {
          const el = document.getElementById("past-quizzes-section");
          if (el) {
            const rect = el.getBoundingClientRect();
            const topOffset = rect.top + window.pageYOffset - 58;
            window.scrollTo({
              top: Math.max(0, topOffset),
              behavior: "smooth",
            });
          }
        };
        const t1 = setTimeout(scrollToSection, 50);
        const t2 = setTimeout(scrollToSection, 250);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }
  }, [loading]);

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
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load hub data:", err);
          setLoading(false);
        });
    }
  }, [authStatus]);

  // Deep link: /quiz/hub?tab=archive&quizId=N → open that quiz's pass briefing
  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const qid = Number(new URLSearchParams(window.location.search).get("quizId"));
    if (!qid) return;
    const match = quizHistory.find((w) => w.id === qid);
    if (match) {
      setActiveTab("quizzes");
      if (!match.isExpired || match.catchupStatus === "active" || (match.submissionsCount ?? 0) >= 7) {
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

  function openCatchupBriefing(week: QuizHistoryEntry) {
    setCatchupModal({
      open: true,
      quiz: week,
      loading: false,
    });
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
        setConflictModal({
          open: true,
          message: msg,
          activeQuizId: activeId,
        });
        return;
      }

      if (!res.ok) {
        setCatchupModal({ open: false, quiz: null, loading: false });
        setConflictModal({
          open: true,
          message: data.error || "Unable to start quiz session.",
        });
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

  // Classify quizzes for stats & filtering
  const activeWeeklyQuiz = quizHistory.find((q) => !q.isExpired) || null;
  const completedCount = quizHistory.filter((q) => (q.submissionsCount ?? 0) >= 7).length;
  const inProgressCount = quizHistory.filter(
    (q) =>
      (q.submissionsCount ?? 0) < 7 &&
      ((!q.isExpired && q.played) || q.catchupStatus === "active")
  ).length;
  const openCount = quizHistory.filter(
    (q) => (q.submissionsCount ?? 0) < 7 && q.catchupStatus !== "expired"
  ).length;

  const filteredQuizzes = quizHistory.filter((week) => {
    const isCompleted = (week.submissionsCount ?? 0) >= 7;
    const isInProgress =
      !isCompleted && ((!week.isExpired && week.played) || week.catchupStatus === "active");
    const isOpenToStart =
      !isCompleted && !isInProgress && week.catchupStatus !== "expired";

    if (quizFilter === "open") return isOpenToStart || (!week.isExpired && !isCompleted);
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
          height: "200px",
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

      {/* Brand Info Card */}
      <div style={{ background: "white", padding: "0 16px 14px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", marginTop: -36 }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "20px",
              background: PRIMARY,
              border: "4px solid white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div style={{ minWidth: 0, paddingBottom: "4px" }}>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>
              Quiz for Christ
            </h1>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
              Pick any Sunday quiz to play and earn points.
            </span>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div style={{ padding: "12px 16px 14px" }}>
        <div
          style={{
            display: "flex",
            background: "white",
            borderRadius: "16px",
            padding: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid #f1f5f9",
            gap: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ flex: 1, borderRight: "1px solid #f1f5f9" }}>
            <span style={{ display: "block", fontSize: "1.15rem", fontWeight: 800, color: PRIMARY }}>
              {openCount}
            </span>
            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Open to Take</span>
          </div>
          <div style={{ flex: 1, borderRight: "1px solid #f1f5f9" }}>
            <span style={{ display: "block", fontSize: "1.15rem", fontWeight: 800, color: "#16a34a" }}>
              {completedCount}
            </span>
            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Completed</span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
              {quizHistory.length}
            </span>
            <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Total Quizzes</span>
          </div>
        </div>
      </div>

      {/* Featured Current Week Quiz Card */}
      {activeWeeklyQuiz && (() => {
        const subCount = activeWeeklyQuiz.submissionsCount ?? 0;
        const isDone = subCount >= 7;

        return (
          <div style={{ padding: "0 16px 16px" }}>
            <div
              style={{
                background: isDone
                  ? "linear-gradient(135deg, #f0fdf4, #dcfce7)"
                  : "linear-gradient(135deg, #ecfeff, #cffafe)",
                border: isDone ? "1.5px solid #86efac" : `1.5px solid ${PRIMARY}`,
                borderRadius: "18px",
                padding: "1.1rem 1.2rem",
                boxShadow: "0 4px 14px rgba(14, 116, 144, 0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span
                  style={{
                    background: isDone ? "#16a34a" : PRIMARY,
                    color: "white",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "4px 10px",
                    borderRadius: "999px",
                    letterSpacing: "0.03em",
                  }}
                >
                  {isDone ? "Completed This Week" : "Live This Week"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
                  {new Date(activeWeeklyQuiz.sermonDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px", lineHeight: 1.3 }}>
                {activeWeeklyQuiz.title.split(/ — | - /)[0]}
              </h2>

              <p style={{ fontSize: "0.82rem", color: "#475569", margin: "0 0 12px", lineHeight: 1.4 }}>
                {isDone
                  ? `Finished with ${activeWeeklyQuiz.score}/7. Review your answers anytime.`
                  : subCount > 0
                    ? `${subCount}/7 challenges completed. Keep going for weekly rewards.`
                    : "7 daily challenges from Sunday's message. Start playing now."}
              </p>

              <button
                onClick={() => router.push(`/quiz?quizId=${activeWeeklyQuiz.id}`)}
                style={{
                  width: "100%",
                  background: isDone ? "#16a34a" : PRIMARY,
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "11px 16px",
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: isDone ? "none" : `0 4px 10px ${PRIMARY}40`,
                }}
              >
                {subCount === 0
                  ? "Take This Week's Quiz"
                  : isDone
                    ? `Review Answers (${activeWeeklyQuiz.score}/7)`
                    : `Continue Quiz (${subCount}/7)`}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Navigation Tabs */}
      <div
        id="past-quizzes-section"
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 16px",
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
      <div style={{ padding: "16px" }}>
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
                  const isCatchupActive = week.catchupStatus === "active";
                  const isCatchupExpired = week.catchupStatus === "expired";

                  let remainingDaysStr = "";
                  if (isCatchupActive && week.catchupExpiresAt) {
                    const ms = new Date(week.catchupExpiresAt).getTime() - Date.now();
                    const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
                    remainingDaysStr = `${days}d left`;
                  }

                  const cleanTitle = week.title.split(/ — | - /)[0];

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
                          : isCatchupActive
                            ? "1.5px solid #7dd3fc"
                            : "1px solid #e2e8f0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: "0.94rem", color: "#0f172a", display: "block", lineHeight: 1.35 }}>
                            {cleanTitle}
                          </strong>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 500 }}>
                              {new Date(week.sermonDate).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            {week.hasVideo && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  color: "#0e7490",
                                  background: "#ecfeff",
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

                        {/* Status Badge */}
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
                          ) : isLiveWeek ? (
                            <span
                              style={{
                                background: "#ecfeff",
                                color: "#0e7490",
                                border: `1px solid ${PRIMARY}`,
                                borderRadius: "999px",
                                padding: "3px 9px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Live Now{subCount > 0 ? ` · ${subCount}/7` : ""}
                            </span>
                          ) : isCatchupActive ? (
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
                              In Progress · {remainingDaysStr}
                            </span>
                          ) : isCatchupExpired ? (
                            <span
                              style={{
                                background: "#f1f5f9",
                                color: "#64748b",
                                border: "1px solid #cbd5e1",
                                borderRadius: "999px",
                                padding: "3px 9px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Window Ended
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
                              Open to Take
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          paddingTop: "8px",
                          borderTop: "1px solid #f1f5f9",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {isCompleted
                            ? "All 7 challenges completed"
                            : isLiveWeek
                              ? subCount > 0
                                ? `${subCount} of 7 answered`
                                : "7 sermon challenges ready"
                              : isCatchupActive
                                ? `${subCount} of 7 answered`
                                : isCatchupExpired
                                  ? "7-day pass expired"
                                  : "7-day pass · 7 challenges"}
                        </span>

                        {isLiveWeek && !isCompleted ? (
                          <button
                            onClick={() => router.push(`/quiz?quizId=${week.id}`)}
                            style={{
                              background: PRIMARY,
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "8px 16px",
                              fontSize: "0.84rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {subCount > 0 ? "Continue Quiz" : "Take Quiz"}
                          </button>
                        ) : isCatchupActive ? (
                          <button
                            onClick={() => router.push(`/quiz?quizId=${week.id}`)}
                            style={{
                              background: PRIMARY,
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "8px 16px",
                              fontSize: "0.84rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Continue Quiz
                          </button>
                        ) : isCompleted ? (
                          <button
                            onClick={() => router.push(`/quiz?quizId=${week.id}`)}
                            style={{
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "8px 14px",
                              fontSize: "0.84rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Review Answers
                          </button>
                        ) : isCatchupExpired ? (
                          <button
                            onClick={() => router.push(`/quiz?quizId=${week.id}`)}
                            style={{
                              background: "#f1f5f9",
                              color: "#64748b",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "8px 14px",
                              fontSize: "0.84rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            View Recap
                          </button>
                        ) : (
                          <button
                            onClick={() => openCatchupBriefing(week)}
                            style={{
                              background: "#0e7490",
                              color: "white",
                              border: "none",
                              borderRadius: "10px",
                              padding: "8px 16px",
                              fontSize: "0.84rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Take Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Weekly Leaderboard */}
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
              <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a", margin: "0 0 12px" }}>
                Weekly Top Performers
              </h3>
              {weeklyLeaders.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0, textAlign: "center", padding: "16px" }}>
                  No participants recorded yet this week. Take this week&apos;s quiz to place!
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
                            width: "20px",
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

            {/* All-Time Leaderboard */}
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
                All-Time Standings
              </h3>
              {allTimeLeaders.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0, textAlign: "center", padding: "16px" }}>
                  All-Time leaderboard is updating. Check back soon!
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
                            width: "20px",
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
                      <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        <strong style={{ color: PRIMARY, fontSize: "0.88rem" }}>{entry.score}</strong> pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Start Quiz Pass Modal */}
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

      {/* Active Quiz Conflict Modal */}
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
