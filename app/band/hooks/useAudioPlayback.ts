// app/band/hooks/useAudioPlayback.ts
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Song, AudioMarker } from '../types/band';
import { getAudioBlobOffline } from '../lib/offlineStorage';
import {
  extractRoadmapSections,
  getCachedAudioMarkers,
  saveCachedAudioMarkers,
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

  // Persistent single Audio element across all songs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const loadedTrackKeyRef = useRef<string>('');

  const volumeStorageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to ensure Web Audio graph is connected (GainNode digital volume for Android WebView & iOS)
  const initWebAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    const audio = audioRef.current;
    if (!audio) return;

    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const gain = ctx.createGain();
          const source = ctx.createMediaElementSource(audio);

          source.connect(gain);
          gain.connect(ctx.destination);

          audioCtxRef.current = ctx;
          gainNodeRef.current = gain;
          sourceNodeRef.current = source;
        }
      } catch (err) {
        console.warn('[useAudioPlayback] Web Audio setup deferred or not supported:', err);
      }
    }

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
  }, []);

  // Unified instantaneous volume & mute application across both HTML5 element and Web Audio API GainNode
  const applyVolume = useCallback(
    (vol: number, muted: boolean) => {
      const targetVol = muted ? 0 : Math.max(0, Math.min(1, vol));

      // 1. Direct HTML5 element volume & mute (Universal support across Chrome, Safari, Android & Desktop)
      if (audioRef.current) {
        audioRef.current.muted = muted;
        try {
          audioRef.current.volume = targetVol;
        } catch (_) {}
      }

      // 2. Web Audio API GainNode direct assignment without cancelScheduledValues pipeline stalls
      if (gainNodeRef.current) {
        try {
          gainNodeRef.current.gain.value = targetVol;
        } catch (_) {}
      }
    },
    []
  );

  // Initialize volume once from localStorage
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

  // Synchronize volume & mute whenever state changes
  useEffect(() => {
    applyVolume(volume, isMuted);
  }, [volume, isMuted, applyVolume]);

  const setVolume = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolumeState(clamped);
      if (clamped > 0 && isMuted) {
        setIsMuted(false);
        applyVolume(clamped, false);
      } else {
        applyVolume(clamped, isMuted);
      }

      // Debounce localStorage writes so rapid slider gestures do not choke the JS thread
      if (volumeStorageTimeoutRef.current) {
        clearTimeout(volumeStorageTimeoutRef.current);
      }
      volumeStorageTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_VOLUME_KEY, clamped.toString());
        } catch {}
      }, 250);
    },
    [isMuted, applyVolume]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      applyVolume(volume, nextMuted);
      return nextMuted;
    });
  }, [volume, applyVolume]);

  // Initialize single audio element on mount
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      (audio as any).playsInline = true;
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || 0);
      };

      audio.ontimeupdate = () => {
        if (!isScrubbing) {
          setCurrentTime(audio.currentTime);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onplay = () => {
        setIsPlaying(true);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };

      initWebAudio();
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
        audioRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close().catch(() => {});
        } catch (_) {}
        audioCtxRef.current = null;
      }
      gainNodeRef.current = null;
      sourceNodeRef.current = null;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Fast, synchronous chapter setup (ZERO LIVE DECODING LAG)
  useEffect(() => {
    if (!song?.id || !song.audioTrack) {
      setMarkers([]);
      return;
    }

    // 1. Direct song markers attached upon upload
    if (song.audioTrack.markers && song.audioTrack.markers.length > 0) {
      setMarkers(song.audioTrack.markers);
      return;
    }

    // 2. Cached markers in localStorage
    const cached = getCachedAudioMarkers(song.id);
    if (cached && cached.length > 0) {
      setMarkers(cached);
      return;
    }

    // 3. Instant 0ms synchronous fallback from chord roadmap sections
    const sections = extractRoadmapSections(song.chords);
    const estDuration = song.audioTrack.durationSec || duration || 210;
    const fastMarkers = generateFallbackMarkers(estDuration, sections);
    setMarkers(fastMarkers);
  }, [song?.id, song?.audioTrack?.markers, song?.audioTrack?.durationSec, duration]);

  // Load song audio source into persistent element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const trackUrl = song?.audioTrack?.url || '';
    const trackFilename = song?.audioTrack?.filename || '';
    const targetTrackKey = song?.id && (trackUrl || trackFilename) ? `${song.id}_${trackUrl}_${trackFilename}` : '';

    if (!targetTrackKey) {
      if (loadedTrackKeyRef.current !== '') {
        loadedTrackKeyRef.current = '';
        audio.pause();
        audio.removeAttribute('src');
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
      return;
    }

    // Crucial: If this exact track is already loaded in the audio element, DO NOT reload or pause!
    if (loadedTrackKeyRef.current === targetTrackKey && audio.src) {
      return;
    }
    loadedTrackKeyRef.current = targetTrackKey;

    let isCancelled = false;

    // Pause immediately only when changing to a different track
    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
    }
    setCurrentTime(0);

    const loadTrack = async () => {
      let playUrl = trackUrl;

      // Check local IndexedDB storage first
      if (trackFilename) {
        const cachedBlob = await getAudioBlobOffline(trackFilename);
        if (cachedBlob && !isCancelled) {
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          blobUrlRef.current = URL.createObjectURL(cachedBlob);
          playUrl = blobUrlRef.current;
        }
      }

      if (isCancelled || !audioRef.current) return;

      audio.src = playUrl;
      audio.load();
    };

    loadTrack();

    return () => {
      isCancelled = true;
    };
  }, [song?.id, song?.audioTrack?.url, song?.audioTrack?.filename]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    initWebAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    applyVolume(volume, isMuted);

    if (audio.paused) {
      playPromiseRef.current = audio.play();
      if (playPromiseRef.current !== undefined) {
        playPromiseRef.current
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('Playback play request was aborted:', err);
            }
          })
          .finally(() => {
            playPromiseRef.current = null;
          });
      }
    } else {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            audio.pause();
            setIsPlaying(false);
          })
          .catch(() => {});
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  }, [initWebAudio, applyVolume, volume, isMuted]);

  const seek = useCallback(
    (timeSec: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      initWebAudio();
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      applyVolume(volume, isMuted);
      const clamped = Math.max(0, Math.min(duration || 99999, timeSec));
      if (typeof (audio as any).fastSeek === 'function') {
        (audio as any).fastSeek(clamped);
      } else {
        audio.currentTime = clamped;
      }
      setCurrentTime(clamped);
    },
    [duration, initWebAudio, applyVolume, volume, isMuted]
  );

  // Active marker based on current time
  const activeMarker = useMemo(() => {
    if (markers.length === 0) return null;
    for (let i = markers.length - 1; i >= 0; i--) {
      if (currentTime >= markers[i].time - 0.5) {
        return markers[i];
      }
    }
    return markers[0] || null;
  }, [markers, currentTime]);

  // Jump to previous marker
  const jumpPrevMarker = useCallback(() => {
    if (markers.length === 0) {
      seek(0);
      return;
    }
    const curIdx = activeMarker ? markers.findIndex((m) => m.id === activeMarker.id) : 0;
    if (curIdx >= 0) {
      const currentMarker = markers[curIdx];
      if (currentTime - currentMarker.time > 2.5) {
        seek(currentMarker.time);
      } else if (curIdx > 0) {
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
    if (next) seek(next.time);
  }, [markers, currentTime, seek]);

  const updateMarkers = (newMarkers: AudioMarker[]) => {
    const sorted = [...newMarkers].sort((a, b) => a.time - b.time);
    setMarkers(sorted);
    if (song?.id) {
      saveCachedAudioMarkers(song.id, sorted);
    }
  };

  const hasAudio = !!(song?.audioTrack && (song.audioTrack.url || song.audioTrack.filename));

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
    updateMarkers,
    activeMarker,
    jumpPrevMarker,
    jumpNextMarker,
    isAnalyzingAudio: false,
  };
}
