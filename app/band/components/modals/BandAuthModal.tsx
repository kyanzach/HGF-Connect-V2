// app/band/components/modals/BandAuthModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BandUser } from '../../types/band';

interface BandAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: BandUser | null;
  onSelectUser: (user: BandUser) => void;
}

export const BandAuthModal: React.FC<BandAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  const [users, setUsers] = useState<BandUser[]>([]);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('guitarist');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/worship/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddUser = async () => {
    if (!newDisplayName.trim()) return;
    try {
      const res = await fetch('/api/worship/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim() || newDisplayName.toLowerCase().replace(/\s+/g, ''),
          displayName: newDisplayName.trim(),
          role: newRole,
          password: 'Godisgood',
        }),
      });
      if (res.ok) {
        setNewUsername('');
        setNewDisplayName('');
        setShowAddForm(false);
        await fetchUsers();
      }
    } catch (_) {}
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
          maxWidth: '440px',
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
            <span>👤</span> Band Musician Profile
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Select your musician profile to synchronize your personal key preferences and scratchpad cues on stage:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {users.map((u) => {
              const isSelected = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isSelected ? 'rgba(78, 177, 203, 0.2)' : '#131c2e',
                    border: `1px solid ${isSelected ? '#4EB1CB' : '#1e293b'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? '#4EB1CB' : '#f8fafc' }}>
                      {u.displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                      {u.role}
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ color: '#4EB1CB', fontWeight: 800, fontSize: '14px' }}>
                      ✓ Active
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Profile Section */}
          {showAddForm ? (
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Musician Name (e.g. Karen)"
                style={{
                  height: '34px',
                  borderRadius: '6px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{
                  height: '34px',
                  borderRadius: '6px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 10px',
                  fontSize: '13px',
                }}
              >
                <option value="MD">Musical Director (MD)</option>
                <option value="guitarist">Guitarist</option>
                <option value="bassist">Bassist</option>
                <option value="keyboardist">Keyboardist</option>
                <option value="drummer">Drummer</option>
                <option value="vocalist">Vocalist</option>
                <option value="sound">Sound Engineer</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    flex: 1,
                    height: '34px',
                    borderRadius: '6px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  style={{
                    flex: 1,
                    height: '34px',
                    borderRadius: '6px',
                    background: '#4EB1CB',
                    border: 'none',
                    color: '#000',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save Profile
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                height: '36px',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px dashed #334155',
                color: '#94a3b8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              + Add Musician Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
