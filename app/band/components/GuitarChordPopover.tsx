// app/band/components/GuitarChordPopover.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getGuitarChordData, playGuitarVoicing, GuitarVoicing } from '../lib/guitarChords';

interface GuitarChordPopoverProps {
  chordName: string | null;
  onClose: () => void;
}

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
const STRING_WIDTHS = [2.2, 1.9, 1.65, 1.4, 1.2, 1.0];

export const GuitarChordPopover: React.FC<GuitarChordPopoverProps> = ({ chordName, onClose }) => {
  const [voicingIdx, setVoicingIdx] = useState<number>(0);
  const [ringingStrings, setRingingStrings] = useState<Record<number, boolean>>({});
  const [isPlayingMode, setIsPlayingMode] = useState<'strum' | 'arpeggio' | null>(null);
  const cancelAudioRef = useRef<(() => void) | null>(null);
  const clearGlowTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const chordData = chordName ? getGuitarChordData(chordName) : null;

  useEffect(() => {
    setVoicingIdx(0);
    setRingingStrings({});
    setIsPlayingMode(null);
  }, [chordName]);

  useEffect(() => {
    if (!chordName) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      cancelAudioRef.current?.();
      clearGlowTimersRef.current.forEach(clearTimeout);
      clearGlowTimersRef.current = [];
    };
  }, [chordName, onClose]);

  if (!chordName || !chordData) return null;

  const safeIdx = Math.min(voicingIdx, chordData.voicings.length - 1);
  const voicing: GuitarVoicing = chordData.voicings[safeIdx];
  const totalVoicings = chordData.voicings.length;

  const triggerPlay = (mode: 'strum' | 'arpeggio') => {
    cancelAudioRef.current?.();
    clearGlowTimersRef.current.forEach(clearTimeout);
    clearGlowTimersRef.current = [];
    setRingingStrings({});
    setIsPlayingMode(mode);

    cancelAudioRef.current = playGuitarVoicing(voicing, mode, (sIdx) => {
      setRingingStrings((prev) => ({ ...prev, [sIdx]: true }));
      const t = setTimeout(() => {
        setRingingStrings((prev) => ({ ...prev, [sIdx]: false }));
      }, 650);
      clearGlowTimersRef.current.push(t);
    });

    const doneTimer = setTimeout(() => {
      setIsPlayingMode(null);
    }, mode === 'arpeggio' ? 1100 : 520);
    clearGlowTimersRef.current.push(doneTimer);
  };

  // SVG Fretboard Geometry
  const fretCount = 4;
  const padLeft = 30;
  const padTop = 26;
  const gridW = 140;
  const gridH = 128;
  const stringStep = gridW / 5;
  const fretStep = gridH / fretCount;

  return (
    <>
      {/* Backdrop */}
      <div
        data-interactive="true"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(3, 7, 15, 0.62)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Signature HGF Dark-Glass Chord Card */}
        <div
          data-interactive="true"
          role="dialog"
          aria-label={`Guitar chord diagram for ${chordData.symbol}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(310px, 90vw)',
            background: 'linear-gradient(180deg, #10192b 0%, #0a101b 100%)',
            border: '1px solid rgba(78, 177, 203, 0.38)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 24px 56px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.03) inset',
            userSelect: 'none',
            color: '#f8fafc',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                  {chordData.symbol}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    color: '#4EB1CB',
                    background: 'rgba(78, 177, 203, 0.14)',
                    border: '1px solid rgba(78, 177, 203, 0.32)',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {voicing.label}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px', fontWeight: 600 }}>
                {chordData.displayName}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close chord diagram"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                border: '1px solid #1e293b',
                background: '#131c2e',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Interactive SVG Guitar Fretboard */}
          <div
            onClick={() => triggerPlay('strum')}
            title="Tap fretboard to strum"
            style={{
              background: '#080d16',
              border: '1px solid #1a263b',
              borderRadius: '14px',
              padding: '10px 8px 8px',
              display: 'flex',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              width={gridW + padLeft + 24}
              height={gridH + padTop + 26}
              viewBox={`0 0 ${gridW + padLeft + 24} ${gridH + padTop + 26}`}
              aria-hidden="true"
            >
              {/* Fretboard Wood Surface */}
              <rect
                x={padLeft}
                y={padTop}
                width={gridW}
                height={gridH}
                rx={4}
                fill="#111a2b"
              />

              {/* Top Nut (baseFret === 1) or Fret Position Label */}
              {voicing.baseFret === 1 ? (
                <rect x={padLeft - 1} y={padTop - 3} width={gridW + 2} height={5} rx={2} fill="#cbd5e1" />
              ) : (
                <text
                  x={padLeft - 10}
                  y={padTop + fretStep * 0.5 + 4}
                  textAnchor="end"
                  fill="#4EB1CB"
                  fontSize="11"
                  fontWeight="800"
                >
                  {voicing.baseFret}fr
                </text>
              )}

              {/* Horizontal Fret Wires */}
              {Array.from({ length: fretCount + 1 }).map((_, fIdx) => (
                <line
                  key={`fret-${fIdx}`}
                  x1={padLeft}
                  y1={padTop + fIdx * fretStep}
                  x2={padLeft + gridW}
                  y2={padTop + fIdx * fretStep}
                  stroke={fIdx === 0 && voicing.baseFret === 1 ? '#cbd5e1' : '#2a3a54'}
                  strokeWidth={fIdx === 0 ? 1.6 : 1.2}
                />
              ))}

              {/* Vertical Guitar Strings */}
              {STRING_LABELS.map((label, sIdx) => {
                const x = padLeft + sIdx * stringStep;
                const isRinging = Boolean(ringingStrings[sIdx]);
                const fret = voicing.frets[sIdx];
                return (
                  <g key={`str-${sIdx}`}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + gridH}
                      stroke={isRinging ? '#4EB1CB' : fret < 0 ? '#243147' : '#536582'}
                      strokeWidth={isRinging ? STRING_WIDTHS[sIdx] + 1.1 : STRING_WIDTHS[sIdx]}
                      style={{ transition: 'stroke 0.12s ease' }}
                    />
                    {/* Open (o) or Muted (x) Indicator above nut */}
                    {fret === 0 && (
                      <circle
                        cx={x}
                        cy={padTop - 13}
                        r={4.5}
                        fill="none"
                        stroke={isRinging ? '#4EB1CB' : '#94a3b8'}
                        strokeWidth={1.7}
                      />
                    )}
                    {fret < 0 && (
                      <g stroke="#64748b" strokeWidth={1.6} strokeLinecap="round">
                        <line x1={x - 3.6} y1={padTop - 16.6} x2={x + 3.6} y2={padTop - 9.4} />
                        <line x1={x + 3.6} y1={padTop - 16.6} x2={x - 3.6} y2={padTop - 9.4} />
                      </g>
                    )}
                    {/* Bottom String Name */}
                    <text
                      x={x}
                      y={padTop + gridH + 17}
                      textAnchor="middle"
                      fill={isRinging ? '#4EB1CB' : '#64748b'}
                      fontSize="10.5"
                      fontWeight="700"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Barre Bars */}
              {voicing.barres?.map((b, bIdx) => {
                const relFret = b.fret - voicing.baseFret + 1;
                if (relFret < 1 || relFret > fretCount) return null;
                const x1 = padLeft + b.fromString * stringStep;
                const x2 = padLeft + b.toString * stringStep;
                const y = padTop + (relFret - 0.5) * fretStep;
                return (
                  <rect
                    key={`barre-${bIdx}`}
                    x={x1 - 9}
                    y={y - 9}
                    width={x2 - x1 + 18}
                    height={18}
                    rx={9}
                    fill="rgba(78, 177, 203, 0.28)"
                    stroke="#4EB1CB"
                    strokeWidth={1.6}
                  />
                );
              })}

              {/* Finger Dots */}
              {voicing.frets.map((fret, sIdx) => {
                if (fret <= 0) return null;
                const relFret = fret - voicing.baseFret + 1;
                if (relFret < 1 || relFret > fretCount) return null;
                const cx = padLeft + sIdx * stringStep;
                const cy = padTop + (relFret - 0.5) * fretStep;
                const finger = voicing.fingers[sIdx];
                const isRinging = Boolean(ringingStrings[sIdx]);
                return (
                  <g key={`dot-${sIdx}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={9.5}
                      fill={isRinging ? '#4EB1CB' : '#f59e0b'}
                      stroke="#0a101b"
                      strokeWidth={1.5}
                    />
                    {finger > 0 && (
                      <text
                        x={cx}
                        y={cy + 3.8}
                        textAnchor="middle"
                        fill="#0a0d14"
                        fontSize="10.5"
                        fontWeight="900"
                      >
                        {finger}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Voicing Switcher */}
          {totalVoicings > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginTop: '12px',
              }}
            >
              <button
                type="button"
                onClick={() => setVoicingIdx((prev) => (prev - 1 + totalVoicings) % totalVoicings)}
                aria-label="Previous voicing"
                style={{
                  width: '36px',
                  height: '34px',
                  borderRadius: '9px',
                  border: '1px solid #26354d',
                  background: '#131c2e',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                Shape {safeIdx + 1} of {totalVoicings}
              </span>
              <button
                type="button"
                onClick={() => setVoicingIdx((prev) => (prev + 1) % totalVoicings)}
                aria-label="Next voicing"
                style={{
                  width: '36px',
                  height: '34px',
                  borderRadius: '9px',
                  border: '1px solid #26354d',
                  background: '#131c2e',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}

          {/* Audio Playback Actions: Strum + Arpeggio */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => triggerPlay('strum')}
              style={{
                flex: 1.3,
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: isPlayingMode === 'strum' ? '#67e8f9' : '#4EB1CB',
                color: '#061018',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <span>Strum</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPlay('arpeggio')}
              style={{
                flex: 1,
                height: '40px',
                borderRadius: '10px',
                border: `1px solid ${isPlayingMode === 'arpeggio' ? '#4EB1CB' : '#26354d'}`,
                background: isPlayingMode === 'arpeggio' ? 'rgba(78, 177, 203, 0.18)' : '#131c2e',
                color: isPlayingMode === 'arpeggio' ? '#67e8f9' : '#e2e8f0',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>Pick</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
