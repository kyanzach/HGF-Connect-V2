"use client";

/**
 * Quiz for Christ — Brand Hub & Leaderboard
 *
 * Dedicated landing page similar to a facebook page:
 * - Brand Banner & Statistics
 * - Tab Navigation: Leaderboard vs Past Quizzes Archive
 * - Weekly & All-Time Top Scorers lists
 * - Review and recap past quiz weeks
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ImageLightbox from "@/components/ImageLightbox";
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
}

export default function QuizHubPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "archive">("leaderboard");
  const [loading, setLoading] = useState(true);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Leaderboard data
  const [weeklyLeaders, setWeeklyLeaders] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaders, setAllTimeLeaders] = useState<LeaderboardEntry[]>([]);

  // History data
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEntry[]>([]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      Promise.all([
        fetch("/api/quiz/leaderboard").then(r => r.ok ? r.json() : null),
        fetch("/api/quiz/history").then(r => r.ok ? r.json() : null)
      ]).then(([leaderData, historyData]) => {
        if (leaderData) {
          setWeeklyLeaders(leaderData.weekly || []);
          setAllTimeLeaders(leaderData.allTime || []);
        }
        if (historyData) {
          setQuizHistory(historyData);
        }
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load hub data:", err);
        setLoading(false);
      });
    }
  }, [authStatus]);

  if (authStatus === "loading" || loading) {
    return <HubLoading />;
  }

  function getInitials(fn: string, ln: string) {
    return `${fn[0] || ""}${ln[0] || ""}`.toUpperCase();
  }

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "0 0 100px", paddingTop: 0 }}>
      {/* Brand Cover Banner */}
      <div 
        onClick={() => setActiveLightboxImg('/quiz-cover-banner.png')}
        style={{
          backgroundImage: "url('/quiz-cover-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 60%",
          height: "240px",
          position: "relative",
          cursor: "pointer",
        }}
      >
        {/* Back Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push("/quiz");
          }}
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            background: "rgba(0,0,0,0.4)",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            color: "white",
            fontSize: "1.1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          ←
        </button>
      </div>

      {/* Brand Info Card — Sits below banner with logo overlapping */}
      <div style={{ background: "white", padding: "0 16px 12px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "16px", marginTop: -40 }}>
          {/* Brand Logo Avatar */}
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: PRIMARY,
            border: "4px solid white",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            flexShrink: 0
          }}>
            🧠
          </div>
          <div style={{ minWidth: 0, paddingBottom: "6px" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>
              HGF Quiz for Christ Page
            </h1>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
              Official Church Quiz Program
            </span>
          </div>
        </div>
      </div>

      {/* Brand Statistics / Intro */}
      <div style={{ padding: "0 16px 16px" }}>
        <p style={{ color: "#475569", fontSize: "0.85rem", lineHeight: 1.5, margin: "0 0 16px" }}>
          Welcome to the HGF Quiz for Christ Page! Test your knowledge of Sunday sermons, climb the leaderboard, grow in the Word, and claim weekly rewards.
        </p>

        {/* Stats strip */}
        <div style={{ display: "flex", background: "white", borderRadius: "16px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", gap: "12px", textAlign: "center" }}>
          <div style={{ flex: 1, borderRight: "1px solid #f1f5f9" }}>
            <span style={{ display: "block", fontSize: "1.1rem", fontWeight: 800, color: PRIMARY }}>
              {quizHistory.length}
            </span>
            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>QUIZ WEEKS</span>
          </div>
          <div style={{ flex: 1, borderRight: "1px solid #f1f5f9" }}>
            <span style={{ display: "block", fontSize: "1.1rem", fontWeight: 800, color: PRIMARY }}>
              {allTimeLeaders.length > 0 ? "Active" : "Inactive"}
            </span>
            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>LEADERBOARD</span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: "1.1rem", fontWeight: 800, color: PRIMARY }}>
              Every Sun
            </span>
            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>AWARDS</span>
          </div>
        </div>
      </div>

      {/* Current Week Quiz Box */}
      {quizHistory.length > 0 && (
        (() => {
          const currentQuiz = quizHistory[0];
          const played = currentQuiz.played;
          const subCount = currentQuiz.submissionsCount ?? 0;
          const isExpired = currentQuiz.isExpired ?? false;
          
          const TIER_LABELS: Record<string, string> = {
            PERFECT: "🏆 Perfect Score!",
            EXCELLENT: "🌟 Excellent!",
            GOOD: "👏 Good Job!",
            PARTICIPANT: "🙏 Participant",
          };

          return (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{
                background: isExpired
                  ? "linear-gradient(135deg, #f1f5f9, #e2e8f0)"
                  : (subCount >= 7 
                      ? "linear-gradient(135deg, #f0fdf4, #dcfce7)" 
                      : "linear-gradient(135deg, #ecfeff, #cffafe)"),
                border: isExpired
                  ? "1.5px solid #cbd5e1"
                  : (subCount >= 7 ? "1.5px solid #86efac" : `1.5px solid ${PRIMARY}`),
                borderRadius: "20px",
                padding: "1.25rem",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <span style={{
                    background: isExpired 
                      ? (played ? "#16a34a" : "#64748b") 
                      : PRIMARY,
                    color: "white",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    padding: "0.25rem 0.6rem",
                    borderRadius: "999px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}>
                    {isExpired 
                      ? (played ? "✅ Completed Week" : "🔒 Expired Week")
                      : "🔥 ACTIVE WEEKLY QUIZ"}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                    {new Date(currentQuiz.sermonDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.5rem" }}>
                  {currentQuiz.title}
                </h2>

                <p style={{ fontSize: "0.8rem", color: "#475569", margin: "0 0 1rem", lineHeight: 1.4 }}>
                  {isExpired 
                    ? (played 
                        ? `Great job! You completed the quiz and scored ${currentQuiz.score}/7. Review your performance or check the leaderboard.`
                        : "This quiz week has ended. You didn't participate in this week's challenges.")
                    : (played 
                        ? (subCount >= 7 
                            ? `Awesome! You completed all 7 days and scored ${currentQuiz.score}/7. View details or check the leaderboard.`
                            : `You have completed ${subCount}/7 daily challenges. Continue playing to unlock weekly rewards!`)
                        : "Test your focus on last Sunday's sermon and claim your weekly reward! Click below to start playing.")
                  }
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {played && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: isExpired ? "0" : "4px" }}>
                      <div style={{
                        background: "white",
                        border: isExpired ? "1px solid #cbd5e1" : "1px solid #bbf7d0",
                        borderRadius: "12px",
                        padding: "0.5rem 1rem",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: isExpired ? "#475569" : "#16a34a",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        Score: {currentQuiz.score}/7 {currentQuiz.tier && `• ${TIER_LABELS[currentQuiz.tier] || currentQuiz.tier}`}
                      </div>
                    </div>
                  )}

                  {(!isExpired || played) && (
                    <button
                      onClick={() => router.push(`/quiz?quizId=${currentQuiz.id}`)}
                      style={{
                        width: "100%",
                        background: isExpired ? "#475569" : PRIMARY,
                        color: "white",
                        border: "none",
                        borderRadius: "14px",
                        padding: "0.75rem",
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: isExpired ? "none" : `0 4px 10px ${PRIMARY}40`,
                        transition: "transform 0.2s"
                      }}
                    >
                      {isExpired 
                        ? "👁️ Review Quiz Results" 
                        : (subCount === 0 
                            ? "📝 Play Weekly Quiz Now" 
                            : (subCount >= 7 ? "👁️ View Quiz Progress" : "📝 Continue Playing"))
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", padding: "0 16px", background: "white", position: "sticky", top: 0, zIndex: 10 }}>
        <button
          onClick={() => setActiveTab("leaderboard")}
          style={{
            flex: 1,
            padding: "14px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "leaderboard" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            color: activeTab === "leaderboard" ? PRIMARY : "#64748b",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          style={{
            flex: 1,
            padding: "14px 0",
            background: "none",
            border: "none",
            borderBottom: activeTab === "archive" ? `3px solid ${PRIMARY}` : "3px solid transparent",
            color: activeTab === "archive" ? PRIMARY : "#64748b",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          📂 Past Quizzes
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ padding: "20px 16px" }}>
        {activeTab === "leaderboard" ? (
          <div>
            {/* Weekly Leaderboard */}
            <div style={{ background: "white", borderRadius: "20px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                🌟 Weekly Top Performers
              </h3>
              {weeklyLeaders.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0, textAlign: "center", padding: "16px" }}>
                  No participants recorded yet this week. Play your quiz today to place!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {weeklyLeaders.map((entry, index) => (
                    <div key={entry.member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: index < weeklyLeaders.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: index === 0 ? "#eab308" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "#64748b", width: "20px" }}>
                          {index + 1}
                        </span>
                        {/* Avatar */}
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: PRIMARY, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {entry.member.profilePicture ? (
                            <img src={`/uploads/profile_pictures/${entry.member.profilePicture}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                        {entry.score}/5
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All-Time Leaderboard */}
            <div style={{ background: "white", borderRadius: "20px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                👑 All-Time Standings
              </h3>
              {allTimeLeaders.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: 0, textAlign: "center", padding: "16px" }}>
                  All-Time leaderboard is updating. Check back soon!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {allTimeLeaders.map((entry, index) => (
                    <div key={entry.member.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: index < allTimeLeaders.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: index === 0 ? "#eab308" : index === 1 ? "#94a3b8" : index === 2 ? "#b45309" : "#64748b", width: "20px" }}>
                          {index + 1}
                        </span>
                        {/* Avatar */}
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: PRIMARY, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {entry.member.profilePicture ? (
                            <img src={`/uploads/profile_pictures/${entry.member.profilePicture}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                        <strong style={{ color: PRIMARY, fontSize: "0.88rem" }}>{entry.score}</strong> correct answers
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {quizHistory.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "20px" }}>
                No past quiz weeks archive available.
              </p>
            ) : (
              quizHistory.map((week) => {
                const played = week.played;
                const score = week.score;
                const tier = week.tier;

                const TIER_LABELS: Record<string, string> = {
                  PERFECT: "🏆 Perfect",
                  EXCELLENT: "🌟 Excellent",
                  GOOD: "👏 Good Job",
                  PARTICIPANT: "🙏 Participant",
                };

                return (
                  <button
                    key={week.id}
                    onClick={() => router.push(`/quiz?quizId=${week.id}`)}
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      padding: "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "none",
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.9rem", color: "#0f172a", display: "block" }}>
                        {week.title}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginTop: "2px" }}>
                        {new Date(week.sermonDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {played ? (
                        <div>
                          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: PRIMARY }}>
                            Score: {score}/7
                          </span>
                          {tier && (
                            <span style={{ display: "block", fontSize: "0.68rem", color: "#64748b", fontWeight: 600, marginTop: "2px" }}>
                              {TIER_LABELS[tier] || tier}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                          Not played
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {activeLightboxImg && (
        <ImageLightbox
          src={activeLightboxImg}
          onClose={() => setActiveLightboxImg(null)}
        />
      )}
    </div>
  );
}
