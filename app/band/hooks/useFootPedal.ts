// app/band/hooks/useFootPedal.ts
'use client';

import { useEffect } from 'react';

interface FootPedalProps {
  onNextSong?: () => void;
  onPrevSong?: () => void;
  onScrollDown?: () => void;
  onScrollUp?: () => void;
}

export function useFootPedal({
  onNextSong,
  onPrevSong,
  onScrollDown,
  onScrollUp,
}: FootPedalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'PageDown' || e.key === '3') {
        if (onScrollDown) onScrollDown();
        e.preventDefault();
      } else if (e.key === 'PageUp' || e.key === '1') {
        if (onScrollUp) onScrollUp();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        if (onNextSong) onNextSong();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        if (onPrevSong) onPrevSong();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNextSong, onPrevSong, onScrollDown, onScrollUp]);
}
