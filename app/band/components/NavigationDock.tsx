// app/band/components/NavigationDock.tsx
'use client';

import React from 'react';

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
            onClick={onTogglePad}
            onContextMenu={(e) => {
              e.preventDefault();
              onOpenPadModal?.();
            }}
            title={
              isPadPlaying
                ? `Ambient Pad Playing [${activePadKey}] • Tap to Fade Out • Gear icon for settings`
                : isPadFadingOut
                ? `Ambient Pad Fading Out [${activePadKey}]`
                : `Ambient Pad Paused [${activePadKey}] • Tap to Play ambient bed • Gear icon for settings`
            }
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: isPadPlaying
                ? 'rgba(78, 177, 203, 0.22)'
                : isPadFadingOut
                ? 'rgba(245, 158, 11, 0.16)'
                : 'rgba(22, 28, 38, 0.85)',
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
                ? '0 0 16px rgba(78, 177, 203, 0.65), 0 6px 16px rgba(0,0,0,0.5)'
                : isPadFadingOut
                ? '0 0 14px rgba(245, 158, 11, 0.4), 0 6px 16px rgba(0,0,0,0.5)'
                : '0 6px 16px rgba(0,0,0,0.5)',
              transform: isPadPlaying ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span style={{ fontSize: '13px', lineHeight: 1 }}>🎹</span>
            <span
              style={{
                fontSize: '9px',
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

          {/* Settings mini-badge to open Ambient Pad modal */}
          {onOpenPadModal && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPadModal();
              }}
              title="Ambient Pad Settings (Volume, Key, Sounds)"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                color: '#cbd5e1',
                fontSize: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
              }}
            >
              ⚙
            </button>
          )}
        </div>
      )}

      {/* Auto-scroll FAB: Yellow Play / Pause Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={onToggleAutoScroll}
          title={isAutoScrolling ? 'Pause Auto-Scroll (Playing)' : 'Start Auto-Scroll (Play)'}
          style={{
            width: '44px',
            height: '44px',
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
            width: '44px',
            height: '44px',
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

      {/* Font Size Zoom Stepper */}
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
          onClick={() => onChangeFontSize(1)}
          title="Increase font size"
          style={{
            width: '44px',
            height: '36px',
            border: 'none',
            background: 'transparent',
            color: '#cbd5e1',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          A+
        </button>
        <button
          onClick={() => onChangeFontSize(-1)}
          title="Decrease font size"
          style={{
            width: '44px',
            height: '36px',
            border: 'none',
            borderTop: '1px solid #334155',
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
