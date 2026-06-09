"use client";

/**
 * QuizPlayer.tsx — Interactive quiz renderer for all 5 quiz types
 *
 * Day 1 (Tue): Balloon Pop — Multiple choice with animated bubbles
 * Day 2 (Wed): Fill the Blanks — Inline text inputs
 * Day 3 (Thu): In Your Own Words — Essay with AI grading
 * Day 4 (Fri): Verse Builder — Drag-and-drop ordering
 * Day 5 (Sat): Defend Your Faith — True/False + explanation
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Confetti from "./Confetti";

interface QuizQuestion {
  questionId: number;
  dayNumber: number;
  type: string;
  questionText: string;
  options?: string[];
  hint?: string;
}

interface QuizResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  explanation: string;
  reward?: { totalScore: number; tier: string } | null;
}

interface QuizPlayerProps {
  question: QuizQuestion;
  onComplete: (result: QuizResult) => void;
  onClose: () => void;
}

// ── Shared styles ────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "linear-gradient(135deg, #0a2a3a 0%, #134e5e 50%, #1a3a4a 100%)",
    zIndex: 11000,
    display: "flex",
    flexDirection: "column" as const,
    paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
    overflowY: "auto" as const,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "#fff",
    fontSize: "1.1rem",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  dayBadge: {
    background: "rgba(78,177,203,0.3)",
    color: "#4EB1CB",
    fontSize: "0.85rem",
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: "20px",
    border: "1px solid rgba(78,177,203,0.4)",
  },
  body: {
    flex: 1,
    padding: "0 20px 100px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
  },
  questionText: {
    color: "#fff",
    fontSize: "1.2rem",
    fontWeight: 600,
    textAlign: "center" as const,
    margin: "24px 0 32px",
    lineHeight: 1.5,
    maxWidth: "600px",
  },
  hintBox: {
    background: "rgba(251,211,141,0.1)",
    border: "1px solid rgba(251,211,141,0.3)",
    borderRadius: "12px",
    padding: "12px 16px",
    color: "#FBD38D",
    fontSize: "0.85rem",
    marginBottom: "24px",
    maxWidth: "500px",
    textAlign: "center" as const,
  },
  submitBtn: {
    background: "linear-gradient(135deg, #4EB1CB 0%, #38A89D 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    padding: "16px 48px",
    fontSize: "1.1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "24px",
    boxShadow: "0 4px 20px rgba(78,177,203,0.4)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed" as const,
  },
  resultCard: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center" as const,
    maxWidth: "500px",
    width: "100%",
    marginTop: "24px",
  },
  loadingDots: {
    display: "inline-block",
    animation: "pulse 1.5s ease-in-out infinite",
  },
};

export default function QuizPlayer({ question, onComplete, onClose }: QuizPlayerProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dayLabels: Record<number, string> = {
    1: "🎈 Day 1 — Balloon Pop",
    2: "✏️ Day 2 — Fill the Blanks",
    3: "📝 Day 3 — In Your Own Words",
    4: "🧩 Day 4 — Verse Builder",
    5: "⚖️ Day 5 — Defend Your Faith",
    6: "🎈 Day 6 — Scripture Trivia",
    7: "📝 Day 7 — Heart Reflection",
  };

  async function submitAnswer(answer: string) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.questionId, answer }),
      });
      const data = await res.json();

      if (res.status === 409) {
        // Already submitted
        setResult({
          isCorrect: data.isCorrect,
          score: data.score,
          feedback: data.feedback || "Already submitted",
          explanation: "",
        });
        return;
      }

      if (!res.ok) throw new Error(data.error);

      const r: QuizResult = {
        isCorrect: data.isCorrect,
        score: data.score,
        feedback: data.feedback,
        explanation: data.explanation || "",
        reward: data.reward,
      };
      setResult(r);

      if (data.isCorrect) {
        setShowConfetti(true);
      }
    } catch (err: any) {
      setResult({
        isCorrect: false,
        score: 0,
        feedback: err?.message || "Something went wrong",
        explanation: "",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) return null;

  const renderContent = () => {
    // ── Result screen ──
    if (result) {
      return (
        <div style={S.overlay}>
          <Confetti trigger={showConfetti} onDone={() => setShowConfetti(false)} />
          <div style={S.header}>
            <span style={S.dayBadge}>{dayLabels[question.dayNumber]}</span>
            <button style={S.closeBtn} onClick={() => onComplete(result)}>Done</button>
          </div>
          <div style={S.body}>
            <div style={{ fontSize: "4rem", marginTop: "40px" }}>
              {result.isCorrect ? "🎉" : "😅"}
            </div>
            <h2 style={{ color: result.isCorrect ? "#48BB78" : "#FC8181", fontSize: "1.5rem", marginTop: "16px" }}>
              {result.isCorrect ? "Correct!" : "Not quite!"}
            </h2>
            <div style={S.resultCard}>
              <p style={{ color: "#e2e8f0", fontSize: "1rem", lineHeight: 1.6 }}>
                {result.feedback}
              </p>
              {result.explanation && (
                <p style={{ color: "#a0aec0", fontSize: "0.9rem", marginTop: "16px", lineHeight: 1.5 }}>
                  💡 {result.explanation}
                </p>
              )}
            </div>
            {result.reward && (
              <div style={{ ...S.resultCard, borderColor: "rgba(78,177,203,0.5)", border: "2px solid rgba(78,177,203,0.5)" }}>
                <p style={{ color: "#4EB1CB", fontSize: "1.1rem", fontWeight: 700 }}>
                  🏆 Week Complete! Score: {result.reward.totalScore}/7
                </p>
                <p style={{ color: "#e2e8f0", fontSize: "0.9rem", marginTop: "8px" }}>
                  {result.reward.tier === "PERFECT"
                    ? "PERFECT SCORE! Claim your Christian statement t-shirt! 🎽"
                    : result.reward.tier === "PARTICIPANT"
                      ? "Keep growing in the Word! Every quiz makes you stronger. 🙏"
                      : "🎁 Prize: TBA — to be announced this Sunday!"}
                </p>
              </div>
            )}
            <button
              style={{ ...S.submitBtn, marginTop: "32px" }}
              onClick={() => onComplete(result)}
            >
              Continue →
            </button>
          </div>
        </div>
      );
    }

    // ── Quiz type renderers ──
    switch (question.type) {
      case "MULTIPLE_CHOICE":
        return (
          <BalloonPop
            question={question}
            onSubmit={submitAnswer}
            submitting={submitting}
            dayLabel={dayLabels[question.dayNumber]}
            showHint={showHint}
            setShowHint={setShowHint}
            onClose={onClose}
          />
        );
      case "FILL_IN_BLANKS":
        return (
          <FillBlanks
            question={question}
            onSubmit={submitAnswer}
            submitting={submitting}
            dayLabel={dayLabels[question.dayNumber]}
            showHint={showHint}
            setShowHint={setShowHint}
            onClose={onClose}
          />
        );
      case "SHORT_ANSWER":
        return (
          <ShortAnswer
            question={question}
            onSubmit={submitAnswer}
            submitting={submitting}
            dayLabel={dayLabels[question.dayNumber]}
            showHint={showHint}
            setShowHint={setShowHint}
            onClose={onClose}
          />
        );
      case "SCRIPTURE_ORDERING":
        return (
          <ScriptureOrder
            question={question}
            onSubmit={submitAnswer}
            submitting={submitting}
            dayLabel={dayLabels[question.dayNumber]}
            showHint={showHint}
            setShowHint={setShowHint}
            onClose={onClose}
          />
        );
      case "TRUE_FALSE_EXPLAIN":
        return (
          <TrueFalseExplain
            question={question}
            onSubmit={submitAnswer}
            submitting={submitting}
            dayLabel={dayLabels[question.dayNumber]}
            showHint={showHint}
            setShowHint={setShowHint}
            onClose={onClose}
          />
        );
      default:
        return <div>Unknown quiz type</div>;
    }
  };

  return createPortal(renderContent(), document.body);
}

// ──────────────────────────────────────────────────────────────────────────────
// DAY 1: Balloon Pop — Multiple Choice with animated bubbles
// ──────────────────────────────────────────────────────────────────────────────
function BalloonPop({ question, onSubmit, submitting, dayLabel, showHint, setShowHint, onClose }: any) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const options = question.options || [];

  const bubbleColors = [
    "linear-gradient(135deg, #FF6B6B 0%, #ee5a24 100%)",
    "linear-gradient(135deg, #4EB1CB 0%, #38A89D 100%)",
    "linear-gradient(135deg, #9F7AEA 0%, #805AD5 100%)",
    "linear-gradient(135deg, #48BB78 0%, #38A169 100%)",
  ];

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <span style={S.dayBadge}>{dayLabel}</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={S.body}>
        <p style={S.questionText}>{question.questionText}</p>

        {question.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            style={{ background: "none", border: "none", color: "#FBD38D", cursor: "pointer", marginBottom: "16px" }}
          >
            {showHint ? "Hide hint" : "💡 Need a hint?"}
          </button>
        )}
        {showHint && question.hint && <div style={S.hintBox}>💡 {question.hint}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "500px", width: "100%" }}>
          {options.map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => {
                if (submitting) return;
                setSelectedIdx(i);
                onSubmit(opt);
              }}
              disabled={submitting}
              style={{
                background: selectedIdx === i ? "rgba(255,255,255,0.2)" : bubbleColors[i % 4],
                border: selectedIdx === i ? "3px solid #fff" : "none",
                borderRadius: "24px",
                padding: "24px 16px",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                animation: submitting ? "none" : `float ${2 + i * 0.5}s ease-in-out infinite`,
                textAlign: "center" as const,
                minHeight: "100px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        {submitting && (
          <p style={{ color: "#a0aec0", marginTop: "24px", fontSize: "0.9rem" }}>
            Checking your answer...
          </p>
        )}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DAY 2: Fill the Blanks
// ──────────────────────────────────────────────────────────────────────────────
function FillBlanks({ question, onSubmit, submitting, dayLabel, showHint, setShowHint, onClose }: any) {
  const blankCount = (question.questionText.match(/______/g) || []).length;
  const [answers, setAnswers] = useState<string[]>(new Array(blankCount).fill(""));

  // Split text by ______ and interleave inputs
  const parts = question.questionText.split("______");

  const canSubmit = answers.every((a) => a.trim().length > 0);

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <span style={S.dayBadge}>{dayLabel}</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={S.body}>
        <div style={{
          color: "#e2e8f0",
          fontSize: "1.15rem",
          lineHeight: 2.2,
          maxWidth: "600px",
          textAlign: "center" as const,
          marginTop: "24px",
        }}>
          {parts.map((part: string, i: number) => (
            <span key={i}>
              {part}
              {i < parts.length - 1 && (
                <input
                  type="text"
                  value={answers[i]}
                  onChange={(e) => {
                    const newA = [...answers];
                    newA[i] = e.target.value;
                    setAnswers(newA);
                  }}
                  placeholder="..."
                  disabled={submitting}
                  style={{
                    background: "rgba(78,177,203,0.15)",
                    border: "2px solid #4EB1CB",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "1rem",
                    padding: "6px 12px",
                    width: `${Math.max(80, (answers[i]?.length || 3) * 14)}px`,
                    textAlign: "center" as const,
                    outline: "none",
                    margin: "0 4px",
                  }}
                />
              )}
            </span>
          ))}
        </div>

        {question.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            style={{ background: "none", border: "none", color: "#FBD38D", cursor: "pointer", marginTop: "24px" }}
          >
            {showHint ? "Hide hint" : "💡 Need a hint?"}
          </button>
        )}
        {showHint && question.hint && <div style={S.hintBox}>💡 {question.hint}</div>}

        <button
          style={{ ...S.submitBtn, ...((!canSubmit || submitting) ? S.submitBtnDisabled : {}) }}
          disabled={!canSubmit || submitting}
          onClick={() => onSubmit(answers.join(","))}
        >
          {submitting ? "Checking..." : "Submit Answer"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DAY 3: Short Answer / Essay
// ──────────────────────────────────────────────────────────────────────────────
function ShortAnswer({ question, onSubmit, submitting, dayLabel, showHint, setShowHint, onClose }: any) {
  const [answer, setAnswer] = useState("");

  const canSubmit = answer.trim().length >= 20;

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <span style={S.dayBadge}>{dayLabel}</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={S.body}>
        <p style={S.questionText}>{question.questionText}</p>

        {/* Input guide banner */}
        <div style={{
          background: "rgba(78,177,203,0.1)",
          border: "1px solid rgba(78,177,203,0.3)",
          borderRadius: "12px",
          padding: "14px 18px",
          maxWidth: "500px",
          marginBottom: "20px",
        }}>
          <p style={{ color: "#4EB1CB", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
            📝 <strong>Answer in your own words.</strong> Bisaya, Tagalog, or English — all are accepted!
            We use AI to understand the meaning of your answer, not exact wording.
          </p>
        </div>

        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value.slice(0, 500))}
          placeholder="Type your answer here..."
          disabled={submitting}
          rows={5}
          style={{
            width: "100%",
            maxWidth: "500px",
            background: "rgba(255,255,255,0.07)",
            border: "2px solid rgba(78,177,203,0.3)",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "1rem",
            padding: "16px",
            outline: "none",
            resize: "vertical" as const,
            lineHeight: 1.6,
            fontFamily: "inherit",
          }}
        />
        <p style={{ color: "#718096", fontSize: "0.8rem", marginTop: "8px" }}>
          {answer.length}/500 characters {answer.length < 20 && "(minimum 20)"}
        </p>

        {question.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            style={{ background: "none", border: "none", color: "#FBD38D", cursor: "pointer", marginTop: "8px" }}
          >
            {showHint ? "Hide hint" : "💡 Need a hint?"}
          </button>
        )}
        {showHint && question.hint && <div style={S.hintBox}>💡 {question.hint}</div>}

        <button
          style={{ ...S.submitBtn, ...((!canSubmit || submitting) ? S.submitBtnDisabled : {}) }}
          disabled={!canSubmit || submitting}
          onClick={() => onSubmit(answer)}
        >
          {submitting ? "AI is reviewing your answer..." : "Submit Answer"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DAY 4: Scripture Ordering — Drag-and-drop (touch-friendly)
// ──────────────────────────────────────────────────────────────────────────────
function ScriptureOrder({ question, onSubmit, submitting, dayLabel, showHint, setShowHint, onClose }: any) {
  const [items, setItems] = useState<string[]>(() => {
    // options already comes shuffled from the API
    return question.options || [];
  });
  const [dragging, setDragging] = useState<number | null>(null);

  function moveItem(fromIdx: number, toIdx: number) {
    const newItems = [...items];
    const [moved] = newItems.splice(fromIdx, 1);
    newItems.splice(toIdx, 0, moved);
    setItems(newItems);
  }

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <span style={S.dayBadge}>{dayLabel}</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={S.body}>
        <p style={S.questionText}>
          Arrange these parts in the correct order:
        </p>

        <div style={{ maxWidth: "500px", width: "100%" }}>
          {items.map((item, i) => (
            <div
              key={item}
              style={{
                background: dragging === i
                  ? "rgba(78,177,203,0.3)"
                  : "rgba(255,255,255,0.08)",
                border: dragging === i
                  ? "2px solid #4EB1CB"
                  : "2px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "10px",
                color: "#e2e8f0",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "grab",
                transition: "background 0.2s, border-color 0.2s",
                userSelect: "none" as const,
              }}
            >
              {/* Move buttons for touch accessibility */}
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <button
                  onClick={() => i > 0 && moveItem(i, i - 1)}
                  disabled={i === 0}
                  style={{
                    background: "none",
                    border: "none",
                    color: i === 0 ? "#4a5568" : "#4EB1CB",
                    fontSize: "1rem",
                    cursor: i === 0 ? "default" : "pointer",
                    padding: "2px 6px",
                  }}
                >
                  ▲
                </button>
                <button
                  onClick={() => i < items.length - 1 && moveItem(i, i + 1)}
                  disabled={i === items.length - 1}
                  style={{
                    background: "none",
                    border: "none",
                    color: i === items.length - 1 ? "#4a5568" : "#4EB1CB",
                    fontSize: "1rem",
                    cursor: i === items.length - 1 ? "default" : "pointer",
                    padding: "2px 6px",
                  }}
                >
                  ▼
                </button>
              </div>
              <span style={{
                background: "rgba(78,177,203,0.2)",
                color: "#4EB1CB",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        {question.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            style={{ background: "none", border: "none", color: "#FBD38D", cursor: "pointer", marginTop: "16px" }}
          >
            {showHint ? "Hide hint" : "💡 Need a hint?"}
          </button>
        )}
        {showHint && question.hint && <div style={S.hintBox}>💡 {question.hint}</div>}

        <button
          style={{ ...S.submitBtn, ...(submitting ? S.submitBtnDisabled : {}) }}
          disabled={submitting}
          onClick={() => onSubmit(JSON.stringify(items))}
        >
          {submitting ? "Checking order..." : "Submit Order"}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DAY 5: True/False + Explanation
// ──────────────────────────────────────────────────────────────────────────────
function TrueFalseExplain({ question, onSubmit, submitting, dayLabel, showHint, setShowHint, onClose }: any) {
  const [selected, setSelected] = useState<"TRUE" | "FALSE" | null>(null);
  const [explanation, setExplanation] = useState("");

  const canSubmit = selected !== null;

  function handleSubmit() {
    if (!selected) return;
    onSubmit(JSON.stringify({ answer: selected, explanation }));
  }

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <span style={S.dayBadge}>{dayLabel}</span>
        <button style={S.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div style={S.body}>
        <p style={S.questionText}>{question.questionText}</p>

        <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
          <button
            onClick={() => setSelected("TRUE")}
            disabled={submitting}
            style={{
              background: selected === "TRUE"
                ? "linear-gradient(135deg, #48BB78, #38A169)"
                : "rgba(72,187,120,0.15)",
              border: selected === "TRUE" ? "3px solid #48BB78" : "2px solid rgba(72,187,120,0.3)",
              borderRadius: "16px",
              padding: "20px 40px",
              color: "#fff",
              fontSize: "1.2rem",
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.3s",
            }}
          >
            ✅ TRUE
          </button>
          <button
            onClick={() => setSelected("FALSE")}
            disabled={submitting}
            style={{
              background: selected === "FALSE"
                ? "linear-gradient(135deg, #FC8181, #E53E3E)"
                : "rgba(252,129,129,0.15)",
              border: selected === "FALSE" ? "3px solid #FC8181" : "2px solid rgba(252,129,129,0.3)",
              borderRadius: "16px",
              padding: "20px 40px",
              color: "#fff",
              fontSize: "1.2rem",
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "all 0.3s",
            }}
          >
            ❌ FALSE
          </button>
        </div>

        {selected && (
          <>
            <div style={{
              background: "rgba(78,177,203,0.1)",
              border: "1px solid rgba(78,177,203,0.3)",
              borderRadius: "12px",
              padding: "14px 18px",
              maxWidth: "500px",
              marginBottom: "16px",
            }}>
              <p style={{ color: "#4EB1CB", fontSize: "0.85rem", margin: 0, lineHeight: 1.5 }}>
                💬 <strong>Explain why.</strong> Write your reasoning in your own words.
                Bisaya, Tagalog, or English accepted.
              </p>
            </div>

            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value.slice(0, 500))}
              placeholder="Explain your answer... (optional but earns better score)"
              disabled={submitting}
              rows={4}
              style={{
                width: "100%",
                maxWidth: "500px",
                background: "rgba(255,255,255,0.07)",
                border: "2px solid rgba(78,177,203,0.3)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "1rem",
                padding: "16px",
                outline: "none",
                resize: "vertical" as const,
                lineHeight: 1.6,
                fontFamily: "inherit",
              }}
            />
            <p style={{ color: "#718096", fontSize: "0.8rem", marginTop: "4px" }}>
              {explanation.length}/500 characters
            </p>
          </>
        )}

        {question.hint && (
          <button
            onClick={() => setShowHint(!showHint)}
            style={{ background: "none", border: "none", color: "#FBD38D", cursor: "pointer", marginTop: "8px" }}
          >
            {showHint ? "Hide hint" : "💡 Need a hint?"}
          </button>
        )}
        {showHint && question.hint && <div style={S.hintBox}>💡 {question.hint}</div>}

        <button
          style={{ ...S.submitBtn, ...((!canSubmit || submitting) ? S.submitBtnDisabled : {}) }}
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "AI is reviewing..." : "Submit Answer"}
        </button>
      </div>
    </div>
  );
}
