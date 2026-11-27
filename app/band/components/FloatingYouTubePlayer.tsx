// app/band/components/FloatingYouTubePlayer.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface YouTubeVideoItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
}

export type YouTubePlayerMode = 'closed' | 'video' | 'audio';

interface FloatingYouTubePlayerProps {
  mode: YouTubePlayerMode;
  videos: YouTubeVideoItem[];
  activeIndex: number;
  isPlaying: boolean;
  onChangeIndex: (nextIndex: number) => void;
  onSwitchToAudioOnly: () => void;
  onClose: () => void;
  onSyncPlayingState: (playing: boolean) => void;
}

export const FloatingYouTubePlayer: React.FC<FloatingYouTubePlayerProps> = ({
  mode,
  videos,
  activeIndex,
  isPlaying,
  onChangeIndex,
  onSwitchToAudioOnly,
  onClose,
  onSyncPlayingState,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeReady, setIframeReady] = useState(false);

  // Drag offset from default docked bottom-right position
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const currentVideo = videos[activeIndex] || videos[0] || null;
  const videoId = currentVideo?.videoId || '';

  // Reset ready flag when switching video
  useEffect(() => {
    setIframeReady(false);
  }, [videoId]);

  // Listen to YouTube IFrame API postMessage state updates
  useEffect(() => {
    if (mode === 'closed' || !videoId) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.origin !== 'string' ||
        (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))
      ) {
        return;
      }
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        if (data.event === 'onReady') {
          setIframeReady(true);
        }

        const state =
          data.event === 'onStateChange'
            ? data.info
            : data.event === 'infoDelivery' && typeof data.info?.playerState === 'number'
            ? data.info.playerState
            : null;

        if (state === 1) {
          onSyncPlayingState(true);
        } else if (state === 2 || state === 0) {
          onSyncPlayingState(false);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mode, videoId, onSyncPlayingState]);

  // Send play/pause commands to the YouTube IFrame whenever isPlaying toggles
  useEffect(() => {
    if (mode === 'closed' || !videoId || !iframeReady) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    const func = isPlaying ? 'playVideo' : 'pauseVideo';
    win.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*');
  }, [isPlaying, mode, videoId, iframeReady]);

  // Drag handlers (mouse + touch) for the floating video header
  const beginDrag = (clientX: number, clientY: number) => {
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const point = 'touches' in e ? e.touches[0] : e;
      if (!point) return;
      const dx = point.clientX - dragRef.current.startX;
      const dy = point.clientY - dragRef.current.startY;
      setOffset({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const handleEnd = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  if (mode === 'closed' || !videoId) return null;

  const isHiddenAudio = mode === 'audio';
  const embedSrc = `https://www.youtube.com/embed/${encodeURIComponent(
    videoId
  )}?autoplay=1&enablejsapi=1&playsinline=1&rel=0&modestbranding=1`;

  const handleIframeLoad = () => {
    setIframeReady(true);
    const win = iframeRef.current?.contentWindow;
    if (win) {
      // Subscribe to YouTube player state events
      win.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      if (isPlaying) {
        win.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
      }
    }
  };

  return (
    <div
      data-interactive="true"
      style={
        isHiddenAudio
          ? {
              // Keep iframe alive off-screen so audio plays smoothly on iOS/Android/Desktop
              position: 'fixed',
              left: '-9999px',
              top: '-9999px',
              width: '200px',
              height: '112px',
              opacity: 0.01,
              pointerEvents: 'none',
              overflow: 'hidden',
              zIndex: -1,
            }
          : {
              position: 'fixed',
              bottom: '80px',
              right: '64px',
              width: 'min(320px, calc(100vw - 84px))',
              borderRadius: '14px',
              background: 'rgba(10, 16, 28, 0.96)',
              border: '1px solid rgba(78, 177, 203, 0.35)',
              boxShadow: '0 18px 44px rgba(0, 0, 0, 0.72)',
              overflow: 'hidden',
              zIndex: 140,
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }
      }
    >
      {/* Draggable Header Bar (visible in video mode only) */}
      {!isHiddenAudio && (
        <div
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            beginDrag(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            const t = e.touches[0];
            if (t) beginDrag(t.clientX, t.clientY);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            padding: '7px 10px',
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444" style={{ flexShrink: 0 }}>
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z" />
            </svg>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#e2e8f0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={currentVideo?.title || 'YouTube Reference'}
            >
              {currentVideo?.title || 'YouTube Reference'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {videos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onChangeIndex((activeIndex - 1 + videos.length) % videos.length)
                  }
                  title="Previous YouTube match"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid #26354d',
                    background: '#131c2e',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ‹
                </button>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
                  {activeIndex + 1}/{videos.length}
                </span>
                <button
                  type="button"
                  onClick={() => onChangeIndex((activeIndex + 1) % videos.length)}
                  title="Next YouTube match"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: '1px solid #26354d',
                    background: '#131c2e',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ›
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onSwitchToAudioOnly}
              title="Hide video & keep audio playing"
              style={{
                height: '24px',
                padding: '0 7px',
                borderRadius: '6px',
                border: '1px solid rgba(78, 177, 203, 0.35)',
                background: 'rgba(78, 177, 203, 0.14)',
                color: '#67e8f9',
                fontSize: '10.5px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Audio Only
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close YouTube player"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                border: '1px solid #26354d',
                background: '#131c2e',
                color: '#94a3b8',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 16:9 Responsive YouTube Embed */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
        }}
      >
        <iframe
          ref={iframeRef}
          key={videoId}
          src={embedSrc}
          title={currentVideo?.title || 'YouTube song player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={handleIframeLoad}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    </div>
  );
};
