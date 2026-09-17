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
  onOpenMetronome?: () => void;
  isMetronomeAudioActive?: boolean;
  hasPlaybackDock?: boolean;
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
  onOpenMetronome,
  isMetronomeAudioActive = false,
  hasPlaybackDock = false,
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
      {/* Auto-scroll FAB */}
      <button
        onClick={onToggleAutoScroll}
        title="Toggle Auto-Scroll"
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

      {/* Metronome FAB */}
      {onOpenMetronome && (
        <button
          onClick={onOpenMetronome}
          title="Open Stage Metronome"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: isMetronomeAudioActive ? '#f59e0b' : 'rgba(22, 28, 38, 0.85)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${isMetronomeAudioActive ? '#f59e0b' : '#334155'}`,
            color: isMetronomeAudioActive ? '#000' : '#fff',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
          }}
        >
          🔔
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
