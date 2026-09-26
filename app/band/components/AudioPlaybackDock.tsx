// app/band/components/AudioPlaybackDock.tsx
'use client';

import React, { useState } from 'react';
import { AudioMarker } from '../types/band';

interface AudioPlaybackDockProps {
  isVisible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number, autoPlay?: boolean) => void;
  title: string;
  // Volume controls
  volume?: number;
  isMuted?: boolean;
  onSetVolume?: (vol: number) => void;
  onToggleMute?: () => void;
  // Chapter markers & navigation
  markers?: AudioMarker[];
  activeMarker?: AudioMarker | null;
  onJumpPrev?: () => void;
  onJumpNext?: () => void;
  isAnalyzingAudio?: boolean;
  onOpenChaptersModal?: () => void;
}

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

export const AudioPlaybackDock: React.FC<AudioPlaybackDockProps> = ({
  isVisible,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onSeek,
  title,
  volume = 0.85,
  isMuted = false,
  onSetVolume,
  onToggleMute,
  markers = [],
  activeMarker = null,
  onJumpPrev,
  onJumpNext,
  isAnalyzingAudio = false,
  onOpenChaptersModal,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  if (!isVisible) return null;

  const displayTime = isScrubbing && scrubTime !== null ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--browser-dock-offset, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '520px',
        zIndex: 62,
        backgroundColor: '#0c1017',
        border: '1px solid #2d3f5e',
        borderRadius: '16px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9)',
        userSelect: 'none',
        backdropFilter: 'blur(10px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header: Title, Active Chapter Badge & Times */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ fontSize: '13px' }}>🎧</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '12px',
              color: '#38bdf8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '160px',
            }}
          >
            {title}
          </span>
          {activeMarker && (
            <span
              onClick={onOpenChaptersModal}
              role={onOpenChaptersModal ? 'button' : undefined}
              title={onOpenChaptersModal ? 'Click to calibrate chapter timings' : undefined}
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '1px 6px',
                borderRadius: '6px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                cursor: onOpenChaptersModal ? 'pointer' : 'default',
              }}
            >
              {activeMarker.label} {onOpenChaptersModal ? '✏️' : ''}
            </span>
          )}
          {isAnalyzingAudio && (
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              Detecting voice...
            </span>
          )}
        </div>

        <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {formatSeconds(displayTime)} / {formatSeconds(duration)}
        </div>
      </div>

      {/* Scrubber Bar with Chapter Divider Notches */}
      <div style={{ position: 'relative', width: '100%', height: '14px', display: 'flex', alignItems: 'center' }}>
        {/* Visual Chapter Notches */}
        {duration > 0 &&
          markers.map((marker) => {
            const notchPct = (marker.time / duration) * 100;
            if (notchPct <= 0 || notchPct >= 99) return null;
            return (
              <div
                key={marker.id}
                title={`${marker.label} (${formatSeconds(marker.time)})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.time, true);
                }}
                style={{
                  position: 'absolute',
                  left: `${notchPct}%`,
                  top: '2px',
                  bottom: '2px',
                  width: '2px',
                  backgroundColor: '#f59e0b',
                  zIndex: 2,
                  cursor: 'pointer',
                  borderRadius: '1px',
                  boxShadow: '0 0 4px rgba(245, 158, 11, 0.8)',
                }}
              />
            );
          })}

        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={displayTime}
          onPointerDown={() => {
            setIsScrubbing(true);
            setScrubTime(currentTime);
          }}
          onTouchStart={() => {
            setIsScrubbing(true);
            setScrubTime(currentTime);
          }}
          onInput={(e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            setScrubTime(val);
          }}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setScrubTime(val);
          }}
          onPointerUp={(e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            onSeek(val, true);
            setIsScrubbing(false);
            setScrubTime(null);
          }}
          onTouchEnd={() => {
            const val = scrubTime !== null ? scrubTime : currentTime;
            onSeek(val, true);
            setIsScrubbing(false);
            setScrubTime(null);
          }}
          onKeyUp={(e) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            onSeek(val, true);
            setIsScrubbing(false);
            setScrubTime(null);
          }}
          style={{
            width: '100%',
            height: '6px',
            accentColor: '#38bdf8',
            cursor: 'pointer',
            position: 'relative',
            zIndex: 3,
            margin: 0,
          }}
        />
      </div>

      {/* Chapter Chips Bar (Tap to jump directly to section, or calibrate timings) */}
      {(markers.length > 0 || onOpenChaptersModal) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
        >
          {onOpenChaptersModal && (
            <button
              onClick={onOpenChaptersModal}
              title="Calibrate Chapter Timings / Cues"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.45)',
                color: '#38bdf8',
                borderRadius: '10px',
                padding: '2px 8px',
                fontSize: '9.5px',
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span>✏️</span>
              <span>Edit Cues</span>
            </button>
          )}
          {markers.map((marker) => {
            const isActive = activeMarker?.id === marker.id;
            return (
              <button
                key={marker.id}
                onClick={() => onSeek(marker.time, true)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.7)',
                  border: `1px solid ${isActive ? '#38bdf8' : '#334155'}`,
                  color: isActive ? '#38bdf8' : '#cbd5e1',
                  borderRadius: '10px',
                  padding: '2px 7px',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {marker.label} <span style={{ opacity: 0.65, fontSize: '8.5px' }}>{formatSeconds(marker.time)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Playback & Volume Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
        {/* Left: Previous Section Jump */}
        <button
          onClick={onJumpPrev}
          title="Previous Section (⏮)"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          ⏮
        </button>

        {/* Center: Play / Pause */}
        <button
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: '#38bdf8',
            border: 'none',
            color: '#0f172a',
            fontSize: '19px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(56, 189, 248, 0.45)',
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* Next Section Jump */}
        <button
          onClick={onJumpNext}
          title="Next Section (⏭)"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          ⏭
        </button>

        {/* Right: Integrated Volume Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(30, 41, 59, 0.75)',
            padding: '4px 10px',
            borderRadius: '16px',
            border: '1px solid #334155',
          }}
        >
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
              background: 'transparent',
              border: 'none',
              color: isMuted ? '#ef4444' : '#38bdf8',
              fontSize: '14px',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isMuted || volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onInput={(e) => onSetVolume && onSetVolume(parseFloat((e.target as HTMLInputElement).value))}
            onChange={(e) => onSetVolume && onSetVolume(parseFloat(e.target.value))}
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            style={{
              width: '64px',
              height: '6px',
              accentColor: isMuted ? '#ef4444' : '#38bdf8',
              cursor: 'pointer',
              touchAction: 'none',
            }}
          />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: isMuted ? '#ef4444' : '#94a3b8',
              fontVariantNumeric: 'tabular-nums',
              minWidth: '26px',
              textAlign: 'right',
            }}
          >
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
