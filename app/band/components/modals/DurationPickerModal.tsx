// app/band/components/modals/DurationPickerModal.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface DurationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDuration?: string;
  songTitle?: string;
  onApplyDuration: (duration: string, savePermanent?: boolean) => void;
  isBandAdmin?: boolean;
}

const PRESETS = ['3:00', '3:30', '4:00', '4:30', '5:00', '5:30', '6:00', '7:00', '8:00'];

export const DurationPickerModal: React.FC<DurationPickerModalProps> = ({
  isOpen,
  onClose,
  currentDuration = '',
  songTitle,
  onApplyDuration,
  isBandAdmin = false,
}) => {
  const [minutes, setMinutes] = useState<number>(4);
  const [seconds, setSeconds] = useState<number>(0);
  const [savePermanent, setSavePermanent] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (currentDuration && currentDuration.includes(':')) {
      const parts = currentDuration.split(':');
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      setMinutes(m);
      setSeconds(s);
    } else if (currentDuration && !isNaN(Number(currentDuration))) {
      const totalSec = Number(currentDuration);
      setMinutes(Math.floor(totalSec / 60));
      setSeconds(totalSec % 60);
    } else {
      setMinutes(4);
      setSeconds(30);
    }
  }, [isOpen, currentDuration]);

  if (!isOpen) return null;

  const handleStepSeconds = (delta: number) => {
    let total = minutes * 60 + seconds + delta;
    if (total < 15) total = 15;
    if (total > 3600) total = 3600; // max 60 mins
    setMinutes(Math.floor(total / 60));
    setSeconds(total % 60);
  };

  const handleSelectPreset = (preset: string) => {
    const [pM, pS] = preset.split(':').map((v) => parseInt(v, 10) || 0);
    setMinutes(pM);
    setSeconds(pS);
  };

  const formatCurrent = () => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const formatted = formatCurrent();
    onApplyDuration(formatted, savePermanent);
    onClose();
  };

  const handleClear = () => {
    onApplyDuration('', savePermanent);
    onClose();
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
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>
              Planned Song Duration
            </div>
            {songTitle && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {songTitle}
              </div>
            )}
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

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Dial / Display */}
          <div
            style={{
              backgroundColor: '#131c2e',
              border: '1px solid #2d3f5e',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Target Arrangement Length
            </div>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '44px',
                fontWeight: 900,
                color: '#4EB1CB',
                lineHeight: 1,
                letterSpacing: '1px',
              }}
            >
              {formatCurrent()}
            </div>

            {/* Quick Adjustment Steppers */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => handleStepSeconds(-30)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                -30s
              </button>
              <button
                onClick={() => handleStepSeconds(-15)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                -15s
              </button>
              <button
                onClick={() => handleStepSeconds(15)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +15s
              </button>
              <button
                onClick={() => handleStepSeconds(30)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +30s
              </button>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
              Quick Presets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {PRESETS.map((preset) => {
                const isSelected = formatCurrent() === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#4EB1CB' : '#1e293b'}`,
                      background: isSelected ? 'rgba(78, 177, 203, 0.2)' : '#131c2e',
                      color: isSelected ? '#4EB1CB' : '#e2e8f0',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save as default checkbox */}
          {isBandAdmin && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#94a3b8',
                cursor: 'pointer',
                marginTop: '-6px',
              }}
            >
              <input
                type="checkbox"
                checked={savePermanent}
                onChange={(e) => setSavePermanent(e.target.checked)}
                style={{ accentColor: '#4EB1CB', cursor: 'pointer' }}
              />
              <span>Save as default duration for this song/setlist</span>
            </label>
          )}

          {/* Bottom Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleClear}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear / Off
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: '#4EB1CB',
                color: '#000',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(78, 177, 203, 0.3)',
              }}
            >
              Set Duration ({formatCurrent()})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
