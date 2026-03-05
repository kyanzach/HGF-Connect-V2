"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";

/**
 * PullToRefresh — Native app-like pull-down gesture to reload the page.
 *
 * How it works:
 * 1. User touches and drags down while at the top of the scroll container
 * 2. A spinner indicator peeks down from the top
 * 3. Once pulled past the threshold (80px), releasing triggers a hard reload
 * 4. If released before threshold, it snaps back (no action)
 *
 * Works with both window scroll AND overflow scroll containers.
 * Only activates on touch devices (ignored on desktop).
 */

const THRESHOLD = 80;
const MAX_PULL = 120;
const INDICATOR_SIZE = 36;

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Check if the scrollable container is at the top
  const isAtTop = useCallback(() => {
    // Check the parent's scroll position (for overflow containers)
    const parent = containerRef.current?.parentElement;
    if (parent && parent.scrollTop > 5) return false;
    // Also check window scroll
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
      // Apply resistance (diminishing returns)
      const distance = Math.min(dy * 0.5, MAX_PULL);
      if (distance > 10) {
        // Prevent scroll while pulling down
        e.preventDefault();
      }
      setPullDistance(distance);
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isPastThreshold = pullDistance >= THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "relative" }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            paddingTop: `${Math.max(pullDistance - INDICATOR_SIZE, 0)}px`,
            zIndex: 9998,
            pointerEvents: "none",
            transition: pullDistance === 0 && !refreshing ? "padding-top 0.25s ease" : "none",
          }}
        >
          <div
            style={{
              width: INDICATOR_SIZE,
              height: INDICATOR_SIZE,
              borderRadius: "50%",
              background: isPastThreshold || refreshing ? "#4EB1CB" : "white",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${progress * 360}deg)`,
              transition: refreshing ? "none" : "background 0.2s",
              animation: refreshing ? "ptrSpin 0.8s linear infinite" : "none",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isPastThreshold || refreshing ? "white" : "#4EB1CB"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </div>
        </div>
      )}

      {/* Page content — shifts down with pull */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : "none",
          transition: pulling.current ? "none" : "transform 0.25s ease",
        }}
      >
        {children}
      </div>

      <style>{`@keyframes ptrSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
