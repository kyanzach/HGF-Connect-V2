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
  onCopyProPresenter?: () => void;
  isCopiedProPresenter?: boolean;
  isCleaningProPresenter?: boolean;
  hasSavedProPresenterLyrics?: boolean;
  onReCleanProPresenter?: () => void;
  showStageTools?: boolean;
  onToggleStageTools?: () => void;
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
  onCopyProPresenter,
  isCopiedProPresenter = false,
  isCleaningProPresenter = false,
  hasSavedProPresenterLyrics = false,
  onReCleanProPresenter,
  showStageTools = false,
  onToggleStageTools,
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
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
        paddingLeft: '14px',
        paddingRight: '14px',
        paddingBottom: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes spinRefresh {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      {/* ROW 1: BURGER, OFFICIAL HGF LOGO, SETLIST SELECTOR, APP & PROFILE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '10px',
          minHeight: '42px',
        }}
      >
        {/* Left: Proper SVG Hamburger Menu & Official HGF Connect Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Toggle Setlist & Songs Library"
            aria-label="Open setlist and songs menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleCopyAndRefresh}
            title={
              isUpdatingApp
                ? 'Updating to latest app version...'
                : copiedLink
                ? 'Link copied! Updating app to latest version...'
                : 'HGF Worship Team Setlist & Chords (Tap to copy hgfapp.link/chords & reload/update app)'
            }
            aria-label="Copy link and refresh HGF Connect"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: '10px',
              border: `1px solid ${copiedLink || isUpdatingApp ? '#10b981' : '#2d3f5e'}`,
              background: copiedLink || isUpdatingApp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(78, 177, 203, 0.12)',
              cursor: isUpdatingApp ? 'wait' : 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease',
              overflow: 'hidden',
            }}
          >
            {isUpdatingApp ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ animation: 'spinRefresh 0.75s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            ) : copiedLink ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <img
                src="/HGF-icon-v1.0.png"
                alt="HGF Connect"
                style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px' }}
              />
            )}
          </button>
        </div>

        {/* Center: Setlist Dropdown */}
        <div style={{ flex: 1, minWidth: 0, margin: '0 4px' }}>
          <select
            value={activeSetlistId || ''}
            onChange={(e) => onSelectSetlist(e.target.value ? e.target.value : null)}
            aria-label="Select setlist"
            style={{
              width: '100%',
              height: '40px',
              borderRadius: '10px',
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              color: '#e2e8f0',
              padding: '0 10px',
              fontSize: '13px',
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
                  {isUpcoming ? '★ ' : ''}{s.name}{dateTag && !hasDateInName ? ` • ${dateTag}` : ''}{s.leader ? ` (${s.leader})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Right: Install App & Musician Profile Icon (generous gap to prevent mis-taps) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {onOpenInstallModal && (
            <button
              type="button"
              onClick={onOpenInstallModal}
              title="Install HGF Worship App (Android APK / iPad)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '40px',
                padding: '0 12px',
                borderRadius: '10px',
                background: 'rgba(78, 177, 203, 0.15)',
                border: '1px solid rgba(78, 177, 203, 0.45)',
                color: '#4EB1CB',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
              <span>App</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAuthModal}
            title={currentUser ? `${currentUser.displayName} (${currentUser.role || 'musician'})` : 'Login'}
            aria-label={currentUser ? `Account: ${currentUser.displayName}` : 'Login'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: currentUser ? 'rgba(78, 177, 203, 0.16)' : '#1e293b',
              border: `1.5px solid ${currentUser ? '#4EB1CB' : '#334155'}`,
              color: currentUser ? '#4EB1CB' : '#cbd5e1',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onOpenEditSong}
            title="Edit Song Lyrics & Chords"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 11px',
              height: '36px',
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={onOpenAmbientPad}
            title="Ambient Worship Pads"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 11px',
              height: '36px',
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M6 5v8M10 5v8M14 5v8M18 5v8" />
            </svg>
            <span>Pad</span>
          </button>
          {onToggleStageTools && (
            <button
              type="button"
              onClick={onToggleStageTools}
              title={showStageTools ? 'Hide stage tools dock' : 'Show stage tools (BPM, Chords, Font Size)'}
              aria-label={showStageTools ? 'Hide stage tools' : 'Show stage tools'}
              aria-pressed={showStageTools}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '36px',
                borderRadius: '8px',
                background: showStageTools ? 'rgba(78, 177, 203, 0.22)' : '#1e293b',
                border: `1px solid ${showStageTools ? '#4EB1CB' : '#334155'}`,
                color: showStageTools ? '#4EB1CB' : '#cbd5e1',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleDrawing}
            title="Draw / Annotate with Finger or Apple Pencil"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 11px',
              height: '36px',
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            </svg>
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={onOpenAudioManager}
            title="Backing Tracks & Audio Manager (Cloud Server / Device)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 11px',
              height: '36px',
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <span>Track</span>
          </button>
          <button
            type="button"
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
              gap: '6px',
              padding: '0 11px',
              height: '36px',
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
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M8 13h8M8 17h6" />
            </svg>
            <span>Notes</span>
          </button>
          {onCopyProPresenter && (
            <div style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={onCopyProPresenter}
                disabled={isCleaningProPresenter}
                title={
                  isCleaningProPresenter
                    ? 'AI is cleaning chords, asterisks, and dynamics notes...'
                    : isCopiedProPresenter
                    ? 'Copied to clipboard! In ProPresenter 7, go to File > Import > Text from Clipboard.'
                    : hasSavedProPresenterLyrics
                    ? 'Copy AI-cleaned lyrics formatted for ProPresenter 7 (Saved on server).'
                    : '1-click: Clean with AI, save to server, & copy formatted for ProPresenter 7'
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 11px',
                  height: '36px',
                  borderRadius: hasSavedProPresenterLyrics && onReCleanProPresenter ? '8px 0 0 8px' : '8px',
                  background: isCleaningProPresenter
                    ? 'rgba(78, 177, 203, 0.22)'
                    : isCopiedProPresenter
                    ? 'rgba(16, 185, 129, 0.2)'
                    : hasSavedProPresenterLyrics
                    ? 'rgba(56, 189, 248, 0.12)'
                    : '#1e293b',
                  border: `1px solid ${
                    isCleaningProPresenter
                      ? '#4EB1CB'
                      : isCopiedProPresenter
                      ? '#10b981'
                      : hasSavedProPresenterLyrics
                      ? '#38bdf8'
                      : '#334155'
                  }`,
                  color: isCleaningProPresenter
                    ? '#4EB1CB'
                    : isCopiedProPresenter
                    ? '#10b981'
                    : hasSavedProPresenterLyrics
                    ? '#38bdf8'
                    : '#f8fafc',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: isCleaningProPresenter ? 'wait' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s ease',
                  opacity: isCleaningProPresenter ? 0.85 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>
                  {isCleaningProPresenter
                    ? 'Cleaning...'
                    : isCopiedProPresenter
                    ? 'Copied Pro7'
                    : hasSavedProPresenterLyrics
                    ? 'ProPresenter'
                    : 'AI Pro7'}
                </span>
              </button>
              {hasSavedProPresenterLyrics && onReCleanProPresenter && !isCleaningProPresenter && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReCleanProPresenter();
                  }}
                  title="Re-clean lyrics with AI and update saved version"
                  aria-label="Re-clean ProPresenter lyrics"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '36px',
                    borderRadius: '0 8px 8px 0',
                    border: '1px solid #38bdf8',
                    borderLeft: 'none',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
