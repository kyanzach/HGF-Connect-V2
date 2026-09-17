// app/band/hooks/useSetlist.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Song, Setlist, SetlistSongItem } from '../types/band';
import { getSongsOffline, saveSongsOffline } from '../lib/offlineStorage';

const STORAGE_ACTIVE_SETLIST = 'hgf_band_active_setlist_id';
const STORAGE_LOCAL_SONGS = 'hgf_band_songs';
const STORAGE_SESSION_KEYS = 'hgf_band_session_keys';

export function useSetlist() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string | null>(null);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [setlistSessionKeys, setSetlistSessionKeys] = useState<Record<string, string>>({});
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
        // Apply MD setlist key preferences if defined
        const mdKey = typeof item === 'object' && item.key ? item.key : found.key;
        const mdCapo = typeof item === 'object' && item.capo !== undefined ? item.capo : found.capo;
        // Check if there is an active session override
        const sessionKey = setlistSessionKeys[`${activeSetlist.id}_${found.id}`];
        lineup.push({
          ...found,
          key: sessionKey || mdKey,
          capo: mdCapo,
        });
      }
    });

    return lineup;
  }, [activeSetlist, songs, setlistSessionKeys]);

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

  const selectSong = useCallback((songId: string) => {
    setCurrentSongId(songId);
  }, []);

  const selectSetlist = useCallback((setId: string | null) => {
    setActiveSetlistId(setId);
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

  const setSongSessionKey = useCallback((songId: string, key: string) => {
    if (!activeSetlistId) return;
    const token = `${activeSetlistId}_${songId}`;
    setSetlistSessionKeys((prev) => ({
      ...prev,
      [token]: key,
    }));
  }, [activeSetlistId]);

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
    refreshData,
  };
}
