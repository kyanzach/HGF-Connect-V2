// app/band/hooks/useMusicTheory.ts
'use client';

import { useState, useMemo, useCallback } from 'react';
import { Song } from '../types/band';
import {
  transposeChord,
  transposeNote,
  calculateSemitoneDistance,
  getRootNote,
  parseAndTransposeSheetLines,
  FLAT_KEYS,
  KEY_DISPLAY_MAP,
  SheetLine,
} from '../lib/musicTheory';

export function useMusicTheory(song: Song | null) {
  const [transposeOffset, setTransposeOffset] = useState<number>(0);
  const [capo, setCapo] = useState<number>(0);
  const [preferFlats, setPreferFlats] = useState<boolean>(false);

  // Sync with song defaults when song changes
  const baseKey = song?.key || song?.originalKey || 'C';

  const isFlats = useMemo(() => {
    return preferFlats || FLAT_KEYS.includes(baseKey);
  }, [preferFlats, baseKey]);

  const effectiveKey = useMemo(() => {
    const root = getRootNote(baseKey);
    const isMinor = baseKey.endsWith('m') || baseKey.includes('min');
    const transposedRoot = transposeNote(root, transposeOffset, isFlats);
    return isMinor ? `${transposedRoot}m` : transposedRoot;
  }, [baseKey, transposeOffset, isFlats]);

  const displayKey = useMemo(() => {
    const root = effectiveKey.replace('m', '');
    const isMinor = effectiveKey.endsWith('m');
    const mapped = KEY_DISPLAY_MAP[root] || root;
    return isMinor ? `${mapped}m` : mapped;
  }, [effectiveKey]);

  const transpose = useCallback((delta: number) => {
    setTransposeOffset((prev) => {
      let next = (prev + delta) % 12;
      if (next > 6) next -= 12;
      if (next < -6) next += 12;
      return next;
    });
  }, []);

  const setTargetKey = useCallback((targetKey: string) => {
    const diff = calculateSemitoneDistance(baseKey, targetKey);
    setTransposeOffset(diff > 6 ? diff - 12 : diff);
  }, [baseKey]);

  const resetTranspose = useCallback(() => {
    setTransposeOffset(0);
  }, []);

  const parsedLines: SheetLine[] = useMemo(() => {
    if (!song) return [];
    const content = song.chords || song.lyrics || '';
    return parseAndTransposeSheetLines(content, transposeOffset, isFlats);
  }, [song, transposeOffset, isFlats]);

  return {
    transposeOffset,
    capo,
    setCapo,
    effectiveKey,
    displayKey,
    isFlats,
    setPreferFlats,
    transpose,
    setTargetKey,
    resetTranspose,
    parsedLines,
  };
}
