// app/band/components/SongSheet.tsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const scrollPosRef = useRef<number>(0);
  const elapsedMsRef = useRef<number>(0);
  const lastReportedSecRef = useRef<number>(-1);

  const effectiveTargetSec = targetDurationSec > 0 ? targetDurationSec : 240;
  const totalMs = effectiveTargetSec * 1000;

  // Sync scrollPosRef & elapsedMs on mount or song change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      scrollPosRef.current = 0;
    }
    elapsedMsRef.current = 0;
    lastReportedSecRef.current = 0;
    onUpdateElapsed?.(0);
  }, [song?.id]);

  // Handle user manual scroll: update scrollPosRef and sync elapsed timer
  const handleScroll = () => {
    if (!containerRef.current) return;
    const currentScroll = containerRef.current.scrollTop;
    if (Math.abs(currentScroll - scrollPosRef.current) > 3) {
      scrollPosRef.current = currentScroll;
      const maxScroll = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      if (maxScroll > 0) {
        const ratio = Math.min(1, Math.max(0, currentScroll / maxScroll));
        elapsedMsRef.current = ratio * totalMs;
        const currentSec = Math.floor(elapsedMsRef.current / 1000);
        if (currentSec !== lastReportedSecRef.current) {
          lastReportedSecRef.current = currentSec;
          onUpdateElapsed?.(currentSec);
        }
      }
    }
  };

  // Playback-synced auto-scroll lockstep (when audio backtrack is playing)
  useEffect(() => {
    if (!playbackState?.isPlaying || !playbackState.duration || !containerRef.current) return;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll > 0) {
      const targetScroll = (playbackState.currentTime / playbackState.duration) * maxScroll;
      container.scrollTop = targetScroll;
      scrollPosRef.current = targetScroll;
    }
  }, [playbackState?.isPlaying, playbackState?.currentTime, playbackState?.duration]);

  // Auto-scroll loop: 60fps/120fps fluid teleprompter pacing or smooth constant speed
  useEffect(() => {
    if (!isAutoScrolling || playbackState?.isPlaying || !containerRef.current) return;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;

    // If starting at the very bottom, restart smoothly from top
    if (maxScroll > 0 && container.scrollTop >= maxScroll - 4) {
      container.scrollTop = 0;
      scrollPosRef.current = 0;
      elapsedMsRef.current = 0;
      lastReportedSecRef.current = 0;
      onUpdateElapsed?.(0);
    } else {
      scrollPosRef.current = container.scrollTop;
      if (maxScroll > 0) {
        elapsedMsRef.current = (container.scrollTop / maxScroll) * totalMs;
      }
    }

    let animId: number;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(100, Math.max(1, now - lastTime)); // Delta ms, capped for tab switching
      lastTime = now;

      if (containerRef.current) {
        const el = containerRef.current;
        const currentMaxScroll = el.scrollHeight - el.clientHeight;

        if (scrollMode === 'duration') {
          // Duration mode: advance elapsedMs continuously by dt
          elapsedMsRef.current = Math.min(totalMs, elapsedMsRef.current + dt);

          if (currentMaxScroll > 0) {
            const ratio = elapsedMsRef.current / totalMs;
            scrollPosRef.current = ratio * currentMaxScroll;
            el.scrollTop = scrollPosRef.current;
          }

          // Report whole-second progression to UI
          const currentSec = Math.floor(elapsedMsRef.current / 1000);
          if (currentSec !== lastReportedSecRef.current) {
            lastReportedSecRef.current = currentSec;
            onUpdateElapsed?.(currentSec);
          }

          if (elapsedMsRef.current >= totalMs) {
            onAutoScrollComplete?.();
            return;
          }
        } else {
          // Speed mode: scroll by constant pixels
          if (currentMaxScroll > 0) {
            const pxPerSec = Math.max(12, (scrollSpeed || 3) * 18);
            scrollPosRef.current = Math.min(currentMaxScroll, scrollPosRef.current + (dt / 1000) * pxPerSec);
            el.scrollTop = scrollPosRef.current;

            elapsedMsRef.current = (scrollPosRef.current / currentMaxScroll) * totalMs;
            const currentSec = Math.floor(elapsedMsRef.current / 1000);
            if (currentSec !== lastReportedSecRef.current) {
              lastReportedSecRef.current = currentSec;
              onUpdateElapsed?.(currentSec);
            }

            if (scrollPosRef.current >= currentMaxScroll - 1) {
              onAutoScrollComplete?.();
              return;
            }
          }
        }
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [
    isAutoScrolling,
    scrollSpeed,
    playbackState?.isPlaying,
    scrollMode,
    totalMs,
    onUpdateElapsed,
    onAutoScrollComplete,
  ]);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDrawingActive) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDrawingActive || isRefreshing) return;
    if (!containerRef.current || touchStartY.current === null) return;

    // Only allow pull-to-refresh at the top of the sheet
    if (containerRef.current.scrollTop <= 0) {
      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartY.current;
      if (diffY > 0) {
        // Elastic rubber-band resistance
        const damped = Math.min(100, Math.pow(diffY, 0.82) * 2);
        setPullDistance(damped);
      }
    } else {
      if (pullDistance > 0) setPullDistance(0);
    }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
    if (isDrawingActive) return;

    if (pullDistance >= 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(50);
      try {
        await onRefresh();
        setRefreshSuccess(true);
        setTimeout(() => {
          setRefreshSuccess(false);
          setIsRefreshing(false);
          setPullDistance(0);
        }, 700);
      } catch (_) {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Must be predominantly horizontal swipe > 60px
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX < 0 && onSwipeLeft) {
        onSwipeLeft(); // Swipe Left -> Next song
      } else if (diffX > 0 && onSwipeRight) {
        onSwipeRight(); // Swipe Right -> Prev song
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
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
      onScroll={handleScroll}
      style={{
        position: 'relative',
        flex: 1,
        overflowY: isDrawingActive ? 'hidden' : 'auto',
        overflowX: 'hidden',
        paddingTop: '16px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 180px)',
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui',
        WebkitOverflowScrolling: 'touch',
        touchAction: isDrawingActive ? 'none' : 'pan-y',
        overscrollBehaviorY: isDrawingActive ? 'none' : 'contain',
      }}
    >
      <style>{`
        @keyframes hgfSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* NATIVE PULL-TO-REFRESH PILL INDICATOR (iOS PWA & Android) */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          style={{
            position: 'sticky',
            top: '8px',
            zIndex: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
            marginBottom: `${Math.max(0, pullDistance - 24)}px`,
            transition: isRefreshing ? 'all 0.2s ease-out' : 'none',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'rgba(15, 23, 42, 0.94)',
              border: '1px solid rgba(78, 177, 203, 0.45)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px rgba(78, 177, 203, 0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              color: '#4EB1CB',
              fontSize: '12px',
              fontWeight: 700,
              transform: `scale(${Math.min(1, 0.75 + (pullDistance / 100) * 0.25)})`,
              opacity: Math.min(1, pullDistance / 35),
            }}
          >
            {isRefreshing ? (
              <>
                {refreshSuccess ? (
                  <>
                    <span style={{ fontSize: '14px', color: '#10b981' }}>✓</span>
                    <span style={{ color: '#10b981' }}>Synced & Updated!</span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        animation: 'hgfSpin 0.8s linear infinite',
                        fontSize: '13px',
                      }}
                    >
                      🔄
                    </span>
                    <span>Syncing band charts...</span>
                  </>
                )}
              </>
            ) : (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    transform: `rotate(${Math.min(180, (pullDistance / 60) * 180)}deg)`,
                    transition: 'transform 0.1s linear',
                    fontSize: '13px',
                  }}
                >
                  ↓
                </span>
                <span>{pullDistance >= 60 ? 'Release to sync charts' : 'Pull to sync'}</span>
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
