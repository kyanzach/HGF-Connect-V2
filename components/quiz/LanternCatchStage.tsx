"use client";

import { useEffect, useRef, useState } from "react";

interface LanternCatchStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    questionText: string;
    options?: string[];
    hint?: string;
  };
  dayLabel: string;
  submitting: boolean;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

export default function LanternCatchStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: LanternCatchStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const options = question.options || [];

  // 3D depth floating golden-teal leaves & sky lanterns canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 32 }, (_, i) => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      z: 0.35 + Math.random() * 0.9,
      vy: 0.25 + Math.random() * 0.45,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.008 + Math.random() * 0.012,
      isGold: i % 2 === 0,
    }));

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.y -= p.vy * p.z;
        p.swayPhase += p.swaySpeed;
        const drawX = p.x + Math.sin(p.swayPhase) * 18 * p.z;

        if (p.y < -40) {
          p.y = h + 40;
          p.x = Math.random() * w;
        }

        const r = 6 * p.z;
        const grad = ctx.createRadialGradient(drawX, p.y, 1, drawX, p.y, r * 3.4);
        if (p.isGold) {
          grad.addColorStop(0, `rgba(253, 224, 71, ${0.75 * p.z})`);
          grad.addColorStop(0.45, `rgba(245, 158, 11, ${0.28 * p.z})`);
          grad.addColorStop(1, "rgba(245, 158, 11, 0)");
        } else {
          grad.addColorStop(0, `rgba(103, 232, 249, ${0.7 * p.z})`);
          grad.addColorStop(0.45, `rgba(78, 177, 203, ${0.25 * p.z})`);
          grad.addColorStop(1, "rgba(78, 177, 203, 0)");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, p.y, r * 3.4, 0, Math.PI * 2);
        ctx.fill();

        // Tiny glowing leaf/lantern core
        ctx.fillStyle = p.isGold ? "#fef08a" : "#cffafe";
        ctx.beginPath();
        ctx.ellipse(drawX, p.y, r * 0.65, r * 0.95, Math.sin(p.swayPhase) * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #061b26 0%, #0a2e3f 50%, #071923 100%)",
        color: "#f8fafc",
        overflowY: "auto",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <style>{`
        @keyframes lanternBobA { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes lanternBobB { 0%, 100% { transform: translateY(-4px); } 50% { transform: translateY(4px); } }
      `}</style>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "560px",
          margin: "0 auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 36px",
        }}
      >
        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <span
            style={{
              background: "rgba(103, 232, 249, 0.16)",
              border: "1px solid rgba(103, 232, 249, 0.4)",
              color: "#cffafe",
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
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#e2e8f0",
              fontSize: "1.1rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Question */}
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fde68a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
            Tap the Glowing Lantern with the Right Answer
          </div>
          <h2 style={{ fontSize: "1.14rem", fontWeight: 800, lineHeight: 1.45, margin: "0 0 12px" }}>
            {question.questionText}
          </h2>
          {question.hint && (
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "rgba(253, 224, 71, 0.14)",
                border: "1px solid rgba(253, 224, 71, 0.35)",
                color: "#fef08a",
                borderRadius: "999px",
                padding: "5px 14px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showHint ? "Hide Hint" : "Need a Hint?"}
            </button>
          )}
          {showHint && question.hint && (
            <p
              style={{
                marginTop: "10px",
                fontSize: "0.84rem",
                color: "#fde68a",
                background: "rgba(15, 23, 42, 0.6)",
                padding: "10px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(251, 191, 36, 0.3)",
              }}
            >
              {question.hint}
            </p>
          )}
        </div>

        {/* 4 Floating Glowing Lantern Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "22px" }}>
          {options.map((opt, idx) => {
            const isSelected = selected === opt;
            const animName = idx % 2 === 0 ? "lanternBobA" : "lanternBobB";
            return (
              <button
                key={idx}
                type="button"
                disabled={submitting}
                onClick={() => setSelected(opt)}
                style={{
                  animation: `${animName} ${3.2 + idx * 0.35}s ease-in-out infinite`,
                  background: isSelected
                    ? "linear-gradient(160deg, rgba(251,191,36,0.34), rgba(217,119,6,0.28))"
                    : "linear-gradient(160deg, rgba(14,116,144,0.42), rgba(15,23,42,0.78))",
                  border: isSelected
                    ? "2px solid #fbbf24"
                    : "1.5px solid rgba(103, 232, 249, 0.35)",
                  borderRadius: "20px",
                  padding: "18px 14px",
                  minHeight: "118px",
                  color: "#ffffff",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  lineHeight: 1.38,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  boxShadow: isSelected
                    ? "0 0 28px rgba(251, 191, 36, 0.42)"
                    : "0 8px 20px rgba(0,0,0,0.32)",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: isSelected ? "#fde047" : "#67e8f9",
                    boxShadow: isSelected ? "0 0 12px #fde047" : "0 0 10px #67e8f9",
                    marginBottom: "10px",
                  }}
                />
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          disabled={!selected || submitting}
          onClick={() => selected && onSubmit(selected)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "14px",
            border: "none",
            background: selected ? "#4EB1CB" : "rgba(255,255,255,0.1)",
            color: selected ? "#061b26" : "#64748b",
            fontSize: "0.96rem",
            fontWeight: 900,
            cursor: selected && !submitting ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          {submitting ? "Checking..." : "Catch This Lantern"}
        </button>
      </div>
    </div>
  );
}
