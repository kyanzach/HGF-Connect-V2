"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CommentDrawer from "./CommentDrawer";
import CleanYoutubePlayer from "@/components/quiz/CleanYoutubePlayer";
import CleanEmbedPlayer from "@/components/feed/CleanEmbedPlayer";
import QuizPlayer from "@/components/quiz/QuizPlayer";
import ConfirmModal from "@/components/ConfirmModal";
import BirthdayCircle from "@/components/feed/BirthdayCircle";

const PRIMARY = "#4EB1CB";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

function getPostBgStyle(bgName: string | null | undefined): React.CSSProperties | undefined {
  if (!bgName) return undefined;
  switch (bgName) {
    case "bg:teal":
      return {
        background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
        color: "#ffffff",
      };
    case "bg:red":
      return {
        background: "linear-gradient(135deg, #991b1b 0%, #ef4444 100%)",
        color: "#ffffff",
      };
    case "bg:mountain":
      return {
        background: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/backgrounds/mountain.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#ffffff",
      };
    case "bg:ocean":
      return {
        background: "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/backgrounds/ocean.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "#ffffff",
      };
    default:
      return undefined;
  }
}


interface PostCardProps {
  post: {
    id: number;
    type: string;
    content?: string | null;
    imageUrl?: string | null;
    aiCaption?: string | null;
    verseRef?: string | null;
    verseText?: string | null;
    linkUrl?: string | null;
    linkTitle?: string | null;
    linkDesc?: string | null;
    linkImage?: string | null;
    createdAt: Date | string;
    author: {
      id: number;
      firstName: string;
      lastName: string;
      profilePicture?: string | null;
      username?: string | null;
    };
    _count?: { likes: number; comments: number };
    isLiked?: boolean;
  };
}

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

const TYPE_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  TEXT:          { icon: "✍️",  label: "Reflection",    color: "#6c757d" },
  DEVO:          { icon: "📖",  label: "Devotional",    color: PRIMARY },
  VERSE_CARD:    { icon: "📜",  label: "Bible Verse",   color: "#805AD5" },
  PRAYER:        { icon: "🙏",  label: "Prayer",        color: "#E67E22" },
  PRAISE:        { icon: "🙌",  label: "Testimony",     color: "#27AE60" },
  EVENT:         { icon: "📅",  label: "Event",         color: "#E74C3C" },
  PROFILE_PHOTO: { icon: "📷",  label: "Profile Photo", color: "#0ea5e9" },
  COVER_PHOTO:   { icon: "🖼️", label: "Cover Photo",   color: "#8b5cf6" },
  QUIZ_ANNOUNCEMENT: { icon: "🧠", label: "Quiz Week",       color: PRIMARY },
  QUIZ_DAILY:        { icon: "🧠", label: "Daily Challenge", color: PRIMARY },
  BIRTHDAY_MONTHLY:  { icon: "🎂",  label: "Monthly Celebrants", color: "#f59e0b" },
  BIRTHDAY_DAILY:    { icon: "🎉",  label: "Happy Birthday", color: "#f59e0b" },
};

