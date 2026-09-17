// app/band/components/SetlistSidebar.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Song, Setlist } from '../types/band';

interface SetlistSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  setlists: Setlist[];
  activeSetlist: Setlist | null;
  activeSetlistId: string | null;
  currentSongId: string | null;
  onSelectSong: (id: string) => void;
  onSelectSetlist: (id: string | null) => void;
  onOpenNewSongModal: () => void;
  onOpenSetlistAdmin: () => void;
}

export const SetlistSidebar: React.FC<SetlistSidebarProps> = ({
  isOpen,
  onClose,
  songs,
  setlists,
  activeSetlist,
  activeSetlistId,
  currentSongId,
  onSelectSong,
  onSelectSetlist,
  onOpenNewSongModal,
  onOpenSetlistAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'key' | 'artist' | 'recent'>('title');

  const displayList = useMemo(() => {
    let list: Song[] = [];
    if (activeSetlist) {
      const items = activeSetlist.songs || [];
      items.forEach((it) => {
        const sId = typeof it === 'string' ? it : it.id;
        const found = songs.find((s) => s.id === sId);
        if (found) {
          list.push({
            ...found,
            key: typeof it === 'object' && it.key ? it.key : found.key,
          });
        }
      });
    } else {
      list = [...songs];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.artist && s.artist.toLowerCase().includes(q)) ||
          (s.key && s.key.toLowerCase().includes(q))
      );
    }

    // Apply sorting
    if (!activeSetlist || sortBy !== 'title') {
      if (sortBy === 'title') {
        list.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'key') {
        list.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
      } else if (sortBy === 'artist') {
        list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      } else if (sortBy === 'recent') {
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    }

    return list;
  }, [activeSetlist, songs, searchQuery, sortBy]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 90,
        }}
      />

      {/* Drawer */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '320px',
          maxWidth: '85vw',
          backgroundColor: '#0c1017',
          borderRight: '1px solid #1e293b',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.8)',
          userSelect: 'none',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 'max(16px, env(safe-area-inset-top))',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff' }}>
            {activeSetlist ? activeSetlist.name : 'Songbook Library'}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#1e293b',
              color: '#94a3b8',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* SETLIST PICKER & ACTIONS */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={activeSetlistId || ''}
            onChange={(e) => onSelectSetlist(e.target.value ? e.target.value : null)}
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              padding: '0 10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="">All Songs ({songs.length})</option>
            {setlists.map((s) => (
              <option key={s.id} value={s.id}>
                🎼 {s.name} ({s.songs?.length || 0})
              </option>
            ))}
          </select>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search song title or artist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '34px',
              borderRadius: '8px',
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              color: '#fff',
              padding: '0 10px',
              fontSize: '13px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {/* Sort By Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
              Sort:
            </span>
            {[
              { id: 'title', label: 'A-Z' },
              { id: 'key', label: 'Key' },
              { id: 'artist', label: 'Artist' },
              { id: 'recent', label: 'Recent' },
            ].map((st) => {
              const active = sortBy === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setSortBy(st.id as any)}
                  style={{
                    flex: 1,
                    height: '24px',
                    borderRadius: '6px',
                    border: `1px solid ${active ? '#4EB1CB' : '#334155'}`,
                    background: active ? 'rgba(78, 177, 203, 0.2)' : '#1e293b',
                    color: active ? '#4EB1CB' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SONG LIST */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {displayList.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              No songs found.
            </div>
          ) : (
            displayList.map((song, idx) => {
              const isActive = song.id === currentSongId;
              return (
                <div
                  key={`${song.id}-${idx}`}
                  onClick={() => {
                    onSelectSong(song.id);
                    onClose();
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(78, 177, 203, 0.18)' : 'transparent',
                    border: `1px solid ${isActive ? '#4EB1CB' : 'transparent'}`,
                    marginBottom: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        color: isActive ? '#4EB1CB' : '#f8fafc',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activeSetlist && (
                        <span style={{ color: '#64748b', marginRight: '6px' }}>
                          {idx + 1}.
                        </span>
                      )}
                      {song.title}
                    </div>
                    {song.artist && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#64748b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}
                      >
                        {song.artist}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {song.audioTrack && <span style={{ fontSize: '11px' }}>🎵</span>}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#facc15',
                        background: '#1e293b',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {song.key || 'C'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: '8px',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            onClick={() => {
              onClose();
              onOpenNewSongModal();
            }}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '8px',
              background: '#4EB1CB',
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            + Add Song
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenSetlistAdmin();
            }}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Setlists
          </button>
        </div>
      </aside>
    </>
  );
};
