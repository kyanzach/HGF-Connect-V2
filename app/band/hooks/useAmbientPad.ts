// app/band/hooks/useAmbientPad.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AmbientPadPlayer } from '../lib/padSynth';

export function useAmbientPad() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [currentKey, setCurrentKey] = useState<string>('C');
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('hgf_band_pad_volume');
        if (saved !== null) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val >= 0 && val <= 1) return val;
        }
      } catch (_) {}
    }
    return 0.25; // 25% volume sweet spot for solo acoustic performers
  });

  const playerRef = useRef<AmbientPadPlayer | null>(null);

  useEffect(() => {
    const player = new AmbientPadPlayer((playing, key, fadingOut) => {
      setIsPlaying(playing);
      setCurrentKey(key);
      setIsFadingOut(fadingOut);
    });
    player.setVolume(volume);
    playerRef.current = player;

    return () => {
      player.stop();
    };
  }, []);

  const play = useCallback((key?: string) => {
    if (playerRef.current) {
      playerRef.current.play(typeof key === 'string' && key ? key : undefined);
    }
  }, []);

  const stop = useCallback((immediate: boolean = false) => {
    if (playerRef.current) {
      playerRef.current.stop(immediate === true);
    }
  }, []);

  const toggle = useCallback((key?: string) => {
    if (playerRef.current) {
      playerRef.current.toggle(typeof key === 'string' && key ? key : undefined);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    const num = typeof vol === 'number' ? vol : 0.25;
    setVolumeState(num);
    try {
      localStorage.setItem('hgf_band_pad_volume', String(num));
    } catch (_) {}
    if (playerRef.current) {
      playerRef.current.setVolume(num);
    }
  }, []);

  const selectKey = useCallback((key: string) => {
    if (typeof key === 'string' && key) {
      setCurrentKey(key);
      if (playerRef.current) {
        playerRef.current.setKey(key);
      }
    }
  }, []);

  return {
    isPlaying,
    isFadingOut,
    currentKey,
    volume,
    play,
    stop,
    toggle,
    selectKey,
    setVolume,
  };
}
