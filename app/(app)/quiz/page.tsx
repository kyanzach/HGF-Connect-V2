"use client";

/**
 * Quiz for Christ — Member Portal
 *
 * Provides:
 * - Sermon Replay (embedded YouTube or notes excerpt)
 * - Daily drip quiz grid (Tuesday–Saturday)
 * - Weekly Score & Points (tier tracking + progress)
 * - Perfect score reward claim modal (t-shirt size selection)
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import QuizPlayer from "@/components/quiz/QuizPlayer";
import ConfirmModal from "@/components/ConfirmModal";
import CleanYoutubePlayer from "@/components/quiz/CleanYoutubePlayer";
import ImageLightbox from "@/components/ImageLightbox";

const PRIMARY = "#4EB1CB";

interface QuizDay {
  questionId: number;
  dayNumber: number;
  label: string;
  type: string;
  typeLabel: string;
  typeEmoji: string;
  difficulty: string;
  status: "completed" | "available" | "locked" | "today" | "expired";
  score: number | null;
  isCorrect: boolean | null;
  feedback: string | null;
}

interface QuizStatus {
  active: boolean;
  attended?: boolean;
  message?: string;
  isActiveQuiz?: boolean;
  quiz?: {
    id: number;
    title: string;
    sermonDate: string;
    youtubeVideoId: string | null;
    status: string;
    eventId?: number | null;
    presentationFile?: string | null;
    presentationSlides?: any | null;
    commentary?: string | null;
    speaker?: string | null;
  };
  days?: QuizDay[];
  currentDay?: number;
  isExpired?: boolean;
  quizWeekStatus?: string;
  rewardItems?: any[];
  progress?: {
    completed: number;
    total: number;
    totalScore: number;
    isWeekComplete: boolean;
    rewardTier: "PERFECT" | "EXCELLENT" | "GOOD" | "PARTICIPANT" | null;
    rewardDisplay: { label: string; description: string; imageUrl?: string | null } | null;
    rewardClaim: {
      rewardTier: string;
      claimStatus: "unclaimed" | "claimed" | "distributed";
      claimDetails: any;
      totalScore: number;
    } | null;
  };
}

export default function MemberQuizPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [quizStatus, setQuizStatus] = useState<QuizStatus | null>(null);

  // Tab & Carousel states for Sermon Slides
  const [activeTab, setActiveTab] = useState<"video" | "slides">("video");
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // ── Reward Claiming state ──
  const [claiming, setClaiming] = useState(false);
  const [tShirtSize, setTShirtSize] = useState("");
  const [claimPhone, setClaimPhone] = useState("");
  const [claimSuccessMsg, setClaimSuccessMsg] = useState("");
  const [claimError, setClaimError] = useState("");

  // ── Info Modal state ──
  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
  }>({ open: false, title: "", message: "" });

  const loadStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const quizId = params.get("quizId") || "";
      const url = quizId ? `/api/quiz/status?quizId=${quizId}` : "/api/quiz/status";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuizStatus(data);
      }
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);



  useEffect(() => {
    if (authStatus === "authenticated") {
      loadStatus();
    }
  }, [authStatus, loadStatus]);

  useEffect(() => {
    if (quizStatus?.quiz) {
      const slides = quizStatus.quiz.presentationSlides;
      const hasSlides = slides && (Array.isArray(slides) ? slides.length : JSON.parse(JSON.stringify(slides)).length) > 0;
      if (hasSlides && !quizStatus.quiz.youtubeVideoId) {
        setActiveTab("slides");
      } else {
        setActiveTab("video");
      }
    }
  }, [quizStatus]);

  async function handleStartDay(day: QuizDay) {
    if (day.status === "locked") return;
    if (day.status === "expired") {
      setInfoModal({
        open: true,
        title: "Week Ended",
        message: "This quiz week has ended. You can no longer play missed challenges. Check back when a new quiz is published!",
      });
      return;
    }
    if (day.status === "completed") {
      const messageContent = (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 700,
            background: day.isCorrect ? "#eff6ff" : "#f1f5f9",
            color: day.isCorrect ? "#1e40af" : "#475569",
            width: "fit-content"
          }}>
            {day.isCorrect ? "🏆 Correct Answer! (+1 Point)" : "💡 Opportunity to Learn"}
          </div>
          
          <div style={{ color: "#334155", fontSize: "0.92rem", lineHeight: 1.5 }}>
            {day.isCorrect ? (
              <span style={{ fontWeight: 600, color: "#0f172a" }}>Awesome job! You've successfully completed this challenge.</span>
            ) : (
              <span style={{ fontWeight: 600, color: "#0f172a" }}>You have completed this challenge and gained valuable knowledge.</span>
            )}
          </div>

          {day.feedback && (
            <div style={{
              background: "#f8fafc",
              borderLeft: `3px solid ${day.isCorrect ? "#3b82f6" : "#94a3b8"}`,
              padding: "10px 12px",
              borderRadius: "0 8px 8px 0",
              fontSize: "0.85rem",
              color: "#475569",
              lineHeight: 1.4,
            }}>
              <strong style={{ display: "block", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", marginBottom: "4px" }}>
                Pastor's Notes / AI Feedback:
              </strong>
              "{day.feedback}"
            </div>
          )}
        </div>
      );

      setInfoModal({
        open: true,
        title: `${day.label} Complete`,
        message: messageContent,
      });
      return;
    }

    // Block play from past quiz archive view
    const isPastQuizView = !!(new URLSearchParams(window.location.search).get("quizId")) && !quizStatus?.isActiveQuiz;
    if (isPastQuizView) {
      setInfoModal({
        open: true,
        title: "Past Quiz Week",
        message: "You cannot play challenges from previous weeks. Browse the active week to play!",
      });
      return;
    }

    setLoading(true);
    // Call API helper to load specific question info
    try {
      const res = await fetch(`/api/quiz/question?id=${day.questionId}`);
      if (res.ok) {
        const qData = await res.json();
        setActiveQuestion({
          questionId: day.questionId,
          dayNumber: day.dayNumber,
          type: day.type,
          questionText: qData.questionText,
          options: qData.options,
          hint: qData.hint,
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === "Quiz is not active") {
          setInfoModal({
            open: true,
            title: "Quiz Week Completed! 🎉",
            message: "This weekly challenge has already ended. Don't worry! You can check all past quizzes, correct answers, and climb the leaderboard in the Quiz Hub. Get ready for the next weekly quiz starting next Monday at 7:00 AM Manila Time!"
          });
          return;
        }
        throw new Error(errData.error || "Failed to load question details");
      }
    } catch (err: any) {
      setInfoModal({
        open: true,
        title: "Error",
        message: err?.message || "Could not load question details. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !quizStatus) return;
    const params = new URLSearchParams(window.location.search);
    const targetDay = params.get("day");
    if (targetDay) {
      const dayNum = parseInt(targetDay, 10);
      const matchedDay = quizStatus.days?.find((d) => d.dayNumber === dayNum);
      if (matchedDay && matchedDay.status !== "locked" && matchedDay.status !== "completed") {
        handleStartDay(matchedDay);
      }
    }
  }, [quizStatus]);

  async function handleClaimReward(e: React.FormEvent) {
    e.preventDefault();
    if (!tShirtSize || !claimPhone) {
      setClaimError("Please select a size and provide a contact number.");
      return;
    }
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/quiz/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quizStatus?.quiz?.id,
          claimDetails: { size: tShirtSize, phone: claimPhone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setClaimSuccessMsg("Your claim details have been recorded! Bring your HGF Connect app to Sunday Service to collect your T-Shirt.");
      loadStatus();
    } catch (err: any) {
      setClaimError(err?.message || "Failed to submit claim.");
    } finally {
      setClaiming(false);
    }
  }

  if (authStatus === "loading" || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ border: `4px solid ${PRIMARY}20`, borderTop: `4px solid ${PRIMARY}`, borderRadius: "50%", width: 40, height: 40, animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>Loading Quiz for Christ...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!quizStatus || !quizStatus.active) {
    return (
      <div style={{ minHeight: "80vh", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", paddingTop: "calc(env(safe-area-inset-top) + 24px)" }}>
        <div style={{ fontSize: "4.5rem", marginBottom: "16px" }}>🧠</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px", textAlign: "center" }}>No Active Quiz Week</h2>
        <p style={{ color: "#64748b", fontSize: "0.95rem", textAlign: "center", maxWidth: "340px", lineHeight: 1.6, marginBottom: "24px" }}>
          The pastors are preparing this week&apos;s sermon quiz. Check back on Monday morning, or browse previous weeks!
        </p>
        <button
          onClick={() => router.push("/quiz/hub")}
          style={{ background: PRIMARY, color: "white", padding: "12px 24px", borderRadius: "12px", border: "none", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: `0 4px 14px ${PRIMARY}40` }}
        >
          📂 Browse Quiz Hub & Leaderboard
        </button>
      </div>
    );
  }

  // Attendance Check Gating
  if (quizStatus.active && quizStatus.attended === false) {
    return (
      <div style={{ minHeight: "80vh", padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", paddingTop: "calc(env(safe-area-inset-top) + 24px)" }}>
        <div style={{
          background: "white",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
          border: "2px solid #F3F4F6",
          maxWidth: "420px",
          textAlign: "center" as const,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center"
        }}>
          <div style={{ fontSize: "4.5rem", marginBottom: "16px" }}>🏠</div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: "12px" }}>
            Join Us in the House!
          </h2>
          <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "24px" }}>
            We missed you at our physical Sunday Service! The <strong>Quiz for Christ</strong> is a special blessing reserved for those who gather with us in person. We warmly invite you to join our next Sunday Service at the physical church to experience the fellowship, worship, and Word together. We can't wait to see you there!
          </p>
          <button
            onClick={() => router.push("/quiz/hub")}
            style={{ width: "100%", background: PRIMARY, color: "white", padding: "12px 24px", borderRadius: "12px", border: "none", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", boxShadow: `0 4px 14px ${PRIMARY}40`, transition: "all 0.2s" }}
          >
            📂 View Leaderboard & Hub
          </button>
        </div>
      </div>
    );
  }

  const { quiz, days, progress } = quizStatus;
  const showClaimBox = progress?.isWeekComplete && progress.rewardTier === "PERFECT" && progress.rewardClaim?.claimStatus === "unclaimed";

  const slides = quiz?.presentationSlides;
  const slidesArray = slides
    ? (Array.isArray(slides)
        ? slides
        : JSON.parse(JSON.stringify(slides)))
    : [];

  const handlePrevSlide = () => {
    if (slidesArray.length === 0) return;
    setActiveSlide((prev) => (prev > 0 ? prev - 1 : slidesArray.length - 1));
  };

  const handleNextSlide = () => {
    if (slidesArray.length === 0) return;
    setActiveSlide((prev) => (prev < slidesArray.length - 1 ? prev + 1 : 0));
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "20px 16px 120px", paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <button
          onClick={() => router.push("/quiz/hub")}
          style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", color: "white", boxShadow: `0 3px 8px ${PRIMARY}30` }}>
            🧠
          </div>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>HGF Quiz For Christ</h1>
            <span style={{ fontSize: "0.75rem", color: PRIMARY, fontWeight: 700 }}>View Brand Hub & Leaderboard →</span>
          </div>
        </button>
      </div>

      {/* Week Title Card */}
      <div style={{ background: quizStatus?.isExpired ? "linear-gradient(135deg, #374151 0%, #4b5563 100%)" : "linear-gradient(135deg, #0f2d3d 0%, #1a5276 100%)", borderRadius: "20px", padding: "20px", color: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", marginBottom: "20px" }}>
        <span style={{ background: quizStatus?.isExpired ? "rgba(255,255,255,0.15)" : `${PRIMARY}30`, color: quizStatus?.isExpired ? "#d1d5db" : PRIMARY, fontSize: "0.7rem", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", border: quizStatus?.isExpired ? "1px solid rgba(255,255,255,0.2)" : `1px solid ${PRIMARY}40` }}>
          {quizStatus?.isExpired ? "COMPLETED WEEK" : "ACTIVE QUIZ WEEK"}
        </span>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "8px", marginBottom: "6px", lineHeight: 1.4 }}>
          {quiz?.title ? quiz.title.split(/ — | - /)[0] : ""}
        </h2>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
          Sermon Date: {quiz?.sermonDate ? new Date(quiz.sermonDate).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}
        </p>
      </div>

      {/* YouTube Sermon Embed (if available) */}

      {/* Expired Week Banner */}
      {quizStatus?.isExpired && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fbbf24",
          borderRadius: "16px",
          padding: "14px 16px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
          <span style={{ fontSize: "1.4rem" }}>⏰</span>
          <div>
            <strong style={{ fontSize: "0.85rem", color: "#92400e", display: "block" }}>
              This quiz week has ended
            </strong>
            <span style={{ fontSize: "0.78rem", color: "#a16207", lineHeight: 1.4 }}>
              Your completed challenges and scores are saved. Check back when a new quiz is published!
            </span>
          </div>
        </div>
      )}


      {/* Tabs / Sermon Replay & Slides */}
      {(() => {
        const hasSlides = slidesArray.length > 0;

        if (!quiz?.youtubeVideoId && !hasSlides) return null;

        return (
          <div style={{ background: "white", borderRadius: "20px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "20px", padding: "16px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              📖 Sermon Study Guide
            </h3>

            {hasSlides && quiz?.youtubeVideoId && (
              <div style={{ display: "flex", gap: "8px", background: "#f1f5f9", borderRadius: "10px", padding: "4px", marginBottom: "16px" }}>
                <button
                  onClick={() => setActiveTab("video")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: activeTab === "video" ? "#fff" : "transparent",
                    color: activeTab === "video" ? "#0f172a" : "#64748b",
                    boxShadow: activeTab === "video" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  📺 Livestream Replay
                </button>
                <button
                  onClick={() => setActiveTab("slides")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    background: activeTab === "slides" ? "#fff" : "transparent",
                    color: activeTab === "slides" ? "#0f172a" : "#64748b",
                    boxShadow: activeTab === "slides" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  📽️ Sermon Slides
                </button>
              </div>
            )}

            {activeTab === "video" && quiz?.youtubeVideoId ? (
              <CleanYoutubePlayer videoId={quiz.youtubeVideoId} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Commentary Text */}
                {quiz?.commentary && (
                  <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", border: "1px solid #edf2f7", fontSize: "0.9rem", color: "#334155", maxHeight: "250px", overflowY: "auto" }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px", letterSpacing: "0.05em" }}>
                      📝 Sermon Commentary & Takeaways
                    </span>
                    {renderFormattedCommentary(quiz.commentary)}
                  </div>
                )}

                {/* Slide Carousel (Below Text) */}
                {slidesArray.length > 0 && (
                  <div>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px", letterSpacing: "0.05em" }}>
                      📽️ Sermon Slide Deck ({slidesArray.length} Slides)
                    </span>
                    
                    {/* Aspect Ratio 16:9 Frame */}
                    <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000", borderRadius: "12px", overflow: "hidden" }}>
                      <img
                        src={slidesArray[activeSlide].startsWith("/") ? slidesArray[activeSlide] : `/uploads/presentations/slides/${slidesArray[activeSlide]}`}
                        alt={`Sermon slide ${activeSlide + 1}`}
                        onClick={() => setLightboxSrc(slidesArray[activeSlide].startsWith("/") ? slidesArray[activeSlide] : `/uploads/presentations/slides/${slidesArray[activeSlide]}`)}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          cursor: "zoom-in",
                        }}
                      />

                      {/* Slide controls overlay */}
                      {slidesArray.length > 1 && (
                        <>
                          <button
                            onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : slidesArray.length - 1))}
                            style={{
                              position: "absolute",
                              left: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              border: "none",
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => setActiveSlide((prev) => (prev < slidesArray.length - 1 ? prev + 1 : 0))}
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              border: "none",
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              zIndex: 10,
                            }}
                          >
                            ▶
                          </button>
                        </>
                      )}

                      {/* Page Indicator Overlay */}
                      <div style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 8px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700 }}>
                        Slide {activeSlide + 1} of {slidesArray.length}
                      </div>
                    </div>

                    {/* Thumbnail Strip */}
                    {slidesArray.length > 1 && (
                      <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginTop: "10px", paddingBottom: "6px", scrollBehavior: "smooth" }}>
                        {slidesArray.map((slideName: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => setActiveSlide(i)}
                            style={{
                              flexShrink: 0,
                              width: "80px",
                              height: "45px",
                              borderRadius: "6px",
                              overflow: "hidden",
                              border: activeSlide === i ? `2px solid ${PRIMARY}` : "2px solid transparent",
                              padding: 0,
                              background: "#000",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={slideName.startsWith("/") ? slideName : `/uploads/presentations/slides/${slideName}`}
                              alt={`Thumb ${i + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Download Button */}
                {quiz?.presentationFile && (
                  <a
                    href={quiz.presentationFile}
                    download
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: PRIMARY,
                      color: "white",
                      padding: "12px",
                      borderRadius: "10px",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      boxShadow: `0 4px 10px ${PRIMARY}30`,
                      textAlign: "center",
                    }}
                  >
                    📥 Download Sermon Slide Deck (.pptx)
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Weekly Progress & Points */}
      <div style={{ background: "white", borderRadius: "20px", padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569", marginBottom: "12px" }}>
          📈 Weekly Progress & Points
        </h3>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#64748b", marginBottom: "6px" }}>
          <span>Completed: {progress?.completed}/7 days</span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>Score: {progress?.totalScore}/7</span>
        </div>
        {/* Progress Bar */}
        <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ width: `${((progress?.completed || 0) / 7) * 100}%`, height: "100%", background: PRIMARY, borderRadius: "10px", transition: "width 0.4s ease" }} />
        </div>

        {/* Reward info */}
        {progress?.isWeekComplete ? (
          <div style={{ background: `${PRIMARY}10`, border: `1px solid ${PRIMARY}30`, borderRadius: "12px", padding: "12px 14px", display: "flex", gap: "10px", alignItems: "center" }}>
            {progress.rewardDisplay?.imageUrl ? (
              <div style={{ width: 44, height: 44, borderRadius: "8px", overflow: "hidden", flexShrink: 0, border: "1px solid #cbd5e1" }}>
                <img
                  src={progress.rewardDisplay.imageUrl.startsWith("http") || progress.rewardDisplay.imageUrl.startsWith("/") ? progress.rewardDisplay.imageUrl : `/uploads/${progress.rewardDisplay.imageUrl}`}
                  alt="Reward"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ) : (
              <div style={{ fontSize: "1.8rem", flexShrink: 0 }}>
                {progress.rewardTier === "PERFECT" ? "🏆" : "🎁"}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "0.88rem", color: "#0f172a", display: "block" }}>
                {progress.rewardDisplay?.label}
              </strong>
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                {progress.rewardDisplay?.description}
              </span>
            </div>
          </div>
        ) : (
          <p style={{ color: "#64748b", fontSize: "0.8rem", margin: 0, fontStyle: "italic", textAlign: "center" }}>
            Complete all 7 days to unlock your weekly reward tier!
          </p>
        )}

        {/* Announced Weekly Rewards Preview */}
        {quizStatus.rewardItems && quizStatus.rewardItems.length > 0 && (
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <h4 style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
              🎁 This Week's Prizes
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {quizStatus.rewardItems.map((item: any) => {
                const tierLabels: Record<string, string> = {
                  PERFECT: "🏆 Perfect (7/7)",
                  EXCELLENT: "🌟 Excellent (6/7)",
                  GOOD: "👏 Good (5/7 or 4/7)",
                  PARTICIPANT: "🙏 Participant",
                };
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "8px 10px", borderRadius: "10px" }}>
                    {item.imageUrl ? (
                      <div style={{ width: 36, height: 36, borderRadius: "6px", overflow: "hidden", flexShrink: 0, border: "1px solid #e2e8f0" }}>
                        <img
                          src={item.imageUrl.startsWith("http") || item.imageUrl.startsWith("/") ? item.imageUrl : `/uploads/${item.imageUrl}`}
                          alt="Prize"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontSize: "1.3rem", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "6px", flexShrink: 0 }}>
                        {item.rewardTier === "PERFECT" ? "🏆" : "🎁"}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "4px" }}>
                        <strong style={{ fontSize: "0.82rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</strong>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: item.rewardTier === "PERFECT" ? "#d97706" : "#2563eb", background: item.rewardTier === "PERFECT" ? "#fef3c7" : "#eff6ff", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}>
                          {tierLabels[item.rewardTier] || item.rewardTier}
                        </span>
                      </div>
                      {item.description && (
                        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Claim Reward Box for PERFECT score */}
      {showClaimBox && (
        <div style={{ background: "white", borderRadius: "20px", padding: "20px", border: `2px solid ${PRIMARY}`, boxShadow: "0 4px 20px rgba(78,177,203,0.15)", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginBottom: "6px" }}>
            🎉 Claim Your T-Shirt!
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5, marginBottom: "16px" }}>
            You got a perfect score! Let us know your T-shirt size and contact number so we can prepare your prize.
          </p>
          {claimSuccessMsg ? (
            <p style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
              {claimSuccessMsg}
            </p>
          ) : (
            <form onSubmit={handleClaimReward} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>T-Shirt Size</label>
                <select
                  value={tShirtSize}
                  onChange={(e) => setTShirtSize(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem" }}
                  required
                >
                  <option value="">Select Size...</option>
                  <option value="XS">Extra Small (XS)</option>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                  <option value="XXL">Double Extra Large (XXL)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>Contact Number</label>
                <input
                  type="tel"
                  value={claimPhone}
                  onChange={(e) => setClaimPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.9rem", boxSizing: "border-box" }}
                  required
                />
              </div>
              {claimError && <p style={{ color: "#ef4444", fontSize: "0.8rem", margin: 0 }}>{claimError}</p>}
              <button
                type="submit"
                disabled={claiming}
                style={{ background: PRIMARY, color: "white", padding: "12px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer", marginTop: "4px" }}
              >
                {claiming ? "Submitting..." : "Submit Claim"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Claimed Status Box */}
      {progress?.isWeekComplete && progress.rewardClaim?.claimStatus === "claimed" && (
        <div style={{ background: "white", borderRadius: "20px", padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "1.8rem" }}>👕</div>
          <div>
            <strong style={{ fontSize: "0.88rem", color: "#0f172a", display: "block" }}>T-Shirt Claim Details Submitted</strong>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Size: {progress.rewardClaim.claimDetails?.size} | Status: Pending distribution this Sunday
            </span>
          </div>
        </div>
      )}

      {/* Claimed Status Box - Distributed */}
      {progress?.isWeekComplete && progress.rewardClaim?.claimStatus === "distributed" && (
        <div style={{ background: "white", borderRadius: "20px", padding: "16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "1.8rem" }}>✅</div>
          <div>
            <strong style={{ fontSize: "0.88rem", color: "#0f172a", display: "block" }}>Reward Received!</strong>
            <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>
              Reward distributed successfully. Thank you for playing!
            </span>
          </div>
        </div>
      )}

      {/* Daily Quiz Grid */}
      <h3 style={{ fontSize: "0.85rem", fontWeight: 800, color: "#475569", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        📅 Daily Challenges
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {days?.map((day) => {
          const isCompleted = day.status === "completed";
          const isLocked = day.status === "locked";
          const isToday = day.status === "today";
          const isAvailable = day.status === "available";
          const isDayExpired = day.status === "expired";
          const isPastQuizView = !!(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("quizId")) && !quizStatus?.isActiveQuiz;

          return (
            <button
              key={day.questionId}
              onClick={() => handleStartDay(day)}
              disabled={isLocked || isDayExpired}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                background: "white",
                border: isToday
                  ? `2px solid ${PRIMARY}`
                  : "1px solid #e2e8f0",
                boxShadow: isToday
                  ? `0 0 15px ${PRIMARY}25`
                  : "0 1px 3px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "left",
              cursor: isLocked || isDayExpired ? "not-allowed" : "pointer",
                opacity: isLocked || isDayExpired ? 0.65 : 1,
                outline: "none",
                transition: "transform 0.15s, border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Status Indicator */}
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: isCompleted
                    ? (day.isCorrect ? "#16a34a15" : "#dc262615")
                    : (isToday ? `${PRIMARY}15` : (isAvailable ? `${PRIMARY}10` : "#f1f5f9")),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}>
                  {isCompleted ? (day.isCorrect ? "✅" : "😅") : day.typeEmoji}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{day.label}</strong>
                    {isToday && (
                      <span style={{ background: PRIMARY, color: "white", fontSize: "0.6rem", fontWeight: 800, padding: "2px 6px", borderRadius: "10px", textTransform: "uppercase" }}>
                        Today
                      </span>
                    )}
                    {isAvailable && (
                      <span style={{ background: `${PRIMARY}20`, color: PRIMARY, fontSize: "0.6rem", fontWeight: 800, padding: "2px 6px", borderRadius: "10px", textTransform: "uppercase" }}>
                        Catch-up
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                    {day.typeLabel} · <span style={{ color: "#475569" }}>{day.difficulty}</span>
                  </span>
                </div>
              </div>

              <div>
                {isCompleted ? (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: day.isCorrect ? "#16a34a15" : "#64748b15",
                    color: day.isCorrect ? "#16a34a" : "#64748b",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {day.isCorrect ? "🏆 +1 Point" : "💡 Learned"}
                  </span>
                ) : isLocked ? (
                  <span style={{ fontSize: "1.1rem" }}>🔒</span>
                ) : isDayExpired ? (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: "#fef2f2",
                    color: "#dc2626",
                    display: "inline-flex",
                    alignItems: "center"
                  }}>
                    Missed
                  </span>
                ) : isPastQuizView ? (
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "4px 8px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#94a3b8",
                    display: "inline-flex",
                    alignItems: "center"
                  }}>
                    Not Played
                  </span>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: PRIMARY, fontWeight: 700 }}>PLAY →</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Question Player */}
      {activeQuestion && (
        <QuizPlayer
          question={activeQuestion}
          onComplete={() => {
            setActiveQuestion(null);
            loadStatus();
          }}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      {/* Custom Info Modal */}
      <ConfirmModal
        open={infoModal.open}
        title={infoModal.title}
        message={infoModal.message}
        confirmLabel="Close"
        confirmColor="teal"
        cancelLabel={null}
        onConfirm={() => setInfoModal({ open: false, title: "", message: "" })}
        onCancel={() => setInfoModal({ open: false, title: "", message: "" })}
      />

      {lightboxSrc && (
        <ImageLightbox
          src={slidesArray[activeSlide].startsWith("/") ? slidesArray[activeSlide] : `/uploads/presentations/slides/${slidesArray[activeSlide]}`}
          onClose={() => setLightboxSrc(null)}
          onPrev={handlePrevSlide}
          onNext={handleNextSlide}
          currentIndex={activeSlide}
          totalSlides={slidesArray.length}
        />
      )}
    </div>
  );
}

// ── Commentary Formatter Helpers ──
function renderFormattedCommentary(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    let cleanLine = line.trim();
    if (!cleanLine) return <div key={idx} style={{ height: "12px" }} />;

    if (cleanLine.startsWith("###")) {
      return (
        <h4 key={idx} style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", marginTop: "14px", marginBottom: "6px" }}>
          {cleanLine.replace("###", "").trim()}
        </h4>
      );
    }
    if (cleanLine.startsWith("##")) {
      return (
        <h3 key={idx} style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "18px", marginBottom: "8px" }}>
          {cleanLine.replace("##", "").trim()}
        </h3>
      );
    }
    if (cleanLine.startsWith("#")) {
      return (
        <h2 key={idx} style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", marginTop: "22px", marginBottom: "10px" }}>
          {cleanLine.replace("#", "").trim()}
        </h2>
      );
    }

    if (cleanLine.startsWith("* ") || cleanLine.startsWith("- ")) {
      const bulletText = cleanLine.substring(2).trim();
      return (
        <li key={idx} style={{ marginLeft: "14px", marginBottom: "4px", fontSize: "0.85rem", color: "#475569", lineHeight: 1.45 }}>
          {parseBoldText(bulletText)}
        </li>
      );
    }

    return (
      <p key={idx} style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.45, margin: "0 0 8px 0" }}>
        {parseBoldText(cleanLine)}
      </p>
    );
  });
}

function parseBoldText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ fontWeight: 700, color: "#0f172a" }}>{part}</strong>;
    }
    return part;
  });
}
