"use client";

import { useState } from "react";

interface MillionaireStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    questionText: string;
    options?: string[];
    hint?: string;
    lifelineEliminate?: number[];
  };
  dayLabel: string;
  submitting: boolean;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

const LETTERS = ["A", "B", "C", "D"];

export default function MillionaireStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: MillionaireStageProps) {
  const options = question.options || [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [used5050, setUsed5050] = useState(false);

  const eliminatedSet = new Set(used5050 ? question.lifelineEliminate || [] : []);
  const canUse5050 = !used5050 && (question.lifelineEliminate?.length ?? 0) >= 2;

  function handleLockIn() {
    if (selectedIdx === null || submitting) return;
    onSubmit(options[selectedIdx]);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background:
          "radial-gradient(circle at 50% 15%, #0e3a52 0%, #071b29 52%, #030c14 100%)",
        color: "#f8fafc",
        overflowY: "auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <span
          style={{
            background: "rgba(245, 158, 11, 0.16)",
            border: "1px solid rgba(251, 191, 36, 0.45)",
            color: "#fde68a",
            padding: "6px 14px",
            borderRadius: "999px",
            fontSize: "0.78rem",
            fontWeight: 800,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {dayLabel}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.08)",
            color: "#e2e8f0",
            fontSize: "1.1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {/* Lifeline Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "18px",
        }}
      >
        <button
          type="button"
          disabled={!canUse5050}
          onClick={() => {
            setUsed5050(true);
            if (selectedIdx !== null && (question.lifelineEliminate || []).includes(selectedIdx)) {
              setSelectedIdx(null);
            }
          }}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: canUse5050 ? "1.5px solid #fbbf24" : "1px solid rgba(255,255,255,0.15)",
            background: canUse5050
              ? "linear-gradient(135deg, rgba(245,158,11,0.28), rgba(217,119,6,0.18))"
              : "rgba(255,255,255,0.05)",
            color: canUse5050 ? "#fef3c7" : "#64748b",
            fontSize: "0.8rem",
            fontWeight: 800,
            cursor: canUse5050 ? "pointer" : "default",
            textDecoration: used5050 ? "line-through" : "none",
            whiteSpace: "nowrap",
          }}
        >
          50:50 Lifeline
        </button>

        {question.hint && (
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1.5px solid rgba(78, 177, 203, 0.55)",
              background: showHint ? "rgba(78, 177, 203, 0.25)" : "rgba(78, 177, 203, 0.12)",
              color: "#a5f3fc",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {showHint ? "Hide Hint" : "Pastor's Hint"}
          </button>
        )}
      </div>

      {/* Question Stage Frame */}
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "linear-gradient(180deg, rgba(14, 58, 82, 0.72), rgba(7, 27, 41, 0.9))",
          border: "1.5px solid rgba(78, 177, 203, 0.55)",
          borderRadius: "18px",
          padding: "22px 20px",
          boxShadow: "0 10px 34px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
          textAlign: "center",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 800,
            color: "#fbbf24",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Spotlight Challenge
        </div>
        <h2
          style={{
            fontSize: "1.12rem",
            fontWeight: 800,
            lineHeight: 1.45,
            margin: 0,
            color: "#ffffff",
          }}
        >
          {question.questionText}
        </h2>

        {showHint && question.hint && (
          <div
            style={{
              marginTop: "14px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: "rgba(245, 158, 11, 0.14)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              color: "#fde68a",
              fontSize: "0.84rem",
              lineHeight: 1.45,
            }}
          >
            {question.hint}
          </div>
        )}
      </div>

      {/* 4 Diamond Option Bars */}
      <div
        style={{
          width: "100%",
          maxWidth: "560px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {options.map((opt, idx) => {
          const isEliminated = eliminatedSet.has(idx);
          const isSelected = selectedIdx === idx;
          return (
            <button
              key={idx}
              type="button"
              disabled={isEliminated || submitting}
              onClick={() => setSelectedIdx(idx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: "14px",
                border: isSelected
                  ? "2px solid #fbbf24"
                  : isEliminated
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "1.5px solid rgba(78, 177, 203, 0.38)",
                background: isSelected
                  ? "linear-gradient(135deg, rgba(245,158,11,0.32), rgba(217,119,6,0.22))"
                  : isEliminated
                    ? "rgba(15, 23, 42, 0.35)"
                    : "rgba(12, 40, 56, 0.85)",
                color: isEliminated ? "#475569" : "#ffffff",
                opacity: isEliminated ? 0.38 : 1,
                cursor: isEliminated ? "not-allowed" : "pointer",
                transition: "all 0.18s ease",
                boxShadow: isSelected ? "0 0 22px rgba(251, 191, 36, 0.3)" : "none",
              }}
            >
              <span
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: isSelected ? "#fbbf24" : "rgba(78, 177, 203, 0.22)",
                  color: isSelected ? "#0f172a" : "#67e8f9",
                  fontSize: "0.82rem",
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {LETTERS[idx] || idx + 1}
              </span>
              <span
                style={{
                  fontSize: "0.94rem",
                  fontWeight: 700,
                  lineHeight: 1.35,
                  textDecoration: isEliminated ? "line-through" : "none",
                }}
              >
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Final Answer Lock-In */}
      <button
        type="button"
        disabled={selectedIdx === null || submitting}
        onClick={handleLockIn}
        style={{
          width: "100%",
          maxWidth: "560px",
          padding: "14px 20px",
          borderRadius: "14px",
          border: "none",
          background:
            selectedIdx !== null
              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              : "rgba(255,255,255,0.1)",
          color: selectedIdx !== null ? "#0f172a" : "#64748b",
          fontSize: "0.98rem",
          fontWeight: 900,
          cursor: selectedIdx !== null && !submitting ? "pointer" : "not-allowed",
          boxShadow: selectedIdx !== null ? "0 8px 24px rgba(245, 158, 11, 0.35)" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {submitting
          ? "Checking Final Answer..."
          : selectedIdx !== null
            ? `Lock In Final Answer (${LETTERS[selectedIdx]})`
            : "Select an Option First"}
      </button>
    </div>
  );
}
