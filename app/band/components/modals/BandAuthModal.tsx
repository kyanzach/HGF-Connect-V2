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
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Please enter your username.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
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
          username: username.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'Invalid username or password.');
        return;
      }

      onSelectUser(data.user);
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
          maxWidth: '420px',
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
            <span>👤</span> Band Musician Login
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
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(78, 177, 203, 0.12)',
                  border: '1px solid rgba(78, 177, 203, 0.35)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Currently logged in:</div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#4EB1CB' }}>
                    {currentUser.displayName} (@{currentUser.username})
                  </div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
                    Role: {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
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

              {/* Admin Manage button - ONLY visible when logged in as admin */}
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminModal();
                  }}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    color: '#38bdf8',
                    fontSize: '13px',
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
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                Log in to sync your personal annotations, private notes, and band preferences:
              </div>

              {errorMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '12px' }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (e.g. ryan, ren)"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#131c2e',
                    border: '1px solid #2d3f5e',
                    color: '#fff',
                    padding: '0 12px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    background: '#131c2e',
                    border: '1px solid #2d3f5e',
                    color: '#fff',
                    padding: '0 12px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  background: '#4EB1CB',
                  border: 'none',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  boxShadow: '0 4px 12px rgba(78, 177, 203, 0.3)',
                }}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

