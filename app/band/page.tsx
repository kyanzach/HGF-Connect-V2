// app/band/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { useSetlist } from './hooks/useSetlist';
import { useMusicTheory } from './hooks/useMusicTheory';
import { useMetronome } from './hooks/useMetronome';
import { useAmbientPad } from './hooks/useAmbientPad';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useFootPedal } from './hooks/useFootPedal';
import { transposeNote } from './lib/musicTheory';

import { StageTopBar } from './components/StageTopBar';
import { SongSheet } from './components/SongSheet';
import { SetlistSidebar } from './components/SetlistSidebar';
import { DrawingCanvas } from './components/DrawingCanvas';
import { AudioPlaybackDock } from './components/AudioPlaybackDock';
import { NavigationDock } from './components/NavigationDock';
import { AutoScrollBar } from './components/AutoScrollBar';

import { SongEditorModal } from './components/modals/SongEditorModal';
import { KeyPickerModal } from './components/modals/KeyPickerModal';
import { AmbientPadModal } from './components/modals/AmbientPadModal';
import { AudioStorageModal } from './components/modals/AudioStorageModal';
import { SetlistAdminModal } from './components/modals/SetlistAdminModal';
import { ScratchpadModal } from './components/modals/ScratchpadModal';
import { BandAuthModal } from './components/modals/BandAuthModal';
import { BandAdminModal } from './components/modals/BandAdminModal';
import { MetronomeModal } from './components/modals/MetronomeModal';
import { SongScraperModal } from './components/modals/SongScraperModal';

import { BandUser, Song, Setlist, AudioTrack, DrawingStroke } from './types/band';

