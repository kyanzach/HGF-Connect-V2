// app/band/components/StageTopBar.tsx
'use client';

import React, { useMemo } from 'react';
import { Setlist, BandUser } from '../types/band';
import { sortSetlistsUpcomingFirst, formatServiceDate, getTodayDateString } from '../lib/sortSetlists';

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
  isUserMD?: boolean;
  onOpenAudioManager: () => void;
  onOpenScratchpad: () => void;
  onOpenAmbientPad: () => void;
  onToggleSidebar: () => void;
  isSessionOverridden?: boolean;
  worshipLeaderKey?: string;
  onRevertKey?: () => void;
  onOpenInstallModal?: () => void;
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
  isUserMD = false,
  onOpenAudioManager,
  onOpenScratchpad,
  onOpenAmbientPad,
  onToggleSidebar,
  isSessionOverridden,
  worshipLeaderKey,
  onRevertKey,
  onOpenInstallModal,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isUpdatingApp, setIsUpdatingApp] = React.useState(false);
  const sortedSetlists = useMemo(() => sortSetlistsUpcomingFirst(setlists), [setlists]);
  const todayStr = useMemo(() => getTodayDateString(), []);

  const handleCopyAndRefresh = async () => {
    const url = 'https://hgfapp.link/chords';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch (_) {}
    setCopiedLink(true);
    setIsUpdatingApp(true);

    try {
      if (typeof window !== 'undefined') {
        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.update().catch(() => {})));
          } catch (_) {}
        }
        if ('caches' in window) {
          try {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          } catch (_) {}
        }
      }
    } catch (_) {}

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 450);
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
      <style>{`
        @keyframes spinRefresh {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
        {/* Left: Sidebar Toggle & Band Emoji */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            onClick={onToggleSidebar}
            title="Toggle Setlist & Songs Library"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: '15px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ☰
          </button>
          <button
            onClick={handleCopyAndRefresh}
            title={
              isUpdatingApp
                ? 'Updating to latest app version...'
                : copiedLink
                ? 'Link copied! Updating app to latest version...'
                : 'HGF Worship Team Setlist & Chords (Tap to copy hgfapp.link/chords & reload/update app)'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: `1px solid ${copiedLink || isUpdatingApp ? '#10b981' : '#2d3f5e'}`,
              background: copiedLink || isUpdatingApp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(78, 177, 203, 0.12)',
              fontSize: '17px',
              cursor: isUpdatingApp ? 'wait' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            {isUpdatingApp ? (
              <span style={{ display: 'inline-block', animation: 'spinRefresh 0.75s linear infinite' }}>🔄</span>
            ) : copiedLink ? (
              '🔗'
            ) : (
              '🎼'
            )}
          </button>
        </div>

        {/* Center: Setlist Dropdown (now has ample room) */}
        <div style={{ flex: 1, minWidth: 0, margin: '0 6px' }}>
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
              padding: '0 8px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <option value="">All Songs</option>
            {sortedSetlists.map((s) => {
              const isUpcoming = Boolean(s.serviceDate && s.serviceDate >= todayStr);
              const dateTag = formatServiceDate(s.serviceDate);
              const hasDateInName = dateTag && s.name.toLowerCase().includes(dateTag.toLowerCase());
              return (
                <option key={s.id} value={s.id}>
                  {isUpcoming ? '✨ ' : '🎼 '}{s.name}{dateTag && !hasDateInName ? ` • ${dateTag}` : ''}{s.leader ? ` (${s.leader})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Right: Install App & Musician Profile Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              title="Install HGF Worship App (Android APK / iPad)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '34px',
                padding: '0 8px',
                borderRadius: '8px',
                background: 'rgba(78, 177, 203, 0.15)',
                border: '1px solid rgba(78, 177, 203, 0.4)',
                color: '#4EB1CB',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span>📲</span>
              <span>App</span>
            </button>
          )}
          <button
            onClick={onOpenAuthModal}
            title={currentUser ? `${currentUser.displayName} (${currentUser.role || 'musician'})` : 'Login'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: currentUser ? 'rgba(78, 177, 203, 0.15)' : '#1e293b',
              border: `1px solid ${currentUser ? '#4EB1CB' : '#334155'}`,
              color: currentUser ? '#4EB1CB' : '#cbd5e1',
              fontSize: '15px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <span>👤</span>
          </button>
        </div>
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
          {isUserMD && (
            <button
              onClick={onOpenAudioManager}
              title="Backing Tracks / Multi-Track Audio (MD Only)"
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
          )}
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
