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
  hasAutoScrollBar?: boolean;
  showStageTools?: boolean;
}

function findSectionElement(
  container: HTMLElement,
  name: string,
  targetLineIdx?: number,
  occurrenceIndex?: number
): HTMLElement | null {
  // 1. If targetLineIdx is provided and valid, try that first
  if (typeof targetLineIdx === 'number' && targetLineIdx >= 0) {
    const el = container.querySelector(`#sheet-line-${targetLineIdx}`) as HTMLElement | null;
    if (el) return el;
  }

  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetNorm = clean(name);
  if (!targetNorm) return null;

  // Canonical alias generator (e.g. v2 <-> verse2, c <-> chorus, b <-> bridge, etc.)
  const getAliases = (norm: string): string[] => {
    const aliases = new Set<string>([norm]);
    const mVerse = norm.match(/^v(?:erse)?(\d+)$/);
    if (mVerse) {
      aliases.add(`verse${mVerse[1]}`);
      aliases.add(`v${mVerse[1]}`);
    }
    const mChorus = norm.match(/^c(?:horus)?(\d*)$/);
    if (mChorus) {
      aliases.add(`chorus${mChorus[1]}`);
      aliases.add(`c${mChorus[1]}`);
      if (!mChorus[1] || mChorus[1] === '1') {
        aliases.add('chorus');
        aliases.add('c');
      }
    }
    const mBridge = norm.match(/^b(?:ridge)?(\d*)$/);
    if (mBridge) {
      aliases.add(`bridge${mBridge[1]}`);
      aliases.add(`b${mBridge[1]}`);
      if (!mBridge[1] || mBridge[1] === '1') {
        aliases.add('bridge');
        aliases.add('b');
      }
    }
    const mPre = norm.match(/^p(?:re)?c(?:horus)?(\d*)$/);
    if (mPre) {
      aliases.add(`prechorus${mPre[1]}`);
      aliases.add(`pc${mPre[1]}`);
    }
    if (norm === 'ending' || norm === 'tag' || norm === 'outro' || norm === 'coda') {
      aliases.add('ending');
      aliases.add('tag');
      aliases.add('outro');
      aliases.add('coda');
    }
    return Array.from(aliases);
  };

  const targetAliases = getAliases(targetNorm);

  // Collect candidate header elements
  const headerElements = Array.from(
    container.querySelectorAll<HTMLElement>('[data-section-title], [data-section-name]')
  );

  // Group candidate elements that match any alias
  const matches: HTMLElement[] = [];
  for (const el of headerElements) {
    const titleAttr = clean(el.getAttribute('data-section-title') || '');
    const nameAttr = clean(el.getAttribute('data-section-name') || '');
    const textContent = clean(el.textContent || '');

    const isMatch = targetAliases.some(
      (alias) =>
        titleAttr === alias ||
        nameAttr === alias ||
        textContent === alias ||
        (alias.length >= 3 && (titleAttr.includes(alias) || nameAttr.includes(alias) || textContent.includes(alias)))
    );

    if (isMatch && !matches.includes(el)) {
      matches.push(el);
    }
  }

  if (matches.length > 0) {
    if (typeof occurrenceIndex === 'number' && occurrenceIndex >= 0 && occurrenceIndex < matches.length) {
      return matches[occurrenceIndex];
    }
    return matches[0];
  }

  // Fallback: search all line divs
  const allLines = Array.from(container.querySelectorAll<HTMLElement>('.hgf-sheet-line'));
  for (const line of allLines) {
    const text = clean(line.textContent || '');
    if (targetAliases.some((alias) => text.includes(alias))) {
      return line;
    }
  }

  return null;
}

