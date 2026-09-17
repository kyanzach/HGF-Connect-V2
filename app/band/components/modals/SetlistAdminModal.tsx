// app/band/components/modals/SetlistAdminModal.tsx
'use client';

import React, { useState } from 'react';
import { Setlist, Song } from '../../types/band';

interface SetlistAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  setlists: Setlist[];
  allSongs: Song[];
  onSaveSetlist: (setlist: Setlist) => Promise<void>;
  onDeleteSetlist: (id: string) => Promise<void>;
  onSelectActiveSetlist: (id: string) => void;
}

export const SetlistAdminModal: React.FC<SetlistAdminModalProps> = ({
  isOpen,
  onClose,
  setlists,
  allSongs,
  onSaveSetlist,
  onDeleteSetlist,
  onSelectActiveSetlist,
}) => {
  const [editingSet, setEditingSet] = useState<Setlist | null>(null);
  const [name, setName] = useState<string>('');
  const [serviceDate, setServiceDate] = useState<string>('');
  const [leader, setLeader] = useState<string>('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);

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
    setSelectedSongIds([]);
  };

  const startEdit = (set: Setlist) => {
    setEditingSet(set);
    setName(set.name);
    setServiceDate(set.serviceDate || '');
    setLeader(set.leader || '');
    const ids = (set.songs || []).map((s) => (typeof s === 'string' ? s : s.id));
    setSelectedSongIds(ids);
  };

  const toggleSongInSet = (songId: string) => {
    setSelectedSongIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Setlist name is required.');
      return;
    }

    const updated: Setlist = {
      id: editingSet?.id || `set-${Date.now()}`,
      name: name.trim(),
      serviceDate,
      leader: leader.trim(),
      songs: selectedSongIds.map((id) => {
        const found = allSongs.find((s) => s.id === id);
        return {
          id,
          title: found?.title || '',
          key: found?.key || 'C',
          capo: found?.capo || '0',
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
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                  SETLIST NAME *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunday Service - Sept 21"
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#131c2e',
                    border: '1px solid #2d3f5e',
                    color: '#fff',
                    padding: '0 10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                    SERVICE DATE
                  </label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#131c2e',
                      border: '1px solid #2d3f5e',
                      color: '#fff',
                      padding: '0 10px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                    WORSHIP LEADER
                  </label>
                  <input
                    type="text"
                    value={leader}
                    onChange={(e) => setLeader(e.target.value)}
                    placeholder="e.g. Karen"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#131c2e',
                      border: '1px solid #2d3f5e',
                      color: '#fff',
                      padding: '0 10px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Select Songs for this Setlist */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                  SONGS IN THIS SETLIST ({selectedSongIds.length})
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
                {setlists.map((set) => (
                  <div
                    key={set.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>
                        {set.name}
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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
