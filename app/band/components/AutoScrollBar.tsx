// app/band/components/AutoScrollBar.tsx
'use client';

import React from 'react';

interface AutoScrollBarProps {
  isVisible: boolean;
  isPlaying: boolean;
  speed: number;
  onTogglePlay: () => void;
  onChangeSpeed: (speed: number) => void;
  onClose: () => void;
  hasPlaybackDock?: boolean;
  // Planned Arrangement Duration Mode
  scrollMode?: 'duration' | 'speed';
  onToggleScrollMode?: () => void;
  duration?: string;
  elapsedSeconds?: number;
  targetDurationSec?: number;
  onOpenDurationPicker?: () => void;
  onStepDurationSeconds?: (delta: number) => void;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const AutoScrollBar: React.FC<AutoScrollBarProps> = ({
  isVisible,
  isPlaying,
  speed,
  onTogglePlay,
  onChangeSpeed,
  onClose,
  hasPlaybackDock = false,
  scrollMode = 'speed',
  onToggleScrollMode,
  duration = '',
  elapsedSeconds = 0,
  targetDurationSec = 0,
  onOpenDurationPicker,
  onStepDurationSeconds,
}) => {
  if (!isVisible) return null;

  const handleStepSpeed = (delta: number) => {
    const next = Math.max(1, Math.min(10, speed + delta));
    onChangeSpeed(next);
  };

  const displayTarget = targetDurationSec > 0 ? formatSec(targetDurationSec) : duration || '4:00';
  const displayElapsed = formatSec(elapsedSeconds);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: hasPlaybackDock
          ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 148px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 20px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 65,
        transition: 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#0c1017',
        border: '1px solid #2d3f5e',
        borderRadius: '999px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85)',
        userSelect: 'none',
        backdropFilter: 'blur(8px)',
        maxWidth: '96vw',
        overflowX: 'auto',
      }}
    >
      {/* Play / Pause */}
      <button
        onClick={onTogglePlay}
        title={isPlaying ? 'Pause Auto-Scroll' : 'Start Auto-Scroll'}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isPlaying ? '#10b981' : '#334155',
          border: 'none',
          color: isPlaying ? '#000' : '#fff',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Mode Toggle Button (Duration vs Speed) */}
      {onToggleScrollMode && (
        <button
          onClick={onToggleScrollMode}
          title={scrollMode === 'duration' ? 'Switch to Raw Speed Mode' : 'Switch to Paced Duration Mode'}
          style={{
            height: '28px',
            padding: '0 8px',
            borderRadius: '999px',
            border: `1px solid ${scrollMode === 'duration' ? '#4EB1CB' : '#334155'}`,
            background: scrollMode === 'duration' ? 'rgba(78, 177, 203, 0.2)' : '#131c2e',
            color: scrollMode === 'duration' ? '#4EB1CB' : '#94a3b8',
            fontSize: '11px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <span>{scrollMode === 'duration' ? '⏱️ Pace' : '⚡ Speed'}</span>
        </button>
      )}

      {/* DURATION-PACED CONTROLS */}
      {scrollMode === 'duration' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onStepDurationSeconds && (
            <button
              onClick={() => onStepDurationSeconds(-30)}
              title="30s shorter"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#131c2e',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              -
            </button>
          )}

          <div
            onClick={onOpenDurationPicker}
            title="Tap to change song arrangement length"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              borderRadius: '8px',
              backgroundColor: '#131c2e',
              border: '1px solid #334155',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 800, color: isPlaying ? '#10b981' : '#e2e8f0', fontFamily: 'monospace' }}>
              {isPlaying ? `${displayElapsed} / ` : ''}{displayTarget}
            </span>
            <span style={{ fontSize: '10px', color: '#4EB1CB' }}>✏️</span>
          </div>

          {onStepDurationSeconds && (
            <button
              onClick={() => onStepDurationSeconds(30)}
              title="30s longer"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#131c2e',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          )}
        </div>
      ) : (
        /* SPEED SLIDER CONTROLS */
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={() => handleStepSpeed(-1)}
            title="Slower"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#131c2e',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            -
          </button>

          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={speed}
            onChange={(e) => onChangeSpeed(parseInt(e.target.value, 10) || 3)}
            style={{
              width: '75px',
              accentColor: '#4EB1CB',
              cursor: 'pointer',
            }}
          />

          <button
            onClick={() => handleStepSpeed(1)}
            title="Faster"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#131c2e',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>

          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#4EB1CB',
              minWidth: '22px',
              textAlign: 'center',
            }}
          >
            {speed}x
          </span>
        </div>
      )}

      <div style={{ width: '1px', height: '18px', backgroundColor: '#334155', margin: '0 2px', flexShrink: 0 }} />

      {/* Close Button */}
      <button
        onClick={onClose}
        title="Close Auto-Scroll Bar"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: '#94a3b8',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
};