function formatSectionRailLabel(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const numMatch = cleaned.match(/(\d+[a-z]?)$/i);
  const num = numMatch ? numMatch[1].toUpperCase() : '';
  const lower = cleaned.toLowerCase();

  if (lower.startsWith('intro')) return `INT${num}`;
  if (/^pre[\s-]*chorus/i.test(cleaned) || /^pc\b/i.test(cleaned)) return `PC${num}`;
  if (lower.startsWith('verse') || /^v\s*\d/i.test(cleaned)) return `V${num || ''}`.trim() || 'V';
  if (lower.startsWith('chorus') || /^c\s*\d/i.test(cleaned)) return `C${num || ''}`.trim() || 'C';
  if (lower.startsWith('bridge') || /^b\s*\d/i.test(cleaned)) return num ? `B${num}` : 'BR';
  if (lower.startsWith('instrumental')) return `INST${num}`;
  if (lower.startsWith('interlude')) return `INTL${num}`;
  if (lower.startsWith('outro') || lower.startsWith('ending')) return `OUT${num}`;
  if (lower.startsWith('coda')) return `CODA${num}`;
  if (lower.startsWith('tag')) return `TAG${num}`;
  if (lower.startsWith('vamp')) return `VMP${num}`;
  if (lower.startsWith('refrain')) return `REF${num}`;
  if (lower.startsWith('turnaround')) return `TRN${num}`;

  return cleaned.length > 6 ? cleaned.slice(0, 5).toUpperCase() : cleaned.toUpperCase();
}

