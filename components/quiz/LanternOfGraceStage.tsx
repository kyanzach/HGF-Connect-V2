"use client";

import { useEffect, useRef, useState } from "react";

interface LanternOfGraceStageProps {
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

export default function LanternOfGraceStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: LanternOfGraceStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [reflection, setReflection] = useState("");
  const [releasing, setReleasing] = useState(false);
  const releaseBoostRef = useRef(false);

  // Serene starry night-sky 3D lantern release canvas
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

    const stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * 0.75,
      r: 0.7 + Math.random() * 1.4,
      twinkle: Math.random() * Math.PI * 2,
    }));

    const lanterns = Array.from({ length: 14 }, () => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * (0.25 + Math.random() * 0.9),
      z: 0.4 + Math.random() * 0.85,
      sway: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        s.twinkle += 0.025;
        const alpha = 0.35 + Math.sin(s.twinkle) * 0.35;
        ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Warm paper lanterns floating up
      const speedMult = releaseBoostRef.current ? 4.2 : 1;
      for (const l of lanterns) {
        l.y -= (0.35 * l.z) * speedMult;
        l.sway += 0.01;
        const dx = l.x + Math.sin(l.sway) * 14 * l.z;
        if (l.y < -50) {
          l.y = h + 50;
          l.x = Math.random() * w;
        }

        const lw = 14 * l.z;
        const lh = 19 * l.z;

        const glow = ctx.createRadialGradient(dx, l.y, 1, dx, l.y, lh * 2.2);
        glow.addColorStop(0, `rgba(251, 191, 36, ${0.42 * l.z})`);
        glow.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(dx, l.y, lh * 2.2, 0, Math.PI * 2);
        ctx.fill();

        const bodyGrad = ctx.createLinearGradient(dx, l.y - lh / 2, dx, l.y + lh / 2);
        bodyGrad.addColorStop(0, "#f59e0b");
        bodyGrad.addColorStop(1, "#fef08a");
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(dx - lw / 2, l.y - lh / 2, lw, lh, 4 * l.z);
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

  function handleRelease() {
    if (!reflection.trim() || submitting || releasing) return;
    setReleasing(true);
    releaseBoostRef.current = true;
    setTimeout(() => {
      onSubmit(reflection.trim());
    }, 450);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #040d1a 0%, #0b2239 58%, #102a43 100%)",
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

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "540px",
          margin: "0 auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 36px",
        }}
      >
        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <span
            style={{
              background: "rgba(251, 191, 36, 0.16)",
              border: "1px solid rgba(251, 191, 36, 0.45)",
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

        {/* Reflection Card */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.72)",
            border: "1.5px solid rgba(251, 191, 36, 0.35)",
            borderRadius: "20px",
            padding: "22px 18px",
            boxShadow: "0 12px 34px rgba(0,0,0,0.4)",
            marginBottom: "18px",
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fde68a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px", textAlign: "center" }}>
            Heart Reflection · English, Bisaya, or Tagalog
          </div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.45, margin: "0 0 14px", textAlign: "center" }}>
            {question.questionText}
          </h2>

          {question.hint && (
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#a5f3fc",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showHint ? "Hide Prompt" : "Need a Reflection Prompt?"}
              </button>
              {showHint && (
                <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.4 }}>
                  {question.hint}
                </p>
              )}
            </div>
          )}

          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write a sincere 1-2 sentence takeaway or prayer from this sermon..."
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px",
              borderRadius: "14px",
              border: "1.5px solid rgba(251, 191, 36, 0.38)",
              background: "rgba(4, 13, 26, 0.72)",
              color: "#ffffff",
              fontSize: "0.94rem",
              lineHeight: 1.5,
              fontFamily: "inherit",
              resize: "none",
            }}
          />
        </div>

        <button
          type="button"
          disabled={!reflection.trim() || submitting || releasing}
          onClick={handleRelease}
          style={{
            width: "100%",
            padding: "15px 20px",
            borderRadius: "14px",
            border: "none",
            background: reflection.trim()
              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              : "rgba(255,255,255,0.1)",
            color: reflection.trim() ? "#0f172a" : "#64748b",
            fontSize: "0.98rem",
            fontWeight: 900,
            cursor: reflection.trim() && !submitting ? "pointer" : "not-allowed",
            boxShadow: reflection.trim() ? "0 8px 24px rgba(245, 158, 11, 0.35)" : "none",
            whiteSpace: "nowrap",
          }}
        >
          {submitting || releasing ? "Releasing Lantern..." : "Release Lantern & Submit"}
        </button>
      </div>
    </div>
  );
}
