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
    const num = typeof vol === 'number' ? vol : 0.85;
    setVolumeState(num);
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
