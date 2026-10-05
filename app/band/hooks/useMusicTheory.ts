// app/band/hooks/useMusicTheory.ts
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Song } from '../types/band';
import {
  transposeChord,
  transposeNote,
  calculateSemitoneDistance,
  getRootNote,
  parseAndTransposeSheetLines,
  detectRootKeyFromChords,
  FLAT_KEYS,
  KEY_DISPLAY_MAP,
  SheetLine,
} from '../lib/musicTheory';

export function useMusicTheory(song: Song | null, activeSetlistId?: string | null) {
  // Baseline key auto-detected from chord tokens if missing
  const detectedKey = useMemo(() => {
    if (!song?.chords) return null;
    return detectRootKeyFromChords(song.chords);
  }, [song?.chords]);

  // Baseline key that the chord chart is physically written in
  const chartKey: string = useMemo(() => {
    if (!song) return 'C';
    const detectedRoot = detectedKey ? getRootNote(detectedKey) : null;
    const songKeyRoot = song.key ? getRootNote(song.key) : null;
    const origKeyRoot = song.originalKey ? getRootNote(song.originalKey) : null;

    // 1. If song.key matches detected chord root, use song.key
    if (detectedRoot && songKeyRoot && detectedRoot === songKeyRoot) {
      return song.key || 'C';
    }
    // 2. If song.originalKey matches detected chord root, use song.originalKey
    if (detectedRoot && origKeyRoot && detectedRoot === origKeyRoot) {
      return song.originalKey || 'C';
    }
    // 3. If chords were detected and there's a discrepancy with stored metadata,
    // trust the physical chord tokens on the sheet!
    if (detectedKey) {
      return detectedKey;
    }
    return song.originalKey || song.key || 'C';
  }, [song, detectedKey]);

  const defaultKey = song?.key || chartKey;

  // The active key to render (defaults to active song.key or chartKey)
  const [activeKey, setActiveKey] = useState<string>(defaultKey);
  const [capo, setCapo] = useState<number>(Number(song?.capo) || 0);
  const [preferFlats, setPreferFlats] = useState<boolean>(false);

  // Sync activeKey and capo when the active song, setlist item, or active setlist changes
  useEffect(() => {
    setActiveKey(song?.key || chartKey);
    setCapo(Number(song?.capo) || 0);
  }, [song?.id, song?.key, chartKey, song?.capo, activeSetlistId]);

  const isFlats = useMemo(() => {
    return preferFlats || FLAT_KEYS.includes(chartKey);
  }, [preferFlats, chartKey]);

  // Exact semitone offset from written chartKey to activeKey
  const transposeOffset = useMemo(() => {
    const rootChart = getRootNote(chartKey);
    const rootActive = getRootNote(activeKey);
    const diff = calculateSemitoneDistance(rootChart, rootActive);
    return diff > 6 ? diff - 12 : diff;
  }, [chartKey, activeKey]);

  const effectiveKey = useMemo(() => {
    const root = getRootNote(activeKey);
    const baseKey = song?.key || chartKey;
    const isMinor = baseKey.endsWith('m') || baseKey.includes('min') || activeKey.endsWith('m');
    return isMinor ? `${root}m` : root;
  }, [activeKey, song?.key, chartKey]);

  const displayKey = useMemo(() => {
    const root = getRootNote(effectiveKey);
    const isMinor = effectiveKey.endsWith('m') || effectiveKey.includes('min');
    const mapped = KEY_DISPLAY_MAP[root] || root;
    return isMinor ? `${mapped}m` : mapped;
  }, [effectiveKey]);

  const transpose = useCallback((delta: number) => {
    setActiveKey((prev) => {
      const root = getRootNote(prev);
      const isMinor = prev.endsWith('m') || prev.includes('min');
      const nextRoot = transposeNote(root, delta, isFlats);
      return isMinor ? `${nextRoot}m` : nextRoot;
    });
  }, [isFlats]);

  const setTargetKey = useCallback((targetKey: string) => {
    setActiveKey(targetKey);
  }, []);

  const resetTranspose = useCallback(() => {
    setActiveKey(song?.key || chartKey);
  }, [song?.key, chartKey]);

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