export default function BandStagePage() {
  const {
    songs,
    setlists,
    activeSetlist,
    activeSetlistId,
    currentSong,
    currentLineup,
    currentIndex,
    isLoading,
    selectSong,
    selectSetlist,
    nextSong,
    prevSong,
    setSongSessionKey,
    setSongSessionOverride,
    revertToMdDefault,
    activeSongMdDefaults,
    isCurrentSongSessionOverridden,
    resetAllSessionOverrides,
    addSongToSetlist,
    removeSongFromSetlist,
    refreshData,
  } = useSetlist();

  const {
    transposeOffset,
    capo,
    setCapo,
    effectiveKey,
    displayKey,
    transpose,
    setTargetKey,
    resetTranspose,
    parsedLines,
  } = useMusicTheory(currentSong);

  const {
    tempo,
    setTempo,
    timeSignature: metronomeSignature,
    setTimeSignature: setMetronomeSignature,
    isPulsing,
    isAudioActive: isMetronomeAudioActive,
    toggleAudio: toggleMetronomeAudio,
  } = useMetronome(currentSong?.tempo ? Number(currentSong.tempo) : 72, currentSong?.timeSignature || '4/4');

  const {
    isPlaying: isPadPlaying,
    isFadingOut: isPadFadingOut,
    currentKey: activePadKey,
    volume: padVolume,
    play: playPad,
    stop: stopPad,
    toggle: togglePad,
    selectKey: selectPadKey,
    setVolume: setPadVolume,
  } = useAmbientPad();

  const {
    hasAudio,
    isPlaying: isBacktrackPlaying,
    currentTime: backtrackCurrentTime,
    duration: backtrackDuration,
    togglePlay: toggleBacktrackPlay,
    seek: seekBacktrack,
  } = useAudioPlayback(currentSong);

  // Musician State
  const [currentUser, setCurrentUser] = useState<BandUser | null>(null);
  const [fontSizePx, setFontSizePx] = useState<number>(17);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);
  const [autoScrollSpeed, setAutoScrollSpeed] = useState<number>(3);
  const [showAutoScrollBar, setShowAutoScrollBar] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);

  // Modals visibility
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [isScraperOpen, setIsScraperOpen] = useState<boolean>(false);
  const [scraperQuery, setScraperQuery] = useState<string>('');
  const [isKeyPickerOpen, setIsKeyPickerOpen] = useState<boolean>(false);
  const [isAmbientPadOpen, setIsAmbientPadOpen] = useState<boolean>(false);
  const [isAudioStorageOpen, setIsAudioStorageOpen] = useState<boolean>(false);
  const [isSetlistAdminOpen, setIsSetlistAdminOpen] = useState<boolean>(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isBandAdminOpen, setIsBandAdminOpen] = useState<boolean>(false);
  const [isMetronomeModalOpen, setIsMetronomeModalOpen] = useState<boolean>(false);

  // Login Gate & MD Setlist Gate Modals
  const [loginPrompt, setLoginPrompt] = useState<{
    open: boolean;
    feature: 'draw' | 'notes' | null;
  }>({ open: false, feature: null });

  const [mdGateModal, setMdGateModal] = useState<{
    open: boolean;
    pendingKey: string;
  }>({ open: false, pendingKey: '' });

  const handleImportScrapedSong = async (newSong: Song, addToSetlist = false) => {
    await handleSaveSong(newSong);
    if (addToSetlist && activeSetlistId) {
      await addSongToSetlist(newSong.id, activeSetlistId);
    }
    selectSong(newSong.id);
  };

  // Sync tempo and time signature when currentSong changes
  useEffect(() => {
    if (currentSong?.tempo) {
      setTempo(Number(currentSong.tempo));
    }
    if (currentSong?.timeSignature) {
      setMetronomeSignature(currentSong.timeSignature);
    }
  }, [currentSong?.id, currentSong?.tempo, currentSong?.timeSignature, setTempo, setMetronomeSignature]);

  // Unified Key Change with Worship Leader Setlist Gate
  const handleKeyChangeRequest = (newKey: string) => {
    if (!currentSong) return;

    // If inside an active setlist with designated Worship Leader defaults
    if (activeSetlistId && activeSongMdDefaults) {
      if (newKey === activeSongMdDefaults.key) {
        // Reverting directly to Worship Leader key
        revertToMdDefault(currentSong.id);
        setTargetKey(newKey);
        return;
      }

      // Prompt user with Worship Leader Key Gate
      setMdGateModal({
        open: true,
        pendingKey: newKey,
      });
      return;
    }

    // Direct application (All songs mode)
    setTargetKey(newKey);
  };

  const handleTransposeDelta = (delta: number) => {
    if (!currentSong) return;
    const nextOffset = transposeOffset + delta;
    const baseRoot = (currentSong.originalKey || currentSong.key || 'C').replace(/m$/, '');
    const isFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(baseRoot);
    const nextKey = transposeNote(baseRoot, nextOffset, isFlats);
    handleKeyChangeRequest(nextKey);
  };

  const handleConfirmSessionKey = () => {
    if (!currentSong || !mdGateModal.pendingKey) return;
    setSongSessionOverride(currentSong.id, { key: mdGateModal.pendingKey });
    setTargetKey(mdGateModal.pendingKey);
    setMdGateModal({ open: false, pendingKey: '' });
  };

  const handleRevertToMdKey = () => {
    if (!currentSong || !activeSongMdDefaults) return;
    revertToMdDefault(currentSong.id);
    setTargetKey(activeSongMdDefaults.key);
    setMdGateModal({ open: false, pendingKey: '' });
  };

  // Load strokes from localStorage fallback on song switch
  useEffect(() => {
    if (currentSong?.id) {
      try {
        const local = localStorage.getItem(`hgf_drawings_${currentSong.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentSong.drawingStrokes = parsed;
          }
        }
      } catch (_) {}
    }
  }, [currentSong?.id]);

  // Bluetooth Pedal Listeners
  useFootPedal({
    onNextSong: nextSong,
    onPrevSong: prevSong,
    onScrollDown: () => {
      document.getElementById('sheetWrapper')?.scrollBy({ top: 320, behavior: 'smooth' });
    },
    onScrollUp: () => {
      document.getElementById('sheetWrapper')?.scrollBy({ top: -320, behavior: 'smooth' });
    },
  });

  // Handlers for Song actions
  const handleSaveSong = async (updatedSong: Song) => {
    if (activeSetlist) {
      // In active setlist mode, update the setlist's song item (preserving MD setlist isolation)
      const updatedSongs = (activeSetlist.songs || []).map((s) => {
        const id = typeof s === 'string' ? s : s.id;
        if (id === updatedSong.id) {
          return {
            ...(typeof s === 'object' ? s : { id }),
            title: updatedSong.title,
            artist: updatedSong.artist,
            key: updatedSong.key,
            capo: updatedSong.capo,
            tempo: typeof updatedSong.tempo === 'number' ? updatedSong.tempo : undefined,
            timeSignature: updatedSong.timeSignature,
            chords: updatedSong.chords,
          };
        }
        return s;
      });
      await handleSaveSetlist({ ...activeSetlist, songs: updatedSongs });
    } else {
      // Under All Songs: update library master without mutating isolated setlist snapshots
      await fetch('/api/worship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSong),
      });
      await refreshData();
    }
  };

  const handleDeleteSong = async (songId: string) => {
    await fetch(`/api/worship?id=${encodeURIComponent(songId)}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const handleSaveSetlist = async (updatedSetlist: Setlist) => {
    await fetch('/api/worship/setlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSetlist),
    });
    await refreshData();
  };

  const handleDeleteSetlist = async (setlistId: string) => {
    await fetch(`/api/worship/setlists?id=${encodeURIComponent(setlistId)}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const handleAttachTrack = async (audioTrack: AudioTrack | null) => {
    if (!currentSong) return;
    const updated = { ...currentSong, audioTrack };
    await handleSaveSong(updated);
  };

  const handleSaveStrokes = (strokes: DrawingStroke[]) => {
    if (!currentSong) return;
    currentSong.drawingStrokes = strokes;
    // Persist to local cache immediately
    try {
      localStorage.setItem(`hgf_drawings_${currentSong.id}`, JSON.stringify(strokes));
    } catch (_) {}
  };

  const handleSaveAsMdKey = async (newKey: string) => {
    if (!currentSong) return;

    if (activeSetlist) {
      const updatedSongs = (activeSetlist.songs || []).map((s) => {
        const id = typeof s === 'string' ? s : s.id;
        if (id === currentSong.id) {
          return { id, key: newKey };
        }
        return s;
      });
      const updated = { ...activeSetlist, songs: updatedSongs };
      await handleSaveSetlist(updated);
    } else {
      const updated = { ...currentSong, originalKey: newKey, key: newKey };
      await handleSaveSong(updated);
    }
  };

  const handleToggleAutoScroll = () => {
    const nextState = !isAutoScrolling;
    setIsAutoScrolling(nextState);
    setShowAutoScrollBar(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0a0d14',
      }}
    >
      {/* TOPBAR */}
      <StageTopBar
        currentKey={effectiveKey}
        displayKey={displayKey}
        onTranspose={handleTransposeDelta}
        onOpenKeyPicker={() => setIsKeyPickerOpen(true)}
        bpm={tempo}
        isMetronomePulsing={isPulsing}
        isMetronomeAudioActive={isMetronomeAudioActive}
        onToggleMetronomeAudio={toggleMetronomeAudio}
        onOpenMetronomeModal={() => setIsMetronomeModalOpen(true)}
        setlists={setlists}
        activeSetlistId={activeSetlistId}
        onSelectSetlist={selectSetlist}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenEditSong={() => {
          setEditingSong(currentSong);
          setIsEditModalOpen(true);
        }}
        isDrawingActive={isDrawingActive}
        onToggleDrawing={() => {
          if (!currentUser) {
            setLoginPrompt({ open: true, feature: 'draw' });
            return;
          }
          setIsDrawingActive(!isDrawingActive);
        }}
        onOpenAudioManager={() => setIsAudioStorageOpen(true)}
        onOpenScratchpad={() => {
          if (!currentUser) {
            setLoginPrompt({ open: true, feature: 'notes' });
            return;
          }
          setIsScratchpadOpen(true);
        }}
        onOpenAmbientPad={() => setIsAmbientPadOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(true)}
        isSessionOverridden={isCurrentSongSessionOverridden}
        worshipLeaderKey={activeSongMdDefaults?.key}
        onRevertKey={handleRevertToMdKey}
      />

      {/* STAGE SONG SHEET (Embeds persistent drawing canvas over sheet content) */}
      <SongSheet
        song={currentSong}
        displayKey={displayKey}
        parsedLines={parsedLines}
        fontSizePx={fontSizePx}
        isAutoScrolling={isAutoScrolling}
        scrollSpeed={autoScrollSpeed}
        onToggleAutoScroll={handleToggleAutoScroll}
        onSwipeLeft={nextSong}
        onSwipeRight={prevSong}
        isSessionOverridden={isCurrentSongSessionOverridden}
        worshipLeaderKey={activeSongMdDefaults?.key}
        playbackState={{
          isPlaying: isBacktrackPlaying,
          currentTime: backtrackCurrentTime,
          duration: backtrackDuration,
        }}
        bpm={tempo}
        isMetronomePulsing={isPulsing}
        isMetronomeAudioActive={isMetronomeAudioActive}
        onOpenMetronomeModal={() => setIsMetronomeModalOpen(true)}
        drawingCanvasElement={
          <DrawingCanvas
            isActive={isDrawingActive}
            onClose={() => setIsDrawingActive(false)}
            currentUser={currentUser}
            savedStrokes={currentSong?.drawingStrokes || []}
            onSaveStrokes={handleSaveStrokes}
          />
        }
      />

      {/* FLOATING NAVIGATION DOCK */}
      <NavigationDock
        onPrevSong={prevSong}
        onNextSong={nextSong}
        canPrev={currentIndex > 0}
        canNext={currentIndex < currentLineup.length - 1}
        currentIndex={currentIndex}
        totalSongs={currentLineup.length}
        fontSizePx={fontSizePx}
        onChangeFontSize={(delta) => setFontSizePx((prev) => Math.max(12, Math.min(32, prev + delta)))}
        isAutoScrolling={isAutoScrolling}
        onToggleAutoScroll={handleToggleAutoScroll}
        onOpenMetronome={() => setIsMetronomeModalOpen(true)}
        isMetronomeAudioActive={isMetronomeAudioActive}
      />

      {/* AUTO-SCROLL CONTROL BAR */}
      <AutoScrollBar
        isVisible={showAutoScrollBar}
        isPlaying={isAutoScrolling}
        speed={autoScrollSpeed}
        onTogglePlay={() => setIsAutoScrolling(!isAutoScrolling)}
        onChangeSpeed={setAutoScrollSpeed}
        onClose={() => {
          setIsAutoScrolling(false);
          setShowAutoScrollBar(false);
        }}
      />

      {/* FLOATING AUDIO SCRUBBER DOCK */}
      {hasAudio && (
        <AudioPlaybackDock
          isVisible={hasAudio}
          isPlaying={isBacktrackPlaying}
          currentTime={backtrackCurrentTime}
          duration={backtrackDuration}
          onTogglePlay={toggleBacktrackPlay}
          onSeek={seekBacktrack}
          title={currentSong?.title || ''}
        />
      )}

      {/* SETLIST & SONG LIBRARY SIDEBAR */}
      <SetlistSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        songs={songs}
        setlists={setlists}
        activeSetlist={activeSetlist}
        activeSetlistId={activeSetlistId}
        currentSongId={currentSong?.id || null}
        onSelectSong={selectSong}
        onSelectSetlist={selectSetlist}
        onOpenNewSongModal={() => {
          setEditingSong(null);
          setIsEditModalOpen(true);
        }}
        onOpenSetlistAdmin={() => setIsSetlistAdminOpen(true)}
        onOpenScraper={(initialQ) => {
          setScraperQuery(initialQ || '');
          setIsScraperOpen(true);
        }}
        onAddSongToSetlist={addSongToSetlist}
        onRemoveSongFromSetlist={removeSongFromSetlist}
        onDeleteSong={handleDeleteSong}
      />

      {/* MODALS */}
      <SongEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        song={editingSong}
        onSaveSong={async (saved) => {
          await handleSaveSong(saved);
          selectSong(saved.id);
        }}
        onDeleteSong={handleDeleteSong}
        onOpenScraper={(q) => {
          setScraperQuery(q || '');
          setIsScraperOpen(true);
        }}
      />

      <KeyPickerModal
        isOpen={isKeyPickerOpen}
        onClose={() => setIsKeyPickerOpen(false)}
        currentKey={effectiveKey}
        capo={capo}
        onSelectKey={(newKey) => handleKeyChangeRequest(newKey)}
        onSelectCapo={setCapo}
        isBandAdmin={currentUser?.role === 'admin' || currentUser?.role === 'MD'}
        onSaveAsMdKey={() => handleSaveAsMdKey(effectiveKey)}
      />

      <AmbientPadModal
        isOpen={isAmbientPadOpen}
        onClose={() => setIsAmbientPadOpen(false)}
        isPlaying={isPadPlaying}
        isFadingOut={isPadFadingOut}
        activeKey={activePadKey}
        volume={padVolume}
        onPlayPad={playPad}
        onSelectKey={selectPadKey}
        onStopPad={stopPad}
        onTogglePad={togglePad}
        onChangeVolume={setPadVolume}
      />

      <AudioStorageModal
        isOpen={isAudioStorageOpen}
        onClose={() => setIsAudioStorageOpen(false)}
        currentSong={currentSong}
        onAttachTrack={handleAttachTrack}
      />

      <SetlistAdminModal
        isOpen={isSetlistAdminOpen}
        onClose={() => setIsSetlistAdminOpen(false)}
        setlists={setlists}
        allSongs={songs}
        onSaveSetlist={handleSaveSetlist}
        onDeleteSetlist={handleDeleteSetlist}
        onSelectActiveSetlist={selectSetlist}
      />

      <ScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        currentSong={currentSong}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <BandAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onLogout={() => {
          setCurrentUser(null);
          resetAllSessionOverrides();
          resetTranspose();
        }}
        onOpenAdminModal={() => setIsBandAdminOpen(true)}
      />

      <BandAdminModal
        isOpen={isBandAdminOpen}
        onClose={() => setIsBandAdminOpen(false)}
        currentUser={currentUser}
        onUserUpdated={refreshData}
      />

      <MetronomeModal
        isOpen={isMetronomeModalOpen}
        onClose={() => setIsMetronomeModalOpen(false)}
        bpm={tempo}
        onBpmChange={setTempo}
        timeSignature={metronomeSignature}
        onTimeSignatureChange={setMetronomeSignature}
        isAudioActive={isMetronomeAudioActive}
        onToggleAudio={toggleMetronomeAudio}
        isPulsing={isPulsing}
      />

      <SongScraperModal
        isOpen={isScraperOpen}
        onClose={() => setIsScraperOpen(false)}
        initialQuery={scraperQuery}
        activeSetlist={activeSetlist}
        onImportSong={handleImportScrapedSong}
        isEditingExisting={isEditModalOpen && !!editingSong}
        onOverwriteChords={(chords, title, artist, key, tempo) => {
          if (editingSong) {
            setEditingSong({
              ...editingSong,
              chords,
              title: title || editingSong.title,
              artist: artist || editingSong.artist,
              key: key || editingSong.key,
              tempo: tempo || editingSong.tempo,
            });
          }
        }}
      />

      {/* Login Prompt Modal for Draw & Notes */}
      <ConfirmModal
        open={loginPrompt.open}
        title="Band Login Required"
        message={
          loginPrompt.feature === 'draw'
            ? 'You must be logged in to draw live stage annotations and synchronize them with your band.'
            : 'You must be logged in to access and add private musician notes.'
        }
        confirmLabel="Log In Now"
        confirmColor="#4EB1CB"
        cancelLabel="Cancel"
        onConfirm={() => {
          setLoginPrompt({ open: false, feature: null });
          setIsAuthModalOpen(true);
        }}
        onCancel={() => setLoginPrompt({ open: false, feature: null })}
      />

      {/* Worship Leader Key Gate Modal */}
      <ConfirmModal
        open={mdGateModal.open}
        title="Worship Leader Key Gate"
        message={
          <span>
            The Worship Leader set this song to{' '}
            <strong style={{ color: '#4EB1CB' }}>
              Key {activeSongMdDefaults?.key || 'C'}
            </strong>{' '}
            {activeSongMdDefaults?.tempo ? `(${activeSongMdDefaults.tempo} BPM)` : ''} for setlist{' '}
            <em>&quot;{activeSetlist?.name}&quot;</em> to match their vocal range.
            <br />
            <br />
            Changing to{' '}
            <strong style={{ color: '#f59e0b' }}>Key {mdGateModal.pendingKey}</strong>{' '}
            will be <strong>temporary for this session only</strong>. It will automatically restore back to the Worship Leader Key ({activeSongMdDefaults?.key || 'Original'}) on the next day or after your session (when logged out).
            <br />
            <br />
            Would you like to proceed for this session?
          </span>
        }
        confirmLabel="Change for This Session Only"
        confirmColor="#f59e0b"
        cancelLabel={`Keep Worship Leader Key (${activeSongMdDefaults?.key || 'Original'})`}
        onConfirm={handleConfirmSessionKey}
        onCancel={handleRevertToMdKey}
      />
    </div>
  );
}
