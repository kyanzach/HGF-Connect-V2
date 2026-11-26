// app/band/components/SetlistSidebar.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { Song, Setlist, BandUser } from '../types/band';
import { sortSetlistsUpcomingFirst, formatSetlistLabel, formatSetlistMeta, getTodayDateString } from '../lib/sortSetlists';

type SortOption = 'order' | 'title' | 'key' | 'artist' | 'recent';
type KeySortMode = 'fifths' | 'chromatic';

// Musical chromatic pitch order (C -> B) with enharmonic grouping (e.g. A# === Bb)
const KEY_PITCH_RANK: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

// Circle of Fifths worship-flow order (C -> G -> D -> A -> E -> B -> F# -> Db -> Ab -> Eb -> Bb -> F)
const KEY_FIFTHS_RANK: Record<string, number> = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5,
  'F#': 6, Gb: 6, 'C#': 7, Db: 7, 'G#': 8, Ab: 8, 'D#': 9, Eb: 9, 'A#': 10, Bb: 10, F: 11,
};

function getKeySortRank(rawKey?: string, mode: KeySortMode = 'chromatic'): number {
  if (!rawKey) return 999;
  const m = rawKey.trim().match(/^([A-G])([#b]?)(m|min)?/i);
  if (!m) return 999;
  const root = `${m[1].toUpperCase()}${m[2] ? (m[2] === '#' ? '#' : 'b') : ''}`;
  const table = mode === 'fifths' ? KEY_FIFTHS_RANK : KEY_PITCH_RANK;
  const pitch = table[root];
  if (pitch === undefined) return 999;
  return pitch * 2 + (m[3] ? 1 : 0);
}

interface TouchDragHandleProps {
  index: number;
  isDragging: boolean;
  onDragStart: (index: number, startY: number) => void;
}

// Native non-passive touch handle guaranteeing e.preventDefault() prevents Android WebView scrolling
const TouchDragHandle: React.FC<TouchDragHandleProps> = ({ index, isDragging, onDragStart }) => {
  const handleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    const onNativeTouchStart = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      if (e.touches.length > 0) {
        onDragStart(index, e.touches[0].clientY);
      }
    };

    el.addEventListener('touchstart', onNativeTouchStart, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onNativeTouchStart);
    };
  }, [index, onDragStart]);

  return (
    <div
      ref={handleRef}
      title="Hold & drag to sort setlist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '38px',
        color: isDragging ? '#4EB1CB' : '#94a3b8',
        cursor: 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        fontSize: '18px',
        letterSpacing: '-1px',
        flexShrink: 0,
      }}
    >
      ⠿
    </div>
  );
};

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
  onReorderSongInSetlist?: (from: number | string, to: number | string) => Promise<void> | void;
  onDeleteSong?: (id: string) => Promise<void> | void;
  currentUser?: BandUser | null;
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
  onReorderSongInSetlist,
  onDeleteSong,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('order');
  const [keySortMode, setKeySortMode] = useState<KeySortMode>('fifths');

  const sortedSetlists = useMemo(() => sortSetlistsUpcomingFirst(setlists), [setlists]);
  const todayStr = useMemo(() => getTodayDateString(), []);

  // Sync default sort mode when active setlist changes
  useEffect(() => {
    if (activeSetlist) {
      setSortBy('order');
      setKeySortMode('fifths');
    } else {
      setSortBy('title');
      setKeySortMode('chromatic');
    }
  }, [activeSetlist?.id]);

  // Deletion modal state
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Quick setlist picker dropdown for rows when in "All Songs" mode
  const [pickerSongId, setPickerSongId] = useState<string | null>(null);

  // Setlist Drag & Drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);

  const touchDragStartIndex = useRef<number | null>(null);
  const touchTargetIndex = useRef<number | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const touchStartYRef = useRef<number>(0);
  const hasDraggedRef = useRef<boolean>(false);
  const dropPositionRef = useRef<'top' | 'bottom' | null>(null);
  dropPositionRef.current = dropPosition;

  const isSetlistSortingEnabled = Boolean(currentUser && activeSetlist && !searchQuery.trim() && sortBy === 'order');

  // Non-logged-in users cannot alter setlist order: lock permanently to 'order'
  useEffect(() => {
    if (!currentUser && activeSetlist && sortBy !== 'order') {
      setSortBy('order');
    }
  }, [currentUser, activeSetlist, sortBy]);

  // Desktop HTML5 Drag Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isSetlistSortingEnabled || !currentUser) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isSetlistSortingEnabled || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const pos = e.clientY < mid ? 'top' : 'bottom';

    setDragOverIndex(index);
    setDropPosition(pos);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 450);

    if (draggedIndex !== null && draggedIndex !== targetIndex && onReorderSongInSetlist) {
      let finalTarget = targetIndex;
      if (dropPosition === 'bottom' && targetIndex < draggedIndex) {
        finalTarget = Math.min(displayList.length - 1, targetIndex + 1);
      } else if (dropPosition === 'top' && targetIndex > draggedIndex) {
        finalTarget = Math.max(0, targetIndex - 1);
      }
      const fromSong = displayList[draggedIndex];
      const toSong = displayList[finalTarget];
      if (fromSong && toSong) {
        onReorderSongInSetlist(fromSong.id, toSong.id);
      } else {
        onReorderSongInSetlist(draggedIndex, finalTarget);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
  };

  // Mobile Touch Drag Handlers (Hold & Drag with Android APK + iOS full support via native non-passive listeners)
  const handleTouchDragStart = useCallback((index: number, startY: number) => {
    if (!isSetlistSortingEnabled) return;
    touchDragStartIndex.current = index;
    touchTargetIndex.current = index;
    touchStartYRef.current = startY;
    hasDraggedRef.current = false;
    setDraggedIndex(index);
    setDragOverIndex(index);

    const onNativeWindowTouchMove = (e: TouchEvent) => {
      if (touchDragStartIndex.current === null) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();

      const touch = e.touches[0];
      if (!touch) return;

      if (Math.abs(touch.clientY - touchStartYRef.current) > 3) {
        hasDraggedRef.current = true;
      }

      // Dual detection: elementFromPoint + vertical bounding box fallback (immune to horizontal touch drift)
      let targetRow: HTMLElement | null = null;
      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      if (targetEl) {
        targetRow = targetEl.closest('[data-setlist-index]') as HTMLElement | null;
      }

      if (!targetRow && listContainerRef.current) {
        const rows = Array.from(listContainerRef.current.querySelectorAll<HTMLElement>('[data-setlist-index]'));
        if (rows.length > 0) {
          if (touch.clientY < rows[0].getBoundingClientRect().top) {
            targetRow = rows[0];
          } else if (touch.clientY > rows[rows.length - 1].getBoundingClientRect().bottom) {
            targetRow = rows[rows.length - 1];
          } else {
            for (const r of rows) {
              const rect = r.getBoundingClientRect();
              if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
                targetRow = r;
                break;
              }
            }
          }
        }
      }

      if (targetRow) {
        const idxAttr = targetRow.getAttribute('data-setlist-index');
        if (idxAttr !== null) {
          const idx = parseInt(idxAttr, 10);
          if (!isNaN(idx)) {
            touchTargetIndex.current = idx;
            const rect = targetRow.getBoundingClientRect();
            const pos = touch.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
            dropPositionRef.current = pos;
            setDragOverIndex(idx);
            setDropPosition(pos);
          }
        }
      }
    };

    const cleanupWindowListeners = () => {
      window.removeEventListener('touchmove', onNativeWindowTouchMove);
      window.removeEventListener('touchend', onNativeWindowTouchEnd);
      window.removeEventListener('touchcancel', onNativeWindowTouchCancel);
    };

    const onNativeWindowTouchEnd = (e: TouchEvent) => {
      e.stopPropagation();
      cleanupWindowListeners();

      if (hasDraggedRef.current) {
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 450);
      }

      const fromIdx = touchDragStartIndex.current;
      const toIdx = touchTargetIndex.current;
      const currentList = displayListRef.current;
      if (fromIdx !== null && toIdx !== null && fromIdx !== toIdx && onReorderSongInSetlist) {
        let finalTarget = toIdx;
        if (dropPositionRef.current === 'bottom' && toIdx < fromIdx) {
          finalTarget = Math.min(currentList.length - 1, toIdx + 1);
        } else if (dropPositionRef.current === 'top' && toIdx > fromIdx) {
          finalTarget = Math.max(0, toIdx - 1);
        }
        const fromSong = currentList[fromIdx];
        const toSong = currentList[finalTarget];
        if (fromSong && toSong) {
          onReorderSongInSetlist(fromSong.id, toSong.id);
        } else {
          onReorderSongInSetlist(fromIdx, finalTarget);
        }
      }

      touchDragStartIndex.current = null;
      touchTargetIndex.current = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      hasDraggedRef.current = false;
    };

    const onNativeWindowTouchCancel = (e: TouchEvent) => {
      e.stopPropagation();
      cleanupWindowListeners();
      touchDragStartIndex.current = null;
      touchTargetIndex.current = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      hasDraggedRef.current = false;
    };

    window.addEventListener('touchmove', onNativeWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onNativeWindowTouchEnd, { passive: false });
    window.addEventListener('touchcancel', onNativeWindowTouchCancel, { passive: false });
  }, [isSetlistSortingEnabled, onReorderSongInSetlist]);

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
    const compareByKey = (a: Song, b: Song) => {
      const diff = getKeySortRank(a.key, keySortMode) - getKeySortRank(b.key, keySortMode);
      return diff !== 0 ? diff : a.title.localeCompare(b.title);
    };
    if (activeSetlist) {
      if (sortBy === 'title') {
        list.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'key') {
        list.sort(compareByKey);
      } else if (sortBy === 'artist') {
        list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      }
      // 'order' maintains the user's arranged sequence without reordering
    } else {
      if (sortBy === 'title') {
        list.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'key') {
        list.sort(compareByKey);
      } else if (sortBy === 'artist') {
        list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      } else if (sortBy === 'recent') {
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    }

    return list;
  }, [activeSetlist, songs, searchQuery, sortBy, keySortMode]);

  const displayListRef = useRef<Song[]>([]);
  displayListRef.current = displayList;

  // Set of song IDs in the currently active setlist (if any)
  const activeSetlistSongIds = useMemo(() => {
    if (!activeSetlist || !activeSetlist.songs) return new Set<string>();
    return new Set(activeSetlist.songs.map((s) => (typeof s === 'string' ? s : s.id)));
  }, [activeSetlist]);

  // Smart cross-library search: when viewing a specific setlist and searching,
  // also find matching songs already in the full Songbook Library so users can
  // add existing DB songs in 1 tap instead of re-importing duplicates.
  const libraryMatches = useMemo(() => {
    if (!activeSetlist || !searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return songs
      .filter(
        (s) =>
          !activeSetlistSongIds.has(s.id) &&
          (s.title.toLowerCase().includes(q) ||
            (s.artist && s.artist.toLowerCase().includes(q)) ||
            (s.key && s.key.toLowerCase().includes(q)))
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [activeSetlist, searchQuery, songs, activeSetlistSongIds]);

  // Precompute setlist membership count per song for multi-setlist badges
  const songSetlistIdsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    setlists.forEach((st) => {
      (st.songs || []).forEach((it) => {
        const sId = typeof it === 'string' ? it : it.id;
        let bucket = map.get(sId);
        if (!bucket) {
          bucket = new Set<string>();
          map.set(sId, bucket);
        }
        bucket.add(st.id);
      });
    });
    return map;
  }, [setlists]);

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
            padding: '14px 16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            paddingTop: 'max(14px, env(safe-area-inset-top))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(78, 177, 203, 0.14)',
                border: '1px solid rgba(78, 177, 203, 0.32)',
                color: '#4EB1CB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {activeSetlist ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  <path d="M9 10h6" />
                  <path d="M9 6h6" />
                </svg>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '15.5px',
                  color: '#f8fafc',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {activeSetlist ? activeSetlist.name : 'Songbook Library'}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#94a3b8',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeSetlist
                  ? `${formatSetlistMeta(activeSetlist) ? `${formatSetlistMeta(activeSetlist)} • ` : ''}${activeSetlist.songs?.length || 0} ${(activeSetlist.songs?.length || 0) === 1 ? 'song' : 'songs'}`
                  : `${songs.length} songs in library`}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              border: '1px solid #1e293b',
              background: '#131c2e',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* SETLIST PICKER & SEARCH */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <select
            value={activeSetlistId || ''}
            onChange={(e) => onSelectSetlist(e.target.value ? e.target.value : null)}
            aria-label="Switch setlist"
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '10px',
              background: '#131c2e',
              border: '1px solid #26354d',
              color: '#f1f5f9',
              padding: '0 10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Songs ({songs.length})</option>
            {sortedSetlists.map((s) => {
              const isUpcoming = Boolean(s.serviceDate && s.serviceDate >= todayStr);
              return (
                <option key={s.id} value={s.id}>
                  {isUpcoming ? '★ ' : ''}{formatSetlistLabel(s, { includeCount: true })}
                </option>
              );
            })}
          </select>

          {/* Unified Search Input with leading SVG icon & inline clear button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchQuery.trim();
              if (q && displayList.length === 0 && libraryMatches.length === 0) {
                (document.activeElement as HTMLElement | null)?.blur?.();
                onClose();
                onOpenScraper(q);
              }
            }}
            style={{ width: '100%', margin: 0, position: 'relative' }}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={searchQuery ? '#4EB1CB' : '#94a3b8'}
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '13px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                transition: 'stroke 0.15s ease',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              enterKeyHint="search"
              placeholder="Search"
              aria-label="Search songs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '11px',
                background: '#111a2c',
                border: `1.5px solid ${searchQuery ? '#4EB1CB' : '#2d405c'}`,
                color: '#fff',
                padding: searchQuery ? '0 38px 0 40px' : '0 14px 0 40px',
                fontSize: '15px',
                fontWeight: 500,
                boxSizing: 'border-box',
                outline: 'none',
                boxShadow: searchQuery ? '0 0 0 3px rgba(78, 177, 203, 0.16)' : 'inset 0 1px 2px rgba(0,0,0,0.35)',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '7px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgba(148, 163, 184, 0.14)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>

          {/* Compact Online Chords shortcut — only shown while actively typing a query */}
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenScraper(searchQuery.trim());
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                background: 'rgba(78, 177, 203, 0.12)',
                border: '1px solid rgba(78, 177, 203, 0.32)',
                color: '#7dd3fc',
                fontSize: '11.5px',
                fontWeight: 700,
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Search &quot;<strong>{searchQuery.trim()}</strong>&quot; on Ultimate Guitar
              </span>
            </button>
          )}

          {/* Segmented Sort Control */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px',
              borderRadius: '9px',
              background: '#090d15',
              border: '1px solid #1a2436',
            }}
          >
            {activeSetlist && !currentUser ? (
              <div
                style={{
                  flex: 1,
                  height: '26px',
                  borderRadius: '6px',
                  background: 'rgba(78, 177, 203, 0.1)',
                  color: '#4EB1CB',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  userSelect: 'none',
                }}
                title="Setlist order is locked for guest viewers"
              >
                <span>Setlist Order</span>
              </div>
            ) : (
              (activeSetlist
                ? [
                    { id: 'order' as SortOption, label: 'Order' },
                    { id: 'title' as SortOption, label: 'A-Z' },
                    { id: 'key' as SortOption, label: 'Key' },
                    { id: 'artist' as SortOption, label: 'Artist' },
                  ]
                : [
                    { id: 'title' as SortOption, label: 'A-Z' },
                    { id: 'key' as SortOption, label: 'Key' },
                    { id: 'artist' as SortOption, label: 'Artist' },
                    { id: 'recent' as SortOption, label: 'Recent' },
                  ]
              ).map((st) => {
                const active = sortBy === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSortBy(st.id)}
                    style={{
                      flex: 1,
                      height: '26px',
                      borderRadius: '6px',
                      border: active ? '1px solid rgba(78, 177, 203, 0.35)' : '1px solid transparent',
                      background: active ? '#152236' : 'transparent',
                      color: active ? '#4EB1CB' : '#8596ad',
                      fontSize: '11.5px',
                      fontWeight: active ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {st.label}
                  </button>
                );
              })
            )}
          </div>

          {/* Dual Key Sort Sub-Toggle (shown only when Key sort is active) */}
          {sortBy === 'key' && (!activeSetlist || Boolean(currentUser)) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px',
                borderRadius: '8px',
                background: '#0b1220',
                border: '1px solid rgba(78, 177, 203, 0.22)',
              }}
            >
              {(
                [
                  { id: 'fifths' as KeySortMode, label: 'Flow (5ths)', title: 'Circle of Fifths: C → G → D → A → E (smooth live transitions)' },
                  { id: 'chromatic' as KeySortMode, label: 'Scale (C–B)', title: 'Chromatic low to high: C → C# → D → ... → B' },
                ] as const
              ).map((opt) => {
                const isSelected = keySortMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    title={opt.title}
                    onClick={() => setKeySortMode(opt.id)}
                    style={{
                      flex: 1,
                      height: '24px',
                      borderRadius: '5px',
                      border: 'none',
                      background: isSelected ? 'rgba(78, 177, 203, 0.18)' : 'transparent',
                      color: isSelected ? '#67e8f9' : '#64748b',
                      fontSize: '11px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SONG LIST */}
        <div ref={listContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {displayList.length === 0 && libraryMatches.length === 0 ? (
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
                  whiteSpace: 'nowrap',
                }}
              >
                Search on Ultimate Guitar
              </button>
            </div>
          ) : (
            <>
            {displayList.map((song, idx) => {
              const isActive = song.id === currentSongId;
              const inCurSetlist = activeSetlistSongIds.has(song.id);
              const isCurrentlyDragged = draggedIndex === idx;
              const isOverThis = dragOverIndex === idx;

              return (
                <div
                  key={`${song.id}-${idx}`}
                  data-setlist-index={idx}
                  draggable={isSetlistSortingEnabled}
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onSelectSong(song.id);
                    onClose();
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isCurrentlyDragged
                      ? 'rgba(78, 177, 203, 0.12)'
                      : isActive
                      ? 'rgba(78, 177, 203, 0.18)'
                      : 'transparent',
                    border: isCurrentlyDragged
                      ? '1px dashed #4EB1CB'
                      : `1px solid ${isActive ? '#4EB1CB' : 'transparent'}`,
                    borderTop: isOverThis && dropPosition === 'top' ? '2px solid #4EB1CB' : undefined,
                    borderBottom: isOverThis && dropPosition === 'bottom' ? '2px solid #4EB1CB' : undefined,
                    opacity: isCurrentlyDragged ? 0.4 : 1,
                    marginBottom: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                    transition: isCurrentlyDragged ? 'none' : 'background 0.15s ease',
                  }}
                >
                  {/* Left Drag Handle & 1-Tap Step Reorder Buttons (Active Setlist Only) */}
                  {isSetlistSortingEnabled && (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <TouchDragHandle
                        index={idx}
                        isDragging={draggedIndex === idx}
                        onDragStart={handleTouchDragStart}
                      />
                      <div
                        style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            const prevSong = displayList[idx - 1];
                            if (prevSong) {
                              onReorderSongInSetlist?.(song.id, prevSong.id);
                            } else {
                              onReorderSongInSetlist?.(idx, idx - 1);
                            }
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          title="Move Up"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: idx === 0 ? 'rgba(148, 163, 184, 0.25)' : '#94a3b8',
                            borderRadius: '4px',
                            width: '26px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            cursor: idx === 0 ? 'default' : 'pointer',
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === displayList.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextSong = displayList[idx + 1];
                            if (nextSong) {
                              onReorderSongInSetlist?.(song.id, nextSong.id);
                            } else {
                              onReorderSongInSetlist?.(idx, idx + 1);
                            }
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          title="Move Down"
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: idx === displayList.length - 1 ? 'rgba(148, 163, 184, 0.25)' : '#94a3b8',
                            borderRadius: '4px',
                            width: '26px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '9px',
                            cursor: idx === displayList.length - 1 ? 'default' : 'pointer',
                            padding: 0,
                            lineHeight: 1,
                          }}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  )}

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

                    {/* Quick Setlist Action (only in All Songs view — inside an active setlist, the ✕ button removes the song) */}
                    {!activeSetlist && (
                      /* In "All Songs" view: multi-setlist toggle picker */
                      (() => {
                        const memberSetIds = songSetlistIdsMap.get(song.id);
                        const memberCount = memberSetIds ? memberSetIds.size : 0;
                        return (
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          title={memberCount > 0 ? `In ${memberCount} setlist${memberCount > 1 ? 's' : ''} — tap to add or remove` : 'Add song to setlists'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (setlists.length === 1 && memberCount === 0 && onAddSongToSetlist) {
                              onAddSongToSetlist(song.id, setlists[0].id);
                            } else {
                              setPickerSongId(pickerSongId === song.id ? null : song.id);
                            }
                          }}
                          style={{
                            height: '22px',
                            padding: '0 6px',
                            borderRadius: '5px',
                            border: memberCount > 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #334155',
                            background: memberCount > 0 ? 'rgba(16, 185, 129, 0.14)' : '#1e293b',
                            color: memberCount > 0 ? '#10b981' : '#cbd5e1',
                            fontSize: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {memberCount > 0 ? `✓ ${memberCount} Set${memberCount > 1 ? 's' : ''}` : '+ Set'}
                        </button>

                        {/* Multi-Setlist toggle picker popup */}
                        {pickerSongId === song.id && (
                          <>
                            {/* Backdrop to close when clicking outside */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setPickerSongId(null);
                              }}
                              style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 140,
                                cursor: 'default',
                              }}
                            />
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
                                padding: '6px',
                                minWidth: '210px',
                                maxWidth: '280px',
                                maxHeight: '280px',
                                overflowY: 'auto',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.85)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  padding: '2px 4px 6px 4px',
                                  borderBottom: '1px solid #1e293b',
                                  marginBottom: '4px',
                                }}
                              >
                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}>
                                  Add to setlists
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPickerSongId(null);
                                  }}
                                  title="Done"
                                  style={{
                                    background: '#4EB1CB',
                                    border: 'none',
                                    color: '#000',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    lineHeight: '16px',
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  Done
                                </button>
                              </div>
                              {sortedSetlists.length === 0 ? (
                                <div style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 6px' }}>
                                  No setlists created yet
                                </div>
                              ) : (
                                sortedSetlists.map((st) => {
                                  const isInSet = Boolean(memberSetIds?.has(st.id));
                                  return (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => {
                                        if (isInSet) {
                                          onRemoveSongFromSetlist?.(song.id, st.id);
                                        } else {
                                          onAddSongToSetlist?.(song.id, st.id);
                                        }
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '6px 8px',
                                        marginBottom: '2px',
                                        background: isInSet ? 'rgba(16, 185, 129, 0.14)' : 'transparent',
                                        border: isInSet ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                                        color: isInSet ? '#a7f3d0' : '#f8fafc',
                                        fontSize: '11px',
                                        fontWeight: isInSet ? 700 : 600,
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '6px',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isInSet) e.currentTarget.style.background = '#1e293b';
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isInSet) e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {formatSetlistLabel(st)}
                                      </span>
                                      <span
                                        style={{
                                          flexShrink: 0,
                                          fontSize: '10px',
                                          fontWeight: 800,
                                          color: isInSet ? '#10b981' : '#4EB1CB',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {isInSet ? '✓ Added' : '+ Add'}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </>
                        )}
                      </div>
                        );
                      })()
                    )}

                    {/* If inside an active setlist: show 'Remove from Setlist' button (keeps song in library!) */}
                    {activeSetlist ? (
                      <button
                        type="button"
                        title={`Remove "${song.title}" from ${activeSetlist.name} (keeps song in library)`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRemoveSongFromSetlist) {
                            onRemoveSongFromSetlist(song.id, activeSetlist.id);
                          }
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#f87171',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                        }}
                      >
                        ✕
                      </button>
                    ) : (
                      /* ONLY in "All Songs" master library view: show permanent library delete button for Admin/MD */
                      (currentUser?.role === 'admin' || currentUser?.role === 'MD') && (
                        <button
                          type="button"
                          title="Permanently delete song from church library (Admin/MD)"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSongToDelete(song);
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
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
                      )
                    )}
                  </div>
                </div>
              );
            })}

            {/* SMART CROSS-LIBRARY MATCHES WHEN SEARCHING INSIDE AN ACTIVE SETLIST */}
            {activeSetlist && libraryMatches.length > 0 && (
              <div style={{ marginTop: displayList.length > 0 ? '12px' : '2px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    marginBottom: '6px',
                    borderTop: displayList.length > 0 ? '1px solid #1e293b' : 'none',
                    paddingTop: displayList.length > 0 ? '10px' : '4px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#4EB1CB' }}>
                    In Songbook ({libraryMatches.length})
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    Already in library
                  </span>
                </div>
                {libraryMatches.map((song) => (
                  <div
                    key={`lib-${song.id}`}
                    onClick={() => {
                      onSelectSong(song.id);
                      onClose();
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid #1e293b',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
                      <button
                        type="button"
                        title={`Add "${song.title}" to ${activeSetlist.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddSongToSetlist?.(song.id, activeSetlist.id);
                          setSearchQuery('');
                        }}
                        style={{
                          height: '28px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#4EB1CB',
                          color: '#000',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            gap: '6px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (currentUser) onClose();
              onOpenNewSongModal();
            }}
            title={currentUser ? 'Add a new song to the church library' : 'Login required to add songs'}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              background: currentUser ? '#4EB1CB' : 'rgba(78, 177, 203, 0.15)',
              border: currentUser ? 'none' : '1px dashed rgba(78, 177, 203, 0.4)',
              color: currentUser ? '#000' : '#4EB1CB',
              fontWeight: 800,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>New Song</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentUser) onClose();
              onOpenScraper('');
            }}
            title={currentUser ? 'Search Ultimate Guitar chord charts' : 'Login required to search online chords'}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#7dd3fc',
              fontWeight: 700,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span>Online</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentUser) onClose();
              onOpenSetlistAdmin();
            }}
            title={currentUser ? 'Manage & create setlists' : 'Login required to manage setlists'}
            style={{
              flex: 1,
              height: '38px',
              borderRadius: '9px',
              background: '#131c2e',
              border: '1px solid #26354d',
              color: '#e2e8f0',
              fontWeight: 700,
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
            <span>Setlists</span>
          </button>
        </div>
      </aside>

      {/* CONFIRMATION MODAL FOR PERMANENT LIBRARY DELETION */}
      <ConfirmModal
        open={!!songToDelete}
        title="⚠️ Permanently Delete from Church Library?"
        message={`Are you sure you want to permanently delete "${songToDelete?.title}" from the entire church songbook library?\n\n⚠️ NOTE: This removes the song permanently for all musicians.\nIf you only wanted to remove this song from a setlist, cancel this and use the "✕" button inside that setlist instead.`}
        confirmLabel="Permanently Delete Song"
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
