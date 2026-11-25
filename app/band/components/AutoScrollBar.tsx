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
  isImmersionMode?: boolean;
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
  isImmersionMode = false,
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
    const next = Math.max(1, Math.min(20, speed + delta));
    onChangeSpeed(next);
  };

  const displayTarget = targetDurationSec > 0 ? formatSec(targetDurationSec) : duration || '4:00';
  const displayElapsed = formatSec(elapsedSeconds);

  const bottomOffset = isImmersionMode
    ? hasPlaybackDock
      ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 66px)'
      : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 16px)'
    : hasPlaybackDock
    ? 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 148px)'
    : 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 20px)';

  return (
    <div
      data-interactive="true"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      role="region"
      aria-label="Auto-scroll controls"
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 12px)',
        margin: '0 auto',
        maxWidth: '960px',
        zIndex: 65,
        transition: 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1), right 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: 'rgba(12, 16, 23, 0.92)',
        border: '1px solid rgba(78, 177, 203, 0.32)',
        borderRadius: '999px',
        padding: '8px clamp(10px, 2vw, 22px)',
        minHeight: '60px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(6px, 1.8vw, 22px)',
        boxShadow: '0 14px 36px rgba(0, 0, 0, 0.82)',
        userSelect: 'none',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        overflow: 'hidden',
      }}
    >
      {/* Play / Pause */}
      <button
        type="button"
        onClick={onTogglePlay}
        title={isPlaying ? 'Pause Auto-Scroll' : 'Start Auto-Scroll'}
        aria-label={isPlaying ? 'Pause Auto-Scroll' : 'Start Auto-Scroll'}
        style={{
          width: 'clamp(40px, 10vw, 48px)',
          height: 'clamp(40px, 10vw, 48px)',
          minWidth: '40px',
          minHeight: '40px',
          borderRadius: '50%',
          backgroundColor: isPlaying ? '#10b981' : '#334155',
          border: 'none',
          color: isPlaying ? '#052e16' : '#f8fafc',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: isPlaying ? '0 0 18px rgba(16, 185, 129, 0.45)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="4" width="4.5" height="16" rx="1.5" />
            <rect x="13.5" y="4" width="4.5" height="16" rx="1.5" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: '2px' }}>
            <path d="M7 4.8v14.4c0 1 1.1 1.6 1.9 1.1l11.2-7.2c.8-.5.8-1.7 0-2.2L8.9 3.7C8.1 3.2 7 3.8 7 4.8z" />
          </svg>
        )}
      </button>

      {/* Mode Toggle Button (Speed vs Pace) */}
      {onToggleScrollMode && (
        <button
          type="button"
          onClick={onToggleScrollMode}
          title={scrollMode === 'speed' ? 'Switch to Pace Mode (Song Duration)' : 'Switch to Speed Mode'}
          aria-label={scrollMode === 'speed' ? 'Switch to Pace Mode' : 'Switch to Speed Mode'}
          style={{
            minHeight: '40px',
            padding: '0 clamp(8px, 1.8vw, 16px)',
            borderRadius: '999px',
            border: `1.5px solid ${scrollMode === 'speed' ? '#38bdf8' : '#4EB1CB'}`,
            background: scrollMode === 'speed' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(78, 177, 203, 0.15)',
            color: scrollMode === 'speed' ? '#38bdf8' : '#4EB1CB',
            fontSize: 'clamp(11.5px, 1.5vw, 15px)',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          {scrollMode === 'speed' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 2L4.5 13.5H11l-1 8.5 9.5-11.5H13l0-8.5z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 1.5" />
              <path d="M9 2h6" />
            </svg>
          )}
          <span>{scrollMode === 'speed' ? 'Speed' : 'Pace'}</span>
        </button>
      )}

      {/* DURATION-PACED CONTROLS */}
      {scrollMode === 'duration' ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(6px, 1.8vw, 20px)',
            flex: 1,
            minWidth: 0,
          }}
        >
          {onStepDurationSeconds && (
            <button
              type="button"
              onClick={() => onStepDurationSeconds(-30)}
              title="30s shorter"
              aria-label="30 seconds shorter"
              style={{
                minWidth: '40px',
                width: 'clamp(40px, 9vw, 56px)',
                height: '44px',
                borderRadius: '12px',
                border: '1.5px solid #475569',
                background: '#162033',
                color: '#f8fafc',
                fontSize: '22px',
                fontWeight: 800,
                lineHeight: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.12s ease',
              }}
            >
              −
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDurationPicker}
            title="Tap to change song arrangement length"
            style={{
              flex: 1,
              minWidth: '88px',
              minHeight: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 10px',
              borderRadius: '12px',
              backgroundColor: '#131c2e',
              border: '1.5px solid #334155',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(12px, 1.7vw, 17px)',
                fontWeight: 800,
                color: isPlaying ? '#10b981' : '#e2e8f0',
                fontFamily: 'monospace',
              }}
            >
              {displayElapsed} / {displayTarget}
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4EB1CB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>

          {onStepDurationSeconds && (
            <button
              type="button"
              onClick={() => onStepDurationSeconds(30)}
              title="30s longer"
              aria-label="30 seconds longer"
              style={{
                minWidth: '40px',
                width: 'clamp(40px, 9vw, 56px)',
                height: '44px',
                borderRadius: '12px',
                border: '1.5px solid #475569',
                background: '#162033',
                color: '#f8fafc',
                fontSize: '22px',
                fontWeight: 800,
                lineHeight: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.12s ease',
              }}
            >
              +
            </button>
          )}
        </div>
      ) : (
        /* SPEED SLIDER CONTROLS */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(6px, 1.8vw, 20px)',
            flex: 1,
            minWidth: 0,
          }}
        >
          <button
            type="button"
            onClick={() => handleStepSpeed(-1)}
            title="Slower"
            aria-label="Decrease scroll speed"
            style={{
              minWidth: '40px',
              width: 'clamp(40px, 9vw, 56px)',
              height: '44px',
              borderRadius: '12px',
              border: '1.5px solid #475569',
              background: '#162033',
              color: '#f8fafc',
              fontSize: '22px',
              fontWeight: 800,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.12s ease',
            }}
          >
            −
          </button>

          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={speed}
            aria-label="Scroll speed"
            onChange={(e) => onChangeSpeed(parseInt(e.target.value, 10) || 1)}
            style={{
              flex: 1,
              minWidth: '36px',
              width: '100%',
              height: '40px',
              accentColor: '#4EB1CB',
              cursor: 'pointer',
            }}
          />

          <button
            type="button"
            onClick={() => handleStepSpeed(1)}
            title="Faster"
            aria-label="Increase scroll speed"
            style={{
              minWidth: '40px',
              width: 'clamp(40px, 9vw, 56px)',
              height: '44px',
              borderRadius: '12px',
              border: '1.5px solid #475569',
              background: '#162033',
              color: '#f8fafc',
              fontSize: '22px',
              fontWeight: 800,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.12s ease',
            }}
          >
            +
          </button>

          <span
            style={{
              fontSize: 'clamp(12px, 1.8vw, 17px)',
              fontWeight: 800,
              color: speed === 1 ? '#38bdf8' : '#4EB1CB',
              minWidth: '28px',
              textAlign: 'center',
              fontFamily: 'monospace',
              flexShrink: 0,
            }}
          >
            {speed}x
          </span>
        </div>
      )}

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        title="Close Auto-Scroll Bar"
        aria-label="Close Auto-Scroll Bar"
        style={{
          width: 'clamp(36px, 8vw, 44px)',
          height: 'clamp(36px, 8vw, 44px)',
          minWidth: '36px',
          minHeight: '36px',
          borderRadius: '50%',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          background: 'rgba(148, 163, 184, 0.12)',
          color: '#cbd5e1',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
