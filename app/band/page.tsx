// app/band/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import ConfirmModal from '@/components/ConfirmModal';
import { useSetlist } from './hooks/useSetlist';
import { useMusicTheory } from './hooks/useMusicTheory';
import { useMetronome } from './hooks/useMetronome';
import { useAmbientPad } from './hooks/useAmbientPad';
import { useAudioPlayback } from './hooks/useAudioPlayback';
import { useFootPedal } from './hooks/useFootPedal';
import { transposeNote, getRootNote } from './lib/musicTheory';

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
import { AudioChaptersModal } from './components/modals/AudioChaptersModal';
import { DurationPickerModal } from './components/modals/DurationPickerModal';
import { BandInstallModal } from './components/modals/BandInstallModal';

import { BandUser, Song, Setlist, AudioTrack, AudioMarker, DrawingStroke } from './types/band';
import { getCachedAudioMarkers, saveCachedAudioMarkers } from './lib/audioAnalysis';

function parseDurationToSec(dur?: string): number {
  if (!dur) return 0;
  if (dur.includes(':')) {
    const parts = dur.split(':');
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  const n = parseInt(dur, 10);
  return isNaN(n) ? 0 : n;
}

function formatSecToMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
    reorderSongInSetlist,
    refreshData,
  } = useSetlist();

  const {
    transposeOffset,
    capo,
    setCapo,
    effectiveKey,
    displayKey,
    isFlats,
    transpose,
    setTargetKey,
    resetTranspose,
    parsedLines,
  } = useMusicTheory(currentSong, activeSetlistId);

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
    volume: backtrackVolume,
    isMuted: isBacktrackMuted,
    setVolume: setBacktrackVolume,
    toggleMute: toggleBacktrackMute,
    markers: audioMarkers,
    updateMarkers: updateAudioMarkers,
    activeMarker: activeAudioMarker,
    jumpPrevMarker: jumpPrevAudioMarker,
    jumpNextMarker: jumpNextAudioMarker,
    isAnalyzingAudio,
  } = useAudioPlayback(currentSong);

  // Mobile Visual Viewport Tracking & Browser Bottom Dock Clearance
  useEffect(() => {
    const updateViewportMetrics = () => {
      const vv = window.visualViewport;
      const vh = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-viewport-height', `${vh}px`);
      const dockOffset = vv ? Math.max(0, window.innerHeight - (vv.height + (vv.offsetTop || 0))) : 0;
      document.documentElement.style.setProperty('--browser-dock-offset', `${dockOffset}px`);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewportMetrics);
      window.visualViewport.addEventListener('scroll', updateViewportMetrics);
    }
    window.addEventListener('resize', updateViewportMetrics);
    window.addEventListener('orientationchange', () => setTimeout(updateViewportMetrics, 200));
    updateViewportMetrics();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportMetrics);
        window.visualViewport.removeEventListener('scroll', updateViewportMetrics);
      }
      window.removeEventListener('resize', updateViewportMetrics);
    };
  }, []);

  // Musician State & Storage Keys
  const STORAGE_BAND_USER = 'hgf_band_current_user';
  const STORAGE_BAND_EXPLICIT_LOGOUT = 'hgf_band_explicit_logout';

  function getBandCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function setBandCookie(name: string, value: string, days = 3650) {
    if (typeof document === 'undefined') return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function removeBandCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }

  const { data: session } = useSession();
  const [currentUser, setCurrentUser] = useState<BandUser | null>(null);

  // 1. Restore saved band user from localStorage or 10-year persistent cookie on mount & silently refresh against API
  useEffect(() => {
    try {
      let saved = localStorage.getItem(STORAGE_BAND_USER);
      if (!saved) {
        // Fallback to 10-year persistent cookie if localStorage was cleared on mobile Safari
        const cookieVal = getBandCookie('hgf_band_user');
        if (cookieVal) {
          saved = cookieVal;
          try {
            localStorage.setItem(STORAGE_BAND_USER, cookieVal);
          } catch (_) {}
        }
      }
      if (saved) {
        const parsed: BandUser = JSON.parse(saved);
        if (parsed && parsed.id && parsed.username) {
          setCurrentUser(parsed);
          setBandCookie('hgf_band_user', JSON.stringify(parsed));

          // Silently revalidate against server in background
          fetch('/api/worship/users')
            .then((res) => res.json())
            .then((data) => {
              const list: BandUser[] = data.users || (Array.isArray(data) ? data : []);
              const fresh = list.find((u) => u.id === parsed.id || u.username.toLowerCase() === parsed.username.toLowerCase());
              if (fresh) {
                setCurrentUser(fresh);
                localStorage.setItem(STORAGE_BAND_USER, JSON.stringify(fresh));
                setBandCookie('hgf_band_user', JSON.stringify(fresh));
              }
            })
            .catch(() => {});
          return;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved band user:', e);
    }
  }, []);

  // 2. Auto-link with NextAuth church account if no band user is logged in
  useEffect(() => {
    if (currentUser) return;

    if (session?.user) {
      // Clear explicit logout flag when user is actively logged into NextAuth church portal
      localStorage.removeItem(STORAGE_BAND_EXPLICIT_LOGOUT);
      removeBandCookie('hgf_band_logout');

      const matchUsername = ((session.user as any).username || '').toLowerCase();
      const matchFirstName = (((session.user as any).firstName || session.user.name || '').split(' ')[0] || '').toLowerCase();
      const isAdmin = (session.user as any).role === 'admin';

      fetch('/api/worship/users')
        .then((res) => res.json())
        .then((data) => {
          const list: BandUser[] = data.users || (Array.isArray(data) ? data : []);
          if (!list || list.length === 0) return;

          let matched = list.find((u) => u.username.toLowerCase() === matchUsername);
          if (!matched && matchFirstName) {
            matched = list.find((u) => u.displayName.toLowerCase().includes(matchFirstName) || u.username.toLowerCase() === matchFirstName);
          }
          if (!matched && isAdmin) {
            matched = list.find((u) => u.username === 'ryan' || u.role === 'admin');
          }

          if (matched) {
            setCurrentUser(matched);
            try {
              localStorage.setItem(STORAGE_BAND_USER, JSON.stringify(matched));
              setBandCookie('hgf_band_user', JSON.stringify(matched));
            } catch (_) {}
          }
        })
        .catch(() => {});
    }
  }, [session, currentUser]);

  const handleSelectUser = (user: BandUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(STORAGE_BAND_USER, JSON.stringify(user));
      setBandCookie('hgf_band_user', JSON.stringify(user));
      localStorage.removeItem(STORAGE_BAND_EXPLICIT_LOGOUT);
      removeBandCookie('hgf_band_logout');
    } catch (e) {
      console.error('Failed to save band user:', e);
    }
  };

  const handleLogoutUser = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_BAND_USER);
      removeBandCookie('hgf_band_user');
      localStorage.setItem(STORAGE_BAND_EXPLICIT_LOGOUT, '1');
      setBandCookie('hgf_band_logout', '1', 30);
    } catch (e) {
      console.error('Failed to remove band user:', e);
    }
    resetAllSessionOverrides();
    resetTranspose();
  };

  const handleUserUpdated = () => {
    refreshData();
    if (currentUser) {
      fetch('/api/worship/users')
        .then((res) => res.json())
        .then((data) => {
          const list: BandUser[] = data.users || (Array.isArray(data) ? data : []);
          const fresh = list.find((u) => u.id === currentUser.id);
          if (fresh) {
            handleSelectUser(fresh);
          }
        })
        .catch(() => {});
    }
  };
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
  const [isAudioChaptersModalOpen, setIsAudioChaptersModalOpen] = useState<boolean>(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Auto-scroll pacing & duration mode
  const [scrollMode, setScrollMode] = useState<'duration' | 'speed'>('duration');
  const [elapsedScrollSeconds, setElapsedScrollSeconds] = useState<number>(0);

  // Login Gate Modal
  const [loginPrompt, setLoginPrompt] = useState<{
    open: boolean;
    feature: 'draw' | 'notes' | null;
  }>({ open: false, feature: null });

  const [drawingSyncTick, setDrawingSyncTick] = useState<number>(0);
  const drawingSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleImportScrapedSong = async (newSong: Song, addToSetlist = false) => {
    await handleSaveSong(newSong);
    if (addToSetlist && activeSetlistId) {
      await addSongToSetlist(newSong.id, activeSetlistId);
    }
    selectSong(newSong.id);
  };

  // Planned arrangement duration in seconds (defaults to standard 4:00 if not yet explicitly saved on song)
  const currentSongDuration = currentSong?.duration || '4:00';
  const targetDurationSec = parseDurationToSec(currentSongDuration) || 240;

  // Reset elapsed timer when currentSong changes
  useEffect(() => {
    setElapsedScrollSeconds(0);
  }, [currentSong?.id]);

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
    if (newKey === effectiveKey) return;

    // Apply key instantly; record session override if inside active setlist
    if (activeSetlistId && activeSongMdDefaults) {
      if (newKey === activeSongMdDefaults.key) {
        revertToMdDefault(currentSong.id);
      } else {
        setSongSessionOverride(currentSong.id, { key: newKey });
      }
    }

    setTargetKey(newKey);
  };

  const handleSelectSetlist = (setId: string | null) => {
    selectSetlist(setId);
    resetTranspose();
  };

  const handleTransposeDelta = (delta: number) => {
    if (!currentSong) return;
    const currentRoot = getRootNote(effectiveKey);
    const isMinor = effectiveKey.endsWith('m') || effectiveKey.includes('min');
    const nextRoot = transposeNote(currentRoot, delta, isFlats);
    const nextKey = isMinor ? `${nextRoot}m` : nextRoot;
    handleKeyChangeRequest(nextKey);
  };

  const handleRevertToMdKey = () => {
    if (!currentSong || !activeSongMdDefaults) return;
    revertToMdDefault(currentSong.id);
    setTargetKey(activeSongMdDefaults.key);
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
            duration: updatedSong.duration,
            chords: updatedSong.chords,
            audioTrack: updatedSong.audioTrack,
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
    const updatedSong: Song = {
      ...currentSong,
      audioTrack,
      updatedAt: Date.now(),
    };

    // 1. Always persist audio track to master library song
    try {
      await fetch('/api/worship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSong),
      });
    } catch (err) {
      console.error('Failed to attach audio track to master song:', err);
    }

    // 2. If viewing a setlist, keep setlist song item in sync
    if (activeSetlist) {
      const updatedSongs = (activeSetlist.songs || []).map((s) => {
        const id = typeof s === 'string' ? s : s.id;
        if (id === currentSong.id) {
          return {
            ...(typeof s === 'object' ? s : { id }),
            audioTrack: audioTrack || undefined,
          };
        }
        return s;
      });
      try {
        await fetch('/api/worship/setlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...activeSetlist, songs: updatedSongs }),
        });
      } catch (err) {
        console.error('Failed to attach audio track to setlist:', err);
      }
    }

    await refreshData();
  };

  const handleUpdateMarkers = async (newMarkers: AudioMarker[]) => {
    if (!currentSong) return;

    // 1. Update player markers immediately
    updateAudioMarkers(newMarkers);
    if (currentSong.id) {
      saveCachedAudioMarkers(currentSong.id, newMarkers);
    }

    const existingTrack = currentSong.audioTrack || {
      url: '',
      markers: [],
    };
    const updatedTrack: AudioTrack = {
      ...existingTrack,
      markers: newMarkers,
      updatedAt: Date.now(),
    };
    const updatedSong: Song = {
      ...currentSong,
      audioTrack: updatedTrack,
      updatedAt: Date.now(),
    };

    // 2. Always persist timecodes & cues directly to the master library song file (/api/worship)
    // This guarantees all band members and devices (including phones) get the calibrated markers
    try {
      const res = await fetch('/api/worship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSong),
      });
      if (!res.ok) {
        console.error('Failed to save markers to master song library:', await res.text());
      }
    } catch (err) {
      console.error('Error saving markers to /api/worship:', err);
    }

    // 3. Also update active setlist's snapshot if applicable
    if (activeSetlist) {
      const updatedSongs = (activeSetlist.songs || []).map((s) => {
        const id = typeof s === 'string' ? s : s.id;
        if (id === currentSong.id) {
          return {
            ...(typeof s === 'object' ? s : { id }),
            audioTrack: updatedTrack,
          };
        }
        return s;
      });
      try {
        await fetch('/api/worship/setlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...activeSetlist, songs: updatedSongs }),
        });
      } catch (err) {
        console.error('Error saving markers to active setlist:', err);
      }
    }

    // 4. Re-sync in-memory songs and setlists across the workspace
    await refreshData();
  };

  // Auto-sync previously cached localStorage chapter markers to server if missing in library
  useEffect(() => {
    if (!currentSong?.id || !currentSong.audioTrack) return;
    const isBandAdmin = currentUser?.role === 'admin' || currentUser?.role === 'MD';
    if (!isBandAdmin) return;

    if (!currentSong.audioTrack.markers || currentSong.audioTrack.markers.length === 0) {
      const cached = getCachedAudioMarkers(currentSong.id);
      if (cached && cached.length > 0) {
        handleUpdateMarkers(cached);
      }
    }
  }, [currentSong?.id, currentSong?.audioTrack?.url, currentUser?.role]);

  const handleSaveStrokes = (strokes: DrawingStroke[]) => {
    if (!currentSong) return;
    currentSong.drawingStrokes = strokes;
    // Persist to local cache immediately
    try {
      localStorage.setItem(`hgf_drawings_${currentSong.id}`, JSON.stringify(strokes));
    } catch (_) {}

    // Debounced persist to server so team members receive annotations in real time
    if (drawingSaveTimerRef.current) clearTimeout(drawingSaveTimerRef.current);
    drawingSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/worship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentSong.id,
            title: currentSong.title,
            drawingStrokes: strokes,
          }),
        });
      } catch (err) {
        console.error('Failed to sync drawing strokes to server:', err);
      }
    }, 600);
  };

  // Real-time synchronization of drawing annotations across devices
  useEffect(() => {
    if (!currentSong?.id) return;

    const syncInterval = setInterval(async () => {
      if (isDrawingActive) return; // Do not interrupt user while actively drawing
      if (typeof document !== 'undefined' && document.hidden) return; // Pause when tab is backgrounded

      try {
        const res = await fetch(`/api/worship?id=${encodeURIComponent(currentSong.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const remoteSong: Song = await res.json();
        if (remoteSong && Array.isArray(remoteSong.drawingStrokes)) {
          const currentJson = JSON.stringify(currentSong.drawingStrokes || []);
          const remoteJson = JSON.stringify(remoteSong.drawingStrokes);
          if (currentJson !== remoteJson) {
            currentSong.drawingStrokes = remoteSong.drawingStrokes;
            try {
              localStorage.setItem(`hgf_drawings_${currentSong.id}`, remoteJson);
            } catch (_) {}
            setDrawingSyncTick((prev) => prev + 1);
          }
        }
      } catch (_) {}
    }, 3500);

    return () => clearInterval(syncInterval);
  }, [currentSong?.id, isDrawingActive]);

  const handleSaveAsMdKey = async (newKey: string) => {
    if (!currentSong || currentUser?.role !== 'MD') return;

    if (activeSetlist) {
      const updatedSongs = (activeSetlist.songs || []).map((s) => {
        const id = typeof s === 'string' ? s : s.id;
        if (id === currentSong.id) {
          return {
            ...(typeof s === 'object' ? s : { id }),
            key: newKey,
          };
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

  const handleApplyDuration = async (newDuration: string, savePermanent?: boolean) => {
    if (!currentSong) return;

    // Apply immediate session override for instant reactive feedback
    setSongSessionOverride(currentSong.id, { duration: newDuration });

    if (savePermanent) {
      if (activeSetlist) {
        const updatedSongs = (activeSetlist.songs || []).map((s) => {
          const id = typeof s === 'string' ? s : s.id;
          if (id === currentSong.id) {
            return {
              ...(typeof s === 'object' ? s : { id }),
              duration: newDuration,
            };
          }
          return s;
        });
        await handleSaveSetlist({ ...activeSetlist, songs: updatedSongs });
      } else {
        await handleSaveSong({ ...currentSong, duration: newDuration });
      }
    }
  };

  const handleStepDuration = (deltaSec: number) => {
    if (!currentSong) return;
    const currentSec = parseDurationToSec(currentSong.duration) || 240;
    const nextSec = Math.max(30, currentSec + deltaSec);
    const nextDurStr = formatSecToMMSS(nextSec);
    handleApplyDuration(nextDurStr, false);
  };

  const handleToggleAutoScroll = () => {
    const nextState = !isAutoScrolling;
    setIsAutoScrolling(nextState);
    setShowAutoScrollBar(true);
    if (nextState && targetDurationSec > 0 && elapsedScrollSeconds >= targetDurationSec) {
      setElapsedScrollSeconds(0);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'var(--app-viewport-height, 100dvh)',
        maxHeight: 'var(--app-viewport-height, 100dvh)',
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
        onSelectSetlist={handleSelectSetlist}
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
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
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
        plannedDuration={currentSongDuration}
        onOpenDurationPicker={() => setIsDurationModalOpen(true)}
        scrollMode={scrollMode}
        elapsedScrollSeconds={elapsedScrollSeconds}
        targetDurationSec={targetDurationSec}
        onUpdateElapsed={setElapsedScrollSeconds}
        onAutoScrollComplete={() => setIsAutoScrolling(false)}
        playbackState={{
          isPlaying: isBacktrackPlaying,
          currentTime: backtrackCurrentTime,
          duration: backtrackDuration,
        }}
        bpm={tempo}
        isMetronomePulsing={isPulsing}
        isMetronomeAudioActive={isMetronomeAudioActive}
        onOpenMetronomeModal={() => setIsMetronomeModalOpen(true)}
        isDrawingActive={isDrawingActive}
        onRefresh={refreshData}
        drawingCanvasElement={
          <DrawingCanvas
            key={`drawing_${currentSong?.id}_${drawingSyncTick}`}
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
        bpm={tempo}
        isMetronomePulsing={isPulsing}
        onOpenMetronome={() => setIsMetronomeModalOpen(true)}
        isMetronomeAudioActive={isMetronomeAudioActive}
        hasPlaybackDock={hasAudio}
        duration={currentSongDuration}
        onOpenDurationPicker={() => setIsDurationModalOpen(true)}
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
        hasPlaybackDock={hasAudio}
        scrollMode={scrollMode}
        onToggleScrollMode={() => setScrollMode((prev) => (prev === 'duration' ? 'speed' : 'duration'))}
        duration={currentSongDuration}
        elapsedSeconds={elapsedScrollSeconds}
        targetDurationSec={targetDurationSec}
        onOpenDurationPicker={() => setIsDurationModalOpen(true)}
        onStepDurationSeconds={handleStepDuration}
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
          volume={backtrackVolume}
          isMuted={isBacktrackMuted}
          onSetVolume={setBacktrackVolume}
          onToggleMute={toggleBacktrackMute}
          markers={audioMarkers}
          activeMarker={activeAudioMarker}
          onJumpPrev={jumpPrevAudioMarker}
          onJumpNext={jumpNextAudioMarker}
          isAnalyzingAudio={isAnalyzingAudio}
          onOpenChaptersModal={() => setIsAudioChaptersModalOpen(true)}
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
        onSelectSetlist={handleSelectSetlist}
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
        onReorderSongInSetlist={reorderSongInSetlist}
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
        isBandAdmin={currentUser?.role === 'MD'}
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
        onSelectActiveSetlist={handleSelectSetlist}
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
        onSelectUser={handleSelectUser}
        onLogout={handleLogoutUser}
        onOpenAdminModal={() => setIsBandAdminOpen(true)}
      />

      <BandAdminModal
        isOpen={isBandAdminOpen}
        onClose={() => setIsBandAdminOpen(false)}
        currentUser={currentUser}
        onUserUpdated={handleUserUpdated}
      />

      <BandInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
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

      {/* Audio Chapter Timings & Cues Calibration Modal */}
      <AudioChaptersModal
        isOpen={isAudioChaptersModalOpen}
        onClose={() => setIsAudioChaptersModalOpen(false)}
        markers={audioMarkers}
        onSaveMarkers={handleUpdateMarkers}
        currentTime={backtrackCurrentTime}
        duration={backtrackDuration}
        onSeek={seekBacktrack}
        songTitle={currentSong?.title}
        isBandAdmin={currentUser?.role === 'admin' || currentUser?.role === 'MD'}
      />

      {/* Arrangement Duration Picker Modal */}
      <DurationPickerModal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        currentDuration={currentSong?.duration}
        songTitle={currentSong?.title}
        onApplyDuration={handleApplyDuration}
        isBandAdmin={currentUser?.role === 'MD'}
      />
    </div>
  );
}
