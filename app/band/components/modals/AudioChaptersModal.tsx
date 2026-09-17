// app/band/components/modals/AudioChaptersModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { AudioMarker } from '../../types/band';

interface AudioChaptersModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: AudioMarker[];
  onSaveMarkers: (markers: AudioMarker[]) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  songTitle?: string;
}

function formatSec(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function parseSec(str: string): number {
  const parts = str.trim().split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return Math.max(0, m * 60 + s);
  }
  const s = parseInt(str, 10);
  return isNaN(s) ? 0 : Math.max(0, s);
}

const COMMON_SECTIONS = [
  'Intro',
  'Verse',
  'Chorus',
  'Interlude',
  'Instrumental',
  'Bridge',
  'Drop',
  'Hold',
  'Outro',
  'Ending',
  'Tag',
];

export const AudioChaptersModal: React.FC<AudioChaptersModalProps> = ({
  isOpen,
  onClose,
  markers,
  onSaveMarkers,
  currentTime,
  duration,
  onSeek,
  songTitle = 'Song',
}) => {
  const [items, setItems] = useState<{ id: string; label: string; timeStr: string; time: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('hgf-modal-open');
      const mapped = (markers || []).map((m, idx) => ({
        id: m.id || `marker-${idx}-${m.time}`,
        label: m.label,
        timeStr: formatSec(m.time),
        time: m.time,
      }));
      setItems(mapped.length > 0 ? mapped : [
        { id: 'marker-0', label: 'Intro', timeStr: '00:00', time: 0 },
        { id: 'marker-1', label: 'Verse', timeStr: formatSec(Math.round(currentTime || 17)), time: Math.round(currentTime || 17) },
      ]);
    } else {
      document.body.classList.remove('hgf-modal-open');
    }
    return () => {
      document.body.classList.remove('hgf-modal-open');
    };
  }, [isOpen, markers]);

  if (!isOpen) return null;

  const handleTimeChange = (id: string, newStr: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, timeStr: newStr, time: parseSec(newStr) } : item))
    );
  };

  const handleSetCurrentTime = (id: string) => {
    const rounded = Math.round(currentTime);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, timeStr: formatSec(rounded), time: rounded } : item
      )
    );
  };

  const handleLabelChange = (id: string, label: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, label } : item)));
  };

  const handleAddChapter = () => {
    const rounded = Math.round(currentTime);
    const newId = `marker-custom-${Date.now()}`;
    const nextItem = {
      id: newId,
      label: 'Verse',
      timeStr: formatSec(rounded),
      time: rounded,
    };
    setItems((prev) => [...prev, nextItem]);
  };

  const handleDeleteChapter = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    const cleaned: AudioMarker[] = items
      .map((item) => ({
        id: item.id,
        label: item.label.trim() || 'Section',
        time: parseSec(item.timeStr),
      }))
      .sort((a, b) => a.time - b.time);

    onSaveMarkers(cleaned);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎵</span>
              <span>Audio Chapter Timings & Cues</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {songTitle} • Total: {formatSec(duration)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 800,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Current Playhead Banner */}
        <div
          style={{
            padding: '10px 18px',
            background: 'rgba(56, 189, 248, 0.08)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              Current Playhead:{' '}
              <strong style={{ color: '#38bdf8', fontSize: '13px' }}>{formatSec(currentTime)}</strong>
            </span>
          </div>
          <button
            onClick={handleAddChapter}
            style={{
              background: '#0284c7',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Add Chapter
          </button>
        </div>

        {/* Chapter List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#131c2e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '8px 10px',
              }}
            >
              {/* Section Index */}
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', width: '18px' }}>
                {idx + 1}
              </span>

              {/* Section Label (editable text input with datalist) */}
              <input
                list={`section-presets-${item.id}`}
                value={item.label}
                onChange={(e) => handleLabelChange(item.id, e.target.value)}
                placeholder="Section name"
                style={{
                  flex: 1,
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  padding: '6px 8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <datalist id={`section-presets-${item.id}`}>
                {COMMON_SECTIONS.map((sec) => (
                  <option key={sec} value={sec} />
                ))}
              </datalist>

              {/* Timestamp Input */}
              <input
                type="text"
                value={item.timeStr}
                onChange={(e) => handleTimeChange(item.id, e.target.value)}
                placeholder="00:00"
                style={{
                  width: '60px',
                  textAlign: 'center',
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  padding: '6px 4px',
                  fontSize: '12px',
                  fontWeight: 800,
                  outline: 'none',
                }}
              />

              {/* Grab Current Playhead 1-Tap Button */}
              <button
                onClick={() => handleSetCurrentTime(item.id)}
                title={`Sync this section to playhead (${formatSec(currentTime)})`}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                📍 {formatSec(currentTime)}
              </button>

              {/* Test Seek */}
              <button
                onClick={() => onSeek(item.time)}
                title="Jump audio to this timestamp"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '5px 7px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ▶
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDeleteChapter(item.id)}
                title="Remove chapter"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: '4px',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '12px' }}>
              No chapters configured. Click <strong>+ Add Chapter</strong> to create markers.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#131c2e',
              color: '#94a3b8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#38bdf8',
              color: '#000',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
            }}
          >
            💾 Save Chapters
          </button>
        </div>
      </div>
    </div>
  );
};
