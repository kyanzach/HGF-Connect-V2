// app/band/hooks/useAudioPlayback.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Song } from '../types/band';
import { getAudioBlobOffline } from '../lib/offlineStorage';

export function useAudioPlayback(song: Song | null) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  }, [song?.audioTrack?.url, song?.audioTrack?.filename, isScrubbing]);

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
    audioRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
  }, []);

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
  };
}
