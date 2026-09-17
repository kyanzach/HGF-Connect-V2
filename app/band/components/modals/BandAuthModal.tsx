// app/band/components/modals/BandAuthModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BandUser } from '../../types/band';

interface BandAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: BandUser | null;
  onSelectUser: (user: BandUser) => void;
  onLogout: () => void;
  onOpenAdminModal: () => void;
}

export const BandAuthModal: React.FC<BandAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onLogout,
  onOpenAdminModal,
}) => {
  const [users, setUsers] = useState<BandUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<BandUser | null>(null);
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/worship/users');
      if (res.ok) {
        const data = await res.json();
        const list = data.users || (Array.isArray(data) ? data : []);
        setUsers(list);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUser(null);
      setPassword('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMsg('Please select your profile.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/worship/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: selectedUser.username,
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Invalid password.');
        return;
      }

      onSelectUser(data.user || selectedUser);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setLoading(false);
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
          maxWidth: '460px',
          maxHeight: '90vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
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
            background: '#101726',
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
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentUser && (
            <div
              style={{
                background: 'rgba(78, 177, 203, 0.12)',
                border: '1px solid rgba(78, 177, 203, 0.35)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Currently logged in:</div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#4EB1CB' }}>
                  {currentUser.displayName} (@{currentUser.username})
                </div>
                <div style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                  Role: {currentUser.role}
                </div>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  setSelectedUser(null);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Log Out
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '12px' }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Select your profile to synchronize your private musician notes and stage preferences:
          </div>

          {/* Roster list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {users.map((u) => {
              const isChosen = selectedUser?.id === u.id;
              const isCurrent = currentUser?.id === u.id;
              return (
                <div
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setErrorMsg('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: isChosen ? 'rgba(78, 177, 203, 0.25)' : isCurrent ? 'rgba(56, 189, 248, 0.12)' : '#131c2e',
                    border: `1px solid ${isChosen ? '#4EB1CB' : isCurrent ? '#38bdf8' : '#1e293b'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: isChosen || isCurrent ? '#4EB1CB' : '#f8fafc' }}>
                      {u.displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      @{u.username} • <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    </div>
                  </div>
                  {isCurrent ? (
                    <span style={{ color: '#10b981', fontWeight: 800, fontSize: '12px' }}>
                      ✓ Active
                    </span>
                  ) : isChosen ? (
                    <span style={{ color: '#4EB1CB', fontWeight: 800, fontSize: '12px' }}>
                      Selected
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Password Input for Selected Profile */}
          {selectedUser && (
            <form onSubmit={handleLogin} style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                Password for @{selectedUser.username}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Default: Godisgood"
                autoFocus
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  background: '#131c2e',
                  border: '1px solid #2d3f5e',
                  color: '#fff',
                  padding: '0 12px',
                  fontSize: '13px',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: '38px',
                  borderRadius: '8px',
                  background: '#4EB1CB',
                  border: 'none',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                {loading ? 'Logging in...' : `Log In as ${selectedUser.displayName}`}
              </button>
            </form>
          )}

          {/* Admin link if user is admin/MD */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'MD' || !currentUser) && (
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminModal();
                }}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>⚙️</span> Manage Band Members & Roles
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
