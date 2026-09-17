// app/band/hooks/useAmbientPad.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AmbientPadPlayer } from '../lib/padSynth';

export function useAmbientPad() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [currentKey, setCurrentKey] = useState<string>('C');
  const [volume, setVolumeState] = useState<number>(0.85);

  const playerRef = useRef<AmbientPadPlayer | null>(null);

  useEffect(() => {
    const player = new AmbientPadPlayer((playing, key, fadingOut) => {
      setIsPlaying(playing);
      setCurrentKey(key);
      setIsFadingOut(fadingOut);
    });
    playerRef.current = player;

    return () => {
      player.stop();
    };
  }, []);

  const play = useCallback((key: string) => {
    if (playerRef.current) {
      playerRef.current.play(key);
    }
  }, []);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
    }
  }, []);

  const toggle = useCallback((key?: string) => {
    if (playerRef.current) {
      playerRef.current.toggle(key);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (playerRef.current) {
      playerRef.current.setVolume(vol);
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
    setVolume,
  };
}
