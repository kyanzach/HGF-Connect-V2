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
  onForceRefresh?: () => void;
  isForceRefreshing?: boolean;
  isLyricsOnly?: boolean;
  onToggleLyricsOnly?: () => void;
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
  onForceRefresh,
  isForceRefreshing = false,
  isLyricsOnly = false,
  onToggleLyricsOnly,
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
      <style>{`
        @keyframes spinRefresh {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Force Refresh & Update Sheets FAB (Floating on top of BPM) */}
      {onForceRefresh && (
        <button
          onClick={onForceRefresh}
          disabled={isForceRefreshing}
          title="Force Refresh & Update Sheets (Clears Cache)"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(22, 28, 38, 0.92)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(78, 177, 203, 0.55)',
            color: '#4EB1CB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isForceRefreshing ? 'wait' : 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
            transition: 'all 0.15s ease',
          }}
        >
          <span
            style={{
              fontSize: '18px',
              display: 'inline-block',
              animation: isForceRefreshing ? 'spinRefresh 0.75s linear infinite' : 'none',
            }}
          >
            🔄
          </span>
        </button>
      )}

      {/* BPM Metronome FAB (Moved to Floating Dock) */}
      {onOpenMetronome && (
        <button
          onClick={onOpenMetronome}
          title="Live Visual BPM Pulse • Tap for Metronome Settings"
          style={{
            width: '44px',
            height: '44px',
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
              ? '0 0 14px rgba(251, 191, 36, 0.7), 0 6px 16px rgba(0,0,0,0.5)'
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

      {/* Auto-scroll FAB with Duration Badge */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={onToggleAutoScroll}
          title={isAutoScrolling ? 'Pause Auto-Scroll' : 'Start Auto-Scroll'}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: isAutoScrolling ? '#10b981' : 'rgba(22, 28, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isAutoScrolling ? '#10b981' : '#334155'}`,
            color: isAutoScrolling ? '#000' : '#fff',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
          }}
        >
          📜
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
