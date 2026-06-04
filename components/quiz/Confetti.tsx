"use client";

/**
 * Confetti.tsx — Lightweight canvas-based confetti burst
 *
 * Usage: <Confetti trigger={showConfetti} onDone={() => setShowConfetti(false)} />
 * No external dependencies — pure canvas animation.
 */

import { useEffect, useRef, useCallback } from "react";

interface ConfettiProps {
  trigger: boolean;
  onDone?: () => void;
  duration?: number; // ms, default 2500
  particleCount?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  opacity: number;
}

const COLORS = [
  "#4EB1CB", // HGF teal
  "#FFD700", // gold
  "#FF6B6B", // coral
  "#48BB78", // green
  "#9F7AEA", // purple
  "#F687B3", // pink
  "#63B3ED", // sky
  "#FBD38D", // warm yellow
];

export default function Confetti({
  trigger,
  onDone,
  duration = 2500,
  particleCount = 60,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fire = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.35;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 1,
      });
    }

    const startTime = performance.now();
    let frameId: number;

    function animate(time: number) {
      if (!ctx || !canvas) return;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.rotation += p.rotSpeed;
        p.opacity = 1 - progress * progress;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onDone?.();
      }
    }

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [duration, particleCount, onDone]);

  useEffect(() => {
    if (trigger) {
      const cleanup = fire();
      return cleanup;
    }
  }, [trigger, fire]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    />
  );
}
