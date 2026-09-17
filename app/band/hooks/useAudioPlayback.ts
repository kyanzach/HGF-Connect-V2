// app/band/hooks/useAudioPlayback.ts
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Song, AudioMarker } from '../types/band';
import { getAudioBlobOffline } from '../lib/offlineStorage';
import {
  extractRoadmapSections,
  getCachedAudioMarkers,
  saveCachedAudioMarkers,
  detectAudioChapters,
  generateFallbackMarkers,
} from '../lib/audioAnalysis';

const STORAGE_VOLUME_KEY = 'hgf_band_backtrack_volume';

export function useAudioPlayback(song: Song | null) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize volume from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VOLUME_KEY);
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          setVolumeState(val);
        }
      }
    } catch {}
  }, []);

  // Update audio element volume whenever volume/mute changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
    try {
      localStorage.setItem(STORAGE_VOLUME_KEY, clamped.toString());
    } catch {}
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Load song audio track
  useEffect(() => {
    if (!song?.audioTrack?.url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setMarkers([]);
      return;
    }

    let isMounted = true;
    const url = song.audioTrack.url;
    const filename = song.audioTrack.filename;

    const setupAudio = async () => {
      let playUrl = url;
      if (filename) {
        const cachedBlob = await getAudioBlobOffline(filename);
        if (cachedBlob && isMounted) {
          playUrl = URL.createObjectURL(cachedBlob);
        }
      }

      if (!isMounted) return;
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(playUrl);
      audio.volume = isMuted ? 0 : volume;
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (isMounted) setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        if (isMounted && !isScrubbing) {
          setCurrentTime(audio.currentTime);
        }
      };

      audio.onended = () => {
        if (isMounted) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      };

      audio.onplay = () => {
        if (isMounted) setIsPlaying(true);
      };

      audio.onpause = () => {
        if (isMounted) setIsPlaying(false);
      };
    };

    setupAudio();

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [song?.id, song?.audioTrack?.url, song?.audioTrack?.filename]);

  // Analyze & cache audio markers (vocal onset / song sections)
  useEffect(() => {
    if (!song?.id || !song.audioTrack?.url || duration <= 0) return;

    let isCancelled = false;

    // 1. Direct song track markers
    if (song.audioTrack.markers && song.audioTrack.markers.length > 0) {
      setMarkers(song.audioTrack.markers);
      return;
    }

    // 2. Cached markers
    const cached = getCachedAudioMarkers(song.id);
    if (cached && cached.length > 0) {
      setMarkers(cached);
      return;
    }

    // 3. Detect via Web Audio API
    const sections = extractRoadmapSections(song.chords);
    setIsAnalyzingAudio(true);

    detectAudioChapters(song.audioTrack.url, duration, sections)
      .then((detected) => {
        if (isCancelled) return;
        const finalMarkers = detected.length > 0 ? detected : generateFallbackMarkers(duration, sections);
        setMarkers(finalMarkers);
        saveCachedAudioMarkers(song.id, finalMarkers);
      })
      .catch(() => {
        if (isCancelled) return;
        const fallback = generateFallbackMarkers(duration, sections);
        setMarkers(fallback);
      })
      .finally(() => {
        if (!isCancelled) setIsAnalyzingAudio(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [song?.id, song?.audioTrack?.url, duration]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, []);

  const seek = useCallback((timeSec: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(duration || 99999, timeSec));
    audioRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  // Current active marker based on playback time
  const activeMarker = useMemo(() => {
    if (markers.length === 0) return null;
    for (let i = markers.length - 1; i >= 0; i--) {
      if (currentTime >= markers[i].time - 0.5) {
        return markers[i];
      }
    }
    return markers[0] || null;
  }, [markers, currentTime]);

  // Jump to previous marker (or restart section if > 2.5s into it)
  const jumpPrevMarker = useCallback(() => {
    if (markers.length === 0) {
      seek(0);
      return;
    }
    const curIdx = activeMarker ? markers.findIndex((m) => m.id === activeMarker.id) : 0;
    if (curIdx >= 0) {
      const currentMarker = markers[curIdx];
      // If we are more than 2.5s into this marker, restart it
      if (currentTime - currentMarker.time > 2.5) {
        seek(currentMarker.time);
      } else if (curIdx > 0) {
        // Otherwise go to previous marker
        seek(markers[curIdx - 1].time);
      } else {
        seek(0);
      }
    } else {
      seek(0);
    }
  }, [markers, activeMarker, currentTime, seek]);

  // Jump to next marker
  const jumpNextMarker = useCallback(() => {
    if (markers.length === 0) return;
    const next = markers.find((m) => m.time > currentTime + 0.8);
    if (next) {
      seek(next.time);
    }
  }, [markers, currentTime, seek]);

  const hasAudio = !!(song?.audioTrack && song.audioTrack.url);

  return {
    hasAudio,
    isPlaying,
    currentTime,
    duration,
    isScrubbing,
    setIsScrubbing,
    togglePlay,
    seek,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    markers,
    activeMarker,
    jumpPrevMarker,
    jumpNextMarker,
    isAnalyzingAudio,
  };
}

