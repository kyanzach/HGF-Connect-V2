// app/band/page.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    optimisticAddSong,
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

  // Scope backtrack playback dock:
  // MD (Musical Director) and Admin ALWAYS have stage playback controls for songs with audio.
  // Regular musicians only see the playback bar if THEY personally uploaded the track.
  const isPlaybackDockVisible = useMemo(() => {
    if (!hasAudio || !currentSong?.audioTrack) return false;
    const track = currentSong.audioTrack;

    if (!currentUser?.id) return false;

    // MD (Musical Director) and Admin ALWAYS have stage playback controls
    const isMDOrAdmin = currentUser.role === 'MD' || currentUser.role === 'admin';
    if (isMDOrAdmin) return true;

    const trackUploader = (track.uploadedBy || '').trim().toLowerCase();
    const currentUserId = (currentUser.id || '').trim().toLowerCase();
    const currentUsername = (currentUser.username || '').trim().toLowerCase();

    // Must have a valid uploader and must match current user
    if (!trackUploader) return false;

    return trackUploader === currentUserId || trackUploader === currentUsername;
  }, [hasAudio, currentSong?.audioTrack, currentUser]);

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
  const [personalStrokesMap, setPersonalStrokesMap] = useState<Record<string, DrawingStroke[]>>({});
  const [mdGlobalStrokesMap, setMdGlobalStrokesMap] = useState<Record<string, DrawingStroke[]>>({});
  const drawingSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocalStrokeTimeRef = useRef<number>(0);

  const getActiveDrawingStrokes = useCallback((songId: string | undefined): DrawingStroke[] => {
    if (!songId) return [];
    const isMd = currentUser?.role === 'MD';

    // 1. Resolve MD Global Strokes
    let mdStrokes: DrawingStroke[] = [];
    if (mdGlobalStrokesMap[songId] && mdGlobalStrokesMap[songId].length > 0) {
      mdStrokes = mdGlobalStrokesMap[songId];
    } else if (currentSong?.id === songId && Array.isArray(currentSong.drawingStrokes)) {
      mdStrokes = currentSong.drawingStrokes.filter((s) => s.scope === 'global' || s.role === 'MD');
    }
    if (mdStrokes.length === 0 && typeof window !== 'undefined') {
      try {
        const cachedMd = localStorage.getItem(`hgf_md_drawings_${songId}`);
        if (cachedMd) {
          const parsed = JSON.parse(cachedMd);
          if (Array.isArray(parsed) && parsed.length > 0) mdStrokes = parsed;
        }
      } catch (_) {}
    }

    // If logged in as MD, MD is author of the global layer — return MD global strokes
    if (isMd) {
      return mdStrokes;
    }

    // 2. Resolve Current User's Personal Strokes
    const currentUserId = currentUser?.id || 'guest';
    const personalKey = `${currentUserId}_${songId}`;
    let myPersonalStrokes: DrawingStroke[] = [];

    if (personalStrokesMap[personalKey]) {
      myPersonalStrokes = personalStrokesMap[personalKey];
    } else if (typeof window !== 'undefined') {
      try {
        const cachedUser = localStorage.getItem(`hgf_user_drawings_${currentUserId}_${songId}`);
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          if (Array.isArray(parsed) && parsed.length > 0) {
            myPersonalStrokes = parsed;
          }
        } else if (currentUserId === 'user-ryan') {
          // Migration: recover legacy strokes drawn by Ryan on this device
          const legacy = localStorage.getItem(`hgf_drawings_${songId}`);
          if (legacy) {
            const parsed = JSON.parse(legacy);
            if (Array.isArray(parsed)) {
              myPersonalStrokes = parsed.filter(
                (s: DrawingStroke) => s.userId === 'user-ryan' || s.authorName?.includes('Ryan')
              );
            }
          }
        }
      } catch (_) {}
    }

    // Non-MD user sees MD's global strokes PLUS their own personal annotations on top!
    return [...mdStrokes, ...myPersonalStrokes];
  }, [currentUser, mdGlobalStrokesMap, personalStrokesMap, currentSong]);

  const handleImportScrapedSong = async (newSong: Song, addToSetlist = false) => {
    const targetSetId = addToSetlist && activeSetlistId ? activeSetlistId : undefined;
    await optimisticAddSong(newSong, targetSetId);
    if (!addToSetlist && activeSetlistId) {
      selectSetlist(null);
    }
    selectSong(newSong.id);
  };

  // Session duration overrides keyed by songId for immediate reactive UI updates
  const [sessionDurationOverrides, setSessionDurationOverrides] = useState<Record<string, string>>({});

  // MD Live Stage Sync state for church WiFi stage harmony
  interface LiveSyncState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    leaderName: string;
    songId: string;
    timestamp: number;
  }
  const [liveSyncState, setLiveSyncState] = useState<LiveSyncState | null>(null);
  const [liveInterpolatedTime, setLiveInterpolatedTime] = useState<number>(0);
  const liveSyncClockRef = useRef<{ baseTime: number; basePerf: number; duration: number } | null>(null);

  const backtrackCurrentTimeRef = useRef(backtrackCurrentTime);
  backtrackCurrentTimeRef.current = backtrackCurrentTime;
  const backtrackDurationRef = useRef(backtrackDuration);
  backtrackDurationRef.current = backtrackDuration;
  const isBacktrackPlayingRef = useRef(isBacktrackPlaying);
  isBacktrackPlayingRef.current = isBacktrackPlaying;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const activeSetlistIdRef = useRef(activeSetlistId);
  activeSetlistIdRef.current = activeSetlistId;

  // Planned arrangement duration in seconds (defaults to standard 4:00 if not yet explicitly saved on song)
  const currentSongDuration =
    (currentSong?.id && sessionDurationOverrides[currentSong.id]) ||
    currentSong?.duration ||
    '4:00';
  const targetDurationSec = parseDurationToSec(currentSongDuration) || 240;

  // MD Master Broadcaster: transmits play/pause/seek to band members viewing the same setlist
  const broadcastSyncState = useCallback((playing: boolean, timeOverride?: number) => {
    if (!activeSetlistIdRef.current || !currentSongRef.current?.id) return;
    const time = timeOverride !== undefined ? timeOverride : backtrackCurrentTimeRef.current;
    const dur = backtrackDurationRef.current;
    const leaderName = currentUser?.displayName || currentUser?.username || 'MD';

    fetch('/api/worship/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setlistId: activeSetlistIdRef.current,
        songId: currentSongRef.current.id,
        isPlaying: playing,
        currentTime: time,
        duration: dur,
        leaderId: currentUser?.id || 'md',
        leaderName,
      }),
    }).catch(() => {});
  }, [currentUser]);

  // Transmit immediate play / pause broadcast
  useEffect(() => {
    if (!activeSetlistId || !isPlaybackDockVisible) return;
    broadcastSyncState(isBacktrackPlaying);
  }, [isBacktrackPlaying, activeSetlistId, isPlaybackDockVisible, broadcastSyncState]);

  // Transmit periodic 1.5s heartbeat while MD playback is active
  useEffect(() => {
    if (!activeSetlistId || !isBacktrackPlaying || !isPlaybackDockVisible) return;
    const interval = setInterval(() => {
      broadcastSyncState(true);
    }, 1500);
    return () => clearInterval(interval);
  }, [activeSetlistId, isBacktrackPlaying, isPlaybackDockVisible, broadcastSyncState]);

  // Follower Sync Poller: only active when on an active setlist AND NOT playing local backtrack
  useEffect(() => {
    if (!activeSetlistId || isBacktrackPlaying) {
      if (liveSyncState) setLiveSyncState(null);
      liveSyncClockRef.current = null;
      return;
    }

    let isSubscribed = true;

    const pollSync = async () => {
      try {
        const res = await fetch(`/api/worship/sync?setlistId=${encodeURIComponent(activeSetlistId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed) return;

        const sync = data?.sync;
        if (sync && sync.isPlaying) {
          if (sync.leaderId && currentUser?.id && sync.leaderId === currentUser.id) {
            return;
          }

          // If MD switched to a different song in the setlist, jump to that song immediately
          if (sync.songId && sync.songId !== currentSongRef.current?.id) {
            selectSong(sync.songId);
          }

          // Compensate for network transmission latency or reconnection delay
          const latencySec = Math.max(0, (Date.now() - sync.timestamp) / 1000);
          const calibratedTime = Math.min(sync.duration, sync.currentTime + latencySec);

          liveSyncClockRef.current = {
            baseTime: calibratedTime,
            basePerf: performance.now(),
            duration: sync.duration,
          };

          setLiveSyncState({
            isPlaying: true,
            currentTime: calibratedTime,
            duration: sync.duration,
            leaderName: sync.leaderName || 'MD',
            songId: sync.songId,
            timestamp: sync.timestamp,
          });
        } else {
          if (liveSyncState?.isPlaying) {
            liveSyncClockRef.current = null;
            setLiveSyncState(null);
          }
        }
      } catch (_) {
        // Resilient to offline drops; will jump to current position once reconnected
      }
    };

    pollSync();
    const interval = setInterval(pollSync, 1200);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeSetlistId, isBacktrackPlaying, currentUser?.id, selectSong, liveSyncState?.isPlaying]);

  // High-performance 60fps RAF interpolator for follower smooth teleprompter scrolling
  useEffect(() => {
    if (!liveSyncState?.isPlaying) {
      setLiveInterpolatedTime(0);
      return;
    }

    let animId: number;
    const tick = () => {
      if (liveSyncClockRef.current) {
        const deltaSec = (performance.now() - liveSyncClockRef.current.basePerf) / 1000;
        const current = Math.min(
          liveSyncClockRef.current.duration,
          liveSyncClockRef.current.baseTime + deltaSec
        );
        setLiveInterpolatedTime(current);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [liveSyncState?.isPlaying]);

  const isLiveSyncFollower = Boolean(
    activeSetlistId &&
    !isBacktrackPlaying &&
    liveSyncState?.isPlaying
  );

  const effectivePlaybackState = isLiveSyncFollower && liveSyncState
    ? {
        isPlaying: true,
        currentTime: liveInterpolatedTime,
        duration: liveSyncState.duration,
      }
    : {
        isPlaying: isBacktrackPlaying,
        currentTime: backtrackCurrentTime,
        duration: backtrackDuration,
      };

  const handleSeekBacktrack = useCallback((time: number) => {
    seekBacktrack(time);
    if (activeSetlistId && isPlaybackDockVisible) {
      broadcastSyncState(isBacktrackPlaying, time);
    }
  }, [seekBacktrack, activeSetlistId, isPlaybackDockVisible, isBacktrackPlaying, broadcastSyncState]);

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

  // Hydrate user-level personal strokes from server when song/user changes
  useEffect(() => {
    if (!currentSong?.id || !currentUser?.id || currentUser.role === 'MD') return;
    const sId = currentSong.id;
    const uId = currentUser.id;

    fetch(`/api/worship/drawings?userId=${encodeURIComponent(uId)}&songId=${encodeURIComponent(sId)}`, {
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.strokes) && data.strokes.length > 0) {
          setPersonalStrokesMap((prev) => ({
            ...prev,
            [`${uId}_${sId}`]: data.strokes,
          }));
          try {
            localStorage.setItem(`hgf_user_drawings_${uId}_${sId}`, JSON.stringify(data.strokes));
          } catch (_) {}
          setDrawingSyncTick((prev) => prev + 1);
        }
      })
      .catch(() => {});
  }, [currentSong?.id, currentUser?.id, currentUser?.role]);

  // Bluetooth Pedal Listeners
  useFootPedal({
    onNextSong: nextSong,
    onPrevSong: prevSong,
    onScrollDown: () => {
      const wrapper = document.getElementById('sheetWrapper');
      if (wrapper) {
        const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
        const currentTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop));
        wrapper.scrollTo({ top: Math.min(maxScroll, currentTop + 320), behavior: 'smooth' });
      }
    },
    onScrollUp: () => {
      const wrapper = document.getElementById('sheetWrapper');
      if (wrapper) {
        const maxScroll = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);
        const currentTop = Math.max(0, Math.min(maxScroll, wrapper.scrollTop));
        wrapper.scrollTo({ top: Math.max(0, currentTop - 320), behavior: 'smooth' });
      }
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
    const resolvedTrack: AudioTrack | null = audioTrack
      ? {
          ...audioTrack,
          uploadedBy: audioTrack.uploadedBy || currentUser?.id,
        }
      : null;
    const updatedSong: Song = {
      ...currentSong,
      audioTrack: resolvedTrack,
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
    const songId = currentSong.id;
    lastLocalStrokeTimeRef.current = Date.now();
    const isMd = currentUser?.role === 'MD';

    if (isMd) {
      // ── MD GLOBAL DRAWING LAYER ──
      // When MD draws or erases, update global song strokes for all band members
      const globalStrokes = strokes.filter((s) => s.scope === 'global' || s.role === 'MD');
      currentSong.drawingStrokes = globalStrokes;
      setMdGlobalStrokesMap((prev) => ({
        ...prev,
        [songId]: globalStrokes,
      }));

      try {
        localStorage.setItem(`hgf_md_drawings_${songId}`, JSON.stringify(globalStrokes));
      } catch (_) {}

      // Debounced persist to server so all team members receive MD annotations in real time
      if (drawingSaveTimerRef.current) clearTimeout(drawingSaveTimerRef.current);
      drawingSaveTimerRef.current = setTimeout(async () => {
        try {
          await fetch('/api/worship', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: songId,
              title: currentSong.title,
              drawingStrokes: globalStrokes,
            }),
          });
        } catch (err) {
          console.error('Failed to sync MD drawing strokes to server:', err);
        }
      }, 600);
    } else {
      // ── PERSONAL USER-LEVEL DRAWING LAYER ──
      // When non-MD (e.g. Ryan who is Admin, or any musician) draws, save strictly to personal storage
      const currentUserId = currentUser?.id || 'guest';
      const personalKey = `${currentUserId}_${songId}`;
      const myPersonalStrokes = strokes.filter(
        (s) => s.userId === currentUserId || (!s.userId && s.scope === 'user')
      );

      setPersonalStrokesMap((prev) => ({
        ...prev,
        [personalKey]: myPersonalStrokes,
      }));

      try {
        localStorage.setItem(`hgf_user_drawings_${currentUserId}_${songId}`, JSON.stringify(myPersonalStrokes));
      } catch (_) {}

      // Debounced persist to personal user drawings API
      if (drawingSaveTimerRef.current) clearTimeout(drawingSaveTimerRef.current);
      drawingSaveTimerRef.current = setTimeout(async () => {
        try {
          await fetch('/api/worship/drawings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUserId,
              songId,
              strokes: myPersonalStrokes,
            }),
          });
        } catch (err) {
          console.error('Failed to save user personal drawings:', err);
        }
      }, 600);
    }
  };

  // Real-time synchronization of MD global drawing annotations across devices
  useEffect(() => {
    if (!currentSong?.id) return;

    const syncInterval = setInterval(async () => {
      if (isDrawingActive) return; // Do not interrupt user while actively drawing
      if (Date.now() - lastLocalStrokeTimeRef.current < 6000) return; // Prevent overwriting freshly drawn local strokes
      if (typeof document !== 'undefined' && document.hidden) return; // Pause when tab is backgrounded

      try {
        const res = await fetch(`/api/worship?id=${encodeURIComponent(currentSong.id)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const remoteSong: Song = await res.json();
        if (remoteSong && Array.isArray(remoteSong.drawingStrokes)) {
          const remoteMdStrokes = remoteSong.drawingStrokes.filter(
            (s) => s.scope === 'global' || s.role === 'MD'
          );
          const currentMdStrokes = (currentSong.drawingStrokes || []).filter(
            (s) => s.scope === 'global' || s.role === 'MD'
          );

          const currentJson = JSON.stringify(currentMdStrokes);
          const remoteJson = JSON.stringify(remoteMdStrokes);

          if (currentJson !== remoteJson) {
            currentSong.drawingStrokes = remoteMdStrokes;
            setMdGlobalStrokesMap((prev) => ({
              ...prev,
              [currentSong.id]: remoteMdStrokes,
            }));
            try {
              localStorage.setItem(`hgf_md_drawings_${currentSong.id}`, remoteJson);
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
    setSessionDurationOverrides((prev) => ({
      ...prev,
      [currentSong.id]: newDuration,
    }));
    currentSong.duration = newDuration;

    if (activeSetlistId) {
      setSongSessionOverride(currentSong.id, { duration: newDuration });
    }

    const shouldPersist = savePermanent || currentUser?.role === 'admin' || currentUser?.role === 'MD';
    if (shouldPersist) {
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
    const currentSec = parseDurationToSec(currentSongDuration) || 240;
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
        playbackState={effectivePlaybackState}
        isLiveSyncFollower={isLiveSyncFollower}
        mdLeaderName={liveSyncState?.leaderName}
        bpm={tempo}
        isMetronomePulsing={isPulsing}
        isMetronomeAudioActive={isMetronomeAudioActive}
        onOpenMetronomeModal={() => setIsMetronomeModalOpen(true)}
        isDrawingActive={isDrawingActive}
        onRefresh={refreshData}
        drawingCanvasElement={
          <DrawingCanvas
            key={`drawing_${currentSong?.id}_${currentUser?.id || 'guest'}_${drawingSyncTick}`}
            isActive={isDrawingActive}
            onClose={() => setIsDrawingActive(false)}
            currentUser={currentUser}
            savedStrokes={getActiveDrawingStrokes(currentSong?.id)}
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
        hasPlaybackDock={isPlaybackDockVisible}
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
        hasPlaybackDock={isPlaybackDockVisible}
        scrollMode={scrollMode}
        onToggleScrollMode={() => setScrollMode((prev) => (prev === 'duration' ? 'speed' : 'duration'))}
        duration={currentSongDuration}
        elapsedSeconds={elapsedScrollSeconds}
        targetDurationSec={targetDurationSec}
        onOpenDurationPicker={() => setIsDurationModalOpen(true)}
        onStepDurationSeconds={handleStepDuration}
      />

      {/* FLOATING AUDIO SCRUBBER DOCK */}
      {isPlaybackDockVisible && (
        <AudioPlaybackDock
          isVisible={isPlaybackDockVisible}
          isPlaying={isBacktrackPlaying}
          currentTime={backtrackCurrentTime}
          duration={backtrackDuration}
          onTogglePlay={toggleBacktrackPlay}
          onSeek={handleSeekBacktrack}
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
        currentUser={currentUser}
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
        currentDuration={currentSongDuration}
        songTitle={currentSong?.title}
        onApplyDuration={handleApplyDuration}
        isBandAdmin={currentUser?.role === 'admin' || currentUser?.role === 'MD'}
      />
    </div>
  );
}
