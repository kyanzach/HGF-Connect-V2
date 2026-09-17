// app/band/components/modals/AmbientPadModal.tsx
'use client';

import React from 'react';
import { ENHARMONIC_KEYS } from '../../lib/musicTheory';

interface AmbientPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  activeKey: string;
  volume: number;
  onPlayPad: (key: string) => void;
  onStopPad: () => void;
  onTogglePad: () => void;
  onChangeVolume: (vol: number) => void;
}

export const AmbientPadModal: React.FC<AmbientPadModalProps> = ({
  isOpen,
  onClose,
  isPlaying,
  activeKey,
  volume,
  onPlayPad,
  onStopPad,
  onTogglePad,
  onChangeVolume,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎹</span> Ambient Worship Pads
          </div>
          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              background: '#1e293b',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Play / Stop Card */}
          <div
            style={{
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#fff' }}>
                Peaceful Pad ({activeKey})
              </div>
              <div style={{ fontSize: '12px', color: isPlaying ? '#10b981' : '#64748b', marginTop: '2px', fontWeight: 600 }}>
                {isPlaying ? '● Audio Active (Smooth Crossfade)' : 'Inactive'}
              </div>
            </div>
            <button
              onClick={onTogglePad}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: isPlaying ? '#ef4444' : '#10b981',
                border: 'none',
                color: '#fff',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {isPlaying ? '⏹ Stop' : '▶ Play'}
            </button>
          </div>

          {/* Volume Control */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
              <span>🔊 PAD VOLUME</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          {/* 12-Key Pad Matrix */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
              SELECT KEY TO CROSSFADE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ENHARMONIC_KEYS.map((k) => {
                const isSelected = activeKey === k.key;
                return (
                  <button
                    key={k.key}
                    onClick={() => onPlayPad(k.key)}
                    style={{
                      height: '42px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected && isPlaying ? '#10b981' : isSelected ? '#38bdf8' : '#1e293b'}`,
                      background: isSelected && isPlaying ? 'rgba(16, 185, 129, 0.25)' : isSelected ? 'rgba(56, 189, 248, 0.15)' : '#131c2e',
                      color: isSelected && isPlaying ? '#34d399' : isSelected ? '#38bdf8' : '#f1f5f9',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {k.display}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
