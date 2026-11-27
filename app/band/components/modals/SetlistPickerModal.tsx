// app/band/components/modals/SetlistPickerModal.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Setlist } from '../../types/band';
import {
  sortSetlistsUpcomingFirst,
  formatServiceDate,
  getServiceTypeLabel,
  getTodayDateString,
} from '../../lib/sortSetlists';

interface SetlistPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  setlists: Setlist[];
  activeSetlistId: string | null;
  totalSongCount: number;
  onSelectSetlist: (id: string | null) => void;
  onCreateSetlist?: () => void;
}

type FilterType = 'all' | 'upcoming' | 'sunday' | 'grace';
type SortType = 'date' | 'leader';

export const SetlistPickerModal: React.FC<SetlistPickerModalProps> = ({
  isOpen,
  onClose,
  setlists,
  activeSetlistId,
  totalSongCount,
  onSelectSetlist,
  onCreateSetlist,
}) => {
  const [query, setQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [selectedLeader, setSelectedLeader] = useState<string | null>(null);

  const todayStr = useMemo(() => getTodayDateString(), []);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Extract unique worship leaders across all setlists (normalized by first name / label)
  const worshipLeaders = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    const canonicalize = (raw: string) => {
      const firstWord = raw.trim().split(/\s+/)[0] || '';
      if (!firstWord) return '';
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    };

    // First pass: collect explicit leader names
    const knownKeys = new Set<string>();
    setlists.forEach((s) => {
      const c = canonicalize(s.leader || '');
      if (c) knownKeys.add(c.toLowerCase());
    });

    const getSetlistLeaderKey = (s: Setlist): string => {
      const explicit = canonicalize(s.leader || '');
      if (explicit) return explicit;
      const lowerName = (s.name || '').toLowerCase();
      for (const k of knownKeys) {
        if (new RegExp(`\\b${k}\\b`, 'i').test(lowerName)) {
          return k.charAt(0).toUpperCase() + k.slice(1);
        }
      }
      return '';
    };

    setlists.forEach((s) => {
      const leaderLabel = getSetlistLeaderKey(s);
      if (!leaderLabel) return;
      const key = leaderLabel.toLowerCase();
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: leaderLabel, count: 1 });
      }
    });

    return Array.from(counts.values()).sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.label.localeCompare(b.label)
    );
  }, [setlists]);

  const filteredSetlists = useMemo(() => {
    let list = sortSetlistsUpcomingFirst(setlists);

    if (filterBy === 'upcoming') {
      list = list.filter((s) => Boolean(s.serviceDate && s.serviceDate >= todayStr));
    } else if (filterBy === 'sunday') {
      list = list.filter((s) => {
        const type = getServiceTypeLabel(s.serviceDate);
        return type === 'Sunday Service' || (s.name || '').toLowerCase().includes('sunday');
      });
    } else if (filterBy === 'grace') {
      list = list.filter((s) => {
        const type = getServiceTypeLabel(s.serviceDate);
        const lower = (s.name || '').toLowerCase();
        return type === 'Grace Night' || lower.includes('grace night') || lower.includes('midweek');
      });
    }

    if (sortBy === 'leader' && selectedLeader) {
      const target = selectedLeader.toLowerCase();
      const wordRe = new RegExp(`\\b${target}\\b`, 'i');
      list = list.filter(
        (s) =>
          (s.leader || '').toLowerCase().includes(target) ||
          wordRe.test(s.name || '')
      );
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => {
        const dateTag = formatServiceDate(s.serviceDate).toLowerCase();
        const typeTag = getServiceTypeLabel(s.serviceDate).toLowerCase();
        return (
          (s.name || '').toLowerCase().includes(q) ||
          (s.leader || '').toLowerCase().includes(q) ||
          dateTag.includes(q) ||
          typeTag.includes(q)
        );
      });
    }

    if (sortBy === 'leader' && !selectedLeader) {
      list = [...list].sort((a, b) => {
        const la = (a.leader || a.name || '').trim();
        const lb = (b.leader || b.name || '').trim();
        return la.localeCompare(lb);
      });
    }

    return list;
  }, [setlists, filterBy, sortBy, selectedLeader, query, todayStr]);

  if (!isOpen) return null;

  const handlePick = (id: string | null) => {
    onSelectSetlist(id);
    onClose();
  };

  return (
    <div
      data-interactive="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 15, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
      }}
    >
      <div
        data-interactive="true"
        role="dialog"
        aria-label="Choose Setlist"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(480px, 95vw)',
          maxHeight: '84dvh',
          background: '#0c1220',
          border: '1px solid #26354d',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.88)',
          userSelect: 'none',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>Choose Setlist</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {setlists.length} setlists • {totalSongCount} songs in library
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {onCreateSetlist && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateSetlist();
                }}
                style={{
                  height: '38px',
                  padding: '0 13px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#4EB1CB',
                  color: '#061018',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>New Setlist</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close setlist picker"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #26354d',
                background: '#131c2e',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search + Filter + Sort Controls */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Big Search Input */}
          <div style={{ position: 'relative' }}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke={query ? '#4EB1CB' : '#94a3b8'}
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
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search setlist, leader, or date..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '11px',
                background: '#111a2c',
                border: `1.5px solid ${query ? '#4EB1CB' : '#2d405c'}`,
                color: '#fff',
                padding: query ? '0 38px 0 40px' : '0 14px 0 40px',
                fontSize: '15px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '7px',
                  border: 'none',
                  background: 'rgba(148, 163, 184, 0.16)',
                  color: '#cbd5e1',
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
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {(
              [
                { id: 'all' as FilterType, label: 'All' },
                { id: 'upcoming' as FilterType, label: 'Upcoming' },
                { id: 'sunday' as FilterType, label: 'Sunday Service' },
                { id: 'grace' as FilterType, label: 'Grace Night' },
              ] as const
            ).map((f) => {
              const active = filterBy === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterBy(f.id)}
                  style={{
                    height: '32px',
                    padding: '0 12px',
                    borderRadius: '999px',
                    border: active ? '1px solid #4EB1CB' : '1px solid #26354d',
                    background: active ? 'rgba(78, 177, 203, 0.18)' : '#131c2e',
                    color: active ? '#67e8f9' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Sort Segmented Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px',
              borderRadius: '9px',
              background: '#080d16',
              border: '1px solid #1a2436',
            }}
          >
            {(
              [
                { id: 'date' as SortType, label: 'By Date' },
                { id: 'leader' as SortType, label: 'By Leader' },
              ] as const
            ).map((s) => {
              const active = sortBy === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSortBy(s.id);
                    if (s.id !== 'leader') setSelectedLeader(null);
                  }}
                  style={{
                    flex: 1,
                    height: '30px',
                    borderRadius: '6px',
                    border: active ? '1px solid rgba(78, 177, 203, 0.35)' : '1px solid transparent',
                    background: active ? '#152236' : 'transparent',
                    color: active ? '#4EB1CB' : '#8596ad',
                    fontSize: '12px',
                    fontWeight: active ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Worship Leader Quick-Select Chips (shown when By Leader is active) */}
          {sortBy === 'leader' && worshipLeaders.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingTop: '2px' }}>
              <button
                type="button"
                onClick={() => setSelectedLeader(null)}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '999px',
                  border: selectedLeader === null ? '1px solid #4EB1CB' : '1px solid #26354d',
                  background: selectedLeader === null ? 'rgba(78, 177, 203, 0.18)' : '#131c2e',
                  color: selectedLeader === null ? '#67e8f9' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                All Leaders
              </button>
              {worshipLeaders.map((wl) => {
                const isSelected = selectedLeader === wl.label;
                return (
                  <button
                    key={wl.label}
                    type="button"
                    onClick={() => setSelectedLeader(isSelected ? null : wl.label)}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: '999px',
                      border: isSelected ? '1px solid #4EB1CB' : '1px solid #26354d',
                      background: isSelected ? '#4EB1CB' : '#131c2e',
                      color: isSelected ? '#061018' : '#e2e8f0',
                      fontSize: '12px',
                      fontWeight: isSelected ? 800 : 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {wl.label} ({wl.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Spacious Touch-Friendly List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Pinned All Songs Card */}
          {!query.trim() && filterBy === 'all' && !selectedLeader && (
            <button
              type="button"
              onClick={() => handlePick(null)}
              style={{
                width: '100%',
                minHeight: '56px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: activeSetlistId === null ? 'rgba(78, 177, 203, 0.16)' : '#131c2e',
                border: activeSetlistId === null ? '1.5px solid #4EB1CB' : '1px solid #223047',
                color: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(78, 177, 203, 0.14)',
                    color: '#4EB1CB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    <path d="M9 10h6M9 6h6" />
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc' }}>All Songs</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Full church songbook library</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#cbd5e1',
                    background: '#1e293b',
                    padding: '4px 9px',
                    borderRadius: '999px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {totalSongCount}
                </span>
                {activeSetlistId === null && (
                  <span style={{ color: '#4EB1CB', fontWeight: 900, fontSize: '16px' }}>✓</span>
                )}
              </div>
            </button>
          )}

          {filteredSetlists.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
              No setlists match your filter.
            </div>
          ) : (
            filteredSetlists.map((st) => {
              const isSelected = activeSetlistId === st.id;
              const isUpcoming = Boolean(st.serviceDate && st.serviceDate >= todayStr);
              const dateTag = formatServiceDate(st.serviceDate);
              const serviceType = getServiceTypeLabel(st.serviceDate);
              const count = st.songs?.length || 0;
              const showLeader =
                st.leader && !st.name.toLowerCase().includes(st.leader.toLowerCase());

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handlePick(st.id)}
                  style={{
                    width: '100%',
                    minHeight: '58px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isSelected
                      ? 'rgba(78, 177, 203, 0.16)'
                      : isUpcoming
                      ? 'rgba(19, 28, 46, 0.95)'
                      : '#101827',
                    border: isSelected
                      ? '1.5px solid #4EB1CB'
                      : isUpcoming
                      ? '1px solid rgba(78, 177, 203, 0.32)'
                      : '1px solid #1e293b',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: isSelected ? '#67e8f9' : '#f8fafc',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {st.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      {isUpcoming && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            color: '#10b981',
                            background: 'rgba(16, 185, 129, 0.14)',
                            padding: '2px 7px',
                            borderRadius: '999px',
                          }}
                        >
                          Upcoming
                        </span>
                      )}
                      {dateTag && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                          {dateTag}
                        </span>
                      )}
                      {serviceType && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#ffffff',
                            background:
                              serviceType === 'Sunday Service' ? '#1d4ed8' : '#0891b2',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            letterSpacing: '0.15px',
                          }}
                        >
                          {serviceType}
                        </span>
                      )}
                      {showLeader && (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          • {st.leader}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#cbd5e1',
                        background: '#1e293b',
                        padding: '4px 9px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {count} {count === 1 ? 'song' : 'songs'}
                    </span>
                    {isSelected && (
                      <span style={{ color: '#4EB1CB', fontWeight: 900, fontSize: '16px' }}>✓</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
