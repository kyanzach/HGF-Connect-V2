// app/band/components/modals/KeyPickerModal.tsx
'use client';

import React from 'react';
import { ENHARMONIC_KEYS, KEY_DISPLAY_MAP } from '../../lib/musicTheory';

interface KeyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  capo: number | string;
  onSelectKey: (key: string) => void;
  onSelectCapo: (capo: number) => void;
  isBandAdmin?: boolean;
  onSaveAsMdKey?: () => void;
}

export const KeyPickerModal: React.FC<KeyPickerModalProps> = ({
  isOpen,
  onClose,
  currentKey,
  capo,
  onSelectKey,
  onSelectCapo,
  isBandAdmin,
  onSaveAsMdKey,
}) => {
  if (!isOpen) return null;

  const activeCapo = parseInt(String(capo), 10) || 0;
  const rootKey = currentKey.replace('m', '');

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
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>
            Choose Key & Capo
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
          {/* 12 Key Grid */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
              PITCH / KEY
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              {ENHARMONIC_KEYS.map((k) => {
                const isSelected = rootKey === k.key;
                return (
                  <button
                    key={k.key}
                    onClick={() => onSelectKey(k.key)}
                    style={{
                      height: '42px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#facc15' : '#1e293b'}`,
                      background: isSelected ? 'rgba(250, 204, 21, 0.2)' : '#131c2e',
                      color: isSelected ? '#facc15' : '#f1f5f9',
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

          {/* Capo Stepper */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
              GUITAR CAPO (FRET)
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
                const isSelected = activeCapo === c;
                return (
                  <button
                    key={c}
                    onClick={() => onSelectCapo(c)}
                    style={{
                      flex: 1,
                      minWidth: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                      background: isSelected ? 'rgba(56, 189, 248, 0.2)' : '#131c2e',
                      color: isSelected ? '#38bdf8' : '#cbd5e1',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {c === 0 ? 'None' : c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MD Official Key Persistence */}
          {isBandAdmin && onSaveAsMdKey && (
            <button
              onClick={() => {
                onSaveAsMdKey();
                onClose();
              }}
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid #f59e0b',
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                marginTop: '4px',
              }}
            >
              ⭐ Save as Official Worship Leader Key for Setlist
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
