// app/band/components/modals/AudioStorageModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Song, AudioTrack } from '../../types/band';
import { saveAudioBlobOffline } from '../../lib/offlineStorage';

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
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);
    if (currentSong) {
      formData.append('songId', currentSong.id);
    }

    try {
      const res = await fetch('/api/worship/audio', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Also save offline
        await saveAudioBlobOffline(data.filename, file);
        await fetchAudioList();
        if (currentSong) {
          await onAttachTrack({
            filename: data.filename,
            url: data.url,
            title: file.name,
            sizeBytes: file.size,
          });
        }
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '520px',
          maxHeight: '90vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
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
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Active Song Target */}
          {currentSong && (
            <div style={{ background: '#131c2e', border: '1px solid #2d3f5e', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                ACTIVE SONG:
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                {currentSong.title}
              </div>
              <div style={{ fontSize: '12px', color: currentSong.audioTrack ? '#10b981' : '#f59e0b', marginTop: '4px', fontWeight: 600 }}>
                {currentSong.audioTrack ? `Attached: ${currentSong.audioTrack.title || currentSong.audioTrack.filename}` : 'No track attached'}
              </div>
              {currentSong.audioTrack && (
                <button
                  onClick={() => onAttachTrack(null)}
                  style={{
                    marginTop: '8px',
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

          {/* Upload Box */}
          <div
            style={{
              border: '2px dashed #334155',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(30, 41, 59, 0.3)',
            }}
            onClick={() => document.getElementById('audioFileInput')?.click()}
          >
            <input
              id="audioFileInput"
              type="file"
              accept="audio/mp3,audio/wav,audio/m4a,audio/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <span style={{ fontSize: '28px' }}>📤</span>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff', marginTop: '6px' }}>
              {isUploading ? 'Uploading Audio Track...' : 'Click to Upload MP3 / WAV Backing Track'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Buffers automatically to device for offline live band stage playback
            </div>
          </div>

          {/* Audio Tracks List */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>
              AVAILABLE SERVER AUDIO TRACKS ({audioFiles.length})
            </div>
            {audioFiles.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                No audio tracks uploaded yet.
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
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.title || file.filename}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {Math.round((file.sizeBytes || 0) / 1024 / 1024 * 10) / 10} MB
                      </div>
                    </div>
                    {currentSong && (
                      <button
                        onClick={() =>
                          onAttachTrack({
                            filename: file.filename,
                            url: file.url,
                            title: file.title || file.filename,
                            sizeBytes: file.sizeBytes,
                          })
                        }
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: '#38bdf8',
                          border: 'none',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
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
