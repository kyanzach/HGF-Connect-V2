// app/band/components/SongSheet.tsx
'use client';

import React, { useRef, useEffect } from 'react';
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Playback-synced auto-scroll lockstep
  useEffect(() => {
    if (!playbackState?.isPlaying || !playbackState.duration || !containerRef.current) return;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll > 0) {
      const targetScroll = (playbackState.currentTime / playbackState.duration) * maxScroll;
      container.scrollTop = targetScroll;
    }
  }, [playbackState?.isPlaying, playbackState?.currentTime, playbackState?.duration]);

  // Auto-scroll loop: Duration-paced teleprompter lockstep OR variable speed
  useEffect(() => {
    if (!isAutoScrolling || playbackState?.isPlaying || !containerRef.current) return;
    const container = containerRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    if (scrollMode === 'duration' && targetDurationSec > 0) {
      const targetScroll = Math.min(maxScroll, (elapsedScrollSeconds / targetDurationSec) * maxScroll);
      container.scrollTop = targetScroll;
      return;
    }

    const interval = setInterval(() => {
      const step = Math.max(0.4, (scrollSpeed || 3) * 0.4);
      container.scrollBy({ top: step, behavior: 'auto' });
    }, 40);

    return () => clearInterval(interval);
  }, [isAutoScrolling, scrollSpeed, playbackState?.isPlaying, scrollMode, elapsedScrollSeconds, targetDurationSec]);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
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
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: '16px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 180px)',
        backgroundColor: '#0a0d14',
        color: '#f8fafc',
        fontFamily: 'monospace, system-ui',
        WebkitOverflowScrolling: 'touch',
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