export default function PostCard({ post }: PostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    title: string;
    message: string | React.ReactNode;
  }>({ open: false, title: "", message: "" });
  const [celebrantsExpanded, setCelebrantsExpanded] = useState(false);

  function extractYoutubeIdFromThumbnail(url: string | null | undefined): string | null {
    if (!url) return null;
    const match = url.match(/vi\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  async function handlePlayQuiz() {
    if (loadingQuiz) return;
    setLoadingQuiz(true);
    try {
      const res = await fetch("/api/quiz/status");
      if (!res.ok) throw new Error("Failed to load quiz status");
      const data = await res.json();
      
      if (!data.active) {
        setInfoModal({
          open: true,
          title: "No Active Quiz",
          message: "There is no active quiz week at the moment."
        });
        return;
      }

      // Check attendance gating
      if (data.attended === false) {
        setInfoModal({
          open: true,
          title: "Join Us in the House!",
          message: "We missed you at our physical Sunday Service! The Quiz for Christ is a special blessing reserved for those who gather with us in person. We warmly invite you to join our next Sunday Service at the physical church to experience the fellowship, worship, and Word together.",
        });
        return;
      }

      // Determine day number
      let targetDayNum = 1;
      if (post.type === "QUIZ_DAILY") {
        const match = post.content?.match(/Day (\d+)/);
        if (match) {
          targetDayNum = parseInt(match[1], 10);
        }
      }

      const day = data.days?.find((d: any) => d.dayNumber === targetDayNum);
      if (!day) {
        setInfoModal({
          open: true,
          title: "Challenge Not Found",
          message: `Could not find challenge details for Day ${targetDayNum}.`
        });
        return;
      }

      if (day.status === "locked") {
        setInfoModal({
          open: true,
          title: "Challenge Locked",
          message: "This daily challenge is locked. Check back on the scheduled day!"
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
                <span style={{ fontWeight: 600, color: "#0f172a" }}>Awesome job! You've already conquered this challenge.</span>
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

      // Load specific question details
      const qRes = await fetch(`/api/quiz/question?id=${day.questionId}`);
      if (!qRes.ok) {
        const qErr = await qRes.json().catch(() => ({}));
        if (qErr.error === "Quiz is not active") {
          setInfoModal({
            open: true,
            title: "Quiz Week Completed! 🎉",
            message: "This weekly challenge has already ended. Don't worry! You can check all past quizzes, correct answers, and climb the leaderboard in the Quiz Hub. Get ready for the next weekly quiz starting next Monday at 7:00 AM Manila Time!",
          });
          return;
        }
        throw new Error(qErr.error || "Failed to load question details");
      }
      const qData = await qRes.json();
      setActiveQuestion({
        questionId: day.questionId,
        dayNumber: day.dayNumber,
        type: day.type,
        questionText: qData.questionText,
        options: qData.options,
        hint: qData.hint,
      });

    } catch (err: any) {
      setInfoModal({
        open: true,
        title: "Error",
        message: err?.message || "Could not launch today's challenge. Please try again."
      });
    } finally {
      setLoadingQuiz(false);
    }
  }

  // Deep-link: ?post=ID auto-opens this card's comment drawer
  useEffect(() => {
    const targetId = searchParams.get("post");
    if (targetId && parseInt(targetId) === post.id && !commentsOpen) {
      setCommentsOpen(true);
      // Scroll card into view smoothly
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("post");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  useEffect(() => {
    const poll = async () => {
      try {
        const d = await fetch(`/api/posts/${post.id}/count`).then((r) => r.json());
        setCommentCount(d.commentCount ?? 0);
        setLikeCount(d.likeCount ?? 0);
      } catch { /* silent */ }
    };
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [post.id]);

  const isQuizPost = post.type === "QUIZ_ANNOUNCEMENT" || post.type === "QUIZ_DAILY";
  const isBirthdayPost = post.type === "BIRTHDAY_MONTHLY" || post.type === "BIRTHDAY_DAILY";
  const isEventPost = post.type === "EVENT";
  const isChurchPost = isBirthdayPost || isEventPost;

  const authorName = isQuizPost 
    ? "HGF Quiz For Christ" 
    : isChurchPost 
    ? "House of Grace Fellowship" 
    : `${post.author.firstName} ${post.author.lastName}`;
  const initials = isQuizPost 
    ? "🧠" 
    : isChurchPost 
    ? "⛪" 
    : `${post.author.firstName[0]}${post.author.lastName[0]}`.toUpperCase();
  const typeInfo = TYPE_LABELS[post.type] ?? TYPE_LABELS.TEXT;
  const profilePic = (isQuizPost || isChurchPost)
    ? null
    : post.author.profilePicture
    ? `/uploads/profile_pictures/${post.author.profilePicture}`
    : null;
  const isOwnPost = session?.user?.id === String(post.author.id);
  const isAdminOrMod = session?.user?.role === "admin" || session?.user?.role === "moderator";
  const canDelete = isOwnPost || isAdminOrMod;

  // Parse birthday data if applicable
  let monthlyData: { month: string; celebrants: any[] } | null = null;
  if (post.type === "BIRTHDAY_MONTHLY" && post.content) {
    try {
      monthlyData = JSON.parse(post.content);
      if (monthlyData && Array.isArray(monthlyData.celebrants)) {
        monthlyData.celebrants = [...monthlyData.celebrants].sort((a, b) => (a.birthDay || 0) - (b.birthDay || 0));
      }
    } catch (e) {
      console.error("Failed to parse BIRTHDAY_MONTHLY content", e);
    }
  }

  let dailyData: {
    memberId: number;
    name: string;
    profilePicture: string | null;
    message: string;
    verseRef: string;
    verseText: string;
    birthMonth?: number;
    birthDay?: number;
  } | null = null;
  if (post.type === "BIRTHDAY_DAILY" && post.content) {
    try {
      dailyData = JSON.parse(post.content);
    } catch (e) {
      console.error("Failed to parse BIRTHDAY_DAILY content", e);
    }
  }

  let dailyBirthMonth = dailyData?.birthMonth;
  let dailyBirthDay = dailyData?.birthDay;
  if (post.type === "BIRTHDAY_DAILY" && !dailyBirthMonth && post.createdAt) {
    const postDate = new Date(post.createdAt);
    dailyBirthMonth = postDate.getMonth() + 1;
    dailyBirthDay = postDate.getDate();
  }

  async function toggleLike() {
    if (!session || loading) return;
    setLoading(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((p) => (wasLiked ? p - 1 : p + 1));
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked(wasLiked);
      setLikeCount((p) => (wasLiked ? p + 1 : p - 1));
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/feed?post=${post.id}`;
    if (navigator.share) {
      navigator.share({ title: `${authorName} on HGF Connect`, text: post.content ?? "", url });
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setInfoModal({
          open: true,
          title: "Link Copied",
          message: "The shareable link has been copied to your clipboard. 📋",
        });
      });
    }
  }

  async function handleDelete() {
    setDeleteConfirmOpen(true);
    setMenuOpen(false);
  }

  return (
    <>
      <div
        ref={cardRef}
        style={{ background: "white", borderRadius: "16px", marginBottom: "0.75rem", overflow: "visible", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", position: "relative" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "0.875rem 1rem 0.5rem", gap: "0.625rem" }}>
          {/* Avatar */}
          <button
            onClick={() => router.push(isQuizPost ? "/quiz/hub" : isChurchPost ? "/church" : `/member/${post.author.id}`)}
            aria-label={isQuizPost ? "View Quiz Brand Hub" : isChurchPost ? "View Church Page" : `View ${authorName}'s profile`}
            style={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "none", padding: 0, cursor: "pointer", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {profilePic ? (
              <img src={profilePic} alt={authorName} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : (
              <span style={{ color: "white", fontWeight: 700, fontSize: "0.875rem" }}>{initials}</span>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => router.push(isQuizPost ? "/quiz/hub" : isChurchPost ? "/church" : `/member/${post.author.id}`)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>{authorName}</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{timeAgo(post.createdAt)}</span>
              <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>·</span>
              <span style={{ fontSize: "0.6875rem", color: typeInfo.color, fontWeight: 600 }}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              {post.type === "BIRTHDAY_DAILY" && dailyBirthMonth && (
                <>
                  <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>·</span>
                  <span style={{ fontSize: "0.6875rem", color: "#f59e0b", fontWeight: 700 }}>
                    🎂 {MONTH_NAMES[dailyBirthMonth - 1]} {dailyBirthDay}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Three-dots menu */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{ background: "none", border: "none", fontSize: "1.1rem", color: "#94a3b8", cursor: "pointer", padding: "4px 8px", borderRadius: "8px" }}
            >•••</button>
            {menuOpen && (
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 10 }}
              />
            )}
            {menuOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "white", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", minWidth: 160, zIndex: 11, overflow: "hidden" }}>
                <button onClick={() => { setMenuOpen(false); router.push(isQuizPost ? "/quiz/hub" : isChurchPost ? "/church" : `/member/${post.author.id}`); }} style={menuItemStyle}>👤 {isQuizPost ? "View Brand Hub" : isChurchPost ? "View Church Page" : "View Profile"}</button>
                <button onClick={() => { setMenuOpen(false); setCommentsOpen(true); }} style={menuItemStyle}>💬 View Comments</button>
                {canDelete && <button onClick={handleDelete} style={{ ...menuItemStyle, color: "#ef4444" }}>🗑️ Delete Post</button>}
                <button onClick={() => { setMenuOpen(false); handleShare(); }} style={menuItemStyle}>📤 Share Post</button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {post.type === "EVENT" && post.content ? (() => {
          // Extract event ID from [event:123] marker
          const eventMatch = post.content.match(/\[event:(\d+)\]/);
          const eventId = eventMatch ? eventMatch[1] : null;
          const displayContent = post.content.replace(/\n?\[event:\d+\]/, "").trim();
          const eventHref = eventId ? `/event/${eventId}` : "/events";

          return (
            <a href={eventHref} style={{ display: "block", margin: "0 0.75rem 0.5rem", borderRadius: "14px", overflow: "hidden", position: "relative", textDecoration: "none", cursor: "pointer" }}>
              {/* Background — cover photo or gradient */}
              <div style={{
                background: post.imageUrl
                  ? `url(${post.imageUrl.startsWith("/") ? post.imageUrl : `/${post.imageUrl}`})`
                  : "linear-gradient(135deg, #0f2d3d 0%, #1a5276 50%, #2980b9 100%)",
                backgroundSize: "cover", backgroundPosition: "center",
                padding: "1.5rem 1.125rem 1.25rem", position: "relative",
              }}>
                {/* Dark overlay for readability */}
                <div style={{ position: "absolute", inset: 0, background: post.imageUrl ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.15)", borderRadius: "14px" }} />
                <div style={{ position: "relative", zIndex: 1, color: "white" }}>
                  {displayContent.split("\n").filter(Boolean).map((line, i) => (
                    <div key={i} style={{
                      fontSize: i === 0 ? "1rem" : "0.82rem",
                      fontWeight: i === 0 ? 800 : 500,
                      marginBottom: i === 0 ? "0.625rem" : "0.25rem",
                      opacity: i === 0 ? 1 : 0.92,
                      lineHeight: 1.4,
                      textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    }}>
                      {line}
                    </div>
                  ))}
                  <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8 }}>
                    View Event →
                  </div>
                </div>
              </div>
            </a>
          );
        })() : (
          <>
            {post.imageUrl && post.imageUrl.startsWith("bg:") ? (
              <div
                style={{
                  margin: "0 0.75rem 0.5rem",
                  borderRadius: "14px",
                  minHeight: "260px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem",
                  boxSizing: "border-box",
                  textAlign: "center",
                  wordBreak: "break-word",
                  ...getPostBgStyle(post.imageUrl),
                }}
              >
                <div style={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  lineHeight: 1.5,
                  textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                  whiteSpace: "pre-line",
                }}>
                  {post.content}
                </div>
              </div>
            ) : (
              post.content && post.type !== "BIRTHDAY_MONTHLY" && post.type !== "BIRTHDAY_DAILY" && (
                <div style={{ padding: "0 1rem 0.5rem", fontSize: "0.9375rem", color: "#334155", lineHeight: 1.65, whiteSpace: "pre-line" }}>
                  {post.content}
                </div>
              )
            )}

            {/* Birthday Monthly Layout */}
            {post.type === "BIRTHDAY_MONTHLY" && monthlyData && (
              <div style={{ padding: "0 1rem 0.75rem" }}>
                {/* Words of Celebration & Encouragement */}
                <div style={{
                  fontSize: "0.9375rem",
                  color: "#334155",
                  lineHeight: 1.65,
                  marginBottom: "12px",
                  fontWeight: 500
                }}>
                  🎉 Welcome to the month of <strong>{monthlyData.month}</strong>! As one HGF family, we praise God for the gift of life and celebrate the birthdays of our beloved brothers and sisters born in this special month. May the Lord guide your steps, surround you with His favor, and shower you with His abundant grace in this new season of your lives! 🎂🎈
                </div>

                {/* Encouragement Verse Block */}
                <div style={{
                  background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)",
                  borderRadius: "12px",
                  padding: "1rem",
                  color: "white",
                  margin: "12px 0",
                  boxShadow: "0 2px 8px rgba(78, 177, 203, 0.12)",
                }}>
                  <div style={{ fontSize: "1.25rem", opacity: 0.5, lineHeight: 1, marginBottom: "0.25rem" }}>❝</div>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 0.5rem", fontStyle: "italic" }}>
                    &ldquo;For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.&rdquo;
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.625rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600 }}>
                      — Jeremiah 29:11
                    </span>
                  </div>
                </div>

                {/* Rotating Showcase Circle */}
                <BirthdayCircle month={monthlyData.month} celebrants={monthlyData.celebrants} />

                {/* List of Celebrants with Birthdates */}
                <div style={{
                  marginTop: "16px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxSizing: "border-box",
                  position: "relative",
                }}>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.82rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    🎂 {monthlyData.month} Celebrants:
                  </h4>
                  <div style={{
                    position: "relative",
                    overflow: "hidden",
                    paddingBottom: (monthlyData.celebrants.length > 7 && !celebrantsExpanded) ? "20px" : "0",
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>
                      {(celebrantsExpanded ? monthlyData.celebrants : monthlyData.celebrants.slice(0, 10)).map((c: any) => {
                        const initials = c.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                        return (
                          <button
                            key={c.id}
                            onClick={() => router.push(`/member/${c.id}`)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              background: "white",
                              padding: "8px 12px",
                              borderRadius: "10px",
                              border: "1px solid #f1f5f9",
                              cursor: "pointer",
                              textAlign: "left",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#4EB1CB";
                              e.currentTarget.style.transform = "translateY(-1px)";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(78,177,203,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#f1f5f9";
                              e.currentTarget.style.transform = "none";
                              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
                            }}
                          >
                            <div style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              background: PRIMARY,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "white"
                            }}>
                              {c.profilePicture ? (
                                <img
                                  src={c.profilePicture.startsWith("/") ? c.profilePicture : `/uploads/profile_pictures/${c.profilePicture}`}
                                  alt=""
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                              {c.birthDay && (
                                <span style={{ fontSize: "0.7rem", color: "#f59e0b", fontWeight: 700 }}>
                                  {monthlyData.month} {c.birthDay}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Gradient solid white/grey overlay for View More */}
                    {(monthlyData.celebrants.length > 7 && !celebrantsExpanded) && (
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: "100px",
                        background: "linear-gradient(to bottom, rgba(248, 250, 252, 0) 0%, rgba(248, 250, 252, 0.7) 40%, rgba(248, 250, 252, 1) 90%)",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        paddingBottom: "4px",
                        pointerEvents: "none",
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCelebrantsExpanded(true);
                          }}
                          style={{
                            background: "white",
                            border: "1px solid #e2e8f0",
                            borderRadius: "999px",
                            padding: "6px 16px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            color: "#475569",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                            cursor: "pointer",
                            pointerEvents: "auto",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontFamily: "inherit",
                          }}
                        >
                          View More ({monthlyData.celebrants.length - 7} more) ▾
                        </button>
                      </div>
                    )}
                  </div>

                  {celebrantsExpanded && monthlyData.celebrants.length > 7 && (
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCelebrantsExpanded(false);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#94a3b8",
                          cursor: "pointer",
                          padding: "4px 12px",
                          fontFamily: "inherit",
                        }}
                      >
                        Show Less ▴
                      </button>
                    </div>
                  )}
                </div>

                {/* Closing caption */}
                <div style={{
                  fontSize: "0.875rem",
                  color: "#64748b",
                  lineHeight: 1.5,
                  marginTop: "12px",
                  textAlign: "center",
                  fontStyle: "italic",
                }}>
                  We celebrate you today on behalf of your family here at House of Grace Fellowship! ❤️
                </div>
              </div>
            )}

            {/* Birthday Daily Layout */}
            {post.type === "BIRTHDAY_DAILY" && dailyData && (
              <div style={{ padding: "0 1rem 0.75rem" }}>
                <div style={{
                  background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                  border: "1px solid #fde68a",
                  borderRadius: "16px",
                  padding: "1.25rem",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}>
                  <div style={{
                    position: "relative",
                    width: "90px",
                    height: "90px",
                    borderRadius: "50%",
                    background: "white",
                    padding: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    border: "2px solid #f59e0b",
                    marginBottom: "12px",
                    cursor: "pointer",
                  }}
                  onClick={() => router.push(`/member/${dailyData.memberId}`)}
                  >
                    <div style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: PRIMARY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {dailyData.profilePicture ? (
                        <img
                          src={dailyData.profilePicture.startsWith("/") ? dailyData.profilePicture : `/uploads/profile_pictures/${dailyData.profilePicture}`}
                          alt={dailyData.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "white" }}>
                          {dailyData.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div style={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      background: "#f59e0b",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                      border: "2px solid white",
                    }}>
                      🎉
                    </div>
                  </div>

                  <h3 style={{
                    margin: "0 0 8px 0",
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "#78350f",
                  }}>
                    {dailyData.name}
                  </h3>

                  <p style={{
                    fontSize: "0.875rem",
                    color: "#451a03",
                    lineHeight: 1.6,
                    margin: "0 0 16px 0",
                    whiteSpace: "pre-line",
                  }}>
                    {dailyData.message}
                  </p>

                  {dailyData.verseText && (
                    <div style={{
                      background: "white",
                      borderLeft: "4px solid #f59e0b",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      width: "100%",
                      boxSizing: "border-box",
                      textAlign: "left",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}>
                      <div style={{
                        fontSize: "1.2rem",
                        color: "#f59e0b",
                        lineHeight: 1,
                        fontWeight: 700,
                        marginBottom: 2
                      }}>
                        ❝
                      </div>
                      <p style={{
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                        margin: "0 0 6px 0",
                        fontStyle: "italic",
                        color: "#78350f",
                      }}>
                        {dailyData.verseText}
                      </p>
                      <div style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#b45309",
                        textAlign: "right",
                      }}>
                        — {dailyData.verseRef}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image or Video Player */}
            {post.type === "QUIZ_ANNOUNCEMENT" ? (() => {
              const youtubeVideoId = extractYoutubeIdFromThumbnail(post.imageUrl);
              if (youtubeVideoId) {
                return (
                  <div style={{ margin: "0.25rem 0" }}>
                    <CleanYoutubePlayer videoId={youtubeVideoId} />
                  </div>
                );
              }
              return post.imageUrl && !post.imageUrl.startsWith("bg:") ? (
                <div style={{ margin: "0.25rem 0" }}>
                  <img
                    src={post.imageUrl.startsWith("http") || post.imageUrl.startsWith("/") ? post.imageUrl : `/uploads/${post.imageUrl}`}
                    alt="Post image"
                    style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "cover" }}
                  />
                </div>
              ) : null;
            })() : (
              <>
                {post.imageUrl && !post.imageUrl.startsWith("bg:") && (
                  <div style={{ margin: "0.25rem 0" }}>
                    <img
                      src={
                        post.imageUrl.startsWith("http") || post.imageUrl.startsWith("/")
                          ? post.imageUrl
                          : post.imageUrl.startsWith("uploads/")
                          ? `/${post.imageUrl}`
                          : `/uploads/${post.imageUrl}`
                      }
                      alt="Post image"
                      style={{ width: "100%", height: "auto", maxHeight: "300px", objectFit: "cover" }}
                    />
                  </div>
                )}

                {post.linkUrl && (() => {
                  const ytId = getYoutubeId(post.linkUrl);
                  if (ytId) {
                    return (
                      <div style={{ margin: "0.25rem 0" }}>
                        <CleanYoutubePlayer videoId={ytId} />
                      </div>
                    );
                  }
                  const isFb = /facebook\.com|fb\.watch/i.test(post.linkUrl);
                  if (isFb) {
                    return (
                      <div style={{ margin: "0.25rem 0" }}>
                        <CleanEmbedPlayer url={post.linkUrl} type="facebook" />
                      </div>
                    );
                  }
                  const isIg = /instagram\.com/i.test(post.linkUrl);
                  if (isIg) {
                    return (
                      <div style={{ margin: "0.25rem 0" }}>
                        <CleanEmbedPlayer url={post.linkUrl} type="instagram" />
                      </div>
                    );
                  }

                  // Standard OG link preview card
                  return (
                    <div style={{ margin: "0.5rem 1rem 0.75rem" }}>
                      <a
                        href={post.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none",
                          display: "block",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          overflow: "hidden",
                        }}
                      >
                        {post.linkImage && (
                          <img
                            src={post.linkImage}
                            alt={post.linkTitle || "Link preview"}
                            style={{ width: "100%", height: "140px", objectFit: "cover" }}
                          />
                        )}
                        <div style={{ padding: "0.75rem" }}>
                          <h4 style={{ margin: "0 0 0.25rem", fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>
                            {post.linkTitle || "Visit Link"}
                          </h4>
                          {post.linkDesc && (
                            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#64748b", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any, overflow: "hidden", lineHeight: 1.4 }}>
                              {post.linkDesc}
                            </p>
                          )}
                          <span style={{ fontSize: "0.7rem", color: PRIMARY, fontWeight: 600 }}>
                            🔗 {new URL(post.linkUrl).hostname}
                          </span>
                        </div>
                      </a>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Quiz CTA Buttons */}
            {post.type === "QUIZ_ANNOUNCEMENT" && (
              <div style={{ padding: "0 1rem 0.75rem", marginTop: "0.5rem" }}>
                <button
                  onClick={handlePlayQuiz}
                  disabled={loadingQuiz}
                  style={{
                    width: "100%",
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #38a89d 100%)`,
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 20px",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: loadingQuiz ? "not-allowed" : "pointer",
                    boxShadow: `0 4px 15px ${PRIMARY}30`,
                    opacity: loadingQuiz ? 0.7 : 1,
                  }}
                >
                  {loadingQuiz ? "⏳ Loading challenge..." : "🧠 Start This Week's Quiz →"}
                </button>
              </div>
            )}

            {post.type === "QUIZ_DAILY" && (
              <div style={{ padding: "0 1rem 0.75rem", marginTop: "0.5rem" }}>
                <button
                  onClick={handlePlayQuiz}
                  disabled={loadingQuiz}
                  style={{
                    width: "100%",
                    background: `linear-gradient(135deg, ${PRIMARY} 0%, #38a89d 100%)`,
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 20px",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: loadingQuiz ? "not-allowed" : "pointer",
                    boxShadow: `0 4px 15px ${PRIMARY}30`,
                    opacity: loadingQuiz ? 0.7 : 1,
                  }}
                >
                  {loadingQuiz ? "⏳ Loading challenge..." : "🎮 Play Today's Challenge →"}
                </button>
              </div>
            )}
          </>
        )}

        {/* AI Caption */}
        {post.aiCaption && post.type === "DEVO" && (
          <div style={{ margin: "0 1rem 0.5rem", background: "#f0f9ff", borderLeft: `3px solid ${PRIMARY}`, padding: "0.625rem 0.75rem", borderRadius: "0 8px 8px 0", fontSize: "0.875rem", color: "#334155", fontStyle: "italic" }}>
            {post.aiCaption}
          </div>
        )}

        {/* Verse card */}
        {post.verseText && (
          <div style={{ margin: "0.25rem 1rem 0.5rem", background: "linear-gradient(135deg, #2d8fa6 0%, #4EB1CB 100%)", borderRadius: "12px", padding: "1rem", color: "white" }}>
            <div style={{ fontSize: "1.25rem", opacity: 0.5, lineHeight: 1, marginBottom: "0.25rem" }}>❝</div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 0.5rem", fontStyle: "italic" }}>&ldquo;{post.verseText}&rdquo;</p>
            {post.verseRef && (
              <span style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", padding: "0.2rem 0.625rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>
                — {post.verseRef}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", borderTop: "1px solid #f1f5f9", padding: "0.1rem 0" }}>
          <button onClick={toggleLike} style={{ ...actionBtnStyle, color: liked ? "#ef4444" : "#64748b", fontWeight: liked ? 700 : 400 }}>
            {liked ? "❤️" : "🤍"} {likeCount > 0 && likeCount}
          </button>
          <button onClick={() => setCommentsOpen(true)} style={actionBtnStyle}>
            💬 {commentCount > 0 && commentCount}
          </button>
          <button onClick={handleShare} style={actionBtnStyle}>
            📤 Share
          </button>
        </div>
      </div>

      {/* Comment Drawer */}
      <CommentDrawer
        postId={post.id}
        postAuthorId={post.author.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={(delta) => setCommentCount((c) => c + delta)}
      />

      {/* Active Quiz Player */}
      {activeQuestion && (
        <QuizPlayer
          question={activeQuestion}
          onComplete={() => {
            setActiveQuestion(null);
            window.location.reload();
          }}
          onClose={() => setActiveQuestion(null)}
        />
      )}

      {/* Info Alert Modal */}
      <ConfirmModal
        open={infoModal.open}
        title={infoModal.title}
        message={infoModal.message}
        confirmLabel="Close"
        confirmColor={PRIMARY}
        cancelLabel={null} // Single-button style
        onConfirm={() => setInfoModal({ open: false, title: "", message: "" })}
        onCancel={() => setInfoModal({ open: false, title: "", message: "" })}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          setDeleteConfirmOpen(false);
          await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
          window.location.reload();
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </>
  );
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  gap: "0.375rem", padding: "0.625rem", background: "none", border: "none",
  cursor: "pointer", fontSize: "0.875rem", color: "#64748b", transition: "color 0.15s",
};

const menuItemStyle: React.CSSProperties = {
  display: "block", width: "100%", textAlign: "left",
  padding: "0.75rem 1rem", background: "none", border: "none",
  cursor: "pointer", fontSize: "0.875rem", color: "#334155",
};
