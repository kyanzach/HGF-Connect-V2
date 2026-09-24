// app/band/components/modals/ScratchpadModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Song, BandUser } from '../../types/band';

interface ScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  currentUser: BandUser | null;
  onOpenAuthModal: () => void;
}

export const ScratchpadModal: React.FC<ScratchpadModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  currentUser,
  onOpenAuthModal,
}) => {
  const [personalNotes, setPersonalNotes] = useState<string>('');
  const [mdGlobalCue, setMdGlobalCue] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const isMd = currentUser?.role === 'MD';

  const fetchNotes = async () => {
    if (!currentSong || !currentUser) return;
    try {
      const res = await fetch(
        `/api/worship/scratch?songId=${encodeURIComponent(currentSong.id)}&userId=${encodeURIComponent(currentUser.id)}`
      );
      if (res.ok) {
        const data = await res.json();
        setMdGlobalCue(data.mdNote?.text || currentSong.notes || '');
        setPersonalNotes(data.userNote?.text || '');
      }
    } catch (_) {
      // Fallback to local storage per user
      const local = localStorage.getItem(`hgf_scratch_${currentUser.id}_${currentSong.id}`);
      if (local) setPersonalNotes(local);
    }
  };

  useEffect(() => {
    if (isOpen && currentSong && currentUser) {
      fetchNotes();
      setSaveSuccess(false);
    }
  }, [isOpen, currentSong, currentUser]);

  if (!isOpen || !currentSong) return null;

  // If not logged in, prompt user to log in to access per-user notes
  if (!currentUser) {
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
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
          <div style={{ fontWeight: 800, fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
            Musician Login Required
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '20px' }}>
            Musician notes are stored privately per user. Please log in or select your band profile to view and write your personal cues.
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
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
              onClick={() => {
                onClose();
                onOpenAuthModal();
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#4EB1CB',
                border: 'none',
                color: '#000',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Log In Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save personal note
      await fetch('/api/worship/scratch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: currentSong.id,
          userId: currentUser.id,
          text: personalNotes.trim(),
          isMdGlobal: false,
        }),
      });

      // Cache locally
      localStorage.setItem(`hgf_scratch_${currentUser.id}_${currentSong.id}`, personalNotes.trim());

      // 2. If MD, also save global cue
      if (isMd) {
        await fetch('/api/worship/scratch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId: currentSong.id,
            userId: currentUser.id,
            authorName: currentUser.displayName,
            text: mdGlobalCue.trim(),
            isMdGlobal: true,
          }),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
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
          overflow: 'hidden',
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
            <span>🗒️</span> Musician Notes — {currentUser.displayName}
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

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>SONG:</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>{currentSong.title}</div>
          </div>

          {/* Section 1: Band / MD Global Cue */}
          <div
            style={{
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              borderRadius: '10px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                💡 Band Cue (Visible to Everyone)
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>
                {isMd ? 'Editable by MD (Ren)' : 'Set by MD (Ren)'}
              </span>
            </div>
            {isMd ? (
              <textarea
                value={mdGlobalCue}
                onChange={(e) => setMdGlobalCue(e.target.value)}
                placeholder="e.g. Tender acoustic intro. Full band explodes on Bridge..."
                rows={2}
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  background: '#0a0d14',
                  border: '1px solid #334155',
                  color: '#fff',
                  padding: '8px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            ) : (
              <div style={{ fontSize: '13px', color: mdGlobalCue ? '#f8fafc' : '#64748b', fontStyle: mdGlobalCue ? 'normal' : 'italic', minHeight: '28px' }}>
                {mdGlobalCue || 'No band cue provided for this song.'}
              </div>
            )}
          </div>

          {/* Section 2: Personal Private Musician Notes */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4EB1CB', textTransform: 'uppercase' }}>
                🔒 My Private Musician Notes (@{currentUser.username})
              </span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Only you can see this</span>
            </div>
            <textarea
              value={personalNotes}
              onChange={(e) => setPersonalNotes(e.target.value)}
              placeholder="Your personal tone settings, intro cues, pickup chords, pedal markings..."
              rows={6}
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
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
            {saveSuccess && (
              <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
                ✓ Saved to your profile!
              </span>
            )}
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
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: saveSuccess ? '#10b981' : '#4EB1CB',
                border: 'none',
                color: saveSuccess ? '#fff' : '#000',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
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
