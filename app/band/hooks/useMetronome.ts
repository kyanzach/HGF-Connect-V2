// app/band/hooks/useMetronome.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MetronomeEngine } from '../lib/metronomeEngine';

export function useMetronome(initialTempo: number = 72, initialSignature: string = '4/4') {
  const [tempo, setTempoState] = useState<number>(initialTempo);
  const [timeSignature, setTimeSignatureState] = useState<string>(initialSignature);
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);

  const engineRef = useRef<MetronomeEngine | null>(null);

  useEffect(() => {
    const engine = new MetronomeEngine(tempo, timeSignature, (beat, _isDownbeat) => {
      setCurrentBeat(beat);
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 120);
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  const updateTempo = useCallback((newTempo: number) => {
    const valid = Math.max(30, Math.min(260, newTempo));
    setTempoState(valid);
    if (engineRef.current) {
      engineRef.current.setTempo(valid);
    }
  }, []);

  const updateTimeSignature = useCallback((newSig: string) => {
    if (!newSig) return;
    setTimeSignatureState(newSig);
    if (engineRef.current) {
      engineRef.current.setTimeSignature(newSig);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    if (!engineRef.current) return;
    const next = !engineRef.current.getAudioActive();
    engineRef.current.setAudioActive(next);
    setIsAudioActive(next);
  }, []);

  return {
    tempo,
    setTempo: updateTempo,
    timeSignature,
    setTimeSignature: updateTimeSignature,
    isPulsing,
    currentBeat,
    isAudioActive,
    toggleAudio,
  };
}
