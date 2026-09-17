// app/band/components/modals/SongEditorModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { Song } from '../../types/band';
import { getDiatonicChordsForKey } from '../../lib/musicTheory';

interface SongEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  onSaveSong: (song: Song) => Promise<void>;
  onDeleteSong?: (id: string) => Promise<void>;
  onOpenScraper?: (initialQuery?: string) => void;
}

export const SongEditorModal: React.FC<SongEditorModalProps> = ({
  isOpen,
  onClose,
  song,
  onSaveSong,
  onDeleteSong,
  onOpenScraper,
}) => {
  const [title, setTitle] = useState<string>('');
  const [artist, setArtist] = useState<string>('');
  const [key, setKey] = useState<string>('C');
  const [capo, setCapo] = useState<string>('0');
  const [tempo, setTempo] = useState<string>('72');
  const [timeSignature, setTimeSignature] = useState<string>('4/4');
  const [sectionOrder, setSectionOrder] = useState<string>('');
  const [chords, setChords] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setErrorMessage('');
    if (song) {
      setTitle(song.title || '');
      setArtist(song.artist || '');
      setKey(song.key || 'C');
      setCapo(String(song.capo || 0));
      setTempo(String(song.tempo || 72));
      setTimeSignature(song.timeSignature || '4/4');
      setSectionOrder(song.sectionOrder || '');
      setChords(song.chords || song.lyrics || '');
    } else {
      setTitle('');
      setArtist('');
      setKey('C');
      setCapo('0');
      setTempo('72');
      setTimeSignature('4/4');
      setSectionOrder('');
      setChords('');
    }
  }, [song]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Song title is required.');
      return;
    }
    setErrorMessage('');

    setIsSaving(true);
    try {
      const updated: Song = {
        id: song ? song.id : `song-${Date.now()}`,
        title: title.trim(),
        artist: artist.trim(),
        key,
        originalKey: song?.originalKey || key,
        capo,
        tempo: parseInt(tempo, 10) || 72,
        timeSignature,
        sectionOrder: sectionOrder.trim(),
        chords: chords.trim(),
        updatedAt: Date.now(),
      };
      await onSaveSong(updated);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Cursor-aware chord and tag insertion
  const insertTextAtCursor = (textToInsert: string, isBlockTag: boolean = false) => {
    const el = textareaRef.current;
    if (!el) {
      setChords((prev) => prev + textToInsert);
      return;
    }

    const start = el.selectionStart ?? chords.length;
    const end = el.selectionEnd ?? chords.length;
    const before = chords.substring(0, start);
    const after = chords.substring(end);

    let prefix = '';
    let suffix = '';
    if (isBlockTag) {
      if (start > 0 && before[before.length - 1] !== '\n') prefix = '\n\n';
      if (!after.startsWith('\n')) suffix = '\n';
    }

    const fullInsert = prefix + textToInsert + suffix;
    const nextVal = before + fullInsert + after;
    setChords(nextVal);

    setTimeout(() => {
      if (el) {
        el.focus();
        const nextPos = start + fullInsert.length;
        el.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  const diatonicChords = getDiatonicChordsForKey(key);

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
          maxWidth: '720px',
          maxHeight: '92vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
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
            {song ? `Edit: ${song.title}` : 'Add New Song'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenScraper && (
              <button
                type="button"
                onClick={() => onOpenScraper(title || '')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span>🔍</span>
                <span>Search Chords</span>
              </button>
            )}
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
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {errorMessage && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Row 1: Title & Artist */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                SONG TITLE *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Awesome In This Place"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                ARTIST / AUTHOR
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="e.g. Hillsong"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Row 2: Key, Capo, Tempo, Time Sig */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                KEY
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#facc15',
                  padding: '0 10px',
                  fontSize: '13px',
                  fontWeight: 800,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                CAPO
              </label>
              <input
                type="text"
                value={capo}
                onChange={(e) => setCapo(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                BPM
              </label>
              <input
                type="number"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fbbf24',
                  padding: '0 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                TIME SIG
              </label>
              <input
                type="text"
                value={timeSignature}
                onChange={(e) => setTimeSignature(e.target.value)}
                placeholder="4/4, 6/8, 8/8"
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Section Order */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
              SECTION ORDER ROADMAP (Comma separated)
            </label>
            <input
              type="text"
              value={sectionOrder}
              onChange={(e) => setSectionOrder(e.target.value)}
              placeholder="e.g. Intro, Verse 1, Chorus, Verse 2, Chorus, Bridge, Chorus, Outro"
              style={{
                width: '100%',
                height: '36px',
                borderRadius: '8px',
                background: '#131c2e',
                border: '1px solid #2d3f5e',
                color: '#38bdf8',
                padding: '0 10px',
                fontSize: '13px',
                fontWeight: 600,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Section Cues Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>
                Stage Section Cues (Insert at Cursor)
              </span>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {showGuide ? 'Hide Format Guide' : 'What is ChordPro?'}
              </button>
            </div>

            {showGuide && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  lineHeight: '1.5',
                }}
              >
                <div><strong>ChordPro format:</strong> Place chords in brackets inside lyrics (e.g. <code>[D]Awesome in [G2]this place</code>). It automatically aligns above words and transposes instantly.</div>
                <div style={{ marginTop: '4px' }}><strong>Chords-Over-Lyrics:</strong> Write chord symbols on their own line directly above lyric lines. Both formats are supported!</div>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {['Intro:', 'Verse 1:', 'Verse 2:', 'Chorus:', 'Bridge:', 'Outro:', 'DROP:', 'HOLD:', 'BREAK:', 'STOP:'].map((cue) => (
                <button
                  key={cue}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertTextAtCursor(cue, true)}
                  style={{
                    background: '#101726',
                    border: '1px solid #1e3a5f',
                    color: '#38bdf8',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  +{cue}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Chord Palette (Key-Aware + Insert at Cursor) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                KEY OF {key.toUpperCase()} CHORDS (Insert at Cursor)
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Tap chord to insert at cursor position
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {diatonicChords.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertTextAtCursor(`${c} `, false)}
                  style={{
                    background: '#131c2e',
                    border: '1px solid #334155',
                    color: '#facc15',
                    borderRadius: '5px',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                >
                  +{c}
                </button>
              ))}
            </div>
          </div>

          {/* Chords / Sheet Textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={chords}
              onChange={(e) => setChords(e.target.value)}
              placeholder="Intro:&#10;D  A/D  G2  repeat&#10;&#10;Verse:&#10;D              Dsus4       D       Dsus4&#10;Here in this house of the great king..."
              rows={13}
              style={{
                width: '100%',
                borderRadius: '8px',
                background: '#131c2e',
                border: '1px solid #2d3f5e',
                color: '#f8fafc',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
                lineHeight: '1.5',
                boxSizing: 'border-box',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {song && onDeleteSong ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#f87171',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🗑️ Delete Song
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                background: '#4EB1CB',
                border: 'none',
                color: '#000',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Song'}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="🗑️ Delete Song"
        message={`Are you sure you want to delete "${song?.title}" from the songbook library? This action cannot be undone.`}
        confirmLabel="Delete Song"
        confirmColor="#ef4444"
        loading={isDeleting}
        onConfirm={async () => {
          if (!song || !onDeleteSong) return;
          setIsDeleting(true);
          try {
            await onDeleteSong(song.id);
            setShowDeleteConfirm(false);
            onClose();
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};
