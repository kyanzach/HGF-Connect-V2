"use client";

/**
 * Quiz for Christ — Admin/Pastor Dashboard
 *
 * Sections:
 * 1. Create New Quiz Week (YouTube URL or manual text + AI generation)
 * 2. Preview & Edit generated quiz inline
 * 3. Manage active/past quizzes with rewards
 */

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const QUIZ_TYPE_LABELS: Record<string, { label: string; difficulty: string; emoji: string }> = {
  MULTIPLE_CHOICE:    { label: "Balloon Pop",       difficulty: "Easy",        emoji: "🎈" },
  FILL_IN_BLANKS:     { label: "Fill the Blanks",   difficulty: "Medium-Easy", emoji: "✏️" },
  SHORT_ANSWER:       { label: "In Your Own Words", difficulty: "Medium",      emoji: "📝" },
  SCRIPTURE_ORDERING: { label: "Verse Builder",     difficulty: "Medium-Hard", emoji: "🧩" },
  TRUE_FALSE_EXPLAIN: { label: "Defend Your Faith", difficulty: "Hard",        emoji: "⚖️" },
};

const DAY_ORDER = ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "SHORT_ANSWER", "SCRIPTURE_ORDERING", "TRUE_FALSE_EXPLAIN"];

interface GeneratedQuestion {
  dayNumber: number;
  questionType: string;
  questionText: string;
  correctAnswer: string;
  options: any;
  hint: string;
  explanation: string;
}

