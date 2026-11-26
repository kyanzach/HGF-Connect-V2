"use client";

import { useEffect, useRef, useState } from "react";

interface ScaleOfTruthStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    questionText: string;
    hint?: string;
  };
  dayLabel: string;
  submitting: boolean;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

export default function ScaleOfTruthStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: ScaleOfTruthStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [choice, setChoice] = useState<"TRUE" | "FALSE" | null>(null);
  const [explanation, setExplanation] = useState("");
  const targetTiltRef = useRef(0);

  useEffect(() => {
    targetTiltRef.current = choice === "TRUE" ? -0.24 : choice === "FALSE" ? 0.24 : 0;
  }, [choice]);

  // Smooth spring-physics animated golden balance scale
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let angle = 0;
    let velocity = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 320;
    const H = 148;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const render = () => {
      const target = targetTiltRef.current;
      const force = (target - angle) * 0.085;
      velocity = (velocity + force) * 0.84;
      angle += velocity;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const pivotY = 40;

      // Base pedestal
      ctx.fillStyle = "#d97706";
      ctx.beginPath();
      ctx.roundRect(cx - 42, H - 18, 84, 10, 5);
      ctx.fill();

      // Vertical pillar
      const pillarGrad = ctx.createLinearGradient(cx - 5, pivotY, cx + 5, H - 18);
      pillarGrad.addColorStop(0, "#fde68a");
      pillarGrad.addColorStop(1, "#b45309");
      ctx.fillStyle = pillarGrad;
      ctx.fillRect(cx - 4, pivotY, 8, H - pivotY - 18);

      // Rotating beam
      const armLen = 96;
      const lx = cx - Math.cos(angle) * armLen;
      const ly = pivotY - Math.sin(angle) * armLen;
      const rx = cx + Math.cos(angle) * armLen;
      const ry = pivotY + Math.sin(angle) * armLen;

      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(rx, ry);
      ctx.stroke();

      // Pivot ornament
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(cx, pivotY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Helper to draw hanging pan
      const drawPan = (px: number, py: number, label: string, active: boolean, activeColor: string) => {
        const drop = 44;
        ctx.strokeStyle = active ? activeColor : "rgba(251, 191, 36, 0.55)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - 22, py + drop);
        ctx.moveTo(px, py);
        ctx.lineTo(px + 22, py + drop);
        ctx.stroke();

        ctx.fillStyle = active ? activeColor : "rgba(255, 255, 255, 0.14)";
        ctx.beginPath();
        ctx.arc(px, py + drop, 24, 0, Math.PI, false);
        ctx.fill();

        ctx.fillStyle = active ? "#ffffff" : "#cbd5e1";
        ctx.font = "800 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, px, py + drop + 18);
      };

      drawPan(lx, ly, "TRUE", target < 0, "#10b981");
      drawPan(rx, ry, "FALSE", target > 0, "#ef4444");

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function handleSubmit() {
    if (!choice || submitting) return;
    const payload = explanation.trim() ? `${choice}: ${explanation.trim()}` : choice;
    onSubmit(payload);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #0b1929 0%, #102a42 60%, #091521 100%)",
        color: "#f8fafc",
        overflowY: "auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 36px",
      }}
    >
      <div style={{ maxWidth: "540px", margin: "0 auto" }}>
        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span
            style={{
              background: "rgba(251, 191, 36, 0.16)",
              border: "1px solid rgba(251, 191, 36, 0.4)",
              color: "#fde68a",
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "0.78rem",
              fontWeight: 800,
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Animated Scale Canvas */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
          <canvas ref={canvasRef} style={{ width: "320px", height: "148px" }} />
        </div>

        {/* Statement Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: "16px",
            padding: "18px 16px",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "1.06rem", fontWeight: 800, lineHeight: 1.45, margin: 0 }}>
            &ldquo;{question.questionText}&rdquo;
          </h2>
          {question.hint && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                marginTop: "10px",
                background: "none",
                border: "none",
                color: "#fde68a",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showHint ? "Hide Hint" : "Need a Hint?"}
            </button>
          )}
          {showHint && question.hint && (
            <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.4 }}>
              {question.hint}
            </p>
          )}
        </div>

        {/* True / False Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setChoice("TRUE")}
            style={{
              padding: "15px 12px",
              borderRadius: "14px",
              border: choice === "TRUE" ? "2px solid #34d399" : "1.5px solid rgba(16,185,129,0.4)",
              background: choice === "TRUE" ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.1)",
              color: "#ecfdf5",
              fontSize: "0.96rem",
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            TRUE
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setChoice("FALSE")}
            style={{
              padding: "15px 12px",
              borderRadius: "14px",
              border: choice === "FALSE" ? "2px solid #f87171" : "1.5px solid rgba(239,68,68,0.4)",
              background: choice === "FALSE" ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.1)",
              color: "#fef2f2",
              fontSize: "0.96rem",
              fontWeight: 900,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            FALSE
          </button>
        </div>

        {/* Optional 1-line Defense */}
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Optional: Add a short reason (English, Bisaya, or Tagalog)..."
          rows={2}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(15, 23, 42, 0.65)",
            color: "#ffffff",
            fontSize: "0.88rem",
            fontFamily: "inherit",
            marginBottom: "14px",
            resize: "none",
          }}
        />

        <button
          type="button"
          disabled={!choice || submitting}
          onClick={handleSubmit}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "14px",
            border: "none",
            background: choice ? "#4EB1CB" : "rgba(255,255,255,0.1)",
            color: choice ? "#061b26" : "#64748b",
            fontSize: "0.96rem",
            fontWeight: 900,
            cursor: choice && !submitting ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          {submitting ? "Weighing Answer..." : "Lock In Verdict"}
        </button>
      </div>
    </div>
  );
}
