// app/band/components/AudioPlaybackDock.tsx
'use client';

import React from 'react';

interface AudioPlaybackDockProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  title: string;
}

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AudioPlaybackDock: React.FC<AudioPlaybackDockProps> = ({
  isVisible,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  title,
}) => {
  if (!isVisible) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '560px',
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #38bdf8',
        borderRadius: '16px',
        padding: '12px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 15px rgba(56, 189, 248, 0.3)',
        zIndex: 60,
        userSelect: 'none',
      }}
    >
      {/* Upper Row: Title & Times */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🎧</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '13px',
              color: '#38bdf8',
              maxWidth: '240px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
          {formatSeconds(currentTime)} / {formatSeconds(duration)}
        </div>
      </div>

      {/* Progress Scrubber */}
      <input
        type="range"
        min="0"
        max={duration || 100}
        value={currentTime}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: '6px',
          accentColor: '#38bdf8',
          cursor: 'pointer',
        }}
      />

      {/* Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button
          onClick={onTogglePlay}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            backgroundColor: '#38bdf8',
            border: 'none',
            color: '#000',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.4)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
};
