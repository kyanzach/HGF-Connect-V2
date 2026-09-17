// app/band/components/modals/BandAdminModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { BandUser } from '../../types/band';

interface BandAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: BandUser | null;
  onUserUpdated?: () => void;
}

export const BandAdminModal: React.FC<BandAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<BandUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // New member form
  const [newUsername, setNewUsername] = useState<string>('');
  const [newDisplayName, setNewDisplayName] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('guitarist');
  const [newPassword, setNewPassword] = useState<string>('Godisgood');

  // Edit member state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('guitarist');
  const [editPassword, setEditPassword] = useState<string>('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/worship/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || (Array.isArray(data) ? data : []));
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanUser = newUsername.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!cleanUser) {
      setErrorMsg('Valid username (at least 2 letters) is required.');
      return;
    }

    try {
      const res = await fetch('/api/worship/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          username: cleanUser,
          displayName: newDisplayName.trim() || cleanUser,
          role: newRole,
          password: newPassword.trim() || 'Godisgood',
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Failed to add member.');
        return;
      }

      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('Godisgood');
      setSuccessMsg(`Member @${cleanUser} added successfully!`);
      await fetchUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating user.');
    }
  };

  const handleStartEdit = (u: BandUser) => {
    setEditingUserId(u.id);
    setEditDisplayName(u.displayName);
    setEditRole(u.role);
    setEditPassword(u.password || 'Godisgood');
  };

  const handleSaveEdit = async (userId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/worship/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: userId,
          displayName: editDisplayName.trim(),
          role: editRole,
          password: editPassword.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMsg(result.error || 'Failed to update member.');
        return;
      }

      setEditingUserId(null);
      setSuccessMsg('Member updated successfully.');
      await fetchUsers();
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating user.');
    }
  };

  const handleDelete = async (user: BandUser) => {
    if (user.username === 'ryan') {
      setErrorMsg('Superadmin @ryan cannot be deleted.');
      return;
    }
    setErrorMsg('');
    try {
      const res = await fetch('/api/worship/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: user.id }),
      });
      if (res.ok) {
        setSuccessMsg(`Member @${user.username} deleted.`);
        await fetchUsers();
        if (onUserUpdated) onUserUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting user.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
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
          maxWidth: '580px',
          maxHeight: '88vh',
          backgroundColor: '#0c1017',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.9)',
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
            <span>⚙️</span> Band Members & Roles
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
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '13px' }}>
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', fontSize: '13px' }}>
              ✓ {successMsg}
            </div>
          )}

          {/* Add New Member Form */}
          <form
            onSubmit={handleAddMember}
            style={{
              background: '#131c2e',
              border: '1px solid #2d3f5e',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#38bdf8' }}>
              + Add Band Member
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Username can be 2 letters (e.g. <code>ren</code>, <code>la</code>, <code>jl</code>). Default password is <strong>Godisgood</strong>.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ren, la, jl"
                  style={{ width: '100%', height: '34px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Display Name</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Ren (MD)"
                  style={{ width: '100%', height: '34px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ width: '100%', height: '34px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="MD">👑 Musical Director (MD)</option>
                  <option value="admin">⭐ Administrator</option>
                  <option value="guitarist">🎸 Guitarist (Lead / Acoustic)</option>
                  <option value="bassist">🎸 Bassist</option>
                  <option value="drummer">🥁 Drummer</option>
                  <option value="keyboardist">🎹 Keyboardist</option>
                  <option value="vocalist">🎤 Vocalist</option>
                  <option value="sound">🎛️ Sound / AV</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Password</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Default: Godisgood"
                  style={{ width: '100%', height: '34px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 10px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: '4px',
                height: '36px',
                borderRadius: '8px',
                background: '#4EB1CB',
                border: 'none',
                color: '#000',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              + Create Musician Account
            </button>
          </form>

          {/* Members List */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <span>ACTIVE BAND ROSTER ({users.length})</span>
              <span>PASSWORD</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map((u) => {
                const isEditing = editingUserId === u.id;
                return (
                  <div
                    key={u.id}
                    style={{
                      background: '#131c2e',
                      border: '1px solid #1e293b',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            placeholder="Display Name"
                            style={{ height: '32px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 8px', fontSize: '12px' }}
                          />
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            style={{ height: '32px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 8px', fontSize: '12px' }}
                          >
                            <option value="MD">👑 MD</option>
                            <option value="admin">⭐ Admin</option>
                            <option value="guitarist">🎸 Guitarist</option>
                            <option value="bassist">🎸 Bassist</option>
                            <option value="drummer">🥁 Drummer</option>
                            <option value="keyboardist">🎹 Keyboardist</option>
                            <option value="vocalist">🎤 Vocalist</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Password"
                          style={{ height: '32px', borderRadius: '6px', background: '#0a0d14', border: '1px solid #334155', color: '#fff', padding: '0 8px', fontSize: '12px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => setEditingUserId(null)}
                            style={{ padding: '6px 12px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(u.id)}
                            style={{ padding: '6px 14px', borderRadius: '6px', background: '#10b981', border: 'none', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>
                              {u.displayName}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              @{u.username}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : u.role === 'MD' ? 'rgba(78, 177, 203, 0.15)' : 'rgba(51, 65, 85, 0.4)',
                                color: u.role === 'admin' ? '#f59e0b' : u.role === 'MD' ? '#4EB1CB' : '#94a3b8',
                                border: `1px solid ${u.role === 'admin' ? '#f59e0b33' : u.role === 'MD' ? '#4EB1CB33' : '#334155'}`,
                              }}
                            >
                              {u.role}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{ fontSize: '12px', color: '#fde68a', background: '#0a0d14', padding: '3px 6px', borderRadius: '4px', border: '1px solid #2d3f5e' }}>
                            {u.password || 'Godisgood'}
                          </code>
                          <button
                            onClick={() => handleStartEdit(u)}
                            style={{ padding: '4px 8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                          {u.username !== 'ryan' && (
                            <button
                              onClick={() => handleDelete(u)}
                              style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
