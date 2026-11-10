"use client";

import { useEffect, useRef, useState } from "react";

interface TreeOfWisdomStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    type: string;
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

interface Branch3D {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  depth: number;
  thickness: number;
}

interface LeafNode3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  tier: number;
}

interface Mote3D {
  angle: number;
  radius: number;
  y: number;
  speed: number;
  size: number;
}

function buildTreeGeometry(): { branches: Branch3D[]; leaves: LeafNode3D[]; motes: Mote3D[] } {
  const branches: Branch3D[] = [];
  const leaves: LeafNode3D[] = [];

  // Deterministic pseudo-random so SSR/hydration & frames are rock-solid
  let seed = 777;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  function grow(
    x: number,
    y: number,
    z: number,
    len: number,
    pitch: number,
    yaw: number,
    depth: number,
    maxDepth: number
  ) {
    const nx = x + Math.sin(pitch) * Math.cos(yaw) * len;
    const ny = y - Math.cos(pitch) * len;
    const nz = z + Math.sin(pitch) * Math.sin(yaw) * len;

    branches.push({
      x1: x,
      y1: y,
      z1: z,
      x2: nx,
      y2: ny,
      z2: nz,
      depth,
      thickness: Math.max(1.2, (maxDepth - depth + 1) * 1.45),
    });

    if (depth >= maxDepth) {
      leaves.push({
        x: nx,
        y: ny,
        z: nz,
        radius: 3.2 + rand() * 2.6,
        tier: (leaves.length % 7) + 1,
      });
      return;
    }

    const childCount = depth === 0 ? 4 : 3;
    for (let i = 0; i < childCount; i++) {
      const baseYaw = yaw + (i * Math.PI * 2) / childCount + (rand() - 0.5) * 0.45;
      const nextPitch = 0.36 + depth * 0.11 + rand() * 0.16;
      const nextLen = len * (0.68 + rand() * 0.08);
      grow(nx, ny, nz, nextLen, nextPitch, baseYaw, depth + 1, maxDepth);
    }
  }

  // Trunk starting from glowing sanctuary base (y = +68 up toward canopy)
  grow(0, 68, 0, 44, 0.02, 0, 0, 3);

  // Subtle root tendrils at base
  for (let r = 0; r < 6; r++) {
    const a = (r * Math.PI * 2) / 6;
    branches.push({
      x1: 0,
      y1: 68,
      z1: 0,
      x2: Math.cos(a) * 28,
      y2: 76,
      z2: Math.sin(a) * 28,
      depth: 1,
      thickness: 2.2,
    });
  }

  const motes: Mote3D[] = Array.from({ length: 22 }, (_, i) => ({
    angle: (i * Math.PI * 2) / 22,
    radius: 26 + (i % 5) * 14,
    y: 65 - (i * 6.5) % 135,
    speed: 0.008 + (i % 4) * 0.003,
    size: 1.4 + (i % 3) * 0.7,
  }));

  return { branches, leaves, motes };
}

