"use client";

import { useEffect, useRef, useState } from "react";

interface WordHarvestTreeStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    questionText: string;
    hint?: string;
    wordChunks?: string[];
  };
  dayLabel: string;
  submitting: boolean;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

export default function WordHarvestTreeStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: WordHarvestTreeStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunks = question.wordChunks && question.wordChunks.length >= 3 ? question.wordChunks : [];
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [manualMode, setManualMode] = useState(chunks.length === 0);
  const [manualText, setManualText] = useState("");
  const bloomLevelRef = useRef(0);

  useEffect(() => {
    bloomLevelRef.current = chunks.length > 0 ? selectedIndices.length / chunks.length : 0;
  }, [selectedIndices.length, chunks.length]);

  // 3D rotating golden-emerald tree canvas that blooms brighter as each word-leaf is plucked!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 320;
    const H = 175;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Precompute 3D canopy leaf nodes on a sphere
    const nodes = Array.from({ length: 46 }, (_, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 46);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const rad = 46 + (i % 4) * 5;
      return {
        x: rad * Math.sin(phi) * Math.cos(theta),
        y: rad * Math.cos(phi) * 0.78 - 22,
        z: rad * Math.sin(phi) * Math.sin(theta),
        size: 3.5 + (i % 3) * 1.4,
        isFruit: i % 5 === 0,
      };
    });

    let rot = 0;
    const render = () => {
      rot += 0.011;
      const bloom = bloomLevelRef.current;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = 96;

      // Soft aura behind canopy
      const aura = ctx.createRadialGradient(cx, cy - 18, 6, cx, cy - 18, 86);
      aura.addColorStop(0, `rgba(78, 177, 203, ${0.22 + bloom * 0.25})`);
      aura.addColorStop(0.6, `rgba(251, 191, 36, ${0.08 + bloom * 0.18})`);
      aura.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy - 18, 86, 0, Math.PI * 2);
      ctx.fill();

      // Trunk & main branches
      ctx.strokeStyle = "#8c6239";
      ctx.lineCap = "round";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx, H - 14);
      ctx.quadraticCurveTo(cx - 2, cy + 16, cx, cy - 6);
      ctx.stroke();

      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx - 28, cy - 18);
      ctx.moveTo(cx, cy + 2);
      ctx.lineTo(cx + 28, cy - 20);
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx, cy - 32);
      ctx.stroke();

      // Project & depth-sort 3D leaf nodes
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const projected = nodes
        .map((n) => {
          const rx = n.x * cosR - n.z * sinR;
          const rz = n.x * sinR + n.z * cosR;
          const scale = 220 / (220 - rz);
          return {
            sx: cx + rx * scale,
            sy: cy + n.y * scale,
            rz,
            r: n.size * scale,
            isFruit: n.isFruit,
          };
        })
        .sort((a, b) => a.rz - b.rz);

      for (const p of projected) {
        const depthAlpha = Math.max(0.32, Math.min(1, (p.rz + 70) / 130));
        if (p.isFruit) {
          ctx.fillStyle =
            bloom > 0.5
              ? `rgba(253, 224, 71, ${depthAlpha})`
              : `rgba(245, 158, 11, ${depthAlpha})`;
        } else {
          ctx.fillStyle = `rgba(52, 211, 153, ${depthAlpha * 0.9})`;
        }
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r * (1 + bloom * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  function pluckWord(idx: number) {
    if (selectedIndices.includes(idx)) return;
    setSelectedIndices((prev) => [...prev, idx]);
  }

  function returnWord(posInTray: number) {
    setSelectedIndices((prev) => prev.filter((_, i) => i !== posInTray));
  }

  const assembledSentence = selectedIndices.map((idx) => chunks[idx]).join(" ");
  const canSubmit = manualMode
    ? manualText.trim().length > 0
    : selectedIndices.length === chunks.length && chunks.length > 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "linear-gradient(180deg, #061c1d 0%, #0a2e36 55%, #06161c 100%)",
        color: "#f8fafc",
        overflowY: "auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 36px",
      }}
    >
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        {/* Top Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span
            style={{
              background: "rgba(52, 211, 153, 0.16)",
              border: "1px solid rgba(52, 211, 153, 0.45)",
              color: "#a7f3d0",
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

        {/* 3D Rotating Tree */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
          <canvas ref={canvasRef} style={{ width: "320px", height: "175px" }} />
        </div>

        {/* Question Prompt */}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <h2 style={{ fontSize: "1.04rem", fontWeight: 800, lineHeight: 1.4, margin: "0 0 8px" }}>
            {question.questionText}
          </h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center" }}>
            {question.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                style={{
                  background: "rgba(253, 224, 71, 0.14)",
                  border: "1px solid rgba(253, 224, 71, 0.35)",
                  color: "#fde68a",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showHint ? "Hide Hint" : "Hint"}
              </button>
            )}
            {chunks.length > 0 && (
              <button
                type="button"
                onClick={() => setManualMode(!manualMode)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#cbd5e1",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {manualMode ? "Use 3D Word Plucker" : "Type Own Words"}
              </button>
            )}
          </div>
          {showHint && question.hint && (
            <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#fde68a", lineHeight: 1.4 }}>
              {question.hint}
            </p>
          )}
        </div>

        {!manualMode ? (
          <>
            {/* Assembled Sentence Tray */}
            <div
              style={{
                minHeight: "68px",
                background: "rgba(15, 23, 42, 0.65)",
                border: "1.5px dashed rgba(78, 177, 203, 0.55)",
                borderRadius: "14px",
                padding: "10px 12px",
                marginBottom: "14px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {selectedIndices.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                  Tap the glowing leaves below in order to build the truth...
                </span>
              ) : (
                selectedIndices.map((chunkIdx, pos) => (
                  <button
                    key={`${chunkIdx}-${pos}`}
                    type="button"
                    onClick={() => returnWord(pos)}
                    style={{
                      background: "linear-gradient(135deg, #0e7490, #0891b2)",
                      color: "white",
                      border: "1px solid #67e8f9",
                      borderRadius: "10px",
                      padding: "7px 11px",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {chunks[chunkIdx]}
                  </button>
                ))
              )}
            </div>

            {/* Available Tree Leaf Words */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "18px",
              }}
            >
              {chunks.map((chunk, idx) => {
                const used = selectedIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={used || submitting}
                    onClick={() => pluckWord(idx)}
                    style={{
                      background: used
                        ? "rgba(255,255,255,0.04)"
                        : "linear-gradient(135deg, rgba(16,185,129,0.28), rgba(245,158,11,0.22))",
                      border: used
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "1.5px solid rgba(167, 243, 208, 0.55)",
                      color: used ? "#475569" : "#ecfdf5",
                      borderRadius: "12px",
                      padding: "9px 13px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: used ? "default" : "pointer",
                      opacity: used ? 0.35 : 1,
                    }}
                  >
                    {chunk}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Write your answer in English, Bisaya, or Tagalog..."
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: "12px",
              border: "1.5px solid rgba(78, 177, 203, 0.45)",
              background: "rgba(15, 23, 42, 0.7)",
              color: "#ffffff",
              fontSize: "0.92rem",
              fontFamily: "inherit",
              marginBottom: "16px",
            }}
          />
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          {!manualMode && selectedIndices.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIndices([])}
              style={{
                padding: "13px 16px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "#e2e8f0",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={() => onSubmit(manualMode ? manualText.trim() : assembledSentence)}
            style={{
              flex: 1,
              padding: "14px 20px",
              borderRadius: "14px",
              border: "none",
              background: canSubmit ? "#4EB1CB" : "rgba(255,255,255,0.1)",
              color: canSubmit ? "#061b26" : "#64748b",
              fontSize: "0.96rem",
              fontWeight: 900,
              cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            {submitting ? "Harvesting..." : "Submit Harvested Truth"}
          </button>
        </div>
      </div>
    </div>
  );
}
