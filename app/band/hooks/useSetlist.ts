// app/band/hooks/useSetlist.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Song, Setlist, SetlistSongItem } from '../types/band';
import { getSongsOffline, saveSongsOffline } from '../lib/offlineStorage';

const STORAGE_ACTIVE_SETLIST = 'hgf_band_active_setlist_id';
const STORAGE_LOCAL_SONGS = 'hgf_band_songs';
const STORAGE_SESSION_KEYS = 'hgf_band_session_keys';

export interface SessionSongOverride {
  key?: string;
  tempo?: number;
  timeSignature?: string;
  capo?: string | number;
}

export function useSetlist() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [setlistSessionOverrides, setSetlistSessionOverrides] = useState<Record<string, SessionSongOverride>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch all songs and setlists
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch songs
      const songsRes = await fetch('/api/worship', { cache: 'no-store' });
      if (songsRes.ok) {
        const remoteSongs: Song[] = await songsRes.json();
        setSongs(remoteSongs);
        saveSongsOffline(remoteSongs).catch(() => {});
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_LOCAL_SONGS, JSON.stringify(remoteSongs));
        }
      } else {
        const offline = await getSongsOffline();
        if (offline.length) setSongs(offline);
      }

      // 2. Fetch setlists
      const setlistsRes = await fetch('/api/worship/setlists', { cache: 'no-store' });
      if (setlistsRes.ok) {
        const remoteSetlists: Setlist[] = await setlistsRes.json();
        setSetlists(remoteSetlists);
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

  // Restore saved active setlist and initial song
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSetId = localStorage.getItem(STORAGE_ACTIVE_SETLIST);
    if (savedSetId) {
      setActiveSetlistId(savedSetId);
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

        // Check if there is an active session override for this setlist
        const override = setlistSessionOverrides[`${activeSetlist.id}_${found.id}`];
        lineup.push({
          ...found,
          chords: mdChords,
          key: override?.key || mdKey,
          capo: override?.capo !== undefined ? override.capo : mdCapo,
          tempo: override?.tempo !== undefined ? override.tempo : mdTempo,
          timeSignature: override?.timeSignature || mdTimeSig,
        });
      }
    });

    return lineup;
  }, [activeSetlist, songs, setlistSessionOverrides]);

  // Set initial song once lineup is loaded
  useEffect(() => {
    if (!currentSongId && currentLineup.length > 0) {
      setCurrentSongId(currentLineup[0].id);
    }
  }, [currentLineup, currentSongId]);

  const currentSong = useMemo(() => {
    if (!currentSongId) return currentLineup[0] || null;
    return currentLineup.find((s) => s.id === currentSongId) || currentLineup[0] || null;
  }, [currentSongId, currentLineup]);

  const currentIndex = useMemo(() => {
    if (!currentSong) return 0;
    return currentLineup.findIndex((s) => s.id === currentSong.id);
  }, [currentSong, currentLineup]);

  // Official MD defaults for the active song inside the active setlist
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
    };
  }, [activeSetlist, currentSong, songs]);

  const selectSong = useCallback((songId: string) => {
    setCurrentSongId(songId);
  }, []);

  const selectSetlist = useCallback((setId: string | null) => {
    setActiveSetlistId(setId);
    // When switching setlists, reset session overrides so it loads fresh MD defaults
    if (setId) {
      setSetlistSessionOverrides((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`${setId}_`)) delete next[k];
        });
        return next;
      });
    }
    if (typeof window !== 'undefined') {
      if (setId) localStorage.setItem(STORAGE_ACTIVE_SETLIST, setId);
      else localStorage.removeItem(STORAGE_ACTIVE_SETLIST);
    }
  }, []);

  const nextSong = useCallback(() => {
    if (currentIndex < currentLineup.length - 1) {
      setCurrentSongId(currentLineup[currentIndex + 1].id);
    }
  }, [currentIndex, currentLineup]);

  const prevSong = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentSongId(currentLineup[currentIndex - 1].id);
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
        }
      : { id: songId };
    const updatedSongs = [...existingSongs, newItem];
    const updatedSetlist: Setlist = {
      ...targetSet,
      songs: updatedSongs,
      songCount: updatedSongs.length,
      updatedAt: Date.now(),
    };

    await fetch('/api/worship/setlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSetlist),
    });
    await refreshData();
  }, [activeSetlistId, setlists, refreshData]);

  const removeSongFromSetlist = useCallback(async (songId: string, setlistId?: string) => {
    const targetSetId = setlistId || activeSetlistId;
    if (!targetSetId) return;
    const targetSet = setlists.find((s) => s.id === targetSetId);
    if (!targetSet) return;

    const existingSongs = targetSet.songs || [];
    const updatedSongs = existingSongs.filter((it) => (typeof it === 'string' ? it !== songId : it.id !== songId));
    const updatedSetlist: Setlist = {
      ...targetSet,
      songs: updatedSongs,
      songCount: updatedSongs.length,
      updatedAt: Date.now(),
    };

    await fetch('/api/worship/setlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSetlist),
    });
    await refreshData();
  }, [activeSetlistId, setlists, refreshData]);

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
    activeSongMdDefaults,
    addSongToSetlist,
    removeSongFromSetlist,
    refreshData,
  };
}
