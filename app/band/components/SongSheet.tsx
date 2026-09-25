// app/band/components/SongSheet.tsx
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Song } from '../types/band';
import { SheetLine } from '../lib/musicTheory';

interface SongSheetProps {
  song: Song | null;
  displayKey: string;
  parsedLines: SheetLine[];
  fontSizePx: number;
  isAutoScrolling: boolean;
  scrollSpeed?: number;
  onToggleAutoScroll: () => void;
  onOpenChordDiagram?: (chord: string) => void;
  onJumpSection?: (secName: string) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  drawingCanvasElement?: React.ReactNode;
  isDrawingActive?: boolean;
  onRefresh?: () => Promise<void>;
  playbackState?: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
  };
  bpm?: number | string | null;
  isMetronomePulsing?: boolean;
  isMetronomeAudioActive?: boolean;
  onOpenMetronomeModal?: () => void;
  isSessionOverridden?: boolean;
  worshipLeaderKey?: string;
  plannedDuration?: string;
  onOpenDurationPicker?: () => void;
  scrollMode?: 'duration' | 'speed';
  elapsedScrollSeconds?: number;
  targetDurationSec?: number;
  onUpdateElapsed?: (elapsedSec: number) => void;
  onAutoScrollComplete?: () => void;
  isLiveSyncFollower?: boolean;
  mdLeaderName?: string;
  onDoubleTap?: () => void;
  isImmersionMode?: boolean;
}