export default function TreeOfWisdomStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: TreeOfWisdomStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const podsGridRef = useRef<HTMLDivElement | null>(null);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const [stagePhase, setStagePhase] = useState<"idle" | "locking">("idle");

  const options = Array.isArray(question.options) ? question.options : [];
  const LETTERS = ["A", "B", "C", "D"];

  // Progressive fallback for CSS sibling-index() stagger per modern-web-guidance
  useEffect(() => {
    if (typeof window === "undefined" || !podsGridRef.current) return;
    if (
      typeof CSS !== "undefined" &&
      !CSS.supports("animation-delay: calc(sibling-index() * 0.1s)")
    ) {
      Array.from(podsGridRef.current.children).forEach((el, index) => {
        (el as HTMLElement).style.setProperty("--sibling-index", String(index + 1));
      });
    }
  }, [options.length]);

  // 3D Perspective Tree of Wisdom Engine (HTML5 Canvas)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const W = 320;
    const H = 200;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const { branches, leaves, motes } = buildTreeGeometry();
    let rotY = 0.35;
    let rafId = 0;

    const project = (x: number, y: number, z: number, cosA: number, sinA: number) => {
      const rx = x * cosA - z * sinA;
      const rz = x * sinA + z * cosA;
      const fov = 260;
      const scale = fov / (fov + rz + 120);
      return {
        sx: W / 2 + rx * scale,
        sy: H / 2 + 12 + y * scale,
        rz,
        scale,
      };
    };

    const renderFrame = () => {
      ctx.clearRect(0, 0, W, H);

      const isLocking = stagePhase === "locking" || submitting;
      const cosA = Math.cos(rotY);
      const sinA = Math.sin(rotY);

      // 1. Sanctuary radial floor halo beneath the 3D Tree
      const baseGlow = ctx.createRadialGradient(W / 2, H - 22, 4, W / 2, H - 22, 95);
      if (isLocking) {
        baseGlow.addColorStop(0, "rgba(251, 191, 36, 0.48)");
        baseGlow.addColorStop(0.5, "rgba(245, 158, 11, 0.16)");
        baseGlow.addColorStop(1, "rgba(5, 19, 29, 0)");
      } else {
        baseGlow.addColorStop(0, "rgba(78, 177, 203, 0.42)");
        baseGlow.addColorStop(0.55, "rgba(14, 165, 233, 0.12)");
        baseGlow.addColorStop(1, "rgba(5, 19, 29, 0)");
      }
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.ellipse(W / 2, H - 22, 92, 22, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric 3D stage rings at root level
      [34, 56].forEach((ringR, idx) => {
        ctx.strokeStyle = isLocking
          ? `rgba(251, 191, 36, ${idx === 0 ? 0.5 : 0.24})`
          : `rgba(78, 177, 203, ${idx === 0 ? 0.45 : 0.2})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(W / 2, H - 22, ringR, ringR * 0.24, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 3. Project & depth-sort 3D branches (back-to-front)
      const projectedBranches = branches
        .map((b) => {
          const p1 = project(b.x1, b.y1, b.z1, cosA, sinA);
          const p2 = project(b.x2, b.y2, b.z2, cosA, sinA);
          return { b, p1, p2, avgZ: (p1.rz + p2.rz) * 0.5 };
        })
        .sort((a, b) => b.avgZ - a.avgZ);

      for (const item of projectedBranches) {
        const { b, p1, p2 } = item;
        const depthAlpha = Math.max(0.28, Math.min(0.95, 0.78 - item.avgZ / 220));
        const grad = ctx.createLinearGradient(p1.sx, p1.sy, p2.sx, p2.sy);
        if (isLocking) {
          grad.addColorStop(0, `rgba(245, 158, 11, ${depthAlpha})`);
          grad.addColorStop(1, `rgba(253, 224, 71, ${depthAlpha})`);
        } else {
          grad.addColorStop(0, `rgba(56, 189, 248, ${depthAlpha * 0.85})`);
          grad.addColorStop(1, `rgba(251, 191, 36, ${depthAlpha})`);
        }
        ctx.strokeStyle = grad;
        ctx.lineWidth = b.thickness * ((p1.scale + p2.scale) * 0.5);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();
      }

      // 4. Project & draw luminous 3D canopy nodes
      const projectedLeaves = leaves
        .map((lf) => ({ lf, p: project(lf.x, lf.y, lf.z, cosA, sinA) }))
        .sort((a, b) => b.p.rz - a.p.rz);

      for (const { lf, p } of projectedLeaves) {
        const isCurrentDayTier = lf.tier === question.dayNumber;
        const r = lf.radius * p.scale * (isCurrentDayTier ? 1.35 : 1);
        const glow = ctx.createRadialGradient(p.sx, p.sy, 0.5, p.sx, p.sy, r * 2.4);
        if (isLocking || isCurrentDayTier) {
          glow.addColorStop(0, "rgba(254, 243, 199, 0.95)");
          glow.addColorStop(0.45, "rgba(251, 191, 36, 0.65)");
          glow.addColorStop(1, "rgba(245, 158, 11, 0)");
        } else {
          glow.addColorStop(0, "rgba(224, 242, 254, 0.9)");
          glow.addColorStop(0.5, "rgba(78, 177, 203, 0.55)");
          glow.addColorStop(1, "rgba(78, 177, 203, 0)");
        }
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Rising sanctuary light motes
      for (const m of motes) {
        if (!prefersReduced) {
          m.angle += isLocking ? m.speed * 2.6 : m.speed;
          m.y -= isLocking ? 0.55 : 0.2;
          if (m.y < -62) m.y = 68;
        }
        const mx = Math.cos(m.angle) * m.radius;
        const mz = Math.sin(m.angle) * m.radius;
        const mp = project(mx, m.y, mz, cosA, sinA);
        ctx.fillStyle = isLocking
          ? "rgba(253, 224, 71, 0.78)"
          : "rgba(125, 211, 252, 0.65)";
        ctx.beginPath();
        ctx.arc(mp.sx, mp.sy, m.size * mp.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReduced) {
        rotY += isLocking ? 0.028 : 0.0075;
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [stagePhase, submitting, question.dayNumber]);

  const handleSelectPod = (opt: string, idx: number) => {
    if (submitting || stagePhase === "locking") return;
    setLockedIdx(idx);
    setStagePhase("locking");
    // 780ms dramatic spotlight lock-in transition before grading reveal
    setTimeout(() => {
      onSubmit(opt);
    }, 780);
  };

  return (
    <div className="hgf-wisdom-stage-overlay">
      {/* Converging Sanctuary Spotlight Cones */}
      <div className="hgf-spotlight-beam hgf-spotlight-left" aria-hidden="true" />
      <div className="hgf-spotlight-beam hgf-spotlight-right" aria-hidden="true" />

      {/* Top Stage Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px 8px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <span
          style={{
            background: "rgba(78, 177, 203, 0.22)",
            color: "#7dd3fc",
            fontSize: "0.82rem",
            fontWeight: 700,
            padding: "5px 14px",
            borderRadius: "999px",
            border: "1px solid rgba(78, 177, 203, 0.45)",
          }}
        >
          {dayLabel}
        </span>

        <button
          onClick={onClose}
          disabled={submitting || stagePhase === "locking"}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontSize: "1rem",
            padding: "7px 15px",
            borderRadius: "10px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Stage Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 16px 90px",
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "680px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* 3D Rotating Tree of Wisdom Stage Centerpiece + 7-Day Ascent Pips */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            marginBottom: "8px",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: "320px", height: "190px", display: "block" }}
            aria-label="3D Tree of Wisdom Sanctuary Stage"
          />
        </div>

        {/* Iconic Hexagonal Beveled Question Chamber with Flanking Stage Rails */}
        <div className="hgf-stage-rail-row" style={{ marginTop: "12px", marginBottom: "14px" }}>
          <div className="hgf-stage-rail" />
          <div className="hgf-hex-question-chamber">
            <div className="hgf-hex-question-inner">
              <p
                style={{
                  color: "#f8fafc",
                  fontSize: "1.08rem",
                  fontWeight: 700,
                  lineHeight: 1.5,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {question.questionText}
              </p>
            </div>
          </div>
          <div className="hgf-stage-rail" />
        </div>

        {/* Optional Hint Toggle */}
        {question.hint && (
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "rgba(251, 191, 36, 0.12)",
                border: "1px solid rgba(251, 191, 36, 0.38)",
                borderRadius: "999px",
                padding: "5px 14px",
                color: "#fde68a",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {showHint ? "Hide Hint" : "Show Scripture Hint"}
            </button>
            {showHint && (
              <div
                style={{
                  marginTop: "8px",
                  background: "rgba(251, 191, 36, 0.1)",
                  border: "1px solid rgba(251, 191, 36, 0.32)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  color: "#fef3c7",
                  fontSize: "0.84rem",
                  maxWidth: "520px",
                }}
              >
                {question.hint}
              </div>
            )}
          </div>
        )}

        {/* 4 Hexagonal Spotlight Answer Pods (A / B / C / D) */}
        <div ref={podsGridRef} className="hgf-hex-pods-grid">
          {options.map((opt: string, idx: number) => {
            const isLocked = lockedIdx === idx;
            const isDimmed = lockedIdx !== null && lockedIdx !== idx;
            return (
              <div key={idx} className="hgf-pod-stagger-item">
                <div className="hgf-stage-rail hgf-pod-rail" />
                <button
                  type="button"
                  disabled={submitting || stagePhase === "locking"}
                  onClick={() => handleSelectPod(opt, idx)}
                  className={`hgf-hex-pod-btn ${isLocked ? "is-locked" : ""} ${
                    isDimmed ? "is-dimmed" : ""
                  }`}
                >
                  <span className="hgf-hex-pod-inner">
                    <span className="hgf-pod-diamond">◆</span>
                    <span className="hgf-pod-letter">{LETTERS[idx] || idx + 1}:</span>
                    <span className="hgf-pod-text">{opt}</span>
                  </span>
                </button>
                <div className="hgf-stage-rail hgf-pod-rail" />
              </div>
            );
          })}
        </div>

        {(stagePhase === "locking" || submitting) && (
          <p
            style={{
              color: "#fde68a",
              marginTop: "18px",
              fontSize: "0.88rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            Illuminating the Tree of Wisdom...
          </p>
        )}
      </div>

      <style>{`
        .hgf-wisdom-stage-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% 24%, #0f3850 0%, #071d2b 52%, #030e16 100%);
          z-index: 11000;
          display: flex;
          flex-direction: column;
          padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
          overflow-y: auto;
          overflow-x: hidden;
        }

        .hgf-spotlight-beam {
          position: fixed;
          top: -10%;
          width: 46vw;
          height: 75vh;
          pointer-events: none;
          z-index: 1;
          opacity: 0.24;
          filter: blur(24px);
          transition: opacity 0.4s ease;
        }

        .hgf-spotlight-left {
          left: -8%;
          background: linear-gradient(155deg, rgba(78, 177, 203, 0.52) 0%, rgba(78, 177, 203, 0) 72%);
          transform: rotate(-12deg);
        }

        .hgf-spotlight-right {
          right: -8%;
          background: linear-gradient(205deg, rgba(251, 191, 36, 0.36) 0%, rgba(251, 191, 36, 0) 72%);
          transform: rotate(12deg);
        }

        .hgf-stage-rail-row {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .hgf-stage-rail {
          height: 2px;
          flex: 1;
          min-width: 12px;
          background: linear-gradient(90deg, rgba(78, 177, 203, 0.15), rgba(78, 177, 203, 0.85), rgba(78, 177, 203, 0.15));
          box-shadow: 0 0 8px rgba(78, 177, 203, 0.45);
        }

        .hgf-hex-question-chamber {
          width: 100%;
          max-width: 580px;
          padding: 2px;
          background: linear-gradient(135deg, #4EB1CB 0%, #fbbf24 50%, #0284c7 100%);
          clip-path: polygon(18px 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0% 50%);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        }

        .hgf-hex-question-inner {
          background: linear-gradient(180deg, #092536 0%, #051622 100%);
          clip-path: polygon(17px 0%, calc(100% - 17px) 0%, 100% 50%, calc(100% - 17px) 100%, 17px 100%, 0% 50%);
          padding: 20px 30px;
        }

        .hgf-hex-pods-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 10px;
          width: 100%;
          margin-top: 4px;
        }

        @media (max-width: 560px) {
          .hgf-hex-pods-grid {
            grid-template-columns: 1fr;
          }
        }

        .hgf-pod-stagger-item {
          --stagger-time: 0.08s;
          display: flex;
          align-items: center;
          width: 100%;
          animation: hgfPodEnter 0.36s cubic-bezier(0.2, 0, 0, 1) backwards;
          animation-delay: calc(var(--sibling-index, 1) * var(--stagger-time));
          animation-delay: calc(sibling-index() * var(--stagger-time));
        }

        @media (prefers-reduced-motion: reduce) {
          .hgf-pod-stagger-item {
            animation: none;
          }
        }

        @keyframes hgfPodEnter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hgf-pod-rail {
          max-width: 14px;
          flex: 0 0 10px;
        }

        .hgf-hex-pod-btn {
          flex: 1;
          border: none;
          padding: 2px;
          cursor: pointer;
          background: linear-gradient(90deg, #38bdf8 0%, #4EB1CB 50%, #0284c7 100%);
          clip-path: polygon(14px 0%, calc(100% - 14px) 0%, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0% 50%);
          transition: transform 0.16s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease;
          text-align: left;
        }

        .hgf-hex-pod-btn:hover:not(:disabled) {
          transform: scale(1.02);
          background: linear-gradient(90deg, #fbbf24 0%, #4EB1CB 50%, #fbbf24 100%);
        }

        .hgf-hex-pod-btn:active:not(:disabled) {
          transform: scale(0.985);
        }

        .hgf-hex-pod-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 54px;
          padding: 12px 20px;
          background: linear-gradient(180deg, #0b2d42 0%, #061a28 100%);
          clip-path: polygon(13px 0%, calc(100% - 13px) 0%, 100% 50%, calc(100% - 13px) 100%, 13px 100%, 0% 50%);
          transition: background 0.2s ease;
        }

        .hgf-pod-diamond {
          color: #fbbf24;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .hgf-pod-letter {
          color: #fbbf24;
          font-weight: 800;
          font-size: 0.92rem;
          flex-shrink: 0;
        }

        .hgf-pod-text {
          color: #f1f5f9;
          font-weight: 600;
          font-size: 0.94rem;
          line-height: 1.35;
        }

        .hgf-hex-pod-btn.is-locked {
          background: linear-gradient(90deg, #fde68a 0%, #f59e0b 50%, #fde68a 100%);
          transform: scale(1.025);
        }

        .hgf-hex-pod-btn.is-locked .hgf-hex-pod-inner {
          background: linear-gradient(180deg, #b45309 0%, #78350f 100%);
        }

        .hgf-hex-pod-btn.is-locked .hgf-pod-diamond,
        .hgf-hex-pod-btn.is-locked .hgf-pod-letter,
        .hgf-hex-pod-btn.is-locked .hgf-pod-text {
          color: #ffffff;
        }

        .hgf-hex-pod-btn.is-dimmed {
          opacity: 0.45;
        }
      `}</style>
    </div>
  );
}
