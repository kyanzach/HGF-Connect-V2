// app/band/hooks/useSetlist.ts
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Song, Setlist, SetlistSongItem } from '../types/band';
import { getSongsOffline, saveSongsOffline } from '../lib/offlineStorage';

const STORAGE_ACTIVE_SETLIST = 'hgf_band_active_setlist_id';
const STORAGE_ACTIVE_SONG = 'hgf_band_active_song_id';
const STORAGE_LOCAL_SONGS = 'hgf_band_songs';
const STORAGE_LOCAL_SETLISTS = 'hgf_band_setlists';
const STORAGE_SESSION_KEYS = 'hgf_band_session_keys';

export interface SessionSongOverride {
  key?: string;
  tempo?: number;
  timeSignature?: string;
  capo?: string | number;
  duration?: string;
}

export function useSetlist() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [setlistSessionOverrides, setSetlistSessionOverrides] = useState<Record<string, SessionSongOverride>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Mutation lockouts to prevent background polling from overwriting instant local operations
  const lastSetlistMutationTimeRef = useRef<number>(0);
  const lastSongMutationTimeRef = useRef<number>(0);

  // Restore instantly from localStorage on mount (0ms latency for offline/slow connections)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cachedSongs = localStorage.getItem(STORAGE_LOCAL_SONGS);
      if (cachedSongs) {
        const parsed = JSON.parse(cachedSongs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSongs(parsed);
          setIsLoading(false);
        }
      }
      const cachedSetlists = localStorage.getItem(STORAGE_LOCAL_SETLISTS);
      if (cachedSetlists) {
        const parsed = JSON.parse(cachedSetlists);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSetlists(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // Fetch all songs and setlists from server
  const refreshData = useCallback(async () => {
    try {
      // 1. Fetch songs
      const songsRes = await fetch('/api/worship', { cache: 'no-store' });
      if (songsRes.ok) {
        const remoteSongs: Song[] = await songsRes.json();
        // Only overwrite if not within a recent local song mutation window
        if (Date.now() - lastSongMutationTimeRef.current > 8000) {
          setSongs(remoteSongs);
          saveSongsOffline(remoteSongs).catch(() => {});
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_LOCAL_SONGS, JSON.stringify(remoteSongs));
          }
        }
      } else {
        const offline = await getSongsOffline();
        if (offline.length) setSongs(offline);
      }

      // 2. Fetch setlists
      const setlistsRes = await fetch('/api/worship/setlists', { cache: 'no-store' });
      if (setlistsRes.ok) {
        const remoteSetlists: Setlist[] = await setlistsRes.json();
        // Only overwrite if not within a recent local setlist mutation window
        if (Date.now() - lastSetlistMutationTimeRef.current > 8000) {
          setSetlists(remoteSetlists);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_LOCAL_SETLISTS, JSON.stringify(remoteSetlists));
          }
        }
      }
    } catch (_) {
      const offline = await getSongsOffline();
      if (offline.length) setSongs(offline);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Background auto-sync polling for setlist & song changes made by MD across all devices
  useEffect(() => {
    let isMounted = true;

    const silentPoll = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const [songsRes, setlistsRes] = await Promise.all([
          fetch('/api/worship', { cache: 'no-store' }),
          fetch('/api/worship/setlists', { cache: 'no-store' }),
        ]);
        if (!isMounted) return;

        // Skip updating songs if local user just imported or added a song (< 8s ago)
        if (songsRes.ok && Date.now() - lastSongMutationTimeRef.current > 8000) {
          const remoteSongs: Song[] = await songsRes.json();
          setSongs((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(remoteSongs)) {
              saveSongsOffline(remoteSongs).catch(() => {});
              if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_LOCAL_SONGS, JSON.stringify(remoteSongs));
              }
              return remoteSongs;
            }
            return prev;
          });
        }

        // Skip updating setlists if local user just reordered or changed setlist (< 8s ago)
        if (setlistsRes.ok && Date.now() - lastSetlistMutationTimeRef.current > 8000) {
          const remoteSetlists: Setlist[] = await setlistsRes.json();
          setSetlists((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(remoteSetlists)) {
              if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_LOCAL_SETLISTS, JSON.stringify(remoteSetlists));
              }
              return remoteSetlists;
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    const intervalId = setInterval(silentPoll, 4000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Restore saved active setlist and initial song
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSetId = localStorage.getItem(STORAGE_ACTIVE_SETLIST);
    if (savedSetId) {
      setActiveSetlistId(savedSetId);
    }
    const savedSongId = localStorage.getItem(STORAGE_ACTIVE_SONG);
    if (savedSongId) {
      setCurrentSongId(savedSongId);
    }
  }, []);

  const activeSetlist = useMemo(() => {
    if (!activeSetlistId) return null;
    return setlists.find((s) => s.id === activeSetlistId) || null;
  }, [activeSetlistId, setlists]);

  // Lineup of songs in the current view
  const currentLineup = useMemo<Song[]>(() => {
    if (!activeSetlist) return songs;
    const items = activeSetlist.songs || [];
    const lineup: Song[] = [];

    items.forEach((item) => {
      const sId = typeof item === 'string' ? item : item.id;
      const found = songs.find((s) => s.id === sId);
      if (found) {
        // Apply MD setlist key, bpm, and timeSignature preferences
        const mdKey = typeof item === 'object' && item.key ? item.key : found.key;
        const mdCapo = typeof item === 'object' && item.capo !== undefined ? item.capo : found.capo;
        const mdTempo = typeof item === 'object' && item.tempo !== undefined ? item.tempo : found.tempo;
        const mdTimeSig = typeof item === 'object' && item.timeSignature ? item.timeSignature : found.timeSignature;
        const mdChords = typeof item === 'object' && item.chords ? item.chords : found.chords;
        const mdDuration = typeof item === 'object' && item.duration ? item.duration : found.duration;
        const mdAudioTrack = typeof item === 'object' && item.audioTrack ? item.audioTrack : found.audioTrack;

        // Check if there is an active session override for this setlist
        const override = setlistSessionOverrides[`${activeSetlist.id}_${found.id}`];
        lineup.push({
          ...found,
          chords: mdChords,
          key: override?.key || mdKey,
          originalKey: found.originalKey || found.key || 'C',
          capo: override?.capo !== undefined ? override.capo : mdCapo,
          tempo: override?.tempo !== undefined ? override.tempo : mdTempo,
          timeSignature: override?.timeSignature || mdTimeSig,
          duration: override?.duration || mdDuration || found.duration,
          audioTrack: mdAudioTrack || found.audioTrack,
        });
      }
    });

    return lineup;
  }, [activeSetlist, songs, setlistSessionOverrides]);

  // Set initial song once lineup is loaded
  useEffect(() => {
    if (isLoading) return;
    if (currentLineup.length === 0 && songs.length === 0) return;

    const isValid = currentSongId && (currentLineup.some((s) => s.id === currentSongId) || songs.some((s) => s.id === currentSongId));

    if (!isValid) {
      let targetId = currentLineup[0]?.id || songs[0]?.id;
      if (typeof window !== 'undefined') {
        const savedSongId = localStorage.getItem(STORAGE_ACTIVE_SONG);
        if (savedSongId && (currentLineup.some((s) => s.id === savedSongId) || songs.some((s) => s.id === savedSongId))) {
          targetId = savedSongId;
        }
      }
      if (targetId) {
        setCurrentSongId(targetId);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_ACTIVE_SONG, targetId);
        }
      }
    }
  }, [currentLineup, currentSongId, isLoading, songs]);

  const currentSong = useMemo(() => {
    if (!currentSongId) return currentLineup[0] || songs[0] || null;
    const inLineup = currentLineup.find((s) => s.id === currentSongId);
    if (inLineup) return inLineup;
    const inLibrary = songs.find((s) => s.id === currentSongId);
    if (inLibrary) return inLibrary;
    return currentLineup[0] || songs[0] || null;
  }, [currentSongId, currentLineup, songs]);

  const currentIndex = useMemo(() => {
    if (!currentSong) return 0;
    return currentLineup.findIndex((s) => s.id === currentSong.id);
  }, [currentSong, currentLineup]);

  // Official MD / Worship Leader defaults for the active song inside the active setlist
  const activeSongMdDefaults = useMemo(() => {
    if (!activeSetlist || !currentSong) return null;
    const item = (activeSetlist.songs || []).find((it) =>
      typeof it === 'string' ? it === currentSong.id : it.id === currentSong.id
    );
    if (!item) return null;
    const foundInLibrary = songs.find((s) => s.id === currentSong.id);
    return {
      key: typeof item === 'object' && item.key ? item.key : foundInLibrary?.key || currentSong.key,
      tempo: typeof item === 'object' && item.tempo !== undefined ? item.tempo : foundInLibrary?.tempo || currentSong.tempo || 72,
      timeSignature: typeof item === 'object' && item.timeSignature ? item.timeSignature : foundInLibrary?.timeSignature || currentSong.timeSignature || '4/4',
      capo: typeof item === 'object' && item.capo !== undefined ? item.capo : foundInLibrary?.capo || currentSong.capo || 0,
      duration: typeof item === 'object' && item.duration ? item.duration : foundInLibrary?.duration || currentSong.duration || '',
    };
  }, [activeSetlist, currentSong, songs]);

  const isCurrentSongSessionOverridden = useMemo(() => {
    if (!activeSetlist || !currentSong || !activeSongMdDefaults) return false;
    const override = setlistSessionOverrides[`${activeSetlist.id}_${currentSong.id}`];
    return Boolean(override?.key && override.key !== activeSongMdDefaults.key);
  }, [activeSetlist, currentSong, setlistSessionOverrides, activeSongMdDefaults]);

  const selectSong = useCallback((songId: string) => {
    setCurrentSongId(songId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_ACTIVE_SONG, songId);
    }
  }, []);

  const selectSetlist = useCallback((setId: string | null) => {
    setActiveSetlistId(setId);
    setSetlistSessionOverrides({});
    if (typeof window !== 'undefined') {
      if (setId) localStorage.setItem(STORAGE_ACTIVE_SETLIST, setId);
      else localStorage.removeItem(STORAGE_ACTIVE_SETLIST);
    }
    if (setId) {
      const target = setlists.find((s) => s.id === setId);
      if (target && target.songs && target.songs.length > 0) {
        // If currently viewed song is already part of the target setlist, keep viewing it!
        const isCurrentInTarget = currentSongId && target.songs.some((it) =>
          (typeof it === 'string' ? it : it.id) === currentSongId
        );
        if (!isCurrentInTarget) {
          const first = target.songs[0];
          const firstId = typeof first === 'string' ? first : first.id;
          setCurrentSongId(firstId);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_ACTIVE_SONG, firstId);
          }
        }
      }
    }
  }, [setlists, currentSongId]);

  const nextSong = useCallback(() => {
    if (currentIndex < currentLineup.length - 1) {
      const nextId = currentLineup[currentIndex + 1].id;
      setCurrentSongId(nextId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_ACTIVE_SONG, nextId);
      }
    }
  }, [currentIndex, currentLineup]);

  const prevSong = useCallback(() => {
    if (currentIndex > 0) {
      const prevId = currentLineup[currentIndex - 1].id;
      setCurrentSongId(prevId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_ACTIVE_SONG, prevId);
      }
    }
  }, [currentIndex, currentLineup]);

  const setSongSessionOverride = useCallback((songId: string, override: SessionSongOverride) => {
    if (!activeSetlistId) return;
    const token = `${activeSetlistId}_${songId}`;
    setSetlistSessionOverrides((prev) => ({
      ...prev,
      [token]: { ...(prev[token] || {}), ...override },
    }));
  }, [activeSetlistId]);

  const revertToMdDefault = useCallback((songId: string) => {
    if (!activeSetlistId) return;
    const token = `${activeSetlistId}_${songId}`;
    setSetlistSessionOverrides((prev) => {
      const next = { ...prev };
      delete next[token];
      return next;
    });
  }, [activeSetlistId]);

  // Backward compatibility alias
  const setSongSessionKey = useCallback((songId: string, key: string) => {
    setSongSessionOverride(songId, { key });
  }, [setSongSessionOverride]);

  const addSongToSetlist = useCallback(async (songId: string, setlistId?: string) => {
    const targetSetId = setlistId || activeSetlistId;
    if (!targetSetId) return;
    const targetSet = setlists.find((s) => s.id === targetSetId);
    if (!targetSet) return;

    const existingSongs = targetSet.songs || [];
    const alreadyIn = existingSongs.some((it) => (typeof it === 'string' ? it === songId : it.id === songId));
    if (alreadyIn) return;

    lastSetlistMutationTimeRef.current = Date.now();

    const foundSong = songs.find((s) => s.id === songId);
    const newItem: SetlistSongItem = foundSong
      ? {
          id: foundSong.id,
          title: foundSong.title,
          key: foundSong.key,
          capo: foundSong.capo,
          tempo: typeof foundSong.tempo === 'number' ? foundSong.tempo : undefined,
          timeSignature: foundSong.timeSignature,
          chords: foundSong.chords,
          duration: foundSong.duration,
        }
      : { id: songId };
    const updatedSongs = [...existingSongs, newItem];
    const updatedSetlist: Setlist = {
      ...targetSet,
      songs: updatedSongs,
      songCount: updatedSongs.length,
      updatedAt: Date.now(),
    };

    // Optimistically update in-memory state and localStorage
    const newSetlists = setlists.map((s) => (s.id === targetSetId ? updatedSetlist : s));
    setSetlists(newSetlists);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LOCAL_SETLISTS, JSON.stringify(newSetlists));
      } catch (_) {}
    }

    try {
      await fetch('/api/worship/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSetlist),
      });
    } catch (err) {
      console.error('Failed to sync added song to setlist on server:', err);
    }
  }, [activeSetlistId, setlists, songs]);

  const removeSongFromSetlist = useCallback(async (songId: string, setlistId?: string) => {
    const targetSetId = setlistId || activeSetlistId;
    if (!targetSetId) return;
    const targetSet = setlists.find((s) => s.id === targetSetId);
    if (!targetSet) return;

    lastSetlistMutationTimeRef.current = Date.now();

    const existingSongs = targetSet.songs || [];
    const updatedSongs = existingSongs.filter((it) => (typeof it === 'string' ? it !== songId : it.id !== songId));
    const updatedSetlist: Setlist = {
      ...targetSet,
      songs: updatedSongs,
      songCount: updatedSongs.length,
      updatedAt: Date.now(),
    };

    // Optimistically update in-memory state and localStorage
    const newSetlists = setlists.map((s) => (s.id === targetSetId ? updatedSetlist : s));
    setSetlists(newSetlists);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LOCAL_SETLISTS, JSON.stringify(newSetlists));
      } catch (_) {}
    }

    try {
      await fetch('/api/worship/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSetlist),
      });
    } catch (err) {
      console.error('Failed to sync song removal from setlist on server:', err);
    }
  }, [activeSetlistId, setlists]);

  const reorderSongInSetlist = useCallback(async (fromIndex: number, toIndex: number, setlistId?: string) => {
    const targetSetId = setlistId || activeSetlistId;
    if (!targetSetId) return;
    const targetSet = setlists.find((s) => s.id === targetSetId);
    if (!targetSet || !Array.isArray(targetSet.songs)) return;
    if (fromIndex < 0 || fromIndex >= targetSet.songs.length) return;
    if (toIndex < 0 || toIndex >= targetSet.songs.length) return;
    if (fromIndex === toIndex) return;

    lastSetlistMutationTimeRef.current = Date.now();

    const updatedSongs = [...targetSet.songs];
    const [moved] = updatedSongs.splice(fromIndex, 1);
    updatedSongs.splice(toIndex, 0, moved);

    const updatedSetlist: Setlist = {
      ...targetSet,
      songs: updatedSongs,
      songCount: updatedSongs.length,
      updatedAt: Date.now(),
    };

    // Optimistically update in-memory state and localStorage for instant 0ms snappy response
    const newSetlists = setlists.map((s) => (s.id === targetSetId ? updatedSetlist : s));
    setSetlists(newSetlists);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_LOCAL_SETLISTS, JSON.stringify(newSetlists));
      } catch (_) {}
    }

    // Background sync to server without disruptive refreshData() to eliminate flicker/bounceback
    try {
      await fetch('/api/worship/setlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSetlist),
      });
    } catch (err) {
      console.error('Failed to sync setlist reorder to server:', err);
    }
  }, [activeSetlistId, setlists]);

  // Instant optimistic ingestion for newly scraped or created songs
  const optimisticAddSong = useCallback(
    async (newSong: Song, targetSetlistId?: string) => {
      lastSongMutationTimeRef.current = Date.now();

      // 1. Instantly inject into songs state and local storage
      setSongs((prev) => {
        const next = [newSong, ...prev.filter((s) => s.id !== newSong.id)];
        saveSongsOffline(next).catch(() => {});
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_LOCAL_SONGS, JSON.stringify(next));
          } catch (_) {}
        }
        return next;
      });

      // 2. Select the song immediately
      setCurrentSongId(newSong.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_ACTIVE_SONG, newSong.id);
      }

      // 3. If target setlist is provided, add song to setlist immediately
      let updatedSetlist: Setlist | null = null;
      if (targetSetlistId) {
        lastSetlistMutationTimeRef.current = Date.now();
        const targetSet = setlists.find((s) => s.id === targetSetlistId);
        if (targetSet) {
          const existingSongs = targetSet.songs || [];
          const newItem: SetlistSongItem = {
            id: newSong.id,
            title: newSong.title,
            key: newSong.key,
            capo: newSong.capo,
            tempo: typeof newSong.tempo === 'number' ? newSong.tempo : undefined,
            timeSignature: newSong.timeSignature,
            chords: newSong.chords,
            duration: newSong.duration,
          };
          const updatedSongs = [...existingSongs, newItem];
          updatedSetlist = {
            ...targetSet,
            songs: updatedSongs,
            songCount: updatedSongs.length,
            updatedAt: Date.now(),
          };

          const newSetlists = setlists.map((s) => (s.id === targetSetlistId ? updatedSetlist! : s));
          setSetlists(newSetlists);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_LOCAL_SETLISTS, JSON.stringify(newSetlists));
            } catch (_) {}
          }
        }
      }

      // 4. Fire background server syncs
      try {
        await fetch('/api/worship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSong),
        });

        if (updatedSetlist) {
          await fetch('/api/worship/setlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedSetlist),
          });
        }
      } catch (err) {
        console.error('Failed to sync new song to server:', err);
      }
    },
    [setlists]
  );

  return {
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
    resetAllSessionOverrides: () => setSetlistSessionOverrides({}),
    activeSongMdDefaults,
    isCurrentSongSessionOverridden,
    addSongToSetlist,
    removeSongFromSetlist,
    reorderSongInSetlist,
    optimisticAddSong,
    refreshData,
  };
}
