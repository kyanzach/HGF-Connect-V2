// app/band/components/modals/AudioStorageModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Song, AudioTrack, AudioMarker } from '../../types/band';
import { saveAudioBlobOffline } from '../../lib/offlineStorage';
import {
  extractRoadmapSections,
  detectAudioChaptersFromBlob,
  getCachedAudioMarkers,
  saveCachedAudioMarkers,
  generateFallbackMarkers,
} from '../../lib/audioAnalysis';

interface AudioStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  onAttachTrack: (track: AudioTrack | null) => Promise<void>;
}

export const AudioStorageModal: React.FC<AudioStorageModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  onAttachTrack,
}) => {
  const [storageMode, setStorageMode] = useState<'local' | 'cloud'>('local');
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

  const fetchAudioList = async () => {
    try {
      const res = await fetch('/api/worship/audio');
      if (res.ok) {
        const data = await res.json();
        setAudioFiles(data.files || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudioList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSong) return;

    setIsProcessing(true);
    setStatusText('Reading audio file...');

    try {
      // 1. Estimate audio duration quickly
      let durationSec = 210;
      try {
        const tempAudio = new Audio(URL.createObjectURL(file));
        await new Promise((res) => {
          tempAudio.onloadedmetadata = () => {
            durationSec = tempAudio.duration || 210;
            res(true);
          };
          tempAudio.onerror = () => res(true);
          setTimeout(() => res(true), 1200);
        });
      } catch {}

      // 2. Perform one-time chapter detection on upload
      setStatusText('Detecting vocal & energy sections (one-time)...');
      const roadmap = extractRoadmapSections(currentSong.chords);
      let detectedMarkers: AudioMarker[] = [];
      try {
        detectedMarkers = await detectAudioChaptersFromBlob(file, durationSec, roadmap);
      } catch {
        detectedMarkers = generateFallbackMarkers(durationSec, roadmap);
      }

      if (detectedMarkers.length === 0) {
        detectedMarkers = generateFallbackMarkers(durationSec, roadmap);
      }
      saveCachedAudioMarkers(currentSong.id, detectedMarkers);

      // 3. Storage path: Local Device Only vs Cloud Server
      if (storageMode === 'local') {
        setStatusText('Saving to local device storage (IndexedDB)...');
        const localFilename = `local_${currentSong.id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        await saveAudioBlobOffline(localFilename, file);

        const localTrack: AudioTrack = {
          filename: localFilename,
          url: 'indexeddb://local',
          title: file.name,
          sizeBytes: file.size,
          durationSec: Math.round(durationSec),
          markers: detectedMarkers,
          isLocalOnly: true,
          uploadedAt: Date.now(),
        };

        await onAttachTrack(localTrack);
        setStatusText('Audio saved locally and ready!');
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 600);
        return;
      }

      // Cloud Upload
      setStatusText('Uploading track to band cloud server...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('songId', currentSong.id);

      const res = await fetch('/api/worship/audio', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await saveAudioBlobOffline(data.filename, file);
        await fetchAudioList();

        const cloudTrack: AudioTrack = {
          filename: data.filename,
          url: data.url,
          title: file.name,
          sizeBytes: file.size,
          durationSec: Math.round(durationSec),
          markers: detectedMarkers,
          isLocalOnly: false,
          uploadedAt: Date.now(),
        };

        await onAttachTrack(cloudTrack);
        setStatusText('Uploaded & attached to song!');
        setTimeout(() => {
          setIsProcessing(false);
          onClose();
        }, 600);
      } else {
        throw new Error(`Upload failed HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error('Audio processing failed:', err);
      setStatusText('Error processing audio. Please try again.');
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎧</span> Backing Tracks & Audio Manager
          </div>
          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              border: 'none',
              background: '#1e293b',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 800,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Song Target */}
          {currentSong && (
            <div style={{ background: '#131c2e', border: '1px solid #2d3f5e', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.04em' }}>
                ACTIVE SONG:
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {currentSong.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                {currentSong.audioTrack ? (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    {currentSong.audioTrack.isLocalOnly ? '📱 Device Local Track' : '☁️ Cloud Track'} •{' '}
                    {currentSong.audioTrack.title || currentSong.audioTrack.filename}
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                    No backtrack attached yet
                  </span>
                )}
              </div>
              {currentSong.audioTrack && (
                <button
                  onClick={() => onAttachTrack(null)}
                  style={{
                    marginTop: '10px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Detach Track
                </button>
              )}
            </div>
          )}

          {/* Storage Mode Toggle */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em' }}>
              STORAGE LOCATION FOR NEW TRACK:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStorageMode('local')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${storageMode === 'local' ? '#38bdf8' : '#334155'}`,
                  background: storageMode === 'local' ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  color: storageMode === 'local' ? '#38bdf8' : '#94a3b8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📱 Local Device Only
                </div>
                <div style={{ fontSize: '10.5px', marginTop: '4px', opacity: 0.85, lineHeight: 1.3 }}>
                  Kept inside this phone (0MB server). Stays permanently linked without re-selecting.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStorageMode('cloud')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${storageMode === 'cloud' ? '#38bdf8' : '#334155'}`,
                  background: storageMode === 'cloud' ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                  color: storageMode === 'cloud' ? '#38bdf8' : '#94a3b8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ☁️ Band Cloud Server
                </div>
                <div style={{ fontSize: '10.5px', marginTop: '4px', opacity: 0.85, lineHeight: 1.3 }}>
                  Uploaded to server so all other musicians and band members can listen.
                </div>
              </button>
            </div>
          </div>

          {/* Select & Attach Box */}
          <div
            style={{
              border: '2px dashed #38bdf8',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              cursor: isProcessing ? 'default' : 'pointer',
              background: 'rgba(56, 189, 248, 0.05)',
              opacity: isProcessing ? 0.7 : 1,
            }}
            onClick={() => {
              if (!isProcessing) {
                document.getElementById('audioTrackFileInput')?.click();
              }
            }}
          >
            <input
              id="audioTrackFileInput"
              type="file"
              accept="audio/mp3,audio/wav,audio/m4a,audio/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={isProcessing}
            />
            <span style={{ fontSize: '32px' }}>{storageMode === 'local' ? '📱' : '☁️'}</span>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff', marginTop: '6px' }}>
              {isProcessing
                ? statusText
                : storageMode === 'local'
                ? 'Choose Audio File from Phone / Drive / Files'
                : 'Upload Audio File to Cloud Server'}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Vocal onsets & chapter transitions will be analyzed once upon selection
            </div>
          </div>

          {/* Server Audio Tracks List (Only for cloud mode or browsing server files) */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.04em' }}>
              SHARED SERVER TRACKS ({audioFiles.length})
            </div>
            {audioFiles.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
                No server tracks uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {audioFiles.map((file) => (
                  <div
                    key={file.filename}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.title || file.filename}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                        {Math.round(((file.sizeBytes || 0) / 1024 / 1024) * 10) / 10} MB
                      </div>
                    </div>
                    {currentSong && (
                      <button
                        onClick={() => {
                          const roadmap = extractRoadmapSections(currentSong.chords);
                          const estDuration = currentSong.audioTrack?.durationSec || 210;
                          const cached = getCachedAudioMarkers(currentSong.id);
                          const markers = cached || generateFallbackMarkers(estDuration, roadmap);
                          onAttachTrack({
                            filename: file.filename,
                            url: file.url,
                            title: file.title || file.filename,
                            sizeBytes: file.sizeBytes,
                            markers,
                            isLocalOnly: false,
                          });
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#38bdf8',
                          border: 'none',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        Attach
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