export const SongSheet: React.FC<SongSheetProps> = ({
  song,
  displayKey,
  parsedLines,
  fontSizePx,
  isAutoScrolling,
  scrollSpeed = 3,
  onOpenChordDiagram,
  onSwipeLeft,
  onSwipeRight,
  drawingCanvasElement,
  isDrawingActive = false,
  onRefresh,
  playbackState,
  bpm,
  isMetronomePulsing,
  isMetronomeAudioActive,
  isSessionOverridden,
  worshipLeaderKey,
  plannedDuration,
  onOpenDurationPicker,
  scrollMode = 'speed',
  elapsedScrollSeconds = 0,
  targetDurationSec = 0,
  onUpdateElapsed,
  onAutoScrollComplete,
  isLiveSyncFollower = false,
  mdLeaderName = 'MD',
  onDoubleTap,
  isImmersionMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const scrollPosRef = useRef<number>(0);
  const elapsedMsRef = useRef<number>(0);
  const lastReportedSecRef = useRef<number>(-1);
  const isUserInteractingRef = useRef<boolean>(false);
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic prop refs so animation loop never tears down on state/prop updates
  const scrollSpeedRef = useRef<number>(scrollSpeed);
  const scrollModeRef = useRef<'duration' | 'speed'>(scrollMode);
  const effectiveTargetSecRef = useRef<number>(targetDurationSec > 0 ? targetDurationSec : 240);
  const onUpdateElapsedRef = useRef(onUpdateElapsed);
  const onAutoScrollCompleteRef = useRef(onAutoScrollComplete);

  scrollSpeedRef.current = scrollSpeed;
  scrollModeRef.current = scrollMode;
  effectiveTargetSecRef.current = targetDurationSec > 0 ? targetDurationSec : 240;
  onUpdateElapsedRef.current = onUpdateElapsed;
  onAutoScrollCompleteRef.current = onAutoScrollComplete;

  // Calibrated gradual musical scroll speeds (px/sec)
  const SPEED_MAP: Record<number, number> = {
    1: 14, // 1x: gentle crawl for dense chord sheets
    2: 20, // 2x: gradual step (+6)
    3: 28, // 3x: standard comfortable reading (+8)
    4: 38, // 4x: moderate (+10)
    5: 50, // 5x: lively (+12)
    6: 65, // 6x: fast (+15)
    7: 82, // 7x: swift (+17)
    8: 102, // 8x: high speed (+20)
    9: 125, // 9x: fast scrub (+23)
    10: 155, // 10x: maximum teleprompter scrub (+30)
  };

  // Sync scrollPosRef & elapsedMs on mount or song change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      scrollPosRef.current = 0;
    }
    elapsedMsRef.current = 0;
    lastReportedSecRef.current = 0;
    onUpdateElapsedRef.current?.(0);
  }, [song?.id]);

  // Recalibrate elapsedMs proportionally when targetDurationSec changes (e.g. from 4:00 to 7:00) so pace does not freeze or reset
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll > 0) {
      const newTotalMs = (targetDurationSec > 0 ? targetDurationSec : 240) * 1000;
      const currentRatio = Math.min(1, Math.max(0, container.scrollTop / maxScroll));
      elapsedMsRef.current = currentRatio * newTotalMs;
      const currentSec = Math.floor(elapsedMsRef.current / 1000);
      lastReportedSecRef.current = currentSec;
      onUpdateElapsedRef.current?.(currentSec);
    }
  }, [targetDurationSec]);

  // Handle user manual scroll: update scrollPosRef and sync elapsed timer only when user actively touches/scrolls
  const handleScroll = () => {
    if (!containerRef.current) return;
    const currentScroll = containerRef.current.scrollTop;

    if (isUserInteractingRef.current) {
      scrollPosRef.current = currentScroll;
      const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      if (maxScroll > 0) {
        const totalMs = effectiveTargetSecRef.current * 1000;
        const ratio = Math.min(1, Math.max(0, currentScroll / maxScroll));
        elapsedMsRef.current = ratio * totalMs;
        const currentSec = Math.floor(elapsedMsRef.current / 1000);
        if (currentSec !== lastReportedSecRef.current) {
          lastReportedSecRef.current = currentSec;
          onUpdateElapsedRef.current?.(currentSec);
        }
      }
    }
  };

  // Playback-synced smooth 60fps/120fps continuous scroll loop (eliminates jelly / jitter completely)
  const playbackTimeRef = useRef<number>(playbackState?.currentTime || 0);
  playbackTimeRef.current = playbackState?.currentTime || 0;

  useEffect(() => {
    if (!playbackState?.isPlaying || !containerRef.current) return;
    let animId: number;
    let lastTime = performance.now();
    let virtualTime = playbackTimeRef.current;

    const frame = (now: number) => {
      const dt = Math.min(64, Math.max(1, now - lastTime)) / 1000;
      lastTime = now;

      if (!isUserInteractingRef.current && containerRef.current) {
        const el = containerRef.current;
        const maxScroll = el.scrollHeight - el.clientHeight;
        const dur = playbackState.duration || effectiveTargetSecRef.current || 240;

        if (maxScroll > 0 && dur > 0) {
          // Continuously advance time between discrete 250ms audio timeupdate events
          virtualTime += dt;
          const reportedTime = playbackTimeRef.current;
          // Smoothly pull virtual time towards reported audio position if drift exceeds 0.3s
          const drift = reportedTime - virtualTime;
          if (Math.abs(drift) > 0.8) {
            virtualTime = reportedTime;
          } else if (Math.abs(drift) > 0.05) {
            virtualTime += drift * 0.1;
          }

          const targetScroll = Math.min(maxScroll, Math.max(0, (virtualTime / dur) * maxScroll));
          const diff = targetScroll - el.scrollTop;

          if (Math.abs(diff) > 100) {
            // Instant section jump or seek
            el.scrollTop = targetScroll;
          } else if (Math.abs(diff) > 0.2) {
            // Fluid sub-pixel lerp step (60fps / 120fps ProMotion butter smooth)
            el.scrollTop += diff * 0.25;
          }
          scrollPosRef.current = el.scrollTop;
        }
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [playbackState?.isPlaying, playbackState?.duration]);

  // Immediate recalibration on song switch or reconnection when playback is active
  useEffect(() => {
    if (!playbackState?.isPlaying || !containerRef.current) return;
    const scrollSync = () => {
      if (!containerRef.current || isUserInteractingRef.current) return;
      const container = containerRef.current;
      const maxScroll = container.scrollHeight - container.clientHeight;
      const dur = playbackState.duration || effectiveTargetSecRef.current || 240;
      if (maxScroll > 0 && dur > 0) {
        const targetScroll = Math.min(maxScroll, Math.max(0, (playbackTimeRef.current / dur) * maxScroll));
        container.scrollTop = targetScroll;
        scrollPosRef.current = targetScroll;
      }
    };
    scrollSync();
    const t1 = setTimeout(scrollSync, 40);
    const t2 = setTimeout(scrollSync, 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [song?.id, playbackState?.isPlaying]);

  // Resilient, abuse-proof Auto-Scroll loop (60fps/120fps requestAnimationFrame)
  useEffect(() => {
    if (!isAutoScrolling || playbackState?.isPlaying || !containerRef.current) return;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const totalMs = effectiveTargetSecRef.current * 1000;

    // If starting at the very bottom, restart smoothly from top
    if (maxScroll > 0 && container.scrollTop >= maxScroll - 4) {
      container.scrollTop = 0;
      scrollPosRef.current = 0;
      elapsedMsRef.current = 0;
      lastReportedSecRef.current = 0;
      onUpdateElapsedRef.current?.(0);
    } else {
      scrollPosRef.current = container.scrollTop;
      if (maxScroll > 0) {
        elapsedMsRef.current = (container.scrollTop / maxScroll) * totalMs;
      }
    }

    let animId: number;
    let lastTime = performance.now();

    const frame = (now: number) => {
      // Clamped delta ms to prevent huge jumps or freezes on frame hiccups
      const dt = Math.min(64, Math.max(1, now - lastTime));
      lastTime = now;

      if (containerRef.current) {
        const el = containerRef.current;
        const currentMaxScroll = el.scrollHeight - el.clientHeight;
        const currentTotalMs = effectiveTargetSecRef.current * 1000;

        if (isUserInteractingRef.current) {
          // User is dragging or touching the screen: synchronize position without fighting user
          scrollPosRef.current = el.scrollTop;
          if (currentMaxScroll > 0) {
            elapsedMsRef.current = (el.scrollTop / currentMaxScroll) * currentTotalMs;
          }
        } else if (currentMaxScroll > 0) {
          if (scrollModeRef.current === 'duration') {
            // Pace / Duration Mode: advances smoothly according to arrangement duration
            elapsedMsRef.current = Math.min(currentTotalMs, elapsedMsRef.current + dt);
            const ratio = elapsedMsRef.current / currentTotalMs;
            scrollPosRef.current = Math.min(currentMaxScroll, ratio * currentMaxScroll);
            el.scrollTop = scrollPosRef.current;

            // Report elapsed seconds to UI
            const currentSec = Math.floor(elapsedMsRef.current / 1000);
            if (currentSec !== lastReportedSecRef.current) {
              lastReportedSecRef.current = currentSec;
              onUpdateElapsedRef.current?.(currentSec);
            }

            if (elapsedMsRef.current >= currentTotalMs || scrollPosRef.current >= currentMaxScroll - 1) {
              onAutoScrollCompleteRef.current?.();
              return;
            }
          } else {
            // Speed Mode: continuous subpixel accumulation with calibrated gradual speeds
            const currentSpeed = scrollSpeedRef.current;
            const pxPerSec = SPEED_MAP[currentSpeed] || (currentSpeed * 12 + 10);
            scrollPosRef.current = Math.min(currentMaxScroll, scrollPosRef.current + (dt / 1000) * pxPerSec);
            el.scrollTop = scrollPosRef.current;

            elapsedMsRef.current = (scrollPosRef.current / currentMaxScroll) * currentTotalMs;
            const currentSec = Math.floor(elapsedMsRef.current / 1000);
            if (currentSec !== lastReportedSecRef.current) {
              lastReportedSecRef.current = currentSec;
              onUpdateElapsedRef.current?.(currentSec);
            }

            if (scrollPosRef.current >= currentMaxScroll - 1) {
              onAutoScrollCompleteRef.current?.();
              return;
            }
          }
        }
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isAutoScrolling, playbackState?.isPlaying]);

  // Section order roadmap parts
  const sectionParts = (song?.sectionOrder || '')
    .split(/[,>|–-]+|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const jumpToSection = (name: string) => {
    if (!containerRef.current || !name) return;
    const q = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const headers = Array.from(containerRef.current.querySelectorAll('[data-section-title]'));
    const target = headers.find((el) => {
      const text = (el.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return text.includes(q);
    }) as HTMLElement | undefined;

    if (target) {
      containerRef.current.scrollTo({
        top: target.offsetTop - 20,
        behavior: 'smooth',
      });
    }
  };

  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshSuccess, setRefreshSuccess] = useState<boolean>(false);
  const refreshDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartedAtTopRef = useRef<boolean>(false);

  const dismissRefreshPill = useCallback(() => {
    if (refreshDismissTimeoutRef.current) {
      clearTimeout(refreshDismissTimeoutRef.current);
      refreshDismissTimeoutRef.current = null;
    }
    setIsRefreshing(false);
    setRefreshSuccess(false);
    setPullDistance(0);
  }, []);

  // Auto-dismiss within 2 seconds OR immediately upon any touch / tap anywhere
  useEffect(() => {
    if (!refreshSuccess) return;

    // 1. Auto dismiss after 2.2 seconds if untouched
    refreshDismissTimeoutRef.current = setTimeout(() => {
      dismissRefreshPill();
    }, 2200);

    // 2. Split-second immediate dismiss on touch/click anywhere on screen
    const handleDismissOnInteraction = () => {
      dismissRefreshPill();
    };

    window.addEventListener('touchstart', handleDismissOnInteraction, { passive: true, capture: true });
    window.addEventListener('mousedown', handleDismissOnInteraction, { capture: true });

    return () => {
      if (refreshDismissTimeoutRef.current) {
        clearTimeout(refreshDismissTimeoutRef.current);
        refreshDismissTimeoutRef.current = null;
      }
      window.removeEventListener('touchstart', handleDismissOnInteraction, { capture: true });
      window.removeEventListener('mousedown', handleDismissOnInteraction, { capture: true });
    };
  }, [refreshSuccess, dismissRefreshPill]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (refreshSuccess) {
      dismissRefreshPill();
    }
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    isUserInteractingRef.current = true;
    if (isDrawingActive) return;

    // Pull-to-refresh can ONLY start if the container is already parked at the very top (scrollTop <= 0)
    touchStartedAtTopRef.current = Boolean(containerRef.current && containerRef.current.scrollTop <= 0);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawingActive || isRefreshing) return;
    if (!containerRef.current || touchStartY.current === null) return;

    // Inside native Android Band APK (HGFBandApp), disable web pull-to-refresh completely
    // so stage teleprompter scrolling is 100% pure, unhindered, and never hijacked
    const isBandApp = typeof navigator !== 'undefined' && navigator.userAgent.includes('HGFBandApp');
    if (isBandApp) return;

    // Pull-to-refresh is strictly restricted to when the user explicitly started dragging from the top.
    // When scrolling up from Chorus/Bridge, touchStartedAtTopRef is false, so it will NEVER trigger pull-to-refresh.
    if (touchStartedAtTopRef.current && containerRef.current.scrollTop <= 0) {
      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartY.current;
      if (diffY > 15) {
        // Snappy responsive elastic resistance after 15px threshold
        const damped = Math.min(85, Math.pow(diffY - 15, 0.88) * 1.5);
        setPullDistance(damped);
      } else {
        if (pullDistance > 0) setPullDistance(0);
      }
    } else {
      if (containerRef.current.scrollTop > 0) {
        touchStartedAtTopRef.current = false;
      }
      if (pullDistance > 0) setPullDistance(0);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    touchStartedAtTopRef.current = false;
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    userInteractionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 120);

    if (isDrawingActive) return;

    const startX = touchStartX.current;
    const startY = touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Trigger hard refresh when pulled past responsive threshold (48px)
    if (pullDistance >= 48 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(46);
      try {
        // 1. Invalidate service worker cache to check for new app build on cloud
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.update().catch(() => {})));
          } catch (_) {}
        }

        // 2. Fetch latest songs and setlists in parallel
        if (onRefresh) {
          await Promise.race([
            onRefresh(),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
        }

        setRefreshSuccess(true);
        setPullDistance(0);
      } catch (_) {
        setIsRefreshing(false);
        setPullDistance(0);
      }
      return; // Do NOT trigger horizontal song navigation
    } else {
      setPullDistance(0);
    }

    if (startX === null || startY === null) return;
    const diffX = e.changedTouches[0].clientX - startX;
    const diffY = e.changedTouches[0].clientY - startY;

    // Detect double-tap gesture to toggle clean immersion mode
    const moveDist = Math.hypot(diffX, diffY);
    if (moveDist < 18 && e.changedTouches.length === 1 && !isDrawingActive) {
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      const tapDist = Math.hypot(
        e.changedTouches[0].clientX - lastTapPosRef.current.x,
        e.changedTouches[0].clientY - lastTapPosRef.current.y
      );

      if (timeDiff > 40 && timeDiff < 360 && tapDist < 36) {
        lastTapTimeRef.current = 0;
        onDoubleTap?.();
        return;
      } else {
        lastTapTimeRef.current = now;
        lastTapPosRef.current = {
          x: e.changedTouches[0].clientX,
          y: e.changedTouches[0].clientY,
        };
      }
    }

    // Must be predominantly horizontal swipe > 60px
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft(); // Swipe Left -> Next song
      } else if (diffX > 0 && onSwipeRight) {
        onSwipeRight(); // Swipe Right -> Prev song
      }
    }
  };

  if (!song) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          color: '#64748b',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '36px' }}>🎼</span>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>No song selected</div>
        <div style={{ fontSize: '13px' }}>Choose a song from the library or setlist.</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id="sheetWrapper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => {
        if (isDrawingActive) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea, [data-interactive="true"]')) return;
        onDoubleTap?.();
      }}
      onWheel={() => {
        if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
        isUserInteractingRef.current = true;
        userInteractionTimeoutRef.current = setTimeout(() => {
          isUserInteractingRef.current = false;
        }, 200);
      }}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: isImmersionMode ? 'calc(env(safe-area-inset-top, 0px) + 24px)' : '16px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: isImmersionMode
          ? 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 180px)',
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehaviorY: 'none',
      }}
    >
      <style>{`
        @keyframes noteWave1 {
          0%, 100% {
            transform: translateY(0px) rotate(-6deg) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-8px) rotate(14deg) scale(1.3);
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(78, 177, 203, 0.9));
          }
        }
        @keyframes noteWave2 {
          0%, 100% {
            transform: translateY(0px) rotate(6deg) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) rotate(-14deg) scale(1.35);
            opacity: 1;
            filter: drop-shadow(0 0 10px rgba(78, 177, 203, 0.95));
          }
        }
        @keyframes noteWave3 {
          0%, 100% {
            transform: translateY(0px) rotate(-4deg) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-8px) rotate(12deg) scale(1.3);
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(78, 177, 203, 0.9));
          }
        }
        @keyframes pillPulse {
          0%, 100% {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7), 0 0 12px rgba(78, 177, 203, 0.25);
          }
          50% {
            box-shadow: 0 8px 28px rgba(0, 0, 0, 0.8), 0 0 20px rgba(78, 177, 203, 0.55);
          }
        }
      `}</style>

      {/* NATIVE PULL-TO-REFRESH PILL INDICATOR WITH WAVING NOTE EMOJIS */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            position: 'sticky',
            top: '8px',
            zIndex: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: refreshSuccess ? 'auto' : 'none',
            cursor: refreshSuccess ? 'pointer' : 'default',
            marginBottom: `${Math.max(0, pullDistance - 20)}px`,
            transition: isRefreshing ? 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}
          onClick={refreshSuccess ? dismissRefreshPill : undefined}
        >
          <div
            onClick={refreshSuccess ? dismissRefreshPill : undefined}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 18px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(10, 15, 26, 0.98) 100%)',
              border: '1.5px solid rgba(78, 177, 203, 0.55)',
              boxShadow: isRefreshing
                ? '0 8px 30px rgba(0, 0, 0, 0.85), 0 0 20px rgba(78, 177, 203, 0.45)'
                : '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(78, 177, 203, 0.2)',
              animation: isRefreshing ? 'pillPulse 1.5s ease-in-out infinite' : 'none',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#4EB1CB',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.01em',
              transform: `scale(${Math.min(1, 0.8 + (pullDistance / 80) * 0.2)})`,
              opacity: Math.min(1, pullDistance / 26),
            }}
          >
            {isRefreshing ? (
              <>
                {refreshSuccess ? (
                  <>
                    <span style={{ fontSize: '15px', color: '#10b981' }}>✓</span>
                    <span style={{ color: '#10b981' }}>Latest version & charts loaded!</span>
                  </>
                ) : (
                  <>
                    {/* WAVING NOTE EMOJIS */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '16px' }}>
                      <span style={{ display: 'inline-block', animation: 'noteWave1 0.75s ease-in-out infinite 0s' }}>🎵</span>
                      <span style={{ display: 'inline-block', animation: 'noteWave2 0.75s ease-in-out infinite 0.15s' }}>🎶</span>
                      <span style={{ display: 'inline-block', animation: 'noteWave3 0.75s ease-in-out infinite 0.3s' }}>🎵</span>
                    </div>
                    <span style={{ color: '#e2e8f0' }}>Reloading app & charts...</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '16px',
                    transform: `translateY(${Math.min(3, (pullDistance / 48) * 3)}px) rotate(${Math.min(25, (pullDistance / 48) * 25)}deg) scale(${1 + (pullDistance / 90) * 0.2})`,
                    transition: 'transform 0.08s ease-out',
                    filter: pullDistance >= 48 ? 'drop-shadow(0 0 6px #4EB1CB)' : 'none',
                  }}
                >
                  {pullDistance >= 48 ? '🎶' : '🎵'}
                </span>
                <span style={{ color: pullDistance >= 48 ? '#38bdf8' : '#94a3b8' }}>
                  {pullDistance >= 48 ? 'Release to hard reload app' : 'Pull down to hard refresh'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Persistent Full-Sheet Annotation Canvas */}
      {drawingCanvasElement}

      {/* SONG HEADER */}
      <div style={{ marginBottom: '18px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                margin: '0 0 6px 0',
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: '#ffffff',
                wordBreak: 'break-word',
              }}
            >
              {song.title}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              {song.artist && (
                <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '13px', marginRight: '4px' }}>
                  {song.artist}
                </span>
              )}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isSessionOverridden ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                  border: isSessionOverridden ? '1px solid #f59e0b' : 'none',
                  color: isSessionOverridden ? '#fbbf24' : '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Key: {displayKey}
                {isSessionOverridden && worshipLeaderKey ? ` (WL: ${worshipLeaderKey})` : ''}
              </span>
              {song.capo !== undefined && song.capo !== '0' && song.capo !== 0 && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    color: '#fde047',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Capo: {song.capo}
                </span>
              )}
              {song.timeSignature && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {song.timeSignature}
                </span>
              )}
              {/* In-Sync with MD Live Broadcast Pill for Followers */}
              {isLiveSyncFollower && playbackState?.isPlaying && (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '8px',
                    background: 'rgba(34, 197, 94, 0.16)',
                    border: '1px solid #22c55e',
                    color: '#4ade80',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 0 12px rgba(34, 197, 94, 0.25)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ fontSize: '8px' }}>🟢</span>
                  <span>SYNCED ({mdLeaderName})</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 900 }}>
                    {`${Math.floor((playbackState.currentTime || 0) / 60)}:${Math.floor((playbackState.currentTime || 0) % 60).toString().padStart(2, '0')}`}
                  </span>
                </span>
              )}

              {/* Planned Live Arrangement Duration / Stage Timer */}
              {(!playbackState || !playbackState.isPlaying) && (plannedDuration || targetDurationSec > 0) && (
                <button
                  onClick={onOpenDurationPicker}
                  title="Planned Song Arrangement Duration • Tap to change"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: isAutoScrolling && scrollMode === 'duration' ? 'rgba(78, 177, 203, 0.25)' : '#1e293b',
                    border: isAutoScrolling && scrollMode === 'duration' ? '1px solid #4EB1CB' : '1px solid transparent',
                    color: '#4EB1CB',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <span>⏱️</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {isAutoScrolling && scrollMode === 'duration'
                      ? `${Math.floor(elapsedScrollSeconds / 60)}:${Math.floor(elapsedScrollSeconds % 60).toString().padStart(2, '0')} / `
                      : ''}
                    {plannedDuration || (targetDurationSec > 0 ? `${Math.floor(targetDurationSec / 60)}:${Math.floor(targetDurationSec % 60).toString().padStart(2, '0')}` : '4:30')}
                  </span>
                </button>
              )}
              {(!playbackState || !playbackState.isPlaying) && !plannedDuration && targetDurationSec <= 0 && onOpenDurationPicker && (
                <button
                  onClick={onOpenDurationPicker}
                  title="Set planned arrangement duration for this song"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: '#131c2e',
                    border: '1px dashed #334155',
                    color: '#64748b',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <span>⏱️</span>
                  <span>Duration</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION ORDER ROADMAP */}
        {sectionParts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {sectionParts.map((sec, idx) => (
              <button
                key={idx}
                onClick={() => jumpToSection(sec)}
                style={{
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {sec}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CHORD & LYRIC BODY */}
      <div
        id="sheetScrollBody"
        style={{
          fontSize: `${fontSizePx}px`,
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          position: 'relative',
        }}
      >
        {parsedLines.map((line, lIdx) => {
          if (line.type === 'empty') {
            return <div key={lIdx} style={{ height: '14px' }} />;
          }

          if (line.type === 'section') {
            return (
              <div
                key={lIdx}
                data-section-title={line.sectionName}
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#38bdf8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginTop: '16px',
                  marginBottom: '6px',
                  borderLeft: '3px solid #38bdf8',
                  paddingLeft: '8px',
                }}
              >
                {line.sectionName || line.raw}
              </div>
            );
          }

          if (line.type === 'chord_line' || line.type === 'chordpro') {
            return (
              <div key={lIdx} style={{ minHeight: '1.5em' }}>
                {line.items?.map((item, iIdx) =>
                  item.isChord ? (
                    <span
                      key={iIdx}
                      onClick={() => onOpenChordDiagram && onOpenChordDiagram(item.text)}
                      style={{
                        fontWeight: 800,
                        color: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-block',
                      }}
                    >
                      {item.text}
                    </span>
                  ) : (
                    <span key={iIdx} style={{ color: '#e2e8f0' }}>
                      {item.text}
                    </span>
                  )
                )}
              </div>
            );
          }

          // Lyric line
          return (
            <div key={lIdx} style={{ color: '#f1f5f9', minHeight: '1.4em' }}>
              {line.raw}
            </div>
          );
        })}
      </div>
    </div>
  );
};
