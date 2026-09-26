// app/band/components/modals/SetlistAdminModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Setlist, Song } from '../../types/band';
import { sortSetlistsUpcomingFirst, getTodayDateString } from '../../lib/sortSetlists';

interface SetlistAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  setlists: Setlist[];
  allSongs: Song[];
  onSaveSetlist: (setlist: Setlist) => Promise<void>;
  onDeleteSetlist: (id: string) => Promise<void>;
  onSelectActiveSetlist: (id: string) => void;
}

const WORSHIP_LEADERS = ['Ryan', 'Karen', 'Vanneza', 'Darlene', 'Tanna'];

export const SetlistAdminModal: React.FC<SetlistAdminModalProps> = ({
  isOpen,
  onClose,
  setlists,
  allSongs,
  onSaveSetlist,
  onDeleteSetlist,
  onSelectActiveSetlist,
}) => {
  const sortedSetlists = useMemo(() => sortSetlistsUpcomingFirst(setlists), [setlists]);
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [editingSet, setEditingSet] = useState<Setlist | null>(null);
  const [name, setName] = useState<string>('');
  const [serviceDate, setServiceDate] = useState<string>('');
  const [leader, setLeader] = useState<string>('');
  const [isCustomLeader, setIsCustomLeader] = useState<boolean>(false);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const startCreateNew = () => {
    setEditingSet({
      id: `set-${Date.now()}`,
      name: '',
      serviceDate: new Date().toISOString().split('T')[0],
      leader: '',
      songs: [],
    });
    setName('');
    setServiceDate(new Date().toISOString().split('T')[0]);
    setLeader('');
    setIsCustomLeader(false);
    setSelectedSongIds([]);
    setErrorMsg('');
  };

  const startEdit = (set: Setlist) => {
    setEditingSet(set);
    setName(set.name);
    setServiceDate(set.serviceDate || '');
    const currentLeader = set.leader || '';
    setLeader(currentLeader);
    const isPreset = WORSHIP_LEADERS.some((l) => l.toLowerCase() === currentLeader.toLowerCase());
    setIsCustomLeader(!isPreset && Boolean(currentLeader.trim()));
    const ids = (set.songs || []).map((s) => (typeof s === 'string' ? s : s.id));
    setSelectedSongIds(ids);
    setErrorMsg('');
  };

  const toggleSongInSet = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  const moveSongInSelection = (fromIdx: number, toIdx: number) => {
    if (fromIdx < 0 || fromIdx >= selectedSongIds.length) return;
    if (toIdx < 0 || toIdx >= selectedSongIds.length) return;
    setSelectedSongIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Setlist name is required.');
      return;
    }
    setErrorMsg('');

    const updated: Setlist = {
      id: editingSet?.id || `set-${Date.now()}`,
      name: name.trim(),
      serviceDate,
      leader: leader.trim(),
      songs: selectedSongIds.map((id) => {
        const existingInSet = (editingSet?.songs || []).find(
          (s) => (typeof s === 'string' ? s : s.id) === id
        );
        const existingObj = typeof existingInSet === 'object' ? existingInSet : null;
        const found = allSongs.find((s) => s.id === id);
        return {
          id,
          title: existingObj?.title || found?.title || '',
          key: existingObj?.key || found?.key || 'C',
          capo: existingObj?.capo || found?.capo || '0',
          duration: existingObj?.duration || found?.duration,
        };
      }),
      updatedAt: Date.now(),
    };

    await onSaveSetlist(updated);
    setEditingSet(null);
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
          maxWidth: '560px',
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
            <span>🎼</span> Setlists Manager
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {editingSet ? (
            /* Setlist Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {errorMsg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}
              {/* Setlist Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.3px' }}>
                  SETLIST NAME *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunday Service - Sept 28"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#131c2e',
                    border: '1.5px solid #2d3f5e',
                    color: '#fff',
                    padding: '0 12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {/* Quick Name Presets */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {['Sunday Service', 'Midweek Service', 'Youth Service', 'Worship Night'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        const d = serviceDate ? new Date(serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                        setName(d ? `${preset} - ${d}` : preset);
                      }}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(78, 177, 203, 0.08)',
                        border: '1px solid rgba(78, 177, 203, 0.25)',
                        color: '#4EB1CB',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Date & Worship Leader in Clean, Non-overlapping Stack / Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.3px' }}>
                    SERVICE DATE
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#131c2e',
                      border: '1.5px solid #2d3f5e',
                      color: '#fff',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.3px' }}>
                      WORSHIP LEADER
                    </label>
                    {leader && (
                      <span style={{ fontSize: '11px', color: '#4EB1CB', fontWeight: 700 }}>
                        Active: {leader}
                      </span>
                    )}
                  </div>

                  {/* Quick-tap Leader Selection Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {WORSHIP_LEADERS.map((wl) => {
                      const isSelected = !isCustomLeader && leader.toLowerCase() === wl.toLowerCase();
                      return (
                        <button
                          key={wl}
                          type="button"
                          onClick={() => {
                            setLeader(wl);
                            setIsCustomLeader(false);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(78, 177, 203, 0.25)' : '#131c2e',
                            border: `1.5px solid ${isSelected ? '#4EB1CB' : '#2d3f5e'}`,
                            color: isSelected ? '#fff' : '#cbd5e1',
                            fontSize: '12px',
                            fontWeight: isSelected ? 800 : 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>🎙️</span>
                          <span>{wl}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomLeader(true);
                        if (WORSHIP_LEADERS.some((wl) => wl.toLowerCase() === leader.toLowerCase())) {
                          setLeader('');
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: isCustomLeader ? 'rgba(245, 158, 11, 0.2)' : '#131c2e',
                        border: `1.5px solid ${isCustomLeader ? '#f59e0b' : '#2d3f5e'}`,
                        color: isCustomLeader ? '#fbbf24' : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: isCustomLeader ? 800 : 600,
                        cursor: 'pointer',
                      }}
                    >
                      ✍️ + Custom / Guest
                    </button>
                  </div>

                  {/* Dropdown Selector */}
                  <select
                    value={
                      isCustomLeader
                        ? '__custom__'
                        : WORSHIP_LEADERS.find((wl) => wl.toLowerCase() === leader.toLowerCase()) || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomLeader(true);
                        setLeader('');
                      } else {
                        setIsCustomLeader(false);
                        setLeader(val);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      background: '#131c2e',
                      border: '1.5px solid #2d3f5e',
                      color: '#fff',
                      padding: '0 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">-- Choose Worship Leader --</option>
                    <option value="Ryan">Ryan (Admin / Worship Leader)</option>
                    <option value="Karen">Karen</option>
                    <option value="Vanneza">Vanneza</option>
                    <option value="Darlene">Darlene</option>
                    <option value="Tanna">Tanna</option>
                    <option value="__custom__">✍️ + Other / Guest Worship Leader...</option>
                  </select>

                  {/* Custom / Guest Name Input */}
                  {isCustomLeader && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        type="text"
                        autoFocus
                        value={leader}
                        onChange={(e) => setLeader(e.target.value)}
                        placeholder="Enter guest or new worship leader name..."
                        style={{
                          width: '100%',
                          height: '40px',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1.5px solid #f59e0b',
                          color: '#fff',
                          padding: '0 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px', display: 'block' }}>
                        💡 Custom or guest worship leader name will be saved with this setlist
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ordered songs in this setlist */}
              {selectedSongIds.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#4EB1CB', marginBottom: '6px' }}>
                    SETLIST LINEUP ORDER ({selectedSongIds.length} Songs)
                  </label>
                  <div
                    style={{
                      maxHeight: '160px',
                      overflowY: 'auto',
                      border: '1px solid rgba(78, 177, 203, 0.3)',
                      borderRadius: '8px',
                      padding: '6px',
                      background: 'rgba(78, 177, 203, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '12px',
                    }}
                  >
                    {selectedSongIds.map((songId, idx) => {
                      const songObj = allSongs.find((s) => s.id === songId);
                      return (
                        <div
                          key={`order_${songId}_${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: '#131c2e',
                            border: '1px solid #1e293b',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#4EB1CB', width: '18px' }}>
                              {idx + 1}.
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {songObj?.title || songId}
                            </span>
                            <span style={{ fontSize: '11px', color: '#facc15' }}>
                              ({songObj?.key || 'C'})
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSongInSelection(idx, idx - 1)}
                              title="Move Up"
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: idx === 0 ? 'rgba(148, 163, 184, 0.25)' : '#94a3b8',
                                borderRadius: '3px',
                                width: '22px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                cursor: idx === 0 ? 'default' : 'pointer',
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedSongIds.length - 1}
                              onClick={() => moveSongInSelection(idx, idx + 1)}
                              title="Move Down"
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: idx === selectedSongIds.length - 1 ? 'rgba(148, 163, 184, 0.25)' : '#94a3b8',
                                borderRadius: '3px',
                                width: '22px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                cursor: idx === selectedSongIds.length - 1 ? 'default' : 'pointer',
                              }}
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSongInSet(songId)}
                              title="Remove from setlist"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                borderRadius: '3px',
                                width: '22px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Select Songs for this Setlist */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  ADD / REMOVE SONGS IN LIBRARY
                </label>
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '8px',
                    background: '#131c2e',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {allSongs.map((s) => {
                    const isChecked = selectedSongIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSongInSet(s.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: isChecked ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: '#38bdf8' }}
                        />
                        <span style={{ fontSize: '13px', color: isChecked ? '#38bdf8' : '#f8fafc', fontWeight: 600 }}>
                          {s.title}
                        </span>
                        <span style={{ fontSize: '11px', color: '#facc15', marginLeft: 'auto' }}>
                          Key: {s.key}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={() => setEditingSet(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#4EB1CB',
                    border: 'none',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save Setlist
                </button>
              </div>
            </div>
          ) : (
            /* Setlists List */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                  ALL SETLISTS ({setlists.length})
                </div>
                <button
                  onClick={startCreateNew}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#4EB1CB',
                    border: 'none',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  + New Setlist
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedSetlists.map((set) => {
                  const isUpcoming = Boolean(set.serviceDate && set.serviceDate >= todayStr);
                  return (
                    <div
                      key={set.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: isUpcoming ? 'rgba(78, 177, 203, 0.08)' : '#131c2e',
                        border: isUpcoming ? '1px solid rgba(78, 177, 203, 0.4)' : '1px solid #1e293b',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isUpcoming && (
                            <span style={{ fontSize: '9px', background: '#4EB1CB', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              UPCOMING
                            </span>
                          )}
                          <span>{set.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          {set.serviceDate ? `${set.serviceDate} • ` : ''}
                          {set.leader ? `Leader: ${set.leader} • ` : ''}
                          {set.songs?.length || 0} songs
                        </div>
                      </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          onSelectActiveSetlist(set.id);
                          onClose();
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#10b981',
                          border: 'none',
                          color: '#000',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        Launch
                      </button>
                      <button
                        onClick={() => startEdit(set)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#cbd5e1',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete setlist "${set.name}"?`)) {
                            onDeleteSetlist(set.id);
                          }
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid #ef4444',
                          color: '#f87171',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
