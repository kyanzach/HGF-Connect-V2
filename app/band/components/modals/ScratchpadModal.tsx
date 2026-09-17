// app/band/components/modals/ScratchpadModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Song, BandUser, ScratchpadNote } from '../../types/band';

interface ScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  currentUser: BandUser | null;
}

export const ScratchpadModal: React.FC<ScratchpadModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  currentUser,
}) => {
  const [content, setContent] = useState<string>('');
  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchNotes = async () => {
    if (!currentSong) return;
    try {
      const res = await fetch(`/api/worship/scratch?songId=${encodeURIComponent(currentSong.id)}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen && currentSong) {
      fetchNotes();
      setContent(currentSong.notes || '');
    }
  }, [isOpen, currentSong]);

  if (!isOpen || !currentSong) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/worship/scratch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: currentSong.id,
          userId: currentUser?.id || 'guest',
          userName: currentUser?.displayName || 'Musician',
          userRole: currentUser?.role || 'band',
          content: content.trim(),
        }),
      });
      await fetchNotes();
      onClose();
    } finally {
      setIsSaving(false);
    }
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
          maxWidth: '520px',
          maxHeight: '90vh',
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
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🗒️</span> Musician Notes & Scratchpad
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

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>SONG:</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>{currentSong.title}</div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write personal cues, tone settings, intro arrangement reminders..."
            rows={8}
            style={{
              width: '100%',
              borderRadius: '8px',
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              color: '#fff',
              padding: '12px',
              fontSize: '13px',
              lineHeight: '1.5',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '12px',
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
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#4EB1CB',
                border: 'none',
                color: '#000',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
