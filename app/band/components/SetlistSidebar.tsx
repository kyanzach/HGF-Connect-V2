// app/band/components/SetlistSidebar.tsx
'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { Song, Setlist, BandUser } from '../types/band';
import { sortSetlistsUpcomingFirst, formatServiceDate, getTodayDateString } from '../lib/sortSetlists';

type SortOption = 'order' | 'title' | 'key' | 'artist' | 'recent';

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
  onReorderSongInSetlist?: (fromIndex: number, toIndex: number) => Promise<void> | void;
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

  const sortedSetlists = useMemo(() => sortSetlistsUpcomingFirst(setlists), [setlists]);
  const todayStr = useMemo(() => getTodayDateString(), []);

  // Sync default sort mode when active setlist changes
  useEffect(() => {
    if (activeSetlist) {
      setSortBy('order');
    } else {
      setSortBy('title');
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
    if (draggedIndex !== null && draggedIndex !== targetIndex && onReorderSongInSetlist) {
      let finalTarget = targetIndex;
      if (dropPosition === 'bottom' && targetIndex < draggedIndex) {
        finalTarget = Math.min(displayList.length - 1, targetIndex + 1);
      } else if (dropPosition === 'top' && targetIndex > draggedIndex) {
        finalTarget = Math.max(0, targetIndex - 1);
      }
      onReorderSongInSetlist(draggedIndex, finalTarget);
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
        onReorderSongInSetlist(fromIdx, finalTarget);
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
    if (activeSetlist) {
      if (sortBy === 'title') {
        list.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'key') {
        list.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
      } else if (sortBy === 'artist') {
        list.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      }
      // 'order' maintains the user's arranged sequence without reordering
    } else {
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

  const displayListRef = useRef<Song[]>([]);
  displayListRef.current = displayList;

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
            {sortedSetlists.map((s) => {
              const isUpcoming = Boolean(s.serviceDate && s.serviceDate >= todayStr);
              const dateTag = formatServiceDate(s.serviceDate);
              const hasDateInName = dateTag && s.name.toLowerCase().includes(dateTag.toLowerCase());
              return (
                <option key={s.id} value={s.id}>
                  {isUpcoming ? '✨ ' : '🎼 '}{s.name}{dateTag && !hasDateInName ? ` • ${dateTag}` : ''} ({s.songs?.length || 0})
                </option>
              );
            })}
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
            {activeSetlist && !currentUser ? (
              <div
                style={{
                  flex: 1,
                  height: '24px',
                  borderRadius: '6px',
                  border: '1px solid rgba(78, 177, 203, 0.3)',
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
                <span>🔒</span>
                <span>Setlist Order (Locked)</span>
              </div>
            ) : (
              (activeSetlist
                ? [
                    { id: 'order' as SortOption, label: 'Setlist' },
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
                    onClick={() => setSortBy(st.id)}
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
              })
            )}
          </div>
        </div>

        {/* SONG LIST */}
        <div ref={listContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
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
                            onReorderSongInSetlist?.(idx, idx - 1);
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
                            onReorderSongInSetlist?.(idx, idx + 1);
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
                                minWidth: '180px',
                                maxWidth: '280px',
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
                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', letterSpacing: '0.04em' }}>
                                  ADD TO SETLIST:
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPickerSongId(null);
                                  }}
                                  title="Close popup"
                                  style={{
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    lineHeight: '16px',
                                    flexShrink: 0,
                                    whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
                                >
                                  ✕ Close
                                </button>
                              </div>
                              {sortedSetlists.length === 0 ? (
                                <div style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 6px' }}>
                                  No setlists created yet
                                </div>
                              ) : (
                                sortedSetlists.map((st) => {
                                  const isUpcoming = Boolean(st.serviceDate && st.serviceDate >= todayStr);
                                  const dateTag = formatServiceDate(st.serviceDate);
                                  const hasDateInName = dateTag && st.name.toLowerCase().includes(dateTag.toLowerCase());
                                  return (
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
                                        padding: '6px 8px',
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
                                      {isUpcoming ? '✨ ' : '🎼 '}{st.name}{dateTag && !hasDateInName ? ` • ${dateTag}` : ''}
                                    </button>
                                  );
                                })
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPickerSongId(null);
                                }}
                                style={{
                                  width: '100%',
                                  marginTop: '6px',
                                  padding: '5px 8px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  borderRadius: '4px',
                                  color: '#f87171',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                ✕ Close
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Quick Delete Song Action (Admin / MD Only) */}
                    {(currentUser?.role === 'admin' || currentUser?.role === 'MD') && (
                      <button
                        title="Delete song from songbook (Admin/MD)"
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
                    )}
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
              if (currentUser) onClose();
              onOpenNewSongModal();
            }}
            title={currentUser ? "Add a new song to the church library" : "Login required to add songs (View-Only Mode)"}
            style={{
              flex: 1,
              height: '36px',
              borderRadius: '8px',
              background: currentUser ? '#4EB1CB' : 'rgba(78, 177, 203, 0.15)',
              border: currentUser ? 'none' : '1px dashed rgba(78, 177, 203, 0.4)',
              color: currentUser ? '#000' : '#4EB1CB',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {currentUser ? '+ Add Song' : '🔒 + Add Song'}
          </button>
          <button
            onClick={() => {
              if (currentUser) onClose();
              onOpenScraper('');
            }}
            title={currentUser ? "Search & scrape chord charts" : "Login required to scrape chords"}
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
            {currentUser ? '🔍 Search' : '🔒 Search'}
          </button>
          <button
            onClick={() => {
              if (currentUser) onClose();
              onOpenSetlistAdmin();
            }}
            title={currentUser ? "Manage & create setlists" : "Login required to manage setlists"}
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
            {currentUser ? 'Setlists' : '🔒 Setlists'}
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
