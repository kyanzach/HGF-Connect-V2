// app/band/components/modals/MetronomeModal.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MetronomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  timeSignature?: string;
  onTimeSignatureChange?: (newSig: string) => void;
  isAudioActive: boolean;
  onToggleAudio: () => void;
  isPulsing: boolean;
}

export const MetronomeModal: React.FC<MetronomeModalProps> = ({
  isOpen,
  onClose,
  bpm,
  onBpmChange,
  timeSignature: externalSig,
  onTimeSignatureChange,
  isAudioActive,
  onToggleAudio,
  isPulsing,
}) => {
  const [internalSig, setInternalSig] = useState<string>('4/4');
  const timeSignature = externalSig || internalSig;

  const setTimeSignature = (sig: string) => {
    setInternalSig(sig);
    if (onTimeSignatureChange) onTimeSignatureChange(sig);
  };

  const [isCustomSig, setIsCustomSig] = useState<boolean>(false);
  const [customSigInput, setCustomSigInput] = useState<string>('');
  const [metronomeVolume, setMetronomeVolume] = useState<number>(0.8);
  const tapTimesRef = useRef<number[]>([]);
  const [tapDisplay, setTapDisplay] = useState<string>('TAP');

  useEffect(() => {
    const presets = ['4/4', '3/4', '6/8', '8/8'];
    if (timeSignature && !presets.includes(timeSignature)) {
      setIsCustomSig(true);
      setCustomSigInput(timeSignature);
    }
  }, [timeSignature]);

  if (!isOpen) return null;

  const adjustBpm = (delta: number) => {
    const next = Math.max(30, Math.min(260, bpm + delta));
    onBpmChange(next);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const taps = tapTimesRef.current.filter((t) => now - t < 3000); // keep taps within 3 seconds
    taps.push(now);
    tapTimesRef.current = taps;

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 0) {
        const calculatedBpm = Math.round(60000 / avgInterval);
        const clamped = Math.max(30, Math.min(260, calculatedBpm));
        onBpmChange(clamped);
        setTapDisplay(`${clamped}`);
      }
    } else {
      setTapDisplay('TAP...');
    }

    setTimeout(() => {
      setTapDisplay('TAP');
    }, 1200);
  };

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
          maxWidth: '420px',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
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
            background: '#101726',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔔</span> Stage Metronome
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

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* BPM Display & Pulse */}
          <div
            style={{
              background: isPulsing ? 'rgba(245, 158, 11, 0.2)' : '#131c2e',
              border: `1px solid ${isPulsing ? '#f59e0b' : '#2d3f5e'}`,
              borderRadius: '12px',
              padding: '18px',
              textAlign: 'center',
              transition: 'background-color 0.08s ease, border-color 0.08s ease',
            }}
          >
            <div style={{ fontSize: '48px', fontWeight: 900, color: '#f59e0b', letterSpacing: '-1px', lineHeight: 1 }}>
              {bpm}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginTop: '4px', letterSpacing: '1px' }}>
              BEATS PER MINUTE ({timeSignature})
            </div>
          </div>

          {/* Quick Adjustment Buttons */}
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {[-5, -1, 1, 5].map((delta) => (
              <button
                key={delta}
                onClick={() => adjustBpm(delta)}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
          </div>

          {/* BPM Slider */}
          <div>
            <input
              type="range"
              min="30"
              max="260"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value, 10) || 72)}
              style={{ width: '100%', accentColor: '#f59e0b', cursor: 'pointer' }}
            />
          </div>

          {/* Tap Tempo & Time Signature Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Tap Tempo */}
            <button
              onClick={handleTapTempo}
              style={{
                height: '46px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                border: '1px solid #475569',
                color: '#f8fafc',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>👆</span> {tapDisplay}
            </button>

            {/* Time Signature Presets + Custom Button */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['4/4', '3/4', '6/8', '8/8'] as const).map((sig) => (
                <button
                  key={sig}
                  onClick={() => {
                    setIsCustomSig(false);
                    setTimeSignature(sig);
                  }}
                  style={{
                    flex: 1,
                    borderRadius: '8px',
                    border: `1px solid ${!isCustomSig && timeSignature === sig ? '#f59e0b' : '#334155'}`,
                    background: !isCustomSig && timeSignature === sig ? 'rgba(245, 158, 11, 0.2)' : '#1e293b',
                    color: !isCustomSig && timeSignature === sig ? '#f59e0b' : '#cbd5e1',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '0',
                  }}
                >
                  {sig}
                </button>
              ))}
              <button
                onClick={() => setIsCustomSig(!isCustomSig)}
                style={{
                  borderRadius: '8px',
                  border: `1px solid ${isCustomSig ? '#38bdf8' : '#334155'}`,
                  background: isCustomSig ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                  color: isCustomSig ? '#38bdf8' : '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '0 8px',
                }}
                title="Input Custom Time Signature"
              >
                ✏️
              </button>
            </div>
          </div>

          {/* Custom Time Signature Input row if active */}
          {isCustomSig && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#131c2e', padding: '8px 12px', borderRadius: '8px', border: '1px solid #2d3f5e' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>Custom Time Sig:</span>
              <input
                type="text"
                value={customSigInput}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setCustomSigInput(val);
                  if (val) setTimeSignature(val);
                }}
                placeholder="e.g. 5/4, 7/8, 12/8, 2/4"
                style={{
                  flex: 1,
                  height: '30px',
                  borderRadius: '6px',
                  background: '#0c1017',
                  border: '1px solid #38bdf8',
                  color: '#fff',
                  padding: '0 8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* Audio Click Toggle */}
          <button
            onClick={onToggleAudio}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              background: isAudioActive ? '#ef4444' : '#10b981',
              border: 'none',
              color: '#fff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{isAudioActive ? '🔇' : '🔔'}</span>
            <span>{isAudioActive ? 'Mute Metronome Click' : 'Start Audio Click (Sound ON)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