export default function QuizAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ── Form state ──
  const [title, setTitle] = useState("");
  const [sermonDate, setSermonDate] = useState("");
  const [sermonText, setSermonText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedEvent, setLinkedEvent] = useState<any | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  useEffect(() => {
    setLoadingEvent(true);
    fetch("/api/quiz/admin/latest-sunday")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setLinkedEvent(data);
          // Format eventDate (YYYY-MM-DD) for API compatibility
          const d = new Date(data.eventDate);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setSermonDate(`${yyyy}-${mm}-${dd}`);
        } else {
          setLinkedEvent(null);
          setSermonDate("");
        }
      })
      .catch(() => {
        setLinkedEvent(null);
        setSermonDate("");
      })
      .finally(() => setLoadingEvent(false));
  }, []);

  // ── Alert state ──
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

  function showAlert(title: string, message: string, type: "success" | "error" | "info" = "info") {
    setAlertModal({ open: true, title, message, type });
  }

  // ── Generation state ──
  const [generating, setGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [transcriptSource, setTranscriptSource] = useState<string | null>(null);
  const [genError, setGenError] = useState("");

  // ── Saved quiz state ──
  const [savedQuizId, setSavedQuizId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // ── Existing quizzes ──
  const [existingQuizzes, setExistingQuizzes] = useState<any[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // ── Rewards ──
  const [rewards, setRewards] = useState<any[]>([]);
  const [selectedQuizForRewards, setSelectedQuizForRewards] = useState<number | null>(null);

  // ── Load existing quizzes ──
  const loadQuizzes = useCallback(async () => {
    try {
      const res = await fetch("/api/quiz/admin/list");
      if (res.ok) {
        const data = await res.json();
        setExistingQuizzes(data);
      }
    } catch {} finally {
      setLoadingQuizzes(false);
    }
  }, []);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  // ── Generate quiz via AI ──
  async function handleGenerate() {
    if (!linkedEvent) {
      setGenError("No physical Sunday Service event found to link the sermon to. Please add a Sunday Service event first.");
      return;
    }
    if (!sermonText || !sermonText.trim()) {
      setGenError("Please paste the sermon notes or transcript script first");
      return;
    }

    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sermonText, sermonDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTitle(data.title || "");
      setGeneratedCaption(data.announcementCaption);
      setGeneratedQuestions(data.questions);
      setTranscriptSource(data.transcriptSource);
    } catch (err: any) {
      setGenError(err?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  // ── Save as draft ──
  async function handleSave() {
    if (!linkedEvent) {
      showAlert("Error", "No linked Sunday Service event found. You must have a physical Sunday Service event to save a quiz.", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: savedQuizId,
          title,
          sermonDate,
          youtubeUrl: youtubeUrl || null,
          transcriptText: sermonText || null,
          announcementCaption: generatedCaption,
          questions: generatedQuestions,
          eventId: linkedEvent.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedQuizId(data.quizId);
      loadQuizzes();
      showAlert("Success", "✅ Saved as draft!", "success");
    } catch (err: any) {
      showAlert("Error", "Save failed: " + (err?.message || "Unknown error"), "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Publish ──
  async function handlePublish() {
    if (!linkedEvent) {
      showAlert("Error", "No linked Sunday Service event found. You must have a physical Sunday Service event to publish a quiz.", "error");
      return;
    }
    if (!savedQuizId) {
      // Auto-save first
      setSaving(true);
      try {
        const res = await fetch("/api/quiz/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            sermonDate,
            youtubeUrl: youtubeUrl || null,
            transcriptText: sermonText || null,
            announcementCaption: generatedCaption,
            questions: generatedQuestions,
            eventId: linkedEvent.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSavedQuizId(data.quizId);

        // Now publish
        const pubRes = await fetch("/api/quiz/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: data.quizId }),
        });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error);

        loadQuizzes();
        showAlert("Success", "🚀 Quiz published! Announcement posted to community feed.", "success");
        // Reset form
        setTitle(""); setSermonDate(""); setSermonText(""); setYoutubeUrl(""); setLinkedEvent(null);
        setGeneratedCaption(""); setGeneratedQuestions([]); setSavedQuizId(null);
      } catch (err: any) {
        showAlert("Error", "Publish failed: " + (err?.message || "Unknown error"), "error");
      } finally {
        setSaving(false);
        setPublishing(false);
      }
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch("/api/quiz/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: savedQuizId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      loadQuizzes();
      showAlert("Success", "🚀 Quiz published! Announcement posted to community feed.", "success");
      setTitle(""); setSermonDate(""); setSermonText(""); setYoutubeUrl(""); setLinkedEvent(null);
      setGeneratedCaption(""); setGeneratedQuestions([]); setSavedQuizId(null);
    } catch (err: any) {
      showAlert("Error", "Publish failed: " + (err?.message || "Unknown error"), "error");
    } finally {
      setPublishing(false);
    }
  }

  // ── Update a question field ──
  function updateQuestion(idx: number, field: keyof GeneratedQuestion, value: any) {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  // ── Load rewards for a quiz ──
  async function loadRewards(quizId: number) {
    setSelectedQuizForRewards(quizId);
    try {
      const res = await fetch(`/api/quiz/rewards?quizId=${quizId}`);
      if (res.ok) setRewards(await res.json());
    } catch {}
  }

  async function markDistributed(rewardId: number) {
    try {
      await fetch("/api/quiz/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      if (selectedQuizForRewards) loadRewards(selectedQuizForRewards);
    } catch {}
  }

  if (status === "loading") return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;

  // ── Styles ──
  const S = {
    page: {
      padding: "20px",
      maxWidth: "700px",
      margin: "0 auto",
    } as React.CSSProperties,
    section: {
      background: "#fff",
      borderRadius: "16px",
      padding: "24px",
      marginBottom: "20px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: "1.1rem",
      fontWeight: 700,
      color: "#1a202c",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    } as React.CSSProperties,
    label: {
      display: "block",
      fontSize: "0.85rem",
      fontWeight: 600,
      color: "#4a5568",
      marginBottom: "6px",
      marginTop: "16px",
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1.5px solid #e2e8f0",
      fontSize: "0.95rem",
      outline: "none",
      background: "#f7fafc",
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
    textarea: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1.5px solid #e2e8f0",
      fontSize: "0.95rem",
      outline: "none",
      background: "#f7fafc",
      fontFamily: "inherit",
      resize: "vertical" as const,
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
    btn: {
      background: "linear-gradient(135deg, #4EB1CB 0%, #38A89D 100%)",
      color: "#fff",
      border: "none",
      borderRadius: "12px",
      padding: "14px 28px",
      fontSize: "1rem",
      fontWeight: 700,
      cursor: "pointer",
      marginTop: "20px",
      boxShadow: "0 4px 15px rgba(78,177,203,0.3)",
    } as React.CSSProperties,
    btnSecondary: {
      background: "#edf2f7",
      color: "#2d3748",
      border: "none",
      borderRadius: "12px",
      padding: "14px 28px",
      fontSize: "1rem",
      fontWeight: 600,
      cursor: "pointer",
      marginTop: "20px",
    } as React.CSSProperties,
    questionCard: {
      background: "#f7fafc",
      borderRadius: "12px",
      padding: "20px",
      marginBottom: "16px",
      border: "1.5px solid #e2e8f0",
    } as React.CSSProperties,
    badge: (color: string) => ({
      display: "inline-block",
      background: color,
      color: "#fff",
      fontSize: "0.75rem",
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: "12px",
      marginRight: "8px",
    } as React.CSSProperties),
    statusBadge: (status: string) => {
      const colors: Record<string, string> = {
        draft: "#ecc94b",
        published: "#48BB78",
        completed: "#a0aec0",
      };
      return {
        display: "inline-block",
        background: colors[status] || "#a0aec0",
        color: "#fff",
        fontSize: "0.75rem",
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: "12px",
      } as React.CSSProperties;
    },
    error: {
      background: "#fff5f5",
      color: "#c53030",
      padding: "12px 16px",
      borderRadius: "10px",
      fontSize: "0.9rem",
      marginTop: "12px",
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1a202c", marginBottom: "4px" }}>
        🧠 Quiz for Christ
      </h1>
      <p style={{ color: "#718096", fontSize: "0.9rem", marginBottom: "24px" }}>
        Create and manage weekly sermon-based quizzes
      </p>

      {/* ═══ Section 1: Create New Quiz ═══ */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          ✨ Create New Quiz Week
        </div>

        <div style={{ marginTop: "16px", padding: "14px", borderRadius: "12px", background: "#f8fafc", border: "1px dashed #cbd5e1" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            🔗 Automatically Linked Event (Sunday Gating)
          </span>
          {loadingEvent ? (
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#64748b" }}>Loading nearest Sunday Service event...</p>
          ) : linkedEvent ? (
            <div style={{ marginTop: "6px" }}>
              <strong style={{ fontSize: "0.95rem", color: "#0f172a", display: "block" }}>{linkedEvent.title}</strong>
              <span style={{ fontSize: "0.8rem", color: "#4EB1CB", fontWeight: 700 }}>
                📅 Event Date: {new Date(linkedEvent.eventDate).toLocaleDateString()}
              </span>
            </div>
          ) : (
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#ef4444", fontWeight: 600 }}>
              ⚠️ No physical Sunday Service event found! Gating will be disabled.
            </p>
          )}
        </div>

        <label style={S.label}>YouTube Sermon Video URL (Optional)</label>
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="e.g. https://www.youtube.com/watch?v=..."
          style={S.input}
        />

        <label style={S.label}>Sermon Notes / Script / Transcript</label>
        <textarea
          value={sermonText}
          onChange={(e) => setSermonText(e.target.value)}
          placeholder="Paste the full sermon script, notes, or copied transcript here..."
          rows={12}
          style={S.textarea}
        />
        <p style={{ color: "#a0aec0", fontSize: "0.8rem", marginTop: "4px" }}>
          Provide the sermon notes or copy-pasted transcript. Bisaya, Tagalog, and English are all accepted.
        </p>

        {genError && <div style={S.error}>{genError}</div>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ ...S.btn, opacity: generating ? 0.6 : 1 }}
        >
          {generating ? "🤖 AI is generating quiz..." : "🤖 Generate Quiz"}
        </button>

        {transcriptSource && (
          <p style={{ color: "#48BB78", fontSize: "0.85rem", marginTop: "12px" }}>
            ✅ Transcript source: {transcriptSource === "youtube" ? "YouTube captions" : "Manual input"}
          </p>
        )}
      </div>

      {/* ═══ Section 2: Preview & Edit ═══ */}
      {generatedQuestions.length > 0 && (
        <div style={S.section}>
          <div style={S.sectionTitle}>
            📋 Preview & Edit
          </div>

          {/* Quiz Title */}
          <label style={S.label}>🏷️ Quiz Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ ...S.input, background: "#fff", border: "1.5px solid #4EB1CB", marginBottom: "16px" }}
          />

          {/* Announcement caption */}
          <label style={S.label}>📺 Announcement Caption</label>
          <textarea
            value={generatedCaption}
            onChange={(e) => setGeneratedCaption(e.target.value)}
            rows={5}
            style={S.textarea}
          />

          {/* Question cards */}
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#2d3748", marginTop: "24px", marginBottom: "12px" }}>
            Quiz Questions
          </h3>

          {generatedQuestions.map((q, idx) => {
            const typeInfo = QUIZ_TYPE_LABELS[q.questionType] || { label: q.questionType, difficulty: "?", emoji: "❓" };
            return (
              <div key={idx} style={S.questionCard}>
                <div style={{ marginBottom: "12px" }}>
                  <span style={S.badge("#4EB1CB")}>Day {q.dayNumber}</span>
                  <span style={S.badge("#805AD5")}>{typeInfo.emoji} {typeInfo.label}</span>
                  <span style={{ color: "#a0aec0", fontSize: "0.8rem" }}>{typeInfo.difficulty}</span>
                </div>

                <label style={{ ...S.label, marginTop: "8px" }}>Question</label>
                <textarea
                  value={q.questionText}
                  onChange={(e) => updateQuestion(idx, "questionText", e.target.value)}
                  rows={2}
                  style={S.textarea}
                />

                <label style={S.label}>Correct Answer</label>
                <textarea
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(idx, "correctAnswer", e.target.value)}
                  rows={2}
                  style={S.textarea}
                />

                {q.options && Array.isArray(q.options) && (
                  <>
                    <label style={S.label}>Options (one per line)</label>
                    <textarea
                      value={Array.isArray(q.options) ? q.options.join("\n") : ""}
                      onChange={(e) => updateQuestion(idx, "options", e.target.value.split("\n").filter(Boolean))}
                      rows={q.options.length || 4}
                      style={S.textarea}
                    />
                  </>
                )}

                <label style={S.label}>Hint (optional)</label>
                <input
                  type="text"
                  value={q.hint || ""}
                  onChange={(e) => updateQuestion(idx, "hint", e.target.value)}
                  style={S.input}
                />

                <label style={S.label}>Explanation (shown after answer)</label>
                <textarea
                  value={q.explanation || ""}
                  onChange={(e) => updateQuestion(idx, "explanation", e.target.value)}
                  rows={2}
                  style={S.textarea}
                />
              </div>
            );
          })}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={handleSave} disabled={saving} style={{ ...S.btnSecondary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "💾 Save as Draft"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || saving}
              style={{ ...S.btn, opacity: (publishing || saving) ? 0.6 : 1 }}
            >
              {publishing ? "Publishing..." : "🚀 Publish Quiz Week"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Section 3: Manage Existing Quizzes ═══ */}
      <div style={S.section}>
        <div style={S.sectionTitle}>
          📊 Manage Quizzes
        </div>

        {loadingQuizzes ? (
          <p style={{ color: "#a0aec0" }}>Loading...</p>
        ) : existingQuizzes.length === 0 ? (
          <p style={{ color: "#a0aec0" }}>No quizzes created yet. Generate your first one above!</p>
        ) : (
          existingQuizzes.map((quiz: any) => (
            <div
              key={quiz.id}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: "1.5px solid #e2e8f0",
                marginBottom: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#1a202c" }}>{quiz.title}</strong>
                  <br />
                  <span style={{ color: "#a0aec0", fontSize: "0.8rem" }}>
                    {new Date(quiz.sermonDate).toLocaleDateString()}
                  </span>
                </div>
                <span style={S.statusBadge(quiz.status)}>{quiz.status}</span>
              </div>

              {quiz.status !== "draft" && (
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => loadRewards(quiz.id)}
                    style={{
                      background: "#edf2f7",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      color: "#2d3748",
                    }}
                  >
                    🏆 View Rewards
                  </button>
                </div>
              )}

              {selectedQuizForRewards === quiz.id && rewards.length > 0 && (
                <div style={{ marginTop: "12px", padding: "12px", background: "#f7fafc", borderRadius: "10px" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "8px" }}>
                    Rewards ({rewards.length})
                  </h4>
                  {rewards.map((r: any) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.9rem" }}>
                          {r.member?.firstName} {r.member?.lastName}
                        </strong>
                        <br />
                        <span style={{ color: "#718096", fontSize: "0.8rem" }}>
                          {r.rewardTier} — {r.totalScore}/5 — {r.claimStatus}
                        </span>
                        {r.claimDetails && (
                          <span style={{ color: "#4EB1CB", fontSize: "0.8rem", marginLeft: "8px" }}>
                            {JSON.stringify(r.claimDetails)}
                          </span>
                        )}
                      </div>
                      {r.claimStatus !== "distributed" && (
                        <button
                          onClick={() => markDistributed(r.id)}
                          style={{
                            background: "#48BB78",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          ✅ Distributed
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Alert modal */}
      <AlertModal
        open={alertModal.open}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

// ── AlertModal Component ──
interface AlertModalProps {
  open: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

function AlertModal({ open, title, message, type, onClose }: AlertModalProps) {
  if (!open) return null;
  const isError = type === "error";
  const btnColor = isError ? "#ef4444" : "#4EB1CB";
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "1.75rem",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.5rem",
            fontSize: "1.125rem",
            fontWeight: 800,
            color: "#0f172a",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "0 0 1.5rem",
            fontSize: "0.9rem",
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            border: "none",
            borderRadius: "8px",
            background: btnColor,
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