function splitPairIntoWrappableTokens(chord?: string, lyric?: string): { chord?: string; lyric: string }[] {
  const c = chord || '';
  const l = lyric || '';

  if (!c) {
    if (!l) return [];
    // Pure lyric words - split by word boundaries while preserving trailing spaces
    const words = l.match(/\S+\s*|\s+/g) || [l];
    return words.map((w) => ({ chord: '', lyric: w }));
  }

  // Chord exists. If lyric is empty or whitespace
  if (!l.trim()) {
    return [{ chord: c, lyric: l || ' ' }];
  }

  // Match leading whitespace if any
  const leadingSpaceMatch = l.match(/^\s+/);
  const leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
  const remaining = l.substring(leadingSpace.length);

  // Match the first word/token for the chord
  const firstWordMatch = remaining.match(/^\S+\s*/);
  if (!firstWordMatch) {
    return [{ chord: c, lyric: l }];
  }

  const firstWord = leadingSpace + firstWordMatch[0];
  const restLyric = remaining.substring(firstWordMatch[0].length);

  const tokens: { chord?: string; lyric: string }[] = [{ chord: c, lyric: firstWord }];
  if (restLyric) {
    const restWords = restLyric.match(/\S+\s*|\s+/g) || [restLyric];
    for (const rw of restWords) {
      tokens.push({ chord: '', lyric: rw });
    }
  }
  return tokens;
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
  onOpenMetronomeModal,
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
  hasAutoScrollBar = false,
  showStageTools = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const lastSectionCheckTimeRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastHandledTouchTapRef = useRef<number>(0);
  const scrollPosRef = useRef<number>(0);
  const baseScrollTopRef = useRef<number>(0);
  const virtualOffsetRef = useRef<number>(0);
  const maxScrollRef = useRef<number>(0);
  const sectionOffsetsRef = useRef<{ id: string; title: string; top: number }[]>([]);
  const activeSectionNameRef = useRef<string>('');
  const activeSectionIdRef = useRef<string>('');
  const jumpLockUntilRef = useRef<number>(0);
  const elapsedMsRef = useRef<number>(0);
  const lastReportedSecRef = useRef<number>(-1);
  const isUserInteractingRef = useRef<boolean>(false);
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchSafetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Calibrated smooth musical scroll speeds (1x - 20x in px/sec)
  // Tuned so 1x-4x slow worship ballads glide visibly without feeling frozen
  const SPEED_MAP: Record<number, number> = {
    1: 4.0,   // 1x: Gentle acoustic ballad crawl (~10s per line)
    2: 6.5,   // 2x: Slow worship crawl (~6.5s per line)
    3: 9.5,   // 3x: Soft worship pace (~4.5s per line)
    4: 13.0,  // 4x: Relaxed worship reading (~3.3s per line)
    5: 17.0,  // 5x: Moderate slow
    6: 22.0,  // 6x: Steady ballad
    7: 28.0,  // 7x: Standard steady pace
    8: 35.0,  // 8x: Comfortable reading
    9: 43.0,  // 9x: Moderate reading
    10: 52.0, // 10x: Mid-tempo standard
    11: 62.0, // 11x: Moderate brisk
    12: 73.0, // 12x: Lively praise
    13: 85.0, // 13x: Upbeat
    14: 98.0, // 14x: Brisk praise
    15: 112.0,// 15x: High speed
    16: 128.0,// 16x: Fast scrub
    17: 146.0,// 17x: Rapid
    18: 166.0,// 18x: Very rapid
    19: 190.0,// 19x: Teleprompter scrub
    20: 215.0,// 20x: Maximum teleprompter scrub
  };

  // Cache container maxScroll & true section header offsets via ResizeObserver (zero forced reflows in rAF)
  const refreshLayoutMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    maxScrollRef.current = Math.max(0, el.scrollHeight - el.clientHeight);
    const cRect = el.getBoundingClientRect();
    const currentVirtualScroll = el.scrollTop + virtualOffsetRef.current;
    const headers = Array.from(el.querySelectorAll<HTMLElement>('[data-section-title]'));
    sectionOffsetsRef.current = headers.map((h) => ({
      id: h.getAttribute('data-section-id') || '',
      title: h.getAttribute('data-section-title') || h.textContent || '',
      top: h.getBoundingClientRect().top - cRect.top + currentVirtualScroll,
    }));
  }, []);

  const syncActiveSectionAtScroll = useCallback((scrollY: number) => {
    if (Date.now() < jumpLockUntilRef.current) return;
    const offsets = sectionOffsetsRef.current;
    if (offsets.length === 0) return;
    const probeY = scrollY + 80;
    let found = offsets[0];
    for (let i = 0; i < offsets.length; i++) {
      if (offsets[i].top <= probeY) {
        found = offsets[i];
      } else {
        break;
      }
    }
    if (found.id && found.id !== activeSectionIdRef.current) {
      activeSectionIdRef.current = found.id;
      setActiveSectionId(found.id);
    }
    if (found.title && found.title !== activeSectionNameRef.current) {
      activeSectionNameRef.current = found.title;
      setActiveSectionName(found.title);
    }
  }, []);

  // Atomically commit GPU virtual translate3d offset back into native scrollTop
  const commitVirtualScroll = useCallback(() => {
    const el = containerRef.current;
    const body = scrollBodyRef.current;
    if (!el) return;
    if (virtualOffsetRef.current !== 0) {
      const maxS = Math.max(0, el.scrollHeight - el.clientHeight);
      maxScrollRef.current = maxS;
      const target = Math.max(0, Math.min(maxS, baseScrollTopRef.current + virtualOffsetRef.current));
      el.scrollTop = Math.round(target);
      baseScrollTopRef.current = el.scrollTop;
      virtualOffsetRef.current = 0;
      scrollPosRef.current = el.scrollTop;
    } else {
      baseScrollTopRef.current = el.scrollTop;
      scrollPosRef.current = el.scrollTop;
    }
    if (body) {
      body.style.transform = '';
    }
  }, []);

  useEffect(() => {
    refreshLayoutMetrics();
    const el = containerRef.current;
    const body = scrollBodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      refreshLayoutMetrics();
    });
    ro.observe(el);
    if (body) ro.observe(body);
    return () => ro.disconnect();
  }, [refreshLayoutMetrics, song?.id, fontSizePx, parsedLines.length, isImmersionMode, isLyricsOnly, showStageTools]);

  // Sync scrollPosRef & elapsedMs on mount or song change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      scrollPosRef.current = 0;
      baseScrollTopRef.current = 0;
      virtualOffsetRef.current = 0;
    }
    if (scrollBodyRef.current) {
      scrollBodyRef.current.style.transform = '';
    }
    elapsedMsRef.current = 0;
    lastReportedSecRef.current = 0;
    activeSectionIdRef.current = '';
    activeSectionNameRef.current = '';
    setActiveSectionId('');
    setActiveSectionName('');
    onUpdateElapsedRef.current?.(0);
    refreshLayoutMetrics();
  }, [song?.id, refreshLayoutMetrics]);

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
    const el = containerRef.current;
    if (!el) return;
    const currentScroll = el.scrollTop;

    // Lightweight throttled section detection using cached offsets (zero forced reflows)
    const now = Date.now();
    if (now - lastSectionCheckTimeRef.current > 120) {
      lastSectionCheckTimeRef.current = now;
      syncActiveSectionAtScroll(currentScroll + virtualOffsetRef.current);
    }

    if (isUserInteractingRef.current) {
      baseScrollTopRef.current = currentScroll;
      virtualOffsetRef.current = 0;
      scrollPosRef.current = currentScroll;
      if (scrollBodyRef.current && scrollBodyRef.current.style.transform) {
        scrollBodyRef.current.style.transform = '';
      }
      const maxScroll = maxScrollRef.current;
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

  // Pro Teleprompter GPU Auto-Scroll Engine:
  // Uses pure GPU-composited translate3d(0, -offset, 0) during glide with ZERO scrollTop writes
  // and ZERO layout reflows inside rAF — completely eliminating 1x-4x subpixel jitter and freezes.
  // Atomically commits back to native scrollTop on touch, wheel, section jump, or pause.
  useEffect(() => {
    if (!isAutoScrolling || !containerRef.current) {
      commitVirtualScroll();
      return;
    }

    const container = containerRef.current;
    refreshLayoutMetrics();
    const maxScroll = maxScrollRef.current;
    const totalMs = effectiveTargetSecRef.current * 1000;

    // Ensure no stale interaction lock blocks playback start
    isUserInteractingRef.current = false;

    // If starting at the very bottom, restart smoothly from top
    if (maxScroll > 0 && container.scrollTop >= maxScroll - 4) {
      container.scrollTop = 0;
      baseScrollTopRef.current = 0;
      virtualOffsetRef.current = 0;
      scrollPosRef.current = 0;
      elapsedMsRef.current = 0;
      lastReportedSecRef.current = 0;
      onUpdateElapsedRef.current?.(0);
      if (scrollBodyRef.current) {
        scrollBodyRef.current.style.transform = '';
      }
    } else {
      baseScrollTopRef.current = container.scrollTop;
      virtualOffsetRef.current = 0;
      scrollPosRef.current = container.scrollTop;
      if (maxScroll > 0) {
        elapsedMsRef.current = (container.scrollTop / maxScroll) * totalMs;
      }
    }

    let animId: number;
    let lastTime = performance.now();
    let lastSectionPoll = lastTime;

    const frame = (now: number) => {
      // Clamped delta ms (max 50ms) prevents huge jumps after tab switch or OS frame drop
      const dt = Math.min(50, Math.max(0.5, now - lastTime));
      lastTime = now;

      const el = containerRef.current;
      const body = scrollBodyRef.current;

      if (el && body) {
        const currentMaxScroll = maxScrollRef.current;
        const currentTotalMs = effectiveTargetSecRef.current * 1000;

        if (isUserInteractingRef.current) {
          // User is actively touching/wheeling: let native scroll lead cleanly
          baseScrollTopRef.current = el.scrollTop;
          virtualOffsetRef.current = 0;
          scrollPosRef.current = el.scrollTop;
          if (body.style.transform) body.style.transform = '';
          if (currentMaxScroll > 0) {
            elapsedMsRef.current = (el.scrollTop / currentMaxScroll) * currentTotalMs;
          }
        } else if (currentMaxScroll > 0) {
          if (scrollModeRef.current === 'duration') {
            elapsedMsRef.current = Math.min(currentTotalMs, elapsedMsRef.current + dt);
            const ratio = elapsedMsRef.current / currentTotalMs;
            scrollPosRef.current = Math.min(currentMaxScroll, ratio * currentMaxScroll);

            const currentSec = Math.floor(elapsedMsRef.current / 1000);
            if (currentSec !== lastReportedSecRef.current) {
              lastReportedSecRef.current = currentSec;
              onUpdateElapsedRef.current?.(currentSec);
            }
          } else {
            const currentSpeed = scrollSpeedRef.current;
            const pxPerSec = SPEED_MAP[currentSpeed] || (currentSpeed <= 1 ? 4.0 : currentSpeed * 10);
            scrollPosRef.current = Math.min(currentMaxScroll, scrollPosRef.current + (dt / 1000) * pxPerSec);
          }

          // Pure GPU subpixel transform — zero scrollTop mutations during playback
          virtualOffsetRef.current = Math.max(0, scrollPosRef.current - baseScrollTopRef.current);
          body.style.transform = `translate3d(0, ${-virtualOffsetRef.current.toFixed(3)}px, 0)`;

          // Lightweight active-section rail sync every 250ms using cached offsets (zero reflow)
          if (now - lastSectionPoll > 250) {
            lastSectionPoll = now;
            syncActiveSectionAtScroll(scrollPosRef.current);
          }

          if (
            scrollPosRef.current >= currentMaxScroll - 0.5 ||
            (scrollModeRef.current === 'duration' && elapsedMsRef.current >= currentTotalMs)
          ) {
            commitVirtualScroll();
            onAutoScrollCompleteRef.current?.();
            return;
          }
        }
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animId);
      commitVirtualScroll();
    };
  }, [isAutoScrolling, commitVirtualScroll, refreshLayoutMetrics, syncActiveSectionAtScroll]);

  const [activeSectionName, setActiveSectionName] = useState<string>('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');

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
          else if (lower.includes('refrain')) secType = 'chorus';
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
      else if (lower.includes('refrain')) secType = 'chorus';
      else if (lower.includes('pre') || /^pc\d*$/i.test(sec)) secType = 'prechorus';
      else if (lower.includes('bridge') || /^b\d*$/i.test(sec)) secType = 'bridge';
      else if (lower.includes('outro') || lower.includes('ending') || lower.includes('tag') || /^o$/i.test(sec)) secType = 'outro';
      else if (lower.includes('interlude') || lower.includes('instrumental') || lower.includes('vamp')) secType = 'interlude';
      return {
        id: `order-sec-${idx}-${sec}`,
        name: sec,
        lineIdx: -1,
        cleanName: sec,
        type: secType,
      };
    });
  }, [songSections, sectionParts]);

  const jumpToSection = (name: string, targetLineIdx?: number, occurrenceIndex?: number, sectionId?: string) => {
    if (!containerRef.current || !name) return;
    commitVirtualScroll();
    const container = containerRef.current;
    const targetEl = findSectionElement(container, name, targetLineIdx, occurrenceIndex);

    if (!targetEl) return;

    const cRect = container.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    const maxScroll = container.scrollHeight - container.clientHeight;
    maxScrollRef.current = Math.max(0, maxScroll);
    const currentTotalMs = effectiveTargetSecRef.current * 1000;

    const relativeOffset = tRect.top - cRect.top;
    const targetScrollTop = Math.max(0, Math.min(maxScroll, container.scrollTop + relativeOffset - 24));

    // Immediately synchronize auto-scroll position refs so animation frame doesn't fight or revert
    baseScrollTopRef.current = targetScrollTop;
    virtualOffsetRef.current = 0;
    scrollPosRef.current = targetScrollTop;
    if (maxScroll > 0) {
      elapsedMsRef.current = (targetScrollTop / maxScroll) * currentTotalMs;
    }

    // Suppress animation frame position overrides during the smooth scroll transition
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    isUserInteractingRef.current = true;
    userInteractionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      if (containerRef.current) {
        baseScrollTopRef.current = containerRef.current.scrollTop;
        scrollPosRef.current = containerRef.current.scrollTop;
        virtualOffsetRef.current = 0;
      }
    }, 650);

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    });

    // Lock auto-detection briefly while smooth scroll finishes, then let scroll tracking take over again
    jumpLockUntilRef.current = Date.now() + 700;
    activeSectionNameRef.current = name;
    setActiveSectionName(name);
    if (sectionId) {
      activeSectionIdRef.current = sectionId;
      setActiveSectionId(sectionId);
    } else {
      activeSectionIdRef.current = '';
      setActiveSectionId('');
    }

    // Visual feedback highlight on target section line
    try {
      targetEl.style.transition = 'background-color 0.25s ease, box-shadow 0.25s ease';
      targetEl.style.backgroundColor = 'rgba(56, 189, 248, 0.28)';
      targetEl.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.45)';
      targetEl.style.borderRadius = '6px';
      setTimeout(() => {
        targetEl.style.backgroundColor = 'transparent';
        targetEl.style.boxShadow = 'none';
      }, 1400);
    } catch (_) {}
  };

  const armTouchSafetyRelease = useCallback(() => {
    if (touchSafetyTimeoutRef.current) clearTimeout(touchSafetyTimeoutRef.current);
    touchSafetyTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      if (containerRef.current) {
        baseScrollTopRef.current = containerRef.current.scrollTop;
        scrollPosRef.current = containerRef.current.scrollTop;
        virtualOffsetRef.current = 0;
      }
    }, 5000);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    try {
      if (typeof window !== 'undefined' && (window as any).AndroidBand?.setSwipeRefreshEnabled) {
        (window as any).AndroidBand.setSwipeRefreshEnabled(false);
      }
    } catch (_) {}

    commitVirtualScroll();
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    isUserInteractingRef.current = true;
    armTouchSafetyRelease();
    if (isDrawingActive) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = () => {
    if (isUserInteractingRef.current) {
      armTouchSafetyRelease();
    }
  };

  const handleTouchCancel = () => {
    if (touchSafetyTimeoutRef.current) clearTimeout(touchSafetyTimeoutRef.current);
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    touchStartX.current = null;
    touchStartY.current = null;
    userInteractionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      if (containerRef.current) {
        baseScrollTopRef.current = containerRef.current.scrollTop;
        scrollPosRef.current = containerRef.current.scrollTop;
        virtualOffsetRef.current = 0;
      }
    }, 120);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchSafetyTimeoutRef.current) clearTimeout(touchSafetyTimeoutRef.current);
    if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
    userInteractionTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
      if (containerRef.current) {
        baseScrollTopRef.current = containerRef.current.scrollTop;
        scrollPosRef.current = containerRef.current.scrollTop;
        virtualOffsetRef.current = 0;
      }
    }, 150);

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
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onDoubleClick={(e) => {
        if (isDrawingActive) return;
        // Suppress synthetic mouse dblclick on touch devices that already handled touch double-tap
        if (Date.now() - lastHandledTouchTapRef.current < 750) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, a, input, select, textarea, [data-interactive="true"]')) return;
        onDoubleTap?.();
      }}
      onWheel={() => {
        commitVirtualScroll();
        if (userInteractionTimeoutRef.current) clearTimeout(userInteractionTimeoutRef.current);
        isUserInteractingRef.current = true;
        userInteractionTimeoutRef.current = setTimeout(() => {
          isUserInteractingRef.current = false;
          if (containerRef.current) {
            baseScrollTopRef.current = containerRef.current.scrollTop;
            scrollPosRef.current = containerRef.current.scrollTop;
            virtualOffsetRef.current = 0;
          }
        }, 220);
      }}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'auto',
        paddingTop: isImmersionMode ? 'calc(env(safe-area-inset-top, 0px) + 24px)' : '16px',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 20px)',
        paddingRight: allSections.length > 0
          ? !isImmersionMode && showStageTools
            ? 'calc(env(safe-area-inset-right, 0px) + 126px)'
            : 'calc(env(safe-area-inset-right, 0px) + 70px)'
          : !isImmersionMode && showStageTools
          ? 'calc(env(safe-area-inset-right, 0px) + 74px)'
          : '20px',
        paddingBottom: isImmersionMode
          ? hasPlaybackDock
            ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 168px)'
            : hasAutoScrollBar
            ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 124px)'
            : 'calc(env(safe-area-inset-bottom, 0px) + 80px)'
          : hasPlaybackDock
          ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 290px)'
          : hasAutoScrollBar
          ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 140px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 100px)',
        scrollPaddingBottom: hasAutoScrollBar
          ? 'calc(env(safe-area-inset-bottom, 0px) + 110px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 48px)',
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'none',
        overscrollBehaviorY: 'none',
      }}
    >
      {/* GPU-Composited Scrollable Content Layer (Header + Leader Space + Lyrics glide as one unified layer) */}
      <div
        ref={scrollBodyRef}
        style={{
          position: 'relative',
          willChange: isAutoScrolling ? 'transform' : 'auto',
          backfaceVisibility: 'hidden',
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
              {/* Interactive Pulsing BPM Badge */}
              <div
                onClick={onOpenMetronomeModal}
                role="button"
                tabIndex={0}
                title="Live Visual BPM Pulse • Click for Metronome Settings"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isMetronomeAudioActive ? 'rgba(245, 158, 11, 0.25)' : '#1e293b',
                  border: isMetronomeAudioActive ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#fbbf24',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: isMetronomeAudioActive ? '0 0 10px rgba(245, 158, 11, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isMetronomePulsing ? '#fbbf24' : '#f59e0b',
                    transform: isMetronomePulsing ? 'scale(1.5)' : 'scale(1)',
                    boxShadow: isMetronomePulsing ? '0 0 8px #fbbf24' : 'none',
                    display: 'inline-block',
                    flexShrink: 0,
                    transition: 'transform 0.08s ease',
                  }}
                />
                <span>{bpm ? `${bpm} BPM` : song.tempo ? `${song.tempo} BPM` : '72 BPM'}</span>
              </div>
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
                onClick={() => jumpToSection(sec, undefined, idx)}
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
              const rawSecName = currentSectionTitle.replace(/^[\[|\s#]+|[\]|\s]+$/g, '').trim();
              return (
                <div
                  key={lIdx}
                  id={`sheet-line-${lIdx}`}
                  className="hgf-sheet-line"
                  data-sheet-line-index={lIdx}
                  data-section-name={currentSectionTitle}
                  data-section-title={line.sectionName}
                  data-section-id={`sec-${lIdx}-${rawSecName}`}
                  style={{
                    fontSize: `${Math.max(14, Math.round(fontSizePx * 0.65))}px`,
                    fontWeight: 800,
                    color: '#38bdf8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginTop: `${Math.max(16, Math.round(fontSizePx * 0.6))}px`,
                    marginBottom: `${Math.max(6, Math.round(fontSizePx * 0.25))}px`,
                    borderLeft: `${Math.max(3, Math.round(fontSizePx * 0.1))}px solid #38bdf8`,
                    paddingLeft: `${Math.max(8, Math.round(fontSizePx * 0.25))}px`,
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

              // Lyrics-Only Mode: render whole line as single continuous text to prevent word wrapping glitches at huge font sizes
              if (isLyricsOnly) {
                const fullLyric = line.pairs.map((p) => p.lyric).join('');
                if (!fullLyric.trim()) return null;
                return (
                  <div
                    key={lIdx}
                    id={`sheet-line-${lIdx}`}
                    className="hgf-sheet-line"
                    data-sheet-line-index={lIdx}
                    data-section-name={currentSectionTitle}
                    style={{
                      color: '#f1f5f9',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      lineHeight: 1.45,
                      marginBottom: `${Math.max(4, Math.round(fontSizePx * 0.25))}px`,
                    }}
                  >
                    {fullLyric.trimStart()}
                  </div>
                );
              }

              // Chords Mode: decompose pairs into wrappable atomic tokens so lines wrap naturally without breaking chord alignment
              const wrappableTokens = line.pairs.flatMap((pair) =>
                splitPairIntoWrappableTokens(pair.chord, pair.lyric)
              );

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
                    rowGap: `${Math.max(6, Math.round(fontSizePx * 0.35))}px`,
                    columnGap: '0px',
                    minHeight: '1.4em',
                    marginBottom: `${Math.max(6, Math.round(fontSizePx * 0.35))}px`,
                    wordBreak: 'break-word',
                  }}
                >
                  {wrappableTokens.map((token, tIdx) => (
                    <span
                      key={tIdx}
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        verticalAlign: 'bottom',
                      }}
                    >
                      <span
                        onClick={() => token.chord && onOpenChordDiagram && onOpenChordDiagram(token.chord)}
                        style={{
                          fontSize: '0.82em',
                          fontWeight: 800,
                          color: '#f59e0b',
                          cursor: token.chord ? 'pointer' : 'default',
                          minHeight: '1.2em',
                          lineHeight: 1.2,
                          whiteSpace: 'pre',
                          paddingRight: token.chord ? '4px' : '0px',
                          userSelect: token.chord ? 'none' : 'text',
                        }}
                      >
                        {token.chord || ''}
                      </span>
                      <span
                        style={{
                          color: '#f1f5f9',
                          whiteSpace: 'pre',
                          lineHeight: 1.4,
                        }}
                      >
                        {token.lyric}
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
                  style={{
                    minHeight: '1.5em',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    lineHeight: 1.4,
                    marginBottom: `${Math.max(4, Math.round(fontSizePx * 0.25))}px`,
                  }}
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
                          marginRight: '2px',
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
                style={{
                  color: '#f1f5f9',
                  minHeight: '1.4em',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  lineHeight: 1.45,
                  marginBottom: `${Math.max(4, Math.round(fontSizePx * 0.25))}px`,
                }}
              >
                {line.raw}
              </div>
            );
          });
        })()}
      </div>
      </div>
    </div>

      {/* FAR-RIGHT VERTICAL SECTION QUICK-JUMP RAIL (Prominent on far right in both standard & focus modes) */}
      {allSections.length > 0 && (
        <nav
          data-testid="section-jump-dock"
          aria-label="Song sections"
          style={{
            position: 'fixed',
            right: 'calc(env(safe-area-inset-right, 0px) + 10px)',
            top: isImmersionMode
              ? 'calc(env(safe-area-inset-top, 0px) + 16px)'
              : 'calc(env(safe-area-inset-top, 0px) + 92px)',
            bottom: isImmersionMode
              ? hasPlaybackDock
                ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 148px)'
                : hasAutoScrollBar
                ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 98px)'
                : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 24px)'
              : hasPlaybackDock
              ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 228px)'
              : hasAutoScrollBar
              ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 104px)'
              : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 24px)',
            zIndex: 55,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            pointerEvents: 'none',
            transition: 'top 0.2s ease, bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div
            style={{
              margin: 'auto 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '8px',
              padding: '4px 0',
            }}
          >
            {allSections.map((sec, idx) => {
              const isMatch =
                activeSectionId === sec.id ||
                (!activeSectionId &&
                  activeSectionName &&
                  activeSectionName.toLowerCase().replace(/[^a-z0-9]/g, '').includes(sec.cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')));

              let badgeBg = 'rgba(15, 23, 42, 0.56)';
              let badgeBorder = 'rgba(148, 163, 184, 0.28)';
              let badgeColor = '#cbd5e1';

              if (sec.type === 'chorus') {
                badgeBg = isMatch ? '#0e7490' : 'rgba(78, 177, 203, 0.14)';
                badgeBorder = isMatch ? '#67e8f9' : 'rgba(78, 177, 203, 0.42)';
                badgeColor = isMatch ? '#ffffff' : '#a5f3fc';
              } else if (sec.type === 'bridge') {
                badgeBg = isMatch ? '#b45309' : 'rgba(245, 158, 11, 0.13)';
                badgeBorder = isMatch ? '#fbbf24' : 'rgba(245, 158, 11, 0.38)';
                badgeColor = isMatch ? '#ffffff' : '#fde68a';
              } else if (sec.type === 'verse') {
                badgeBg = isMatch ? '#0369a1' : 'rgba(14, 165, 233, 0.13)';
                badgeBorder = isMatch ? '#38bdf8' : 'rgba(14, 165, 233, 0.36)';
                badgeColor = isMatch ? '#ffffff' : '#bae6fd';
              } else if (sec.type === 'prechorus') {
                badgeBg = isMatch ? '#047857' : 'rgba(16, 185, 129, 0.13)';
                badgeBorder = isMatch ? '#34d399' : 'rgba(16, 185, 129, 0.36)';
                badgeColor = isMatch ? '#ffffff' : '#a7f3d0';
              } else if (sec.type === 'intro' || sec.type === 'outro' || sec.type === 'interlude') {
                badgeBg = isMatch ? '#334155' : 'rgba(15, 23, 42, 0.52)';
                badgeBorder = isMatch ? '#94a3b8' : 'rgba(148, 163, 184, 0.26)';
                badgeColor = isMatch ? '#ffffff' : '#94a3b8';
              }

              return (
                <button
                  key={sec.id}
                  type="button"
                  data-interactive="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    jumpToSection(sec.name, sec.lineIdx >= 0 ? sec.lineIdx : undefined, idx, sec.id);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  title={`Jump to ${sec.name}`}
                  aria-label={`Jump to ${sec.name}`}
                  aria-current={isMatch ? 'location' : undefined}
                  style={{
                    pointerEvents: 'auto',
                    flexShrink: 0,
                    minHeight: '40px',
                    minWidth: '48px',
                    padding: '6px 9px',
                    borderRadius: '12px',
                    backgroundColor: badgeBg,
                    border: `1.5px solid ${badgeBorder}`,
                    color: badgeColor,
                    fontSize: '11.5px',
                    fontWeight: 800,
                    letterSpacing: '0.25px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    opacity: isMatch ? 1 : 0.78,
                    boxShadow: isMatch
                      ? '0 4px 14px rgba(78, 177, 203, 0.35)'
                      : '0 2px 8px rgba(0, 0, 0, 0.35)',
                    transform: isMatch ? 'scale(1.04)' : 'scale(1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {formatSectionRailLabel(sec.cleanName)}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
