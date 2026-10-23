// app/band/components/SongSheet.tsx
'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Song, BandUser } from '../types/band';
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
  isLyricsOnly?: boolean;
  onToggleLyricsOnly?: () => void;
  currentUser?: BandUser | null;
  onUpdateSongNotes?: (notes: string) => Promise<void>;
  onRevertToMasterLyrics?: () => void;
  hasPlaybackDock?: boolean;
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
  isLyricsOnly = false,
  onToggleLyricsOnly,
  currentUser,
  onUpdateSongNotes,
  onRevertToMasterLyrics,
  hasPlaybackDock = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastHandledTouchTapRef = useRef<number>(0);
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

  // Worship Leader Space & Notes State
  const [isEditingLeaderNotes, setIsEditingLeaderNotes] = useState<boolean>(false);
  const [leaderNotesDraft, setLeaderNotesDraft] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  useEffect(() => {
    setLeaderNotesDraft(song?.exhortation || song?.notes || '');
    setIsEditingLeaderNotes(false);
  }, [song?.id, song?.exhortation, song?.notes]);

  const isWorshipLeader = useMemo(() => {
    if (!currentUser) return false;
    const role = (currentUser.role || '').toLowerCase();
    const uname = (currentUser.username || '').toLowerCase();

    // Explicitly exclude musician roles so MD, drummer, bassist, guitarist, keyboardist, etc. NEVER see this space
    const musicianRoles = [
      'md',
      'drummer',
      'drums',
      'bassist',
      'bass',
      'guitarist',
      'guitar',
      'keyboardist',
      'keys',
      'sound',
      'multimedia',
      'backup_singer',
      'vocalist',
    ];
    if (musicianRoles.includes(role)) {
      return false;
    }

    // Must be role 'leader' / 'worship_leader' or designated leader username (or admin not in musician role)
    return (
      role === 'leader' ||
      role === 'worship_leader' ||
      (role === 'admin' && !uname.includes('ren')) ||
      ['karen', 'vanneza', 'darlene', 'tanna'].includes(uname)
    );
  }, [currentUser]);

  const handleSaveLeaderNotes = async () => {
    if (!song) return;
    setIsSavingNotes(true);
    try {
      if (onUpdateSongNotes) {
        await onUpdateSongNotes(leaderNotesDraft.trim());
      } else {
        await fetch('/api/worship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: song.id,
            exhortation: leaderNotesDraft.trim(),
            notes: leaderNotesDraft.trim(),
          }),
        });
        song.exhortation = leaderNotesDraft.trim();
        song.notes = leaderNotesDraft.trim();
      }
      setIsEditingLeaderNotes(false);
    } catch (err) {
      console.error('Error saving leader notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

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

  // Bulletproof block against Android browser pull-to-refresh:
  // Intercept touchmove when already at scrollTop <= 0 and dragging downward, preventing native browser reload gesture
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startClientY = 0;
    const onTouchStartNative = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        startClientY = e.touches[0].clientY;
      }
    };

    const onTouchMoveNative = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const currentClientY = e.touches[0].clientY;
        // User is at top of lyrics sheet and dragging downwards -> cancel browser pull-to-refresh
        if (el.scrollTop <= 0 && currentClientY > startClientY) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    };

    el.addEventListener('touchstart', onTouchStartNative, { passive: true });
    el.addEventListener('touchmove', onTouchMoveNative, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStartNative);
      el.removeEventListener('touchmove', onTouchMoveNative);
    };
  }, []);

  // Handle user manual scroll: update scrollPosRef and sync elapsed timer only when user actively touches/scrolls
  const handleScroll = () => {
    if (!containerRef.current) return;
    const currentScroll = containerRef.current.scrollTop;

    // Detect section currently in view
    const headers = Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-section-title]'));
    const scrollY = currentScroll + 60;
    let foundSection = '';
    for (const h of headers) {
      if (h.offsetTop <= scrollY) {
        foundSection = h.getAttribute('data-section-title') || h.textContent || '';
      } else {
        break;
      }
    }
    if (foundSection) {
      setActiveSectionName(foundSection);
    }

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

  // Resilient, abuse-proof Auto-Scroll loop (60fps/120fps requestAnimationFrame)
  useEffect(() => {
    if (!isAutoScrolling || !containerRef.current) return;
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
  }, [isAutoScrolling]);

  const [activeSectionName, setActiveSectionName] = useState<string>('');

  // Section order roadmap parts from song metadata
  const sectionParts = (song?.sectionOrder || '')
    .split(/[,>|–-]+|\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Auto-parsed song sections from sheet chords & lyrics
  const songSections = useMemo(() => {
    const list: { id: string; name: string; lineIdx: number; cleanName: string; type: string }[] = [];
    parsedLines.forEach((line, lIdx) => {
      if (line.type === 'section') {
        const rawName = (line.sectionName || line.raw || '').replace(/^[\[|\s#]+|[\]|\s]+$/g, '').trim();
        if (rawName) {
          const lower = rawName.toLowerCase();
          let secType = 'other';
          if (lower.includes('intro')) secType = 'intro';
          else if (lower.includes('verse')) secType = 'verse';
          else if (lower.includes('chorus') && !lower.includes('pre')) secType = 'chorus';
          else if (lower.includes('pre-chorus') || lower.includes('pre chorus') || lower.includes('prechorus')) secType = 'prechorus';
          else if (lower.includes('bridge')) secType = 'bridge';
          else if (lower.includes('outro') || lower.includes('ending') || lower.includes('tag')) secType = 'outro';
          else if (lower.includes('interlude') || lower.includes('vamp') || lower.includes('instrumental')) secType = 'interlude';

          list.push({
            id: `sec-${lIdx}-${rawName}`,
            name: rawName,
            lineIdx: lIdx,
            cleanName: rawName,
            type: secType,
          });
        }
      }
    });
    return list;
  }, [parsedLines]);

  const allSections = useMemo(() => {
    if (songSections.length > 0) return songSections;
    return sectionParts.map((sec, idx) => {
      const lower = sec.toLowerCase();
      let secType = 'other';
      if (lower.includes('intro')) secType = 'intro';
      else if (lower.includes('verse') || /^v\d+$/i.test(sec)) secType = 'verse';
      else if ((lower.includes('chorus') || /^c\d*$/i.test(sec)) && !lower.includes('pre')) secType = 'chorus';
      else if (lower.includes('pre') || /^pc\d*$/i.test(sec)) secType = 'prechorus';
      else if (lower.includes('bridge') || /^b\d*$/i.test(sec)) secType = 'bridge';
      else if (lower.includes('outro') || /^o$/i.test(sec)) secType = 'outro';
      return {
        id: `order-sec-${idx}-${sec}`,
        name: sec,
        lineIdx: -1,
        cleanName: sec,
        type: secType,
      };
    });
  }, [songSections, sectionParts]);

  const jumpToSection = (name: string, targetLineIdx?: number) => {
    if (!containerRef.current || !name) return;
    if (typeof targetLineIdx === 'number' && targetLineIdx >= 0) {
      const el = containerRef.current.querySelector(`#sheet-line-${targetLineIdx}`) as HTMLElement | null;
      if (el) {
        containerRef.current.scrollTo({
          top: Math.max(0, el.offsetTop - 24),
          behavior: 'smooth',
        });
        setActiveSectionName(name);
        return;
      }
    }
    const q = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const headers = Array.from(containerRef.current.querySelectorAll('[data-section-title]'));
    const target = headers.find((el) => {
      const text = (el.textContent || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return text.includes(q);
    }) as HTMLElement | undefined;

    if (target) {
      containerRef.current.scrollTo({
        top: Math.max(0, target.offsetTop - 24),
        behavior: 'smooth',
      });
      setActiveSectionName(name);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidBand?.setSwipeRefreshEnabled) {
        (window as any).AndroidBand.setSwipeRefreshEnabled(false);
      }
    } catch (_) {}

    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    isUserInteractingRef.current = true;
    if (isDrawingActive) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    userInteractionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 120);

    if (isDrawingActive) return;

    const startX = touchStartX.current;
    const startY = touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (startX === null || startY === null || e.changedTouches.length === 0) return;
    const diffX = e.changedTouches[0].clientX - startX;
    const diffY = e.changedTouches[0].clientY - startY;

    // Detect double-tap gesture to toggle clean immersion mode
    const moveDist = Math.hypot(diffX, diffY);
    const target = e.target as HTMLElement | null;
    const isInteractive = Boolean(target?.closest('button, a, input, select, textarea, [data-interactive="true"]'));

    if (moveDist < 30 && e.changedTouches.length === 1 && !isDrawingActive && !isInteractive) {
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      const tapDist = Math.hypot(
        e.changedTouches[0].clientX - lastTapPosRef.current.x,
        e.changedTouches[0].clientY - lastTapPosRef.current.y
      );

      // 50ms - 480ms window, generous 60px tap distance for thumb/finger pad shifts
      if (timeDiff > 50 && timeDiff < 480 && tapDist < 60) {
        lastTapTimeRef.current = 0;
        lastHandledTouchTapRef.current = now;
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
    <>
      <div
        ref={containerRef}
      id="sheetWrapper"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => {
        if (isDrawingActive) return;
        // Suppress synthetic mouse dblclick on touch devices that already handled touch double-tap
        if (Date.now() - lastHandledTouchTapRef.current < 750) return;
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
          : hasPlaybackDock
          ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 280px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 160px)',
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'none',
        overscrollBehaviorY: 'none',
      }}
    >
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
              {/* Lyrics-Only Mode Pill */}
              {isLyricsOnly && (
                <span
                  onClick={onToggleLyricsOnly}
                  title="Lyrics-Only Mode Active (Chords Hidden) • Tap to show chords"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(168, 85, 247, 0.25)',
                    border: '1px solid #a855f7',
                    color: '#d8b4fe',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 0 10px rgba(168, 85, 247, 0.35)',
                  }}
                >
                  <span>🎤</span>
                  <span>LYRICS ONLY</span>
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
              {!isLyricsOnly && song.capo !== undefined && song.capo !== '0' && song.capo !== 0 && (
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
              {(plannedDuration || targetDurationSec > 0) && (
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
              {!plannedDuration && targetDurationSec <= 0 && onOpenDurationPicker && (
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

              {/* Personal / Device-Scoped Custom Lyrics Badge */}
              {song?.hasCustomLyrics && onRevertToMasterLyrics && (
                <span
                  title="Viewing customized lyrics. Tap ↺ to restore church master."
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(192, 132, 252, 0.15)',
                    border: '1px solid rgba(192, 132, 252, 0.4)',
                    color: '#c084fc',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{currentUser ? '👤 My Sheet' : '📱 Device Sheet'}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevertToMasterLyrics();
                    }}
                    title="Revert to Church Master Lyrics"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#c084fc',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 900,
                    }}
                  >
                    ↺
                  </button>
                </span>
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

      {/* WORSHIP LEADER PERSONAL SPACE: INTRO, SCRIPTURE VERSE & EXHORTATION */}
      {song && isWorshipLeader && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 16px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(78, 177, 203, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
            border: '1.5px solid rgba(78, 177, 203, 0.35)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎙️</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#4EB1CB', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Worship Leader Space
                </div>
                <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>
                  Intro cues, scripture reading & exhortation message
                </div>
              </div>
            </div>
            {isWorshipLeader && !isEditingLeaderNotes && (
              <button
                type="button"
                onClick={() => setIsEditingLeaderNotes(true)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  background: 'rgba(78, 177, 203, 0.2)',
                  border: '1px solid #4EB1CB',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>✏️</span>
                <span>{song.exhortation || song.notes ? 'Edit Cues' : '+ Add Leader Notes'}</span>
              </button>
            )}
          </div>

          {/* Edit Mode */}
          {isEditingLeaderNotes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              {/* Quick Template Cue Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  'Scripture Verse: ',
                  'Intro Cues: ',
                  'Exhortation: ',
                  'Prayer Focus: ',
                  'Call to Worship: ',
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setLeaderNotesDraft((prev) => (prev ? `${prev}\n${tpl}` : tpl))}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#d8b4fe',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    +{tpl.trim()}
                  </button>
                ))}
              </div>

              <textarea
                value={leaderNotesDraft}
                onChange={(e) => setLeaderNotesDraft(e.target.value)}
                placeholder="Write your intro notes, scripture verse to read, exhortation, or prayer direction before the lyrics begin..."
                rows={4}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  background: '#0c1017',
                  border: '1.5px solid #4EB1CB',
                  color: '#fff',
                  padding: '10px 12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLeaderNotesDraft(song.exhortation || song.notes || '');
                    setIsEditingLeaderNotes(false);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveLeaderNotes}
                  disabled={isSavingNotes}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    background: '#4EB1CB',
                    border: 'none',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: isSavingNotes ? 'wait' : 'pointer',
                  }}
                >
                  {isSavingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          ) : (
            /* Display Mode */
            song.exhortation || song.notes ? (
              <div
                style={{
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  color: '#f1f5f9',
                  whiteSpace: 'pre-wrap',
                  background: 'rgba(12, 16, 23, 0.7)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  borderLeft: '4px solid #4EB1CB',
                  letterSpacing: '0.2px',
                }}
              >
                {song.exhortation || song.notes}
              </div>
            ) : (
              isWorshipLeader && (
                <div
                  onClick={() => setIsEditingLeaderNotes(true)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1.5px dashed rgba(78, 177, 203, 0.4)',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    background: 'rgba(12, 16, 23, 0.4)',
                  }}
                >
                  ✨ Tap to add your intro instructions, scripture verse reading, or exhortation for this song
                </div>
              )
            )
          )}
        </div>
      )}

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
        {(() => {
          let currentSectionTitle = '';
          return parsedLines.map((line, lIdx) => {
            if (line.type === 'empty') {
              return (
                <div
                  key={lIdx}
                  id={`sheet-line-${lIdx}`}
                  className="hgf-sheet-line"
                  data-sheet-line-index={lIdx}
                  data-section-name={currentSectionTitle}
                  style={{ height: '14px' }}
                />
              );
            }

            if (line.type === 'section') {
              currentSectionTitle = line.sectionName || line.raw || '';
              return (
                <div
                  key={lIdx}
                  id={`sheet-line-${lIdx}`}
                  className="hgf-sheet-line"
                  data-sheet-line-index={lIdx}
                  data-section-name={currentSectionTitle}
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

            // Atomic interlocked chord-lyric pairs: Chords locked above words, wrapping together seamlessly
            if (line.pairs && line.pairs.length > 0) {
              const isPureInstrumental = line.pairs.every((p) => !p.lyric.trim());
              if (isLyricsOnly && isPureInstrumental) {
                return null;
              }

              return (
                <div
                  key={lIdx}
                  id={`sheet-line-${lIdx}`}
                  className="hgf-sheet-line"
                  data-sheet-line-index={lIdx}
                  data-section-name={currentSectionTitle}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    rowGap: isLyricsOnly ? '4px' : '10px',
                    columnGap: '0px',
                    minHeight: '1.4em',
                    marginBottom: isLyricsOnly ? '4px' : '6px',
                  }}
                >
                  {line.pairs.map((pair, pIdx) => (
                    <span
                      key={pIdx}
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        verticalAlign: 'bottom',
                      }}
                    >
                      {!isLyricsOnly && (
                        <span
                          onClick={() => pair.chord && onOpenChordDiagram && onOpenChordDiagram(pair.chord)}
                          style={{
                            fontSize: '0.82em',
                            fontWeight: 800,
                            color: '#f59e0b',
                            cursor: pair.chord ? 'pointer' : 'default',
                            minHeight: '1.2em',
                            lineHeight: 1.2,
                            whiteSpace: 'pre',
                            paddingRight: pair.chord ? '4px' : '0px',
                            userSelect: pair.chord ? 'none' : 'text',
                          }}
                        >
                          {pair.chord || ''}
                        </span>
                      )}
                      <span
                        style={{
                          color: '#f1f5f9',
                          whiteSpace: 'pre',
                          lineHeight: 1.4,
                        }}
                      >
                        {pair.lyric}
                      </span>
                    </span>
                  ))}
                </div>
              );
            }

            // Fallback chord line rendering
            if (line.type === 'chord_line' || line.type === 'chordpro') {
              if (isLyricsOnly) return null;
              return (
                <div
                  key={lIdx}
                  id={`sheet-line-${lIdx}`}
                  className="hgf-sheet-line"
                  data-sheet-line-index={lIdx}
                  data-section-name={currentSectionTitle}
                  style={{ minHeight: '1.5em' }}
                >
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
              <div
                key={lIdx}
                id={`sheet-line-${lIdx}`}
                className="hgf-sheet-line"
                data-sheet-line-index={lIdx}
                data-section-name={currentSectionTitle}
                style={{ color: '#f1f5f9', minHeight: '1.4em' }}
              >
                {line.raw}
              </div>
            );
          });
        })()}
      </div>
    </div>

      {/* FLOATING BOTTOM SECTION QUICK-JUMP DOCK */}
      {allSections.length > 0 && !isImmersionMode && (
        <div
          data-testid="section-jump-dock"
          style={{
            position: 'fixed',
            left: '16px',
            bottom: hasPlaybackDock
              ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 148px)'
              : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 20px)',
            maxWidth: 'calc(100vw - 86px)',
            zIndex: 55,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 6px',
            borderRadius: '24px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.35)',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {allSections.map((sec) => {
            const isMatch =
              activeSectionName &&
              activeSectionName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(sec.cleanName.toLowerCase().replace(/[^a-z0-9]/g, ''));

            let badgeBg = 'rgba(255, 255, 255, 0.08)';
            let badgeBorder = 'rgba(255, 255, 255, 0.16)';
            let badgeColor = '#cbd5e1';

            if (sec.type === 'chorus') {
              badgeBg = isMatch ? '#9333ea' : 'rgba(168, 85, 247, 0.18)';
              badgeBorder = isMatch ? '#c084fc' : 'rgba(168, 85, 247, 0.45)';
              badgeColor = isMatch ? '#fff' : '#d8b4fe';
            } else if (sec.type === 'bridge') {
              badgeBg = isMatch ? '#d97706' : 'rgba(245, 158, 11, 0.18)';
              badgeBorder = isMatch ? '#fbbf24' : 'rgba(245, 158, 11, 0.45)';
              badgeColor = isMatch ? '#fff' : '#fde047';
            } else if (sec.type === 'verse') {
              badgeBg = isMatch ? '#0284c7' : 'rgba(14, 165, 233, 0.16)';
              badgeBorder = isMatch ? '#38bdf8' : 'rgba(14, 165, 233, 0.4)';
              badgeColor = isMatch ? '#fff' : '#7dd3fc';
            } else if (sec.type === 'prechorus') {
              badgeBg = isMatch ? '#0d9488' : 'rgba(20, 184, 166, 0.16)';
              badgeBorder = isMatch ? '#2dd4bf' : 'rgba(20, 184, 166, 0.4)';
              badgeColor = isMatch ? '#fff' : '#5eead4';
            } else if (sec.type === 'intro' || sec.type === 'outro' || sec.type === 'interlude') {
              badgeBg = isMatch ? '#475569' : 'rgba(148, 163, 184, 0.12)';
              badgeBorder = isMatch ? '#94a3b8' : 'rgba(148, 163, 184, 0.25)';
              badgeColor = isMatch ? '#fff' : '#94a3b8';
            }

            return (
              <button
                key={sec.id}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToSection(sec.name, sec.lineIdx >= 0 ? sec.lineIdx : undefined);
                }}
                title={`Jump to ${sec.name}`}
                style={{
                  flexShrink: 0,
                  padding: '5px 11px',
                  borderRadius: '16px',
                  backgroundColor: badgeBg,
                  border: `1.5px solid ${badgeBorder}`,
                  color: badgeColor,
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isMatch ? '0 0 10px rgba(78, 177, 203, 0.5)' : 'none',
                  transform: isMatch ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}
              >
                {sec.cleanName}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
