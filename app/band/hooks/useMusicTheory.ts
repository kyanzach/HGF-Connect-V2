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
  const chartKey = song?.originalKey || detectedKey || song?.key || 'C';

  // The active key to render (defaults to active song.key or chartKey)
  const [activeKey, setActiveKey] = useState<string>(song?.key || chartKey);
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
    const isMinor = (song?.key || chartKey).endsWith('m') || (song?.key || chartKey).includes('min') || activeKey.endsWith('m');
    return isMinor ? `${root}m` : root;
  }, [activeKey, song?.key, chartKey]);

  const displayKey = useMemo(() => {
    const root = effectiveKey.replace('m', '');
    const isMinor = effectiveKey.endsWith('m');
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
