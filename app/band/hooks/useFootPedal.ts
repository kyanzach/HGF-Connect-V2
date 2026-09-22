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

      if (e.key === 'PageDown' || e.key === '3' || e.key === 'ArrowDown') {
        if (onScrollDown) onScrollDown();
        e.preventDefault();
      } else if (e.key === 'PageUp' || e.key === '1' || e.key === 'ArrowUp') {
        if (onScrollUp) onScrollUp();
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.code === 'MediaTrackNext') {
        if (onNextSong) onNextSong();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.code === 'MediaTrackPrevious') {
        if (onPrevSong) onPrevSong();
        e.preventDefault();
      }
    };

    const handleCustomPedal = (e: Event) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable)
      ) {
        return;
      }

      const customEvent = e as CustomEvent<{ key: string }>;
      const key = customEvent.detail?.key;
      if (key === 'PageDown' || key === 'ArrowDown') {
        if (onScrollDown) onScrollDown();
      } else if (key === 'PageUp' || key === 'ArrowUp') {
        if (onScrollUp) onScrollUp();
      } else if (key === 'MediaTrackNext' || key === 'ArrowRight') {
        if (onNextSong) onNextSong();
      } else if (key === 'MediaTrackPrevious' || key === 'ArrowLeft') {
        if (onPrevSong) onPrevSong();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hgf-pedal', handleCustomPedal);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hgf-pedal', handleCustomPedal);
    };
  }, [onNextSong, onPrevSong, onScrollDown, onScrollUp]);
}
