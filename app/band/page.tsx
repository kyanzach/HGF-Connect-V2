// app/band/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSetlist } from './hooks/useSetlist';
import { useMusicTheory } from './hooks/useMusicTheory';
import { useMetronome } from './hooks/useMetronome';
import { useAmbientPad } from './hooks/useAmbientPad';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useFootPedal } from './hooks/useFootPedal';

import { StageTopBar } from './components/StageTopBar';
import { SongSheet } from './components/SongSheet';
import { SetlistSidebar } from './components/SetlistSidebar';
import { DrawingCanvas } from './components/DrawingCanvas';
import { AudioPlaybackDock } from './components/AudioPlaybackDock';
import { NavigationDock } from './components/NavigationDock';

import { SongEditorModal } from './components/modals/SongEditorModal';
import { KeyPickerModal } from './components/modals/KeyPickerModal';
import { AmbientPadModal } from './components/modals/AmbientPadModal';
import { AudioStorageModal } from './components/modals/AudioStorageModal';
import { SetlistAdminModal } from './components/modals/SetlistAdminModal';
import { ScratchpadModal } from './components/modals/ScratchpadModal';
import { BandAuthModal } from './components/modals/BandAuthModal';

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
    parsedLines,
  } = useMusicTheory(currentSong);

  const {
    tempo,
    setTempo,
    isPulsing,
    isAudioActive: isMetronomeAudioActive,
    toggleAudio: toggleMetronomeAudio,
  } = useMetronome(currentSong?.tempo ? Number(currentSong.tempo) : 72);

  const {
    isPlaying: isPadPlaying,
    currentKey: activePadKey,
    volume: padVolume,
    play: playPad,
    stop: stopPad,
    toggle: togglePad,
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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);

  // Modals visibility
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isKeyPickerOpen, setIsKeyPickerOpen] = useState<boolean>(false);
  const [isAmbientPadOpen, setIsAmbientPadOpen] = useState<boolean>(false);
  const [isAudioStorageOpen, setIsAudioStorageOpen] = useState<boolean>(false);
  const [isSetlistAdminOpen, setIsSetlistAdminOpen] = useState<boolean>(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync tempo when currentSong changes
  useEffect(() => {
    if (currentSong?.tempo) {
      setTempo(Number(currentSong.tempo));
    }
  }, [currentSong?.id, currentSong?.tempo, setTempo]);

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
    await fetch('/api/worship', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSong),
    });
    await refreshData();
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

  const handleDeleteSetlist = async (setId: string) => {
    await fetch(`/api/worship/setlists?id=${encodeURIComponent(setId)}`, {
      method: 'DELETE',
    });
    await refreshData();
  };

  const handleAttachTrack = async (track: AudioTrack | null) => {
    if (!currentSong) return;
    const updated: Song = {
      ...currentSong,
      audioTrack: track,
      updatedAt: Date.now(),
    };
    await handleSaveSong(updated);
  };

  const handleSaveStrokes = (strokes: DrawingStroke[]) => {
    if (!currentSong) return;
    currentSong.drawingStrokes = strokes;
    // Debounce save to server
    fetch('/api/worship', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentSong),
    }).catch(() => {});
  };

  const handleSaveAsMdKey = async () => {
    if (!activeSetlist || !currentSong) return;
    const updatedSongs = (activeSetlist.songs || []).map((item) => {
      const sId = typeof item === 'string' ? item : item.id;
      if (sId === currentSong.id) {
        return {
          id: sId,
          key: effectiveKey,
          capo: capo,
        };
      }
      return item;
    });
    const updatedSet: Setlist = {
      ...activeSetlist,
      songs: updatedSongs,
      updatedAt: Date.now(),
    };
    await handleSaveSetlist(updatedSet);
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
        onTranspose={transpose}
        onOpenKeyPicker={() => setIsKeyPickerOpen(true)}
        bpm={tempo}
        isMetronomePulsing={isPulsing}
        isMetronomeAudioActive={isMetronomeAudioActive}
        onToggleMetronomeAudio={toggleMetronomeAudio}
        setlists={setlists}
        activeSetlistId={activeSetlistId}
        onSelectSetlist={selectSetlist}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenEditSong={() => setIsEditModalOpen(true)}
        isDrawingActive={isDrawingActive}
        onToggleDrawing={() => setIsDrawingActive(!isDrawingActive)}
        onOpenAudioManager={() => setIsAudioStorageOpen(true)}
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
        onOpenAmbientPad={() => setIsAmbientPadOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />

      {/* STAGE SONG SHEET */}
      <SongSheet
        song={currentSong}
        displayKey={displayKey}
        parsedLines={parsedLines}
        fontSizePx={fontSizePx}
        isAutoScrolling={isAutoScrolling}
        onToggleAutoScroll={() => setIsAutoScrolling(!isAutoScrolling)}
        onSwipeLeft={nextSong}
        onSwipeRight={prevSong}
      />

      {/* DRAWING ANNOTATION CANVAS */}
      <DrawingCanvas
        isActive={isDrawingActive}
        onClose={() => setIsDrawingActive(false)}
        savedStrokes={currentSong?.drawingStrokes || []}
        onSaveStrokes={handleSaveStrokes}
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
        onToggleAutoScroll={() => setIsAutoScrolling(!isAutoScrolling)}
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
          setIsEditModalOpen(true);
        }}
        onOpenSetlistAdmin={() => setIsSetlistAdminOpen(true)}
      />

      {/* MODALS */}
      <SongEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        song={currentSong}
        onSaveSong={handleSaveSong}
        onDeleteSong={handleDeleteSong}
      />

      <KeyPickerModal
        isOpen={isKeyPickerOpen}
        onClose={() => setIsKeyPickerOpen(false)}
        currentKey={effectiveKey}
        capo={capo}
        onSelectKey={(newKey) => {
          setTargetKey(newKey);
          if (currentSong && activeSetlistId) {
            setSongSessionKey(currentSong.id, newKey);
          }
        }}
        onSelectCapo={setCapo}
        isBandAdmin={currentUser?.role === 'admin' || currentUser?.role === 'MD'}
        onSaveAsMdKey={handleSaveAsMdKey}
      />

      <AmbientPadModal
        isOpen={isAmbientPadOpen}
        onClose={() => setIsAmbientPadOpen(false)}
        isPlaying={isPadPlaying}
        activeKey={activePadKey}
        volume={padVolume}
        onPlayPad={playPad}
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
      />

      <BandAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
      />
    </div>
  );
}
