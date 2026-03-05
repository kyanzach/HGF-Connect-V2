"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";

/**
 * PullToRefresh — Premium pull-down gesture with glassmorphic centered indicator.
 *
 * Design:
 * - Full-screen frosted overlay with centered glass circle
 * - Gradient ring spinner that fills as you pull
 * - Teal glow pulse when threshold is met
 * - Smooth spring-like snap-back animation
 * - "Refreshing…" text appears after release
 */

const THRESHOLD = 80;
const MAX_PULL = 140;

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const isAtTop = useCallback(() => {
    const parent = containerRef.current?.parentElement;
    if (parent && parent.scrollTop > 5) return false;
    if (window.scrollY > 5) return false;
    return true;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      if (!isAtTop()) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [refreshing, isAtTop]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const distance = Math.min(dy * 0.45, MAX_PULL);
      setPullDistance(distance);
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setTimeout(() => window.location.reload(), 600);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isActive = pullDistance > 8 || refreshing;
  const isPast = pullDistance >= THRESHOLD;

  // SVG arc for progress ring
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - progress * circumference;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "relative" }}
    >
      {/* ── Overlay + Centered Indicator ── */}
      {isActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: refreshing ? "auto" : "none",
            background: refreshing
              ? "rgba(0,0,0,0.15)"
              : `rgba(0,0,0,${Math.min(progress * 0.12, 0.12)})`,
            backdropFilter: refreshing ? "blur(4px)" : `blur(${progress * 3}px)`,
            WebkitBackdropFilter: refreshing ? "blur(4px)" : `blur(${progress * 3}px)`,
            transition: refreshing ? "all 0.3s ease" : "none",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: isPast || refreshing
                ? "0 0 30px rgba(78,177,203,0.4), 0 8px 32px rgba(0,0,0,0.12)"
                : "0 4px 20px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              transform: refreshing
                ? "scale(1)"
                : `scale(${0.6 + progress * 0.4})`,
              opacity: refreshing ? 1 : Math.min(progress * 1.5, 1),
              transition: pulling.current
                ? "box-shadow 0.2s"
                : "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
              animation: refreshing ? "ptrPulse 1.5s ease-in-out infinite" : "none",
            }}
          >
            {/* Progress Ring */}
            <svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              style={{
                transform: refreshing ? "none" : `rotate(${-90 + progress * 270}deg)`,
                transition: pulling.current ? "none" : "transform 0.3s ease",
                animation: refreshing ? "ptrSpin 1s linear infinite" : "none",
              }}
            >
              {/* Background track */}
              <circle
                cx="26"
                cy="26"
                r={radius}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="3"
              />
              {/* Progress arc — gradient via stroke color */}
              <circle
                cx="26"
                cy="26"
                r={radius}
                fill="none"
                stroke={isPast || refreshing ? "#4EB1CB" : "#94a3b8"}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={refreshing ? 0 : strokeOffset}
                style={{
                  transition: refreshing
                    ? "stroke-dashoffset 0.4s ease"
                    : pulling.current
                    ? "none"
                    : "all 0.3s ease",
                }}
              />
              {/* Center icon */}
              <g
                transform="translate(17, 17)"
                opacity={refreshing ? 1 : Math.max(progress, 0.3)}
              >
                <polyline
                  points="1 3 1 8 6 8"
                  fill="none"
                  stroke={isPast || refreshing ? "#4EB1CB" : "#94a3b8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.5 12a7 7 0 1 0 1.66-7.28L1 8"
                  fill="none"
                  stroke={isPast || refreshing ? "#4EB1CB" : "#94a3b8"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>

            {/* Status text */}
            {refreshing && (
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#4EB1CB",
                  letterSpacing: "0.03em",
                  marginTop: -4,
                  animation: "ptrFadeIn 0.3s ease",
                }}
              >
                Refreshing…
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      {children}

      <style>{`
        @keyframes ptrSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes ptrPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(78,177,203,0.3), 0 8px 32px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 40px rgba(78,177,203,0.5), 0 8px 32px rgba(0,0,0,0.15); }
        }
        @keyframes ptrFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
