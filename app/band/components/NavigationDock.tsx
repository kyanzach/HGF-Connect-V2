// app/band/components/NavigationDock.tsx
'use client';

import React, { useRef } from 'react';

interface NavigationDockProps {
  onPrevSong: () => void;
  onNextSong: () => void;
  canPrev: boolean;
  canNext: boolean;
  currentIndex: number;
  totalSongs: number;
  fontSizePx: number;
  onChangeFontSize: (delta: number) => void;
  isAutoScrolling: boolean;
  onToggleAutoScroll: () => void;
  bpm?: number | string | null;
  isMetronomePulsing?: boolean;
  onOpenMetronome?: () => void;
  isMetronomeAudioActive?: boolean;
  hasPlaybackDock?: boolean;
  duration?: string;
  onOpenDurationPicker?: () => void;
  isLyricsOnly?: boolean;
  onToggleLyricsOnly?: () => void;
  isPadPlaying?: boolean;
  isPadFadingOut?: boolean;
  activePadKey?: string;
  onTogglePad?: () => void;
  onOpenPadModal?: () => void;
}

export const NavigationDock: React.FC<NavigationDockProps> = ({
  onPrevSong,
  onNextSong,
  canPrev,
  canNext,
  currentIndex,
  totalSongs,
  fontSizePx = 17,
  onChangeFontSize,
  isAutoScrolling,
  onToggleAutoScroll,
  bpm,
  isMetronomePulsing = false,
  onOpenMetronome,
  isMetronomeAudioActive = false,
  hasPlaybackDock = false,
  duration,
  onOpenDurationPicker,
  isLyricsOnly = false,
  onToggleLyricsOnly,
  isPadPlaying = false,
  isPadFadingOut = false,
  activePadKey = 'C',
  onTogglePad,
  onOpenPadModal,
}) => {
  const padLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPadLongPressTriggeredRef = useRef<boolean>(false);

  const startPadLongPress = () => {
    isPadLongPressTriggeredRef.current = false;
    if (padLongPressTimerRef.current) clearTimeout(padLongPressTimerRef.current);
    padLongPressTimerRef.current = setTimeout(() => {
      isPadLongPressTriggeredRef.current = true;
      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(45);
        }
      } catch (_) {}
      onOpenPadModal?.();
    }, 450);
  };

  const cancelPadLongPress = () => {
    if (padLongPressTimerRef.current) {
      clearTimeout(padLongPressTimerRef.current);
      padLongPressTimerRef.current = null;
    }
  };

  const handlePadClick = (e: React.MouseEvent) => {
    if (isPadLongPressTriggeredRef.current) {
      isPadLongPressTriggeredRef.current = false;
      return;
    }
    onTogglePad?.();
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: '16px',
        bottom: hasPlaybackDock
          ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 148px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 60,
        userSelect: 'none',
        transition: 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Ambient Worship Pad FAB (Solo Performer Ambient Bed) */}
      {onTogglePad && (
        <div style={{ position: 'relative' }}>
          <button
            onTouchStart={startPadLongPress}
            onTouchEnd={cancelPadLongPress}
            onTouchCancel={cancelPadLongPress}
            onTouchMove={cancelPadLongPress}
            onMouseDown={startPadLongPress}
            onMouseUp={cancelPadLongPress}
            onMouseLeave={cancelPadLongPress}
            onClick={handlePadClick}
            onDoubleClick={(e) => {
              e.preventDefault();
              onOpenPadModal?.();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenPadModal?.();
            }}
            title={
              isPadPlaying
                ? `Ambient Pad: [${activePadKey}] Playing • Tap to Fade Out • Hold (Long-Press) to change Key & Volume`
                : isPadFadingOut
                ? `Ambient Pad: [${activePadKey}] Fading Out`
                : `Ambient Pad: [${activePadKey}] Paused • Tap to Play • Hold (Long-Press) to change Key & Volume`
            }
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: isPadPlaying
                ? 'rgba(78, 177, 203, 0.25)'
                : isPadFadingOut
                ? 'rgba(245, 158, 11, 0.18)'
                : 'rgba(22, 28, 38, 0.9)',
              backdropFilter: 'blur(10px)',
              border: `1.5px solid ${
                isPadPlaying ? '#4EB1CB' : isPadFadingOut ? '#f59e0b' : '#334155'
              }`,
              color: isPadPlaying ? '#38bdf8' : isPadFadingOut ? '#fde047' : '#94a3b8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPadPlaying
                ? '0 0 18px rgba(78, 177, 203, 0.7), 0 6px 16px rgba(0,0,0,0.5)'
                : isPadFadingOut
                ? '0 0 14px rgba(245, 158, 11, 0.45), 0 6px 16px rgba(0,0,0,0.5)'
                : '0 6px 16px rgba(0,0,0,0.5)',
              transform: isPadPlaying ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>🎹</span>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 900,
                marginTop: '1px',
                letterSpacing: '-0.3px',
                color: isPadPlaying ? '#ffffff' : isPadFadingOut ? '#fde047' : '#cbd5e1',
                lineHeight: 1,
              }}
            >
              {activePadKey}
            </span>
          </button>
        </div>
      )}

      {/* BPM Metronome FAB (Live Visual Pulse • Tap for Metronome Settings) */}
      {onOpenMetronome && (
        <button
          onClick={onOpenMetronome}
          title={
            isMetronomeAudioActive
              ? `Metronome Audio Active (${bpm || 72} BPM) • Tap to adjust`
              : `Visual BPM Pulse (${bpm || 72} BPM) • Tap for Metronome Settings & Audio`
          }
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: isMetronomeAudioActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(22, 28, 38, 0.9)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${
              isMetronomePulsing
                ? '#fbbf24'
                : isMetronomeAudioActive
                ? '#f59e0b'
                : 'rgba(245, 158, 11, 0.45)'
            }`,
            color: '#fbbf24',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isMetronomePulsing
              ? '0 0 16px rgba(251, 191, 36, 0.75), 0 6px 16px rgba(0,0,0,0.5)'
              : isMetronomeAudioActive
              ? '0 0 10px rgba(245, 158, 11, 0.4), 0 6px 16px rgba(0,0,0,0.5)'
              : '0 6px 16px rgba(0,0,0,0.5)',
            transform: isMetronomePulsing ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.2px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: isMetronomePulsing ? '#fbbf24' : '#f59e0b',
                display: 'inline-block',
                boxShadow: isMetronomePulsing ? '0 0 6px #fbbf24' : 'none',
              }}
            />
            <span>{bpm ? String(bpm).replace(/[^0-9]/g, '') : '72'}</span>
          </div>
          <div
            style={{
              fontSize: '8px',
              fontWeight: 800,
              color: isMetronomeAudioActive ? '#fbbf24' : '#94a3b8',
              lineHeight: 1,
              marginTop: '2px',
              textTransform: 'uppercase',
            }}
          >
            BPM
          </div>
        </button>
      )}

      {/* Auto-scroll FAB: Yellow Play / Pause Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={onToggleAutoScroll}
          title={isAutoScrolling ? 'Pause Auto-Scroll (Playing)' : 'Start Auto-Scroll (Play)'}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: isAutoScrolling ? '#facc15' : 'rgba(245, 158, 11, 0.16)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${isAutoScrolling ? '#facc15' : '#f59e0b'}`,
            color: isAutoScrolling ? '#000' : '#fbbf24',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isAutoScrolling
              ? '0 0 16px rgba(250, 204, 21, 0.65), 0 6px 16px rgba(0,0,0,0.5)'
              : '0 4px 12px rgba(245, 158, 11, 0.25), 0 6px 16px rgba(0,0,0,0.5)',
            transform: isAutoScrolling ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.15s ease',
          }}
        >
          {isAutoScrolling ? (
            <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>⏸</span>
          ) : (
            <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1, marginLeft: '2px' }}>▶</span>
          )}
        </button>
      </div>

      {/* Lyrics-Only Mode Toggle (Singers / Vocalists Tool) */}
      {onToggleLyricsOnly && (
        <button
          onClick={onToggleLyricsOnly}
          title={
            isLyricsOnly
              ? 'Lyrics-Only Mode Active (Chords Hidden) • Tap to show chords'
              : 'Lyrics-Only Mode (Hide Chords for Singers) • Tap for clean lyrics'
          }
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: isLyricsOnly ? '#9333ea' : 'rgba(22, 28, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${isLyricsOnly ? '#c084fc' : '#334155'}`,
            color: isLyricsOnly ? '#fff' : '#cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isLyricsOnly
              ? '0 0 16px rgba(168, 85, 247, 0.65), 0 6px 16px rgba(0,0,0,0.5)'
              : '0 6px 16px rgba(0,0,0,0.5)',
            transition: 'all 0.18s ease',
          }}
        >
          <span style={{ fontSize: '15px', lineHeight: 1 }}>🎤</span>
          <span
            style={{
              fontSize: '7.5px',
              fontWeight: 900,
              textTransform: 'uppercase',
              marginTop: '2px',
              letterSpacing: '0.2px',
              color: isLyricsOnly ? '#fff' : '#94a3b8',
              lineHeight: 1,
            }}
          >
            {isLyricsOnly ? 'LYRICS' : 'CHORDS'}
          </span>
        </button>
      )}

      {/* Font Size Zoom Stepper with Live Size Readout & 1-Tap Reset */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(22, 28, 38, 0.85)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #334155',
          borderRadius: '23px',
          overflow: 'hidden',
          boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
        }}
      >
        <button
          onClick={() => onChangeFontSize(1)}
          title="Increase font size (A+)"
          style={{
            width: '46px',
            height: '34px',
            border: 'none',
            background: 'transparent',
            color: '#cbd5e1',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          A+
        </button>
        <div
          onClick={() => onChangeFontSize(0)}
          title={`Current Font Size: ${fontSizePx}px • Tap to reset to normal (17px)`}
          style={{
            textAlign: 'center',
            fontSize: '9px',
            fontWeight: 800,
            color: fontSizePx > 26 ? '#38bdf8' : '#94a3b8',
            padding: '3px 0',
            borderTop: '1px solid #334155',
            borderBottom: '1px solid #334155',
            cursor: 'pointer',
            background: fontSizePx > 26 ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
            lineHeight: 1,
          }}
        >
          {fontSizePx}px
        </div>
        <button
          onClick={() => onChangeFontSize(-1)}
          title="Decrease font size (A-)"
          style={{
            width: '46px',
            height: '34px',
            border: 'none',
            background: 'transparent',
            color: '#cbd5e1',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          A-
        </button>
      </div>

      {/* Next / Prev Stepper */}
      {totalSongs > 1 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(22, 28, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #334155',
            borderRadius: '22px',
            overflow: 'hidden',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
          }}
        >
          <button
            onClick={onPrevSong}
            disabled={!canPrev}
            title="Previous Song"
            style={{
              width: '44px',
              height: '40px',
              border: 'none',
              background: 'transparent',
              color: canPrev ? '#38bdf8' : '#475569',
              fontSize: '16px',
              cursor: canPrev ? 'pointer' : 'not-allowed',
            }}
          >
            ▲
          </button>
          <div
            style={{
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 800,
              color: '#94a3b8',
              padding: '2px 0',
              borderTop: '1px solid #334155',
              borderBottom: '1px solid #334155',
            }}
          >
            {currentIndex + 1}/{totalSongs}
          </div>
          <button
            onClick={onNextSong}
            disabled={!canNext}
            title="Next Song"
            style={{
              width: '44px',
              height: '40px',
              border: 'none',
              background: 'transparent',
              color: canNext ? '#38bdf8' : '#475569',
              fontSize: '16px',
              cursor: canNext ? 'pointer' : 'not-allowed',
            }}
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
};
