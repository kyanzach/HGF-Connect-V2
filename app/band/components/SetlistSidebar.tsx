// app/band/components/SetlistSidebar.tsx
'use client';

import React, { useState, useMemo } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
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
  onOpenScraper: (initialQuery?: string) => void;
  onAddSongToSetlist?: (songId: string, setlistId?: string) => void;
  onRemoveSongFromSetlist?: (songId: string, setlistId: string) => void;
  onDeleteSong?: (id: string) => Promise<void> | void;
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
  onOpenScraper,
  onAddSongToSetlist,
  onRemoveSongFromSetlist,
  onDeleteSong,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'title' | 'key' | 'artist' | 'recent'>('title');

  // Deletion modal state
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Quick setlist picker dropdown for rows when in "All Songs" mode
  const [pickerSongId, setPickerSongId] = useState<string | null>(null);

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

  // Set of song IDs in the currently active setlist (if any)
  const activeSetlistSongIds = useMemo(() => {
    if (!activeSetlist || !activeSetlist.songs) return new Set<string>();
    return new Set(activeSetlist.songs.map((s) => (typeof s === 'string' ? s : s.id)));
  }, [activeSetlist]);

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
          width: '360px',
          maxWidth: '90vw',
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
          <div style={{ fontWeight: 800, fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎼</span>
            <span>{activeSetlist ? activeSetlist.name : 'Songbook Library'}</span>
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

          {/* Scrape Online Tabs Trigger Button */}
          {searchQuery.trim() ? (
            <button
              onClick={() => {
                onClose();
                onOpenScraper(searchQuery.trim());
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                background: 'rgba(59, 130, 246, 0.14)',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🎸</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Search &quot;<strong>{searchQuery}</strong>&quot; on Ultimate Guitar...
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onOpenScraper('');
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(78, 177, 203, 0.1)',
                border: '1px solid rgba(78, 177, 203, 0.25)',
                color: '#4EB1CB',
                fontSize: '11px',
                fontWeight: 700,
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>🔍</span>
              <span>Search Online Chords (Ultimate Guitar)</span>
            </button>
          )}

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
              <div>No songs found matching &quot;{searchQuery}&quot;.</div>
              <button
                onClick={() => {
                  onClose();
                  onOpenScraper(searchQuery);
                }}
                style={{
                  marginTop: '12px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#4EB1CB',
                  border: 'none',
                  color: '#000',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🔍 Search on Ultimate Guitar
              </button>
            </div>
          ) : (
            displayList.map((song, idx) => {
              const isActive = song.id === currentSongId;
              const inCurSetlist = activeSetlistSongIds.has(song.id);

              return (
                <div
                  key={`${song.id}-${idx}`}
                  onClick={() => {
                    onSelectSong(song.id);
                    onClose();
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isActive ? 'rgba(78, 177, 203, 0.18)' : 'transparent',
                    border: `1px solid ${isActive ? '#4EB1CB' : 'transparent'}`,
                    marginBottom: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Title & Artist */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '13px',
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
                          marginTop: '1px',
                        }}
                      >
                        {song.artist}
                      </div>
                    )}
                  </div>

                  {/* Right Actions & Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    {song.audioTrack && <span style={{ fontSize: '11px' }}>🎵</span>}

                    {/* Key badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#facc15',
                        background: '#1e293b',
                        padding: '2px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      {song.key || 'C'}
                    </span>

                    {/* Quick Setlist Action */}
                    {activeSetlist ? (
                      inCurSetlist ? (
                        <button
                          title={`Remove from ${activeSetlist.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRemoveSongFromSetlist) {
                              onRemoveSongFromSetlist(song.id, activeSetlist.id);
                            }
                          }}
                          style={{
                            height: '22px',
                            padding: '0 6px',
                            borderRadius: '5px',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            fontSize: '10px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          ✓ Set
                        </button>
                      ) : (
                        <button
                          title={`Add to ${activeSetlist.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onAddSongToSetlist) {
                              onAddSongToSetlist(song.id, activeSetlist.id);
                            }
                          }}
                          style={{
                            height: '22px',
                            padding: '0 6px',
                            borderRadius: '5px',
                            border: '1px solid rgba(78, 177, 203, 0.4)',
                            background: 'rgba(78, 177, 203, 0.15)',
                            color: '#4EB1CB',
                            fontSize: '10px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          + Set
                        </button>
                      )
                    ) : (
                      /* In "All Songs" view: allow adding to active setlist or picking one */
                      <div style={{ position: 'relative' }}>
                        <button
                          title="Add song to a setlist"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (setlists.length === 1 && onAddSongToSetlist) {
                              onAddSongToSetlist(song.id, setlists[0].id);
                            } else {
                              setPickerSongId(pickerSongId === song.id ? null : song.id);
                            }
                          }}
                          style={{
                            height: '22px',
                            padding: '0 6px',
                            borderRadius: '5px',
                            border: '1px solid #334155',
                            background: '#1e293b',
                            color: '#cbd5e1',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + Set
                        </button>

                        {/* Setlist picker popup */}
                        {pickerSongId === song.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              top: '26px',
                              right: 0,
                              zIndex: 150,
                              background: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                              padding: '4px',
                              minWidth: '150px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                            }}
                          >
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', padding: '4px 6px' }}>
                              ADD TO SETLIST:
                            </div>
                            {setlists.length === 0 ? (
                              <div style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 6px' }}>
                                No setlists created yet
                              </div>
                            ) : (
                              setlists.map((st) => (
                                <button
                                  key={st.id}
                                  onClick={() => {
                                    if (onAddSongToSetlist) {
                                      onAddSongToSetlist(song.id, st.id);
                                    }
                                    setPickerSongId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '5px 8px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  🎼 {st.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Delete Song Action with Confirmation */}
                    <button
                      title="Delete song from songbook"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongToDelete(song);
                      }}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '5px',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#f87171',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      🗑️
                    </button>
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
            gap: '6px',
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
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            + Add Song
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenScraper('');
            }}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.18)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#60a5fa',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            🎸 Scrape Tabs
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
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Setlists
          </button>
        </div>
      </aside>

      {/* CONFIRMATION MODAL FOR DELETION */}
      <ConfirmModal
        open={!!songToDelete}
        title="🗑️ Delete Song from Songbook"
        message={`Are you sure you want to delete "${songToDelete?.title}" from the songbook library? This will permanently remove the song and its chords.`}
        confirmLabel="Delete Song"
        confirmColor="#ef4444"
        loading={isDeleting}
        onConfirm={async () => {
          if (!songToDelete || !onDeleteSong) return;
          setIsDeleting(true);
          try {
            await onDeleteSong(songToDelete.id);
            setSongToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setSongToDelete(null)}
      />
    </>
  );
};
