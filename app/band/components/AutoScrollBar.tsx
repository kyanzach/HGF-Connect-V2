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
}

export const AutoScrollBar: React.FC<AutoScrollBarProps> = ({
  isVisible,
  isPlaying,
  speed,
  onTogglePlay,
  onChangeSpeed,
  onClose,
}) => {
  if (!isVisible) return null;

  const handleStep = (delta: number) => {
    const next = Math.max(1, Math.min(10, speed + delta));
    onChangeSpeed(next);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 65,
        backgroundColor: '#0c1017',
        border: '1px solid #2d3f5e',
        borderRadius: '999px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85)',
        userSelect: 'none',
        backdropFilter: 'blur(8px)',
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
          transition: 'all 0.15s ease',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Speed Label & Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
          Speed
        </span>

        <button
          onClick={() => handleStep(-1)}
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
            width: '85px',
            accentColor: '#4EB1CB',
            cursor: 'pointer',
          }}
        />

        <button
          onClick={() => handleStep(1)}
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

      <div style={{ width: '1px', height: '18px', backgroundColor: '#334155', margin: '0 2px' }} />

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
        }}
      >
        ✕
      </button>
    </div>
  );
};
