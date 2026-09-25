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

  // Central MD Role Authority: Ren / MD authority across session, user profile, and aliases
  const isUserMD = Boolean(
    (currentUser?.role || '').toUpperCase() === 'MD' ||
    (currentUser?.username || '').toLowerCase() === 'ren' ||
    (currentUser?.username || '').toLowerCase().includes('ren') ||
    (currentUser?.displayName || '').toLowerCase().includes('(md)') ||
    ((currentUser as any)?.aliases || []).some((a: string) => a.toLowerCase().includes('ren')) ||
    (session?.user?.name || '').toLowerCase().includes('renz') ||
    (session?.user?.name || '').toLowerCase().includes('ren ') ||
    ((session?.user as any)?.username || '').toLowerCase().includes('ren') ||
    ((session?.user as any)?.role || '').toUpperCase() === 'MD'
  );

  // Scope backtrack playback dock: strictly visible to MDs (Musical Directors) only
  const isPlaybackDockVisible = useMemo(() => {
    if (!hasAudio || !currentSong?.audioTrack) return false;
    return isUserMD;
  }, [hasAudio, currentSong?.audioTrack, isUserMD]);

  // Permanently disable native Android SwipeRefreshLayout in HGFBandApp APK bridge
  useEffect(() => {
    const disableAndroidSwipe = () => {
      try {
        if (typeof window !== 'undefined' && (window as any).AndroidBand?.setSwipeRefreshEnabled) {
          (window as any).AndroidBand.setSwipeRefreshEnabled(false);
        }
      } catch (_) {}
    };

    disableAndroidSwipe();
    const interval = setInterval(disableAndroidSwipe, 1000);
    window.addEventListener('touchstart', disableAndroidSwipe, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('touchstart', disableAndroidSwipe);
    };
  }, []);

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
            matched = list.find((u) => {
              const uName = u.username.toLowerCase();
              const dName = u.displayName.toLowerCase();
              const aliases = (u as any).aliases || [];
              return (
                dName.includes(matchFirstName) ||
                uName === matchFirstName ||
                aliases.some((a: string) => a.toLowerCase() === matchUsername || a.toLowerCase() === matchFirstName) ||
                (matchFirstName.startsWith('ren') && (uName === 'ren' || dName.includes('ren')))
              );
            });
          }
          if (!matched && (matchUsername.includes('ren') || matchFirstName.startsWith('ren'))) {
            matched = list.find((u) => u.username === 'ren' || u.role === 'MD');
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

  // One-time client purge of legacy drawing artifacts
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const purgeKey = 'hgf_drawings_clean_v2687';
      if (!localStorage.getItem(purgeKey)) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('hgf_drawings_') || k.startsWith('hgf_user_drawings_') || k.startsWith('hgf_md_drawings_'))) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(purgeKey, 'true');
      }
    } catch (_) {}
  }, []);

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
    const isMd = isUserMD;

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
        }
      } catch (_) {}
    }

    // Non-MD user sees MD's global strokes PLUS their own personal annotations on top!
    return [...mdStrokes, ...myPersonalStrokes];
  }, [currentUser, isUserMD, mdGlobalStrokesMap, personalStrokesMap, currentSong]);

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

  // Clean Stage Immersion Mode (double-tap anywhere to hide all toolbars, sidebar, docks)
  const [isImmersionMode, setIsImmersionMode] = useState<boolean>(false);
  const [isImmersionPlaybackExpanded, setIsImmersionPlaybackExpanded] = useState<boolean>(false);
  const [immersionToast, setImmersionToast] = useState<string | null>(null);
  const lastToggleImmersionTimeRef = useRef<number>(0);

  const handleToggleImmersionMode = useCallback(() => {
    const now = Date.now();
    // 450ms debounce cooldown: strictly prevents duplicate triggers, bounce, and rapid toggling
    if (now - lastToggleImmersionTimeRef.current < 450) return;
    lastToggleImmersionTimeRef.current = now;

    setIsImmersionMode((prev) => {
      const next = !prev;
      if (next) {
        setIsSidebarOpen(false);
        setIsImmersionPlaybackExpanded(false);
        setImmersionToast('✨ Stage Immersion Mode — Tap "Show Tools" or double-tap to restore');
        setTimeout(() => setImmersionToast(null), 2500);
      } else {
        setImmersionToast(null);
      }
      return next;
    });
  }, []);

  // Floating Force Clear Cache & Refresh Sheets
  const [isForceRefreshing, setIsForceRefreshing] = useState<boolean>(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);

  const handleForceRefreshApp = useCallback(async () => {
    setIsForceRefreshing(true);
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
            await Promise.all(keys.filter((k) => k.includes('hgf-connect') || k.includes('band')).map((k) => caches.delete(k)));
          } catch (_) {}
        }
      }
      await refreshData();
      setRefreshToast('✅ Sheet lyrics & app updated!');
      setTimeout(() => setRefreshToast(null), 2500);
    } catch (err) {
      console.error('Refresh error:', err);
      setRefreshToast('⚠️ Update failed, retrying...');
      setTimeout(() => setRefreshToast(null), 2000);
    } finally {
      setIsForceRefreshing(false);
    }
  }, [refreshData]);

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
  // Dynamically resolve active setlist ID or discover the setlist containing the current song
  const effectiveSetlistId = useMemo(() => {
    if (activeSetlistId) return activeSetlistId;
    if (currentSong?.id && setlists.length > 0) {
      const found = setlists.find((s) => s.songs && s.songs.some((item) => {
        const sid = typeof item === 'string' ? item : item.id;
        return sid === currentSong.id;
      }));
      if (found) return found.id;
    }
    return null;
  }, [activeSetlistId, currentSong?.id, setlists]);

  const effectiveSetlistIdRef = useRef<string | null>(effectiveSetlistId);
  effectiveSetlistIdRef.current = effectiveSetlistId;

  // Planned arrangement duration in seconds:
  // Automatically defaults to audio playback duration (e.g. 8:09) if present,
  // falling back to song's saved duration or 4:00, with user session overrides taking precedence.
  const currentSongDuration = useMemo(() => {
    if (currentSong?.id && sessionDurationOverrides[currentSong.id]) {
      return sessionDurationOverrides[currentSong.id];
    }
    // 1. Backtrack audio element loaded duration (> 5s)
    if (backtrackDuration && backtrackDuration > 5) {
      return formatSecToMMSS(Math.round(backtrackDuration));
    }
    // 2. AudioTrack saved metadata duration (> 5s)
    const audioTrackDur = currentSong?.audioTrack?.durationSec || (currentSong?.audioTrack as any)?.duration;
    if (audioTrackDur && audioTrackDur > 5) {
      return formatSecToMMSS(Math.round(audioTrackDur));
    }
    // 3. Fallback to song duration if saved
    if (currentSong?.duration) {
      return currentSong.duration;
    }
    return '4:00';
  }, [currentSong?.id, currentSong?.duration, currentSong?.audioTrack, sessionDurationOverrides, backtrackDuration]);
  const targetDurationSec = parseDurationToSec(currentSongDuration) || 240;

  // MD Master Broadcaster: transmits play/pause/seek to band members viewing the same setlist
  const broadcastSyncState = useCallback((playing: boolean, timeOverride?: number) => {
    const targetSetlistId = effectiveSetlistIdRef.current;
    if (!targetSetlistId || !currentSongRef.current?.id || !isUserMD) return;
    const time = timeOverride !== undefined ? timeOverride : backtrackCurrentTimeRef.current;
    const dur = backtrackDurationRef.current || parseDurationToSec(currentSongRef.current?.duration || '4:00') || 240;
    const leaderName = currentUser?.displayName || currentUser?.username || 'Ren (MD)';

    fetch('/api/worship/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        setlistId: targetSetlistId,
        songId: currentSongRef.current.id,
        isPlaying: playing,
        currentTime: time,
        duration: dur,
        leaderId: currentUser?.id || 'user-ren',
        leaderName,
      }),
    }).catch(() => {});
  }, [currentUser, isUserMD]);

  // Handle immediate play/pause toggle from MD AudioPlaybackDock
  const handleToggleBacktrackPlay = useCallback(() => {
    const willPlay = !isBacktrackPlaying;
    toggleBacktrackPlay();
    if (effectiveSetlistId && isUserMD && currentSong?.id) {
      broadcastSyncState(willPlay);
    }
  }, [toggleBacktrackPlay, isBacktrackPlaying, effectiveSetlistId, isUserMD, currentSong?.id, broadcastSyncState]);

  // Transmit immediate play / pause broadcast when playback state changes
  useEffect(() => {
    if (!effectiveSetlistId || !isUserMD) return;
    broadcastSyncState(isBacktrackPlaying);
  }, [isBacktrackPlaying, effectiveSetlistId, isUserMD, broadcastSyncState]);

  // Transmit periodic 1.5s heartbeat while MD playback is active
  useEffect(() => {
    if (!effectiveSetlistId || !isBacktrackPlaying || !isUserMD) return;
    const interval = setInterval(() => {
      broadcastSyncState(true);
    }, 1500);
    return () => clearInterval(interval);
  }, [effectiveSetlistId, isBacktrackPlaying, isUserMD, broadcastSyncState]);

  // Reference to latest liveSyncState without triggering effect rebuilds
  const liveSyncStateRef = useRef<LiveSyncState | null>(null);
  liveSyncStateRef.current = liveSyncState;

  // Follower Sync Poller: active ONLY when viewing an active setlist (outside setlist is untouched)
  useEffect(() => {
    // If not on an active setlist, or if user is an MD actively playing their own master audio, do not follow
    if (!effectiveSetlistId || (isUserMD && isBacktrackPlaying)) {
      if (liveSyncStateRef.current) {
        liveSyncClockRef.current = null;
        liveSyncStateRef.current = null;
        setLiveSyncState(null);
      }
      return;
    }

    let isSubscribed = true;

    const pollSync = async () => {
      try {
        const res = await fetch(`/api/worship/sync?setlistId=${encodeURIComponent(effectiveSetlistId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed) return;

        const sync = data?.sync;
        if (sync && sync.isPlaying) {
          // Do not follow oneself
          const isSelf = (sync.leaderId && currentUser?.id && sync.leaderId === currentUser.id) ||
            (isUserMD && isBacktrackPlaying);
          if (isSelf) return;

          // If MD switched to or played a different song in the setlist, FORCE transfer follower immediately
          if (sync.songId && sync.songId !== currentSongRef.current?.id) {
            selectSong(sync.songId);
            currentSongRef.current = { ...(currentSongRef.current || {}), id: sync.songId } as any;
            if (typeof window !== 'undefined') {
              localStorage.setItem('hgf_band_active_song_id', sync.songId);
            }
            // If follower was running local playback on a different song, stop it so MD audio commands stage
            if (isBacktrackPlaying) {
              toggleBacktrackPlay();
            }
          }

          // Compensate for network transmission latency or intermittent connection recovery
          const latencySec = Math.max(0, (Date.now() - sync.timestamp) / 1000);
          const targetDur = sync.duration || parseDurationToSec(currentSongRef.current?.duration || '4:00') || 240;
          const calibratedTime = Math.min(targetDur, sync.currentTime + latencySec);

          liveSyncClockRef.current = {
            baseTime: calibratedTime,
            basePerf: performance.now(),
            duration: targetDur,
          };

          const nextSyncState: LiveSyncState = {
            isPlaying: true,
            currentTime: calibratedTime,
            duration: targetDur,
            leaderName: sync.leaderName || 'MD',
            songId: sync.songId,
            timestamp: sync.timestamp,
          };
          liveSyncStateRef.current = nextSyncState;
          setLiveSyncState(nextSyncState);
        } else {
          // MD paused or stopped playback
          if (liveSyncStateRef.current?.isPlaying) {
            liveSyncClockRef.current = null;
            liveSyncStateRef.current = null;
            setLiveSyncState(null);
          }
        }
      } catch (_) {
        // Resilient to offline drops; will jump to current position once reconnected
      }
    };

    pollSync();
    // Sub-second 600ms polling for instantaneous stage reaction
    const interval = setInterval(pollSync, 600);

    // Instant polling trigger on reconnection / phone wake-up
    const handleReconnect = () => {
      pollSync();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollSync();
      }
    };

    window.addEventListener('online', handleReconnect);
    window.addEventListener('focus', handleReconnect);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      window.removeEventListener('online', handleReconnect);
      window.removeEventListener('focus', handleReconnect);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [effectiveSetlistId, isBacktrackPlaying, isUserMD, currentUser?.id, selectSong, toggleBacktrackPlay]);

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
    effectiveSetlistId &&
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
    if (effectiveSetlistId && isUserMD) {
      broadcastSyncState(isBacktrackPlaying, time);
    }
  }, [seekBacktrack, effectiveSetlistId, isUserMD, isBacktrackPlaying, broadcastSyncState]);

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
    if (!currentSong?.id || !currentUser?.id || isUserMD) return;
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
    const isBandAdmin = currentUser?.role === 'admin' || isUserMD;
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
    const isMd = isUserMD;

    if (isMd) {
      // ── MD GLOBAL DRAWING LAYER ──
      // When MD draws or erases, update global song strokes for all band members
      const globalStrokes = strokes.map((s) => ({
        ...s,
        scope: 'global' as const,
        role: 'MD',
        userId: currentUser?.id || 'user-ren',
        authorName: currentUser?.displayName || currentUser?.username || 'Ren (MD)',
      }));
      currentSong.drawingStrokes = globalStrokes;
      setMdGlobalStrokesMap((prev) => ({
        ...prev,
        [songId]: globalStrokes,
      }));

      try {
        localStorage.setItem(`hgf_md_drawings_${songId}`, JSON.stringify(globalStrokes));
      } catch (_) {}

      // Instant live broadcast to in-memory endpoint for sub-second livestream feel
      fetch('/api/worship/drawings/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId,
          strokes: globalStrokes,
          role: 'MD',
          authorId: currentUser?.id || 'user-ren',
          authorName: currentUser?.displayName || currentUser?.username || 'Ren (MD)',
        }),
      }).catch(() => {});

      // Debounced persist to server so all team members receive MD annotations in database
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
      }, 1000);
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

  // Follower Live Drawing Poller: fetches MD whiteboard strokes live (sub-second streaming)
  useEffect(() => {
    if (!currentSong?.id || isUserMD) return;
    const songId = currentSong.id;
    let isSubscribed = true;

    const pollLiveDrawings = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (Date.now() - lastLocalStrokeTimeRef.current < 2000) return;

      try {
        const res = await fetch(`/api/worship/drawings/live?songId=${encodeURIComponent(songId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!isSubscribed) return;

        if (Array.isArray(data?.strokes)) {
          setMdGlobalStrokesMap((prev) => {
            const existing = prev[songId] || [];
            if (existing.length !== data.strokes.length || JSON.stringify(existing) !== JSON.stringify(data.strokes)) {
              return { ...prev, [songId]: data.strokes };
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    pollLiveDrawings();
    const interval = setInterval(pollLiveDrawings, 400);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [currentSong?.id, isUserMD]);

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

    const shouldPersist = savePermanent || currentUser?.role === 'admin' || isUserMD;
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
        overscrollBehavior: 'none',
        overscrollBehaviorY: 'none',
        backgroundColor: '#0a0d14',
      }}
    >
      {/* TOPBAR */}
      {!isImmersionMode && (
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
          isUserMD={isUserMD}
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
      )}

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
        onDoubleTap={handleToggleImmersionMode}
        isImmersionMode={isImmersionMode}
        drawingCanvasElement={
          <DrawingCanvas
            key={`drawing_${currentSong?.id}_${currentUser?.id || 'guest'}`}
            isActive={isDrawingActive}
            onClose={() => setIsDrawingActive(false)}
            currentUser={currentUser}
            savedStrokes={getActiveDrawingStrokes(currentSong?.id)}
            onSaveStrokes={handleSaveStrokes}
          />
        }
      />

      {/* FLOATING NAVIGATION DOCK */}
      {!isImmersionMode && (
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
          onForceRefresh={handleForceRefreshApp}
          isForceRefreshing={isForceRefreshing}
        />
      )}

      {/* AUTO-SCROLL CONTROL BAR */}
      {!isImmersionMode && (
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
      )}

      {/* FLOATING AUDIO SCRUBBER DOCK (Standard Stage Mode - MD Only) */}
      {!isImmersionMode && isPlaybackDockVisible && (
        <AudioPlaybackDock
          isVisible={isPlaybackDockVisible}
          isPlaying={isBacktrackPlaying}
          currentTime={backtrackCurrentTime}
          duration={backtrackDuration}
          onTogglePlay={handleToggleBacktrackPlay}
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

      {/* IMMERSION MODE FLOATING PLAYBACK PULL-PILL (MD Only) */}
      {isImmersionMode && isPlaybackDockVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 85,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            maxWidth: '94vw',
          }}
        >
          {isImmersionPlaybackExpanded && (
            <div style={{ marginBottom: 4, width: 'min(94vw, 560px)' }}>
              <AudioPlaybackDock
                isVisible={true}
                isPlaying={isBacktrackPlaying}
                currentTime={backtrackCurrentTime}
                duration={backtrackDuration}
                onTogglePlay={handleToggleBacktrackPlay}
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
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsImmersionPlaybackExpanded((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 24,
              backgroundColor: 'rgba(15, 23, 42, 0.94)',
              border: '1px solid rgba(78, 177, 203, 0.45)',
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.65)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🎧</span>
            <span style={{ color: '#4EB1CB', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
              {formatSecToMMSS(Math.round(backtrackCurrentTime))} / {formatSecToMMSS(Math.round(backtrackDuration || targetDurationSec))}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginLeft: 4 }}>
              {isImmersionPlaybackExpanded ? '▼ Hide' : '▲ Player'}
            </span>
          </button>
        </div>
      )}

      {/* IMMERSION MODE FLOATING "SHOW TOOLS" RESTORE BUTTON */}
      {isImmersionMode && (
        <button
          type="button"
          onClick={handleToggleImmersionMode}
          title="Restore toolbars, sidebar, and controls"
          style={{
            position: 'fixed',
            top: 'calc(14px + env(safe-area-inset-top, 0px))',
            right: '16px',
            zIndex: 95,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: '20px',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(78, 177, 203, 0.5)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.65)',
            color: '#38bdf8',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>👁️</span>
          <span>Show Tools</span>
        </button>
      )}

      {/* IMMERSION MODE TOAST NOTIFICATION */}
      {immersionToast && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            color: '#4EB1CB',
            border: '1px solid rgba(78, 177, 203, 0.45)',
            padding: '8px 20px',
            borderRadius: '24px',
            fontSize: '0.84rem',
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            pointerEvents: 'none',
          }}
        >
          {immersionToast}
        </div>
      )}

      {/* REFRESH TOAST NOTIFICATION */}
      {refreshToast && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.45)',
            padding: '8px 20px',
            borderRadius: '24px',
            fontSize: '0.84rem',
            fontWeight: 700,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            pointerEvents: 'none',
          }}
        >
          {refreshToast}
        </div>
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
        isBandAdmin={isUserMD}
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
        isOpen={isAudioStorageOpen && isUserMD}
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
        isBandAdmin={currentUser?.role === 'admin' || isUserMD}
      />

      {/* Arrangement Duration Picker Modal */}
      <DurationPickerModal
        isOpen={isDurationModalOpen}
        onClose={() => setIsDurationModalOpen(false)}
        currentDuration={currentSongDuration}
        songTitle={currentSong?.title}
        onApplyDuration={handleApplyDuration}
        isBandAdmin={currentUser?.role === 'admin' || isUserMD}
      />
    </div>
  );
}
