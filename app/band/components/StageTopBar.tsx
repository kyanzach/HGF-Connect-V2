// app/band/components/StageTopBar.tsx
'use client';

import React from 'react';
import { Setlist, BandUser } from '../types/band';

interface StageTopBarProps {
  currentKey: string;
  displayKey: string;
  onTranspose: (delta: number) => void;
  onOpenKeyPicker: () => void;
  bpm?: number | string | null;
  isMetronomePulsing?: boolean;
  isMetronomeAudioActive?: boolean;
  onToggleMetronomeAudio?: () => void;
  onOpenMetronomeModal?: () => void;
  setlists: Setlist[];
  activeSetlistId: string | null;
  onSelectSetlist: (id: string | null) => void;
  currentUser: BandUser | null;
  onOpenAuthModal: () => void;
  onOpenEditSong: () => void;
  isDrawingActive: boolean;
  onToggleDrawing: () => void;
  onOpenAudioManager: () => void;
  onOpenScratchpad: () => void;
  onOpenAmbientPad: () => void;
  onToggleSidebar: () => void;
  isSessionOverridden?: boolean;
  worshipLeaderKey?: string;
  onRevertKey?: () => void;
}

export const StageTopBar: React.FC<StageTopBarProps> = ({
  displayKey,
  onTranspose,
  onOpenKeyPicker,
  setlists,
  activeSetlistId,
  onSelectSetlist,
  currentUser,
  onOpenAuthModal,
  onOpenEditSong,
  isDrawingActive,
  onToggleDrawing,
  onOpenAudioManager,
  onOpenScratchpad,
  onOpenAmbientPad,
  onToggleSidebar,
  isSessionOverridden,
  worshipLeaderKey,
  onRevertKey,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  const handleCopyShortlink = () => {
    const url = 'https://hgfapp.link/chords';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }).catch(() => {});
    }
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#0a0d14',
        borderBottom: '1px solid #1e293b',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: '12px',
        paddingRight: '12px',
        paddingBottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        userSelect: 'none',
      }}
    >
      {/* ROW 1: BRAND, SETLIST SELECTOR, PROFILE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '8px',
          height: '40px',
        }}
      >
        {/* Left: Sidebar Toggle & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleSidebar}
            title="Toggle Setlist & Songs Library"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ☰
          </button>
          <div
            onClick={handleCopyShortlink}
            title="Tap to copy shortlink (hgfapp.link/chords)"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
          >
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.5px', color: '#fff' }}>
              THE BAND
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: copiedLink ? '#059669' : 'rgba(78, 177, 203, 0.18)',
                color: copiedLink ? '#ffffff' : '#4EB1CB',
                padding: '2px 6px',
                borderRadius: '4px',
                border: `1px solid ${copiedLink ? '#10b981' : 'rgba(78, 177, 203, 0.35)'}`,
                transition: 'all 0.2s ease',
              }}
            >
              {copiedLink ? '🔗 COPIED' : 'CHORDS'}
            </span>
          </div>
        </div>

        {/* Center: Setlist Dropdown */}
        <div style={{ flex: 1, maxWidth: '320px', margin: '0 8px' }}>
          <select
            value={activeSetlistId || ''}
            onChange={(e) => onSelectSetlist(e.target.value ? e.target.value : null)}
            style={{
              width: '100%',
              height: '34px',
              borderRadius: '8px',
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              color: '#e2e8f0',
              padding: '0 10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              textOverflow: 'ellipsis',
            }}
          >
            <option value="">All Songs</option>
            {setlists.map((s) => (
              <option key={s.id} value={s.id}>
                🎼 {s.name} {s.leader ? `(${s.leader})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Musician Profile */}
        <button
          onClick={onOpenAuthModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            background: currentUser ? 'rgba(78, 177, 203, 0.15)' : '#1e293b',
            border: `1px solid ${currentUser ? '#4EB1CB' : '#334155'}`,
            color: currentUser ? '#4EB1CB' : '#cbd5e1',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <span>👤</span>
          <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser ? currentUser.displayName : 'Login'}
          </span>
        </button>
      </div>

      {/* ROW 2: TRANSPOSE WIDGET, LIVE METRONOME PULSE PILL, STAGE ACTIONS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {/* Transpose Stepper */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#131c2e',
            border: '1px solid #2d3f5e',
            borderRadius: '999px',
            padding: '2px',
            gap: '2px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onTranspose(-1)}
            title="Transpose down 1 semitone"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '999px',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            -
          </button>
          <div
            onClick={onOpenKeyPicker}
            title={
              isSessionOverridden && worshipLeaderKey
                ? `Temporary key for this session (Worship Leader Key: ${worshipLeaderKey}). Tap to change or restore.`
                : 'Choose Key / Capo'
            }
            style={{
              padding: '0 10px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 800,
              color: isSessionOverridden ? '#f59e0b' : '#facc15',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>Key: {displayKey}</span>
            {isSessionOverridden && worshipLeaderKey && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onRevertKey?.();
                }}
                title={`Revert to Worship Leader Key (${worshipLeaderKey})`}
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(245, 158, 11, 0.25)',
                  border: '1px solid #f59e0b',
                  color: '#fbbf24',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                WL: {worshipLeaderKey} ↺
              </span>
            )}
          </div>
          <button
            onClick={() => onTranspose(1)}
            title="Transpose up 1 semitone"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '999px',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            +
          </button>
        </div>

        {/* Stage Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={onOpenEditSong}
            title="Edit Song Lyrics & Chords"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 10px',
              height: '34px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>✏️</span>
            <span>Edit</span>
          </button>
          <button
            onClick={onToggleDrawing}
            title="Draw / Annotate with Finger or Apple Pencil"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 10px',
              height: '34px',
              borderRadius: '8px',
              background: isDrawingActive ? 'rgba(78, 177, 203, 0.25)' : '#1e293b',
              border: `1px solid ${isDrawingActive ? '#4EB1CB' : '#334155'}`,
              color: isDrawingActive ? '#4EB1CB' : '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🎨</span>
            <span>Draw</span>
          </button>
          <button
            onClick={onOpenAudioManager}
            title="Backing Tracks / Multi-Track Audio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 10px',
              height: '34px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🎧</span>
            <span>Track</span>
          </button>
          <button
            onClick={() => {
              if (!currentUser) {
                onOpenAuthModal();
              } else {
                onOpenScratchpad();
              }
            }}
            title={currentUser ? "Musician Personal Notes & Scratchpad" : "Login to view & write your musician notes"}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 10px',
              height: '34px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🗒️</span>
            <span>Notes</span>
          </button>
          <button
            onClick={onOpenAmbientPad}
            title="Ambient Worship Pads"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 10px',
              height: '34px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🎹</span>
            <span>Pad</span>
          </button>
        </div>
      </div>
    </header>
  );
};
