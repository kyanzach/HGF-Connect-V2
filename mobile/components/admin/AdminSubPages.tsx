import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import client from '@/api/client';

const api = client;
const P = '#4EB1CB';

// ── 1. LIFE GROUP ADMIN (/admin/lifegroup) ─────────────────────────
export function LifeGroupView({
  data,
  onRefresh,
  onNavigate,
}: {
  data: any;
  onRefresh: () => void;
  onNavigate: (page: string) => void;
}) {
  const registrations: any[] = data?.registrations || [];
  const leaders: any[] = data?.leaders || [];
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const filtered = registrations.filter((r) => {
    if (search && !String(r.fullName || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && (r.rolePreference || 'discipled') !== roleFilter) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  const total = registrations.length;
  const pending = registrations.filter((r) => r.status === 'pending').length;
  const appointed = registrations.filter((r) => r.status === 'appointed').length;
  const discipled = registrations.filter((r) => r.rolePreference !== 'discipler').length;
  const discipler = registrations.filter((r) => r.rolePreference === 'discipler').length;

  let central = 0,
    north = 0,
    southWest = 0,
    others = 0;
  registrations.forEach((r) => {
    const a = String(r.area || '');
    if (a.startsWith('Central Davao')) central++;
    else if (a.startsWith('North Davao')) north++;
    else if (a.startsWith('South & West Davao')) southWest++;
    else others++;
  });

  const assignLeader = async (regId: number, leaderId: number | null) => {
    await api.post('/admin', {
      action: 'update_lifegroup',
      id: regId,
      assignedLeaderId: leaderId,
    });
    onRefresh();
  };

  const deleteReg = async (regId: number) => {
    await api.post('/admin', { action: 'delete_lifegroup', id: regId });
    onRefresh();
  };

  return (
    <View style={styles.pagePad}>
      <TouchableOpacity onPress={() => onNavigate('dashboard')} style={{ marginBottom: 8 }}>
        <Text style={{ color: P, fontSize: 13, fontWeight: '700' }}>← Back to Admin Dashboard</Text>
      </TouchableOpacity>
      <Text style={styles.h1}>👥 LIFE Group Registrations</Text>
      <Text style={styles.sub}>Manage list of members registering for cell groups</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginVertical: 14 }}>
        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: '#10b981', flex: 1 }]}
          onPress={() => Linking.openURL('https://connect.houseofgrace.ph/admin/lifegroup')}
        >
          <Text style={styles.btnSolidText}>📥 Export to CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: P, flex: 1 }]}
          onPress={() => setQrOpen(true)}
        >
          <Text style={styles.btnSolidText}>📱 Project QR Code</Text>
        </TouchableOpacity>
      </View>

      {/* Analytics Widgets */}
      <View style={{ gap: 10, marginBottom: 16 }}>
        <View style={styles.statBox}>
          <View style={styles.rowBetween}>
            <Text style={styles.statBigNum}>{total}</Text>
            <Text style={{ fontSize: 22 }}>📋</Text>
          </View>
          <Text style={styles.statLabel}>Total Registrations</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: '#f59e0b' }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.statBigNum, { color: '#d97706' }]}>{pending}</Text>
            <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.badgeTxt, { color: '#d97706' }]}>Action Needed</Text>
            </View>
          </View>
          <Text style={styles.statLabel}>Pending Assignment</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: '#10b981' }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.statBigNum, { color: '#059669' }]}>{appointed}</Text>
            <View style={[styles.badge, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[styles.badgeTxt, { color: '#059669' }]}>Assigned</Text>
            </View>
          </View>
          <Text style={styles.statLabel}>Appointed / Grouped</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 4, borderLeftColor: '#0284c7' }]}>
          <Text style={styles.upperSmall}>GOAL BREAKDOWN</Text>
          <View style={[styles.rowBetween, { marginTop: 6 }]}>
            <Text style={{ color: '#0369a1', fontWeight: '600', fontSize: 13 }}>🌱 Be Discipled:</Text>
            <Text style={{ fontWeight: '800', color: '#0f172a' }}>{discipled}</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 4 }]}>
            <Text style={{ color: '#0f766e', fontWeight: '600', fontSize: 13 }}>📖 Be a Discipler:</Text>
            <Text style={{ fontWeight: '800', color: '#0f172a' }}>{discipler}</Text>
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.upperSmall}>AREA SEGMENTS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
            <Text style={styles.areaTxt}>Central: <Text style={styles.bold}>{central}</Text></Text>
            <Text style={styles.areaTxt}>North: <Text style={styles.bold}>{north}</Text></Text>
            <Text style={styles.areaTxt}>South/West: <Text style={styles.bold}>{southWest}</Text></Text>
            <Text style={styles.areaTxt}>Others: <Text style={styles.bold}>{others}</Text></Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.card, { marginBottom: 14, gap: 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Search by name..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[
            { k: '', l: `All Goals (${total})` },
            { k: 'discipled', l: `🌱 Discipled (${discipled})` },
            { k: 'discipler', l: `📖 Discipler (${discipler})` },
          ].map((b) => (
            <TouchableOpacity
              key={b.k}
              onPress={() => setRoleFilter(b.k)}
              style={[styles.pill, roleFilter === b.k && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, roleFilter === b.k && styles.pillTxtActive]}>{b.l}</Text>
            </TouchableOpacity>
          ))}
          {[
            { k: '', l: 'All Statuses' },
            { k: 'pending', l: 'Pending' },
            { k: 'appointed', l: 'Appointed' },
          ].map((b) => (
            <TouchableOpacity
              key={`st-${b.k}`}
              onPress={() => setStatusFilter(b.k)}
              style={[styles.pill, statusFilter === b.k && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, statusFilter === b.k && styles.pillTxtActive]}>{b.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cards */}
      {filtered.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 12, color: '#64748b' }}>
              {new Date(r.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: r.rolePreference === 'discipler' ? '#ccfbf1' : '#e0f2fe' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeTxt,
                    { color: r.rolePreference === 'discipler' ? '#0f766e' : '#0369a1' },
                  ]}
                >
                  {r.rolePreference === 'discipler' ? '📖 Discipler' : '🌱 Discipled'}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: r.status === 'appointed' ? '#ecfdf5' : '#fef3c7' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeTxt,
                    { color: r.status === 'appointed' ? '#059669' : '#d97706' },
                  ]}
                >
                  {r.status === 'appointed' ? 'Appointed' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>{r.fullName}</Text>
          <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Age: {r.age}</Text>
          <Text style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>Phone: {r.phone || '—'}</Text>
          <View style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginVertical: 10 }}>
            <Text style={{ fontSize: 13, color: '#475569' }}>📍 {r.area}</Text>
          </View>

          <Text style={styles.upperSmall}>ASSIGNED PASTOR / LEADER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 8 }}>
            <TouchableOpacity
              onPress={() => assignLeader(r.id, null)}
              style={[styles.pill, !r.assignedLeaderId && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, !r.assignedLeaderId && styles.pillTxtActive]}>Unassigned</Text>
            </TouchableOpacity>
            {leaders.map((l: any) => {
              const active = r.assignedLeaderId === l.id;
              return (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => assignLeader(r.id, l.id)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>
                    {l.firstName} {l.lastName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }}>
            <TouchableOpacity
              onPress={() => deleteReg(r.id)}
              style={{ backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
            >
              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={qrOpen} transparent animationType="fade" onRequestClose={() => setQrOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>📱 LIFE Group Join QR</Text>
            <Text style={[styles.sub, { marginBottom: 12 }]}>connect.houseofgrace.ph/lifegroup/join</Text>
            <Image
              source={{
                uri: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=https%3A%2F%2Fconnect.houseofgrace.ph%2Flifegroup%2Fjoin',
              }}
              style={{ width: 220, height: 220, alignSelf: 'center', marginVertical: 12 }}
            />
            <TouchableOpacity style={[styles.btnSolid, { backgroundColor: P }]} onPress={() => setQrOpen(false)}>
              <Text style={styles.btnSolidText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── 2. TESTIMONIES ADMIN (/admin/testimonies) ──────────────────────
export function TestimoniesView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const testimonies: any[] = data?.testimonies || [];
  const [catFilter, setCatFilter] = useState('');
  const categories = Array.from(new Set(testimonies.map((t) => t.category).filter(Boolean))) as string[];
  const filtered = catFilter ? testimonies.filter((t) => t.category === catFilter) : testimonies;

  const toggleRead = async (id: number, current: boolean) => {
    await api.post('/admin', {
      action: 'toggle_testimony_read',
      id,
      readByAnnouncer: !current,
    });
    onRefresh();
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>Testimonies & Praise Reports</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 12 }}>
        <TouchableOpacity
          onPress={() => setCatFilter('')}
          style={[styles.pill, !catFilter && styles.pillActive]}
        >
          <Text style={[styles.pillTxt, !catFilter && styles.pillTxtActive]}>All Categories</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCatFilter(c)}
            style={[styles.pill, catFilter === c && styles.pillActive]}
          >
            <Text style={[styles.pillTxt, catFilter === c && styles.pillTxtActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.avatarCircle}>
                {t.member?.profilePicture ? (
                  <Image
                    source={{ uri: `https://connect.houseofgrace.ph/uploads/profile_pictures/${t.member.profilePicture}` }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <Text style={{ fontSize: 16 }}>👤</Text>
                )}
              </View>
              <View>
                <Text style={{ fontWeight: '700', color: '#1e293b', fontSize: 14 }}>
                  {t.member?.firstName} {t.member?.lastName}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b' }}>
                  {new Date(t.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {t.category ? (
              <View style={[styles.badge, { backgroundColor: '#e0f7fb' }]}>
                <Text style={[styles.badgeTxt, { color: P }]}>{t.category}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.btnSolid, { backgroundColor: P, flex: 1, paddingVertical: 8 }]}
              onPress={() => Linking.openURL(`https://connect.houseofgrace.ph/admin/testimonies/${t.id}/present`)}
            >
              <Text style={styles.btnSolidText}>📺 Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnSolid,
                { backgroundColor: t.readByAnnouncer ? '#cbd5e1' : '#10b981', flex: 1, paddingVertical: 8 },
              ]}
              onPress={() => toggleRead(t.id, Boolean(t.readByAnnouncer))}
            >
              <Text style={[styles.btnSolidText, t.readByAnnouncer && { color: '#64748b' }]}>
                {t.readByAnnouncer ? '📢 Read' : '📖 Mark Read'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 8 }}>
            <Text style={styles.upperSmall}>ORIGINAL (BISAYA)</Text>
            <Text style={{ fontSize: 14, color: '#334155', lineHeight: 20, marginTop: 4 }}>{t.content}</Text>
          </View>

          <View style={{ backgroundColor: '#f0fdfa', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccfbf1' }}>
            <Text style={[styles.upperSmall, { color: '#0f766e' }]}>AI TRANSLATION</Text>
            <Text style={{ fontSize: 14, color: '#115e59', lineHeight: 20, marginTop: 4 }}>
              {t.englishTranslation || t.translatedContent || 'No translation available.'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── 3. MINISTRIES ADMIN (/admin/ministries) ────────────────────────
export function MinistriesView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const ministries: any[] = data?.ministries || [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  const openAdd = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setStatus('active');
    setModalOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setName(m.name);
    setDescription(m.description || '');
    setStatus(m.status || 'active');
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return;
    await api.post('/admin', {
      action: 'save_ministry',
      id: editing?.id,
      name: name.trim(),
      description: description.trim(),
      status,
    });
    setModalOpen(false);
    onRefresh();
  };

  const toggleStatus = async (m: any) => {
    await api.post('/admin', {
      action: 'save_ministry',
      id: m.id,
      name: m.name,
      description: m.description,
      status: m.status === 'active' ? 'inactive' : 'active',
    });
    onRefresh();
  };

  return (
    <View style={styles.pagePad}>
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.h1}>🙌 Ministries</Text>
        <Text style={styles.sub}>{ministries.length} ministries</Text>
        <TouchableOpacity style={[styles.btnSolid, { backgroundColor: P, marginTop: 10 }]} onPress={openAdd}>
          <Text style={styles.btnSolidText}>➕ Add Ministry</Text>
        </TouchableOpacity>
      </View>

      {ministries.map((m) => (
        <View key={m.id} style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1 }}>{m.name}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: m.status === 'active' ? '#d1fae5' : '#f1f5f9' },
              ]}
            >
              <Text style={[styles.badgeTxt, { color: m.status === 'active' ? '#10b981' : '#94a3b8' }]}>
                {m.status}
              </Text>
            </View>
          </View>
          {m.description ? (
            <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 10 }}>
              {m.description}
            </Text>
          ) : null}
          <Text style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
            👥 {m._count?.members || 0} active member{(m._count?.members || 0) !== 1 ? 's' : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => openEdit(m)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: `${P}40`,
                backgroundColor: `${P}12`,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: P, fontWeight: '700', fontSize: 13 }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleStatus(m)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: '#e2e8f0',
                backgroundColor: '#ffffff',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#64748b', fontWeight: '700', fontSize: 13 }}>
                {m.status === 'active' ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.h2}>{editing ? 'Edit Ministry' : 'Add Ministry'}</Text>
            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.btnOutline, { flex: 1 }]}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSolid, { backgroundColor: P, flex: 2 }]} onPress={save}>
                <Text style={styles.btnSolidText}>{editing ? 'Update' : 'Add Ministry'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── 4. SEND CUSTOM SMS (/admin/send-sms) & SMS LOGS (/admin/sms) ───
export function SendSmsView({ data }: { data: any; onRefresh?: () => void }) {
  const members: any[] = data?.members || [];
  const [selected, setSelected] = useState<number[]>([]);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const filtered =
    filter === 'all' ? members : members.filter((m) => m.type === filter || m.ageGroup === filter);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (filtered.every((m) => selected.includes(m.id))) {
      setSelected((prev) => prev.filter((id) => !filtered.some((m) => m.id === id)));
    } else {
      const next = new Set(selected);
      filtered.forEach((m) => next.add(m.id));
      setSelected(Array.from(next));
    }
  };

  const handleSend = async () => {
    if (selected.length === 0 || !message.trim()) return;
    setSending(true);
    try {
      await api.post('/admin', { action: 'send_sms', memberIds: selected, message });
      setResultMsg(`✅ Queued SMS to ${selected.length} member(s).`);
      setSelected([]);
      setMessage('');
    } catch (e: any) {
      setResultMsg(`❌ ${e?.message || 'Failed to send SMS'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>📱 Send Custom SMS</Text>
      <Text style={[styles.sub, { marginBottom: 14 }]}>Send a message to selected active members</Text>

      <View style={styles.card}>
        <View style={[styles.rowBetween, { marginBottom: 10 }]}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15 }}>Recipients</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{selected.length} selected</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
          {['all', 'FamilyMember', 'GrowingFriend', 'NewFriend', 'Adult', 'Youth', 'Kids'].map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.pill, filter === f && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, filter === f && styles.pillTxtActive]}>
                {f === 'all' ? 'All' : f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={toggleAll}
          style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
        >
          <Text style={{ fontWeight: '700', fontSize: 13, color: '#475569' }}>
            {filtered.length > 0 && filtered.every((m) => selected.includes(m.id)) ? '☑' : '☐'} Select all ({filtered.length})
          </Text>
        </TouchableOpacity>

        <View style={{ maxHeight: 260 }}>
          <ScrollView nestedScrollEnabled>
            {filtered.slice(0, 80).map((m) => {
              const isSel = selected.includes(m.id);
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => toggle(m.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: '#f8fafc',
                    backgroundColor: isSel ? `${P}10` : '#fff',
                  }}
                >
                  <Text style={{ fontSize: 16, color: isSel ? P : '#94a3b8' }}>{isSel ? '☑' : '☐'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
                      {m.firstName} {m.lastName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                      {m.phone || 'No phone'} · {m.ageGroup || m.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 15, marginBottom: 10 }}>
          Compose Message
        </Text>
        <TextInput
          style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
          multiline
          maxLength={1000}
          placeholder="Type your SMS message here…"
          placeholderTextColor="#94a3b8"
          value={message}
          onChangeText={setMessage}
        />
        <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
          {message.length}/1000
        </Text>
        {resultMsg ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f766e', marginTop: 8 }}>{resultMsg}</Text>
        ) : null}
        <TouchableOpacity
          style={[
            styles.btnSolid,
            {
              backgroundColor: sending || selected.length === 0 || !message.trim() ? '#94a3b8' : P,
              marginTop: 12,
            },
          ]}
          disabled={sending || selected.length === 0 || !message.trim()}
          onPress={handleSend}
        >
          <Text style={styles.btnSolidText}>
            {sending ? 'Sending…' : `📤 Send to ${selected.length} Member${selected.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SmsLogsView({ data }: { data: any; onRefresh?: () => void }) {
  const logs: any[] = data?.logs || [];
  const [tab, setTab] = useState<'logs' | 'reminder_verses' | 'birthday_sms'>('logs');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed'>('all');

  const filtered = logs.filter((l) => {
    if (statusFilter === 'sent' && !String(l.actionType).toLowerCase().includes('sent')) return false;
    if (statusFilter === 'failed' && !String(l.actionType).toLowerCase().includes('failed')) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        String(l.targetName || '').toLowerCase().includes(q) ||
        String(l.description || '').toLowerCase().includes(q) ||
        String(l.performedByName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sentCount = logs.filter((l) => String(l.actionType).toLowerCase().includes('sent')).length;
  const failedCount = logs.filter((l) => String(l.actionType).toLowerCase().includes('failed')).length;

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>📱 SMS Command & Verse Management Hub</Text>
      <Text style={[styles.sub, { marginBottom: 12 }]}>
        Audit activity logs, randomize reminder Scripture verses, and configure birthday SMS greetings.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
        {[
          { k: 'logs', l: '📋 SMS Activity Logs' },
          { k: 'reminder_verses', l: '📖 Reminder Scripture Verses' },
          { k: 'birthday_sms', l: '🎂 Birthday SMS & Verses' },
        ].map((t) => (
          <TouchableOpacity
            key={t.k}
            onPress={() => setTab(t.k as any)}
            style={[styles.pill, tab === t.k && styles.pillActive]}
          >
            <Text style={[styles.pillTxt, tab === t.k && styles.pillTxtActive]}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'logs' ? (
        <>
          <View style={[styles.card, { marginBottom: 12 }]}>
            <TextInput
              style={styles.input}
              placeholder="🔍 Search logs by recipient, phone, event, message..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
            />
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              <TouchableOpacity
                onPress={() => setStatusFilter('all')}
                style={[styles.pill, statusFilter === 'all' && styles.pillActive]}
              >
                <Text style={[styles.pillTxt, statusFilter === 'all' && styles.pillTxtActive]}>
                  All ({logs.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStatusFilter('sent')}
                style={[styles.pill, statusFilter === 'sent' && { backgroundColor: '#16a34a', borderColor: '#16a34a' }]}
              >
                <Text style={[styles.pillTxt, statusFilter === 'sent' && styles.pillTxtActive]}>
                  ✓ Sent ({sentCount})
                </Text>
              </TouchableOpacity>
              {failedCount > 0 ? (
                <TouchableOpacity
                  onPress={() => setStatusFilter('failed')}
                  style={[styles.pill, statusFilter === 'failed' && { backgroundColor: '#dc2626', borderColor: '#dc2626' }]}
                >
                  <Text style={[styles.pillTxt, statusFilter === 'failed' && styles.pillTxtActive]}>
                    ✕ Failed ({failedCount})
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {filtered.slice(0, 60).map((log) => {
            const failed = String(log.actionType).toLowerCase().includes('failed');
            return (
              <View key={log.id} style={styles.card}>
                <View style={[styles.rowBetween, { marginBottom: 6 }]}>
                  <View style={[styles.badge, { backgroundColor: failed ? '#fee2e2' : '#dcfce7' }]}>
                    <Text style={[styles.badgeTxt, { color: failed ? '#b91c1c' : '#15803d' }]}>
                      {failed ? 'FAILED' : 'SENT'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(log.createdAt).toLocaleString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={{ fontWeight: '700', color: '#1e293b', fontSize: 14 }}>
                  {log.targetName || '—'}
                </Text>
                <Text style={{ fontSize: 13, color: '#475569', marginVertical: 6, lineHeight: 19 }}>
                  {log.description}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  Source: <Text style={styles.bold}>{log.performedByName || '—'}</Text>
                </Text>
              </View>
            );
          })}
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.h2}>
            {tab === 'reminder_verses' ? '📖 Active Reminder Scripture Pool' : '🎂 Birthday SMS Greeting Template'}
          </Text>
          <Text style={[styles.sub, { marginTop: 4 }]}>
            {tab === 'reminder_verses'
              ? 'Automated event reminders pick a Scripture hook at random from the active pool.'
              : '🎉 Happy Birthday, {firstName}! 🎂 House of Grace Fellowship celebrates you today and thanks God for the gift of your life!'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── 5. STEWARDSHOP MODERATION (/admin/stewardshop) ─────────────────
export function StewardShopAdminView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const listings: any[] = data?.listings || [];
  const stats = data?.stats || { total: 0, active: 0, privateCount: 0, verifiedSellers: 0 };
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      String(l.title || '').toLowerCase().includes(q) ||
      `${l.seller?.firstName} ${l.seller?.lastName}`.toLowerCase().includes(q);
    if (!matchQ) return false;
    if (statusFilter === 'public') return !l.isPrivate;
    if (statusFilter === 'private') return l.isPrivate;
    if (statusFilter === 'sold') return l.status === 'sold';
    return true;
  });

  const toggleVerify = async (sellerId: number, current: boolean) => {
    await api.post('/admin', {
      action: 'moderate_listing',
      sellerId,
      isVerified: !current,
    });
    onRefresh();
  };

  const togglePrivate = async (listingId: number, current: boolean) => {
    await api.post('/admin', {
      action: 'moderate_listing',
      listingId,
      isPrivate: !current,
      moderationReason: !current ? 'Moderated by Admin' : null,
    });
    onRefresh();
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>🤝 StewardShop Moderation</Text>
      <Text style={[styles.sub, { marginBottom: 14 }]}>
        Set items to private, flag inappropriate listings, provide reasons, and verify HGF sellers.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        {[
          { l: 'Total Listings', v: stats.total, i: '📦' },
          { l: 'Active Public', v: stats.active, i: '🔓' },
          { l: 'Moderated Private', v: stats.privateCount, i: '🔒' },
          { l: 'Verified Sellers', v: stats.verifiedSellers, i: '🛡️' },
        ].map((s) => (
          <View key={s.l} style={[styles.statBox, { width: '48%' }]}>
            <Text style={{ fontSize: 20 }}>{s.i}</Text>
            <Text style={[styles.statBigNum, { marginTop: 4 }]}>{s.v}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { marginBottom: 12 }]}>
        <TextInput
          style={styles.input}
          placeholder="Search listing title or seller name…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 10 }}>
          {[
            { k: 'all', l: 'All' },
            { k: 'public', l: 'Public' },
            { k: 'private', l: 'Private/Moderated' },
            { k: 'sold', l: 'Sold' },
          ].map((t) => (
            <TouchableOpacity
              key={t.k}
              onPress={() => setStatusFilter(t.k)}
              style={[styles.pill, statusFilter === t.k && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, statusFilter === t.k && styles.pillTxtActive]}>{t.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filtered.map((l) => (
        <View key={l.id} style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: 6 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1e293b', fontSize: 15 }}>{l.title}</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                Category: {l.category || 'General'} · Listed on {new Date(l.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#10b98120' }]}>
              <Text style={[styles.badgeTxt, { color: '#10b981', textTransform: 'uppercase' }]}>{l.status}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9', marginVertical: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.upperSmall}>SELLER</Text>
              <Text style={{ fontWeight: '600', color: '#374151', marginTop: 2 }}>
                {l.seller?.firstName} {l.seller?.lastName}
              </Text>
              {l.seller?.isVerified ? (
                <Text style={{ fontSize: 10, color: '#0284c7', fontWeight: '700', marginTop: 2 }}>
                  🛡️ VERIFIED
                </Text>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.upperSmall}>PRICE & GIFT</Text>
              <Text style={{ fontWeight: '700', color: '#374151', marginTop: 2 }}>
                ₱{Number(l.ogPrice || 0).toLocaleString()}
              </Text>
              {Number(l.loveGiftAmount) > 0 ? (
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>
                  ❤️ ₱{Number(l.loveGiftAmount).toLocaleString()}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.rowBetween}>
            <View style={[styles.badge, { backgroundColor: l.isPrivate ? '#fee2e2' : '#d1fae5' }]}>
              <Text style={[styles.badgeTxt, { color: l.isPrivate ? '#ef4444' : '#10b981' }]}>
                {l.isPrivate ? '🔒 PRIVATE' : '🔓 PUBLIC'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => toggleVerify(l.seller?.id, Boolean(l.seller?.isVerified))}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: l.seller?.isVerified ? '#fee2e2' : '#ecfeff',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: l.seller?.isVerified ? '#b91c1c' : '#0e7490' }}>
                  {l.seller?.isVerified ? 'Unverify' : 'Verify'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => togglePrivate(l.id, Boolean(l.isPrivate))}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: P }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Moderate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── 6. AI & CHURCH SETTINGS (/admin/church-settings) ───────────────
export function ChurchSettingsView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const [settings, setSettings] = useState<Record<string, string>>(data?.settings || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await api.post('/admin', { action: 'save_church_settings', settings });
    setSaving(false);
    setSaved(true);
    onRefresh();
    setTimeout(() => setSaved(false), 3000);
  };

  const fields = [
    { k: 'church_name', l: 'Church Name', multi: false },
    { k: 'church_address', l: 'Church Address / Location', multi: false },
    { k: 'sunday_services', l: 'Sunday Service Times', multi: true },
    { k: 'midweek_services', l: 'Midweek (Wednesday) Service Times', multi: true },
    { k: 'prayer_schedules', l: 'Other Prayer Schedules', multi: true },
    { k: 'cell_groups', l: 'Cell Group Information & Joining Instructions', multi: true },
    { k: 'volunteering', l: 'Volunteering & Orientation', multi: true },
    { k: 'worship_team', l: 'Worship Team Info', multi: true },
    { k: 'prayer_support', l: 'Prayer Support Info', multi: true },
    { k: 'latest_announcements', l: 'Latest Announcements', multi: true },
  ];

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>⛪ AI & Church Knowledge Base Settings</Text>
      <Text style={[styles.sub, { marginBottom: 14 }]}>
        Configure basic church details. The HGF Connect AI assistant dynamically queries this database to answer questions.
      </Text>

      {saved ? (
        <View style={{ backgroundColor: '#ecfdf5', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <Text style={{ color: '#065f46', fontWeight: '700', fontSize: 13 }}>
            ✅ Settings saved successfully! Changes are live immediately for the AI assistant.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        {fields.map((f) => (
          <View key={f.k} style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>{f.l}</Text>
            <TextInput
              style={[styles.input, f.multi && { minHeight: 72, textAlignVertical: 'top' }]}
              multiline={f.multi}
              value={settings[f.k] || ''}
              onChangeText={(v) => setSettings((prev) => ({ ...prev, [f.k]: v }))}
            />
          </View>
        ))}
        <TouchableOpacity style={[styles.btnSolid, { backgroundColor: P }]} onPress={save} disabled={saving}>
          <Text style={styles.btnSolidText}>{saving ? 'Saving…' : '💾 Save All Settings'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── 7. USERS ROLES (/admin/users) ──────────────────────────────────
export function UsersRolesView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const users: any[] = data?.users || [];
  const [search, setSearch] = useState('');
  const roles = ['user', 'usher', 'moderator', 'admin', 'multimedia'];
  const ROLE_COLOR: Record<string, string> = {
    admin: '#ef4444',
    moderator: '#f59e0b',
    usher: '#0284c7',
    multimedia: '#10b981',
    user: '#94a3b8',
  };

  const filtered = search
    ? users.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email || ''} ${u.username || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : users;

  const changeRole = async (memberId: number, role: string) => {
    await api.post('/admin', { action: 'update_member', memberId, role });
    onRefresh();
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>🔑 User Roles</Text>
      <Text style={[styles.sub, { marginBottom: 12 }]}>
        Manage login roles for all members with accounts — Admin only
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: '#fff', marginBottom: 12 }]}
        placeholder="🔍 Search…"
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.slice(0, 80).map((u) => {
        const rc = ROLE_COLOR[u.role] || '#64748b';
        return (
          <View key={u.id} style={styles.card}>
            <View style={[styles.rowBetween, { marginBottom: 6 }]}>
              <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15 }}>
                {u.firstName} {u.lastName}
              </Text>
              <View style={[styles.badge, { backgroundColor: `${rc}18` }]}>
                <Text style={[styles.badgeTxt, { color: rc, textTransform: 'capitalize' }]}>
                  {u.role === 'user' ? 'Member' : u.role}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#475569' }}>✉️ {u.email || '—'}</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Last Login:{' '}
              {u.lastLogin
                ? new Date(u.lastLogin).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Never'}
            </Text>
            <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 8, paddingTop: 8 }}>
              <Text style={[styles.upperSmall, { marginBottom: 6 }]}>CHANGE ROLE:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => changeRole(u.id, r)}
                    style={[styles.pill, u.role === r && styles.pillActive]}
                  >
                    <Text style={[styles.pillTxt, u.role === r && styles.pillTxtActive]}>
                      {r === 'user' ? 'Member' : r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── 8. BIRTHDAYS ADMIN (/admin/birthdays) ──────────────────────────
export function BirthdaysAdminView({ data }: { data: any; onRefresh?: () => void }) {
  const members: any[] = data?.members || [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [notif, setNotif] = useState<string | null>(null);

  const parsed = members.map((m) => {
    const d = new Date(m.birthdate);
    return {
      ...m,
      birthMonth: d.getUTCMonth() + 1,
      birthDay: d.getUTCDate(),
    };
  });

  const activeCelebrants = parsed
    .filter((m) => m.birthMonth === selectedMonth)
    .sort((a, b) => a.birthDay - b.birthDay);

  const postDemo = async (type: 'monthly' | 'daily', memberId?: number) => {
    try {
      await api.post('/admin', { action: 'birthday_demo', type, memberId });
      setNotif('🎉 Birthday announcement posted to the community feed!');
    } catch {
      setNotif('🎉 Triggered birthday announcement!');
    }
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>🎂 Birthday Control Board</Text>
      <Text style={[styles.sub, { marginBottom: 14 }]}>
        Preview upcoming schedules and manually trigger birthday feed announcements.
      </Text>

      {notif ? (
        <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>{notif}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.h2}>Monthly Announcement Preview</Text>
        <Text style={[styles.sub, { marginBottom: 12 }]}>
          Triggers on the 1st day of the month showing all members celebrating in {monthNames[currentMonth - 1]}.
        </Text>
        <TouchableOpacity style={[styles.btnSolid, { backgroundColor: P }]} onPress={() => postDemo('monthly')}>
          <Text style={styles.btnSolidText}>📣 Post Monthly Celebrants Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Upcoming Birthdays (Daily Posts)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 12 }}>
          {monthNames.map((mName, idx) => {
            const mNum = idx + 1;
            const active = selectedMonth === mNum;
            return (
              <TouchableOpacity
                key={mName}
                onPress={() => setSelectedMonth(mNum)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>
                  {mName.slice(0, 3)} {mNum === currentMonth ? '📌' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeCelebrants.map((c) => (
          <View
            key={c.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#f1f5f9',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={[styles.avatarCircle, { backgroundColor: P }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                  {c.firstName?.[0]}
                  {c.lastName?.[0]}
                </Text>
              </View>
              <View>
                <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 14 }}>
                  {c.firstName} {c.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  🎂 {monthNames[c.birthMonth - 1]} {c.birthDay}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => postDemo('daily', c.id)}
              style={{ backgroundColor: `${P}18`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
            >
              <Text style={{ color: P, fontWeight: '700', fontSize: 12 }}>📣 Post Card</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── 9. MULTIMEDIA DASHBOARD (/admin/multimedia) ────────────────────
export function MultimediaAdminView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const upcomingEvents: any[] = data?.upcomingEvents || [];
  const [selectedEvent, setSelectedEvent] = useState<any>(data?.event || upcomingEvents[0] || null);
  const crew: any[] = data?.crew || [];
  const tasks: any[] = selectedEvent?.sopTasks || [];
  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const pct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const toggleTask = async (taskId: number) => {
    await api.post('/admin', { action: 'toggle_sop_task', taskId });
    onRefresh();
  };

  const soundboard = [
    { ch: '1-2', name: 'Main Out L/R (Broadcast)' },
    { ch: '3', name: 'Pastor Handheld Mic (Wireless)' },
    { ch: '4', name: 'Worship Leader Mic' },
    { ch: '5-8', name: 'Praise Band (Instruments)' },
    { ch: '9-10', name: 'ProPresenter Audio (Playbacks)' },
  ];
  const switcher = [
    { ch: 'HDMI 1', name: 'ProPresenter slides (1080p)' },
    { ch: 'HDMI 2', name: 'Main Stage Cam (Wide)' },
    { ch: 'HDMI 3', name: 'Audience Cam (Close)' },
    { ch: 'HDMI 4', name: 'Live Streaming Output Feed' },
  ];

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>📽️ Pre-Service Operations</Text>
      <Text style={[styles.sub, { marginBottom: 12 }]}>
        Real-time status board and slide management for Sunday Services.
      </Text>

      {upcomingEvents.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
          {upcomingEvents.map((ev) => {
            const active = selectedEvent?.id === ev.id;
            return (
              <TouchableOpacity
                key={ev.id}
                onPress={() => setSelectedEvent(ev)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>
                  {new Date(ev.eventDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} - {ev.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {selectedEvent ? (
        <>
          <View style={{ backgroundColor: '#0f172a', borderRadius: 16, padding: 18, marginBottom: 14 }}>
            <Text style={{ color: P, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
              📅 Service Event
            </Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginVertical: 6 }}>
              {selectedEvent.title}
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
              📅 {new Date(selectedEvent.eventDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              {selectedEvent.location ? ` · 📍 ${selectedEvent.location}` : ''}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.rowBetween, { marginBottom: 8 }]}>
              <Text style={styles.h2}>Pre-Service Checklist</Text>
              <Text style={{ color: P, fontWeight: '800', fontSize: 13 }}>
                {completedCount} / {tasks.length} Completed
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: P }} />
            </View>
            {tasks.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => toggleTask(t.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: t.isCompleted ? '#e2f2f5' : '#f1f5f9',
                  backgroundColor: t.isCompleted ? '#f7fcfd' : '#fafbfc',
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: t.isCompleted ? P : '#cbd5e1',
                    backgroundColor: t.isCompleted ? P : '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {t.isCompleted ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text> : null}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: '600',
                    color: '#0f172a',
                    textDecorationLine: t.isCompleted ? 'line-through' : 'none',
                  }}
                >
                  {t.taskName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.h2}>🎛️ Routing Patch Sheet</Text>
        <Text style={[styles.upperSmall, { marginTop: 10, marginBottom: 6 }]}>SOUNDBOARD (BEHRINGER X32)</Text>
        {soundboard.map((p) => (
          <View key={p.ch} style={[styles.rowBetween, { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }]}>
            <Text style={{ color: P, fontWeight: '700', fontSize: 13 }}>{p.ch}</Text>
            <Text style={{ color: '#334155', fontSize: 13 }}>{p.name}</Text>
          </View>
        ))}
        <Text style={[styles.upperSmall, { marginTop: 12, marginBottom: 6 }]}>VIDEO SWITCHER (ATEM MINI)</Text>
        {switcher.map((p) => (
          <View key={p.ch} style={[styles.rowBetween, { paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }]}>
            <Text style={{ color: P, fontWeight: '700', fontSize: 13 }}>{p.ch}</Text>
            <Text style={{ color: '#334155', fontSize: 13 }}>{p.name}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>👥 Multimedia Crew</Text>
        {crew.length === 0 ? (
          <Text style={[styles.sub, { marginTop: 6 }]}>No members assigned the multimedia role.</Text>
        ) : (
          crew.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <View style={[styles.avatarCircle, { backgroundColor: `${P}22` }]}>
                <Text style={{ color: P, fontWeight: '800', fontSize: 12 }}>
                  {m.firstName?.[0]}
                  {m.lastName?.[0]}
                </Text>
              </View>
              <View>
                <Text style={{ fontWeight: '600', color: '#334155', fontSize: 14 }}>
                  {m.firstName} {m.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Team Volunteer</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

// ── 10. QUIZ FOR CHRIST ADMIN (/quiz/admin) — Full 1:1 Parity ──────
export function QuizAdminView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const quizzes: any[] = data?.quizzes || [];
  const events: any[] = data?.events || [];

  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    events[0]?.id || null
  );
  const [sermonDate, setSermonDate] = useState(
    events[0]?.eventDate
      ? String(events[0].eventDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [sermonText, setSermonText] = useState('');
  const [fetchingTranscript, setFetchingTranscript] = useState(false);
  const [transcriptMeta, setTranscriptMeta] = useState<{
    wordCount: number;
    language: string;
  } | null>(null);

  // Generated Preview & Edit State
  const [generating, setGenerating] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [publishingQuiz, setPublishingQuiz] = useState(false);
  const [savedQuizId, setSavedQuizId] = useState<number | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [notifyArchiveMembers, setNotifyArchiveMembers] = useState(true);

  // Weekly Reward Announcement State
  const [rewardTier, setRewardTier] = useState('PERFECT');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardImageUrl, setRewardImageUrl] = useState('');
  const [uploadingRewardImg, setUploadingRewardImg] = useState(false);
  const [announcingReward, setAnnouncingReward] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  // Participant Analytics & Rewards Modals
  const [analyticsModalQuiz, setAnalyticsModalQuiz] = useState<any | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [participantFilter, setParticipantFilter] = useState<
    'all' | 'in_progress' | 'completed' | 'perfect'
  >('all');
  const [participantSearch, setParticipantSearch] = useState('');
  const [nudgingId, setNudgingId] = useState<number | 'all' | null>(null);

  const [rewardsModalQuiz, setRewardsModalQuiz] = useState<any | null>(null);
  const [rewardsList, setRewardsList] = useState<any[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activePublishedQuiz =
    quizzes.find((q) => q.status === 'published') || quizzes[0];

  useEffect(() => {
    if (!activePublishedQuiz) return;
    const existing = (activePublishedQuiz.rewardItems || []).find(
      (it: any) => it.rewardTier === rewardTier
    );
    if (existing) {
      setRewardTitle(existing.title || '');
      setRewardDescription(existing.description || '');
      setRewardImageUrl(existing.imageUrl || '');
    } else {
      setRewardTitle('');
      setRewardDescription('');
      setRewardImageUrl('');
    }
  }, [rewardTier, activePublishedQuiz?.id]);

  // Check if selected sermon date is past (>7 days old -> Catch-Up Archive Mode)
  const isPastSermon = (() => {
    if (!sermonDate) return false;
    const d = new Date(sermonDate);
    if (isNaN(d.getTime())) return false;
    const end = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 59, 999);
    return new Date() > end;
  })();

  const handleFetchTranscript = async () => {
    if (!youtubeUrl.trim()) {
      setErrorMsg('Enter a YouTube sermon video URL first.');
      return;
    }
    setFetchingTranscript(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.post('/admin', {
        action: 'fetch_quiz_transcript',
        url: youtubeUrl.trim(),
      });
      const d = res.data?.data || res.data;
      setSermonText(d.transcript || '');
      setTranscriptMeta({
        wordCount: d.wordCount || 0,
        language: d.language || 'English',
      });
      if (!generatedTitle && d.title) {
        setGeneratedTitle(d.title);
      }
      setStatusMsg(
        `Extracted ${(d.wordCount || 0).toLocaleString()} words (${
          d.language || 'CC'
        }) from YouTube!`
      );
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message ||
          'Could not extract YouTube captions automatically. Paste sermon notes below.'
      );
    } finally {
      setFetchingTranscript(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMsg(null);
    setErrorMsg(null);
    try {
      const res = await api.post('/admin', {
        action: 'generate_quiz',
        sermonText,
        sermonDate,
        eventId: selectedEventId,
        youtubeUrl: youtubeUrl.trim() || null,
      });
      const d = res.data?.data || res.data;
      setGeneratedTitle(d.title || 'Weekly Sermon Quiz');
      setGeneratedCaption(d.announcementCaption || '');
      setGeneratedQuestions(Array.isArray(d.questions) ? d.questions : []);
      setSavedQuizId(null);
      setStatusMsg(
        `Generated 7-day quiz (${
          d.questions?.length || 7
        } questions)! Review & publish below.`
      );
    } catch (e: any) {
      setErrorMsg(
        e?.response?.data?.message ||
          'Provide sermon notes, YouTube URL with CC, or select an event with slides.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateQuestionField = (idx: number, field: string, value: any) => {
    setGeneratedQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const handleSaveOrPublish = async (mode: 'save_quiz' | 'publish_quiz') => {
    if (!generatedTitle.trim() || generatedQuestions.length === 0) return;
    if (mode === 'save_quiz') setSavingQuiz(true);
    else setPublishingQuiz(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.post('/admin', {
        action: mode,
        quizId: savedQuizId,
        title: generatedTitle.trim(),
        sermonDate,
        youtubeUrl: youtubeUrl.trim() || null,
        transcriptText: sermonText || null,
        announcementCaption: generatedCaption || null,
        questions: generatedQuestions,
        eventId: selectedEventId,
        notifyArchiveMembers,
      });
      const d = res.data?.data || res.data;
      if (d?.quizId) setSavedQuizId(d.quizId);
      setStatusMsg(res.data?.message || 'Quiz saved!');
      if (mode === 'publish_quiz' || isPastSermon) {
        setGeneratedQuestions([]);
      }
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to save quiz.');
    } finally {
      setSavingQuiz(false);
      setPublishingQuiz(false);
    }
  };

  const handlePickRewardImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('Photo library permission is required to upload prize images.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    setUploadingRewardImg(true);
    setErrorMsg(null);
    try {
      const asset = picked.assets[0];
      const fd = new FormData();
      fd.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'quiz-prize.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      const upRes = await api.post('/posts/upload?folder=posts', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const upData = upRes.data?.data || upRes.data;
      const savedPath = upData?.photoPath || upData?.url || '';
      if (savedPath) {
        setRewardImageUrl(
          savedPath.startsWith('posts/') || savedPath.startsWith('/')
            ? savedPath
            : `posts/${savedPath}`
        );
      }
    } catch {
      setErrorMsg('Prize image upload failed. Please try again.');
    } finally {
      setUploadingRewardImg(false);
    }
  };

  const handleAnnounceReward = async () => {
    if (!rewardTitle.trim()) {
      setErrorMsg('Enter a reward title before announcing.');
      return;
    }
    setAnnouncingReward(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.post('/admin', {
        action: 'announce_quiz_rewards',
        rewardTier,
        title: rewardTitle.trim(),
        description: rewardDescription.trim(),
        imageUrl: rewardImageUrl || null,
      });
      setStatusMsg(res.data?.message || 'Reward announced & posted to the feed!');
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Failed to announce reward.');
    } finally {
      setAnnouncingReward(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/admin', { action: 'backfill_quiz_posts' });
      setStatusMsg(res.data?.message || 'Backfill complete!');
      onRefresh();
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'No active published quiz to backfill.');
    } finally {
      setBackfilling(false);
    }
  };

  const openParticipantsModal = async (quiz: any) => {
    setAnalyticsModalQuiz(quiz);
    setAnalyticsData(null);
    setLoadingAnalytics(true);
    setParticipantFilter('all');
    setParticipantSearch('');
    try {
      const res = await api.get(`/admin?page=quiz-participants&quizId=${quiz.id}`);
      setAnalyticsData(res.data?.data || res.data);
    } catch {
      setAnalyticsData(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleNudge = async (targetMemberId?: number) => {
    if (!analyticsModalQuiz) return;
    setNudgingId(targetMemberId ?? 'all');
    try {
      const res = await api.post('/admin', {
        action: 'nudge_quiz_participants',
        quizId: analyticsModalQuiz.id,
        targetMemberId: targetMemberId || null,
        nudgeAllInProgress: !targetMemberId,
      });
      setStatusMsg(res.data?.message || 'In-app reminder sent!');
    } catch {
      setErrorMsg('Failed to send reminder notification.');
    } finally {
      setNudgingId(null);
    }
  };

  const openRewardsModal = async (quiz: any) => {
    setRewardsModalQuiz(quiz);
    setRewardsList([]);
    setLoadingRewards(true);
    try {
      const res = await api.get(`/admin?page=quiz-rewards&quizId=${quiz.id}`);
      const d = res.data?.data || res.data;
      setRewardsList(Array.isArray(d?.rewards) ? d.rewards : []);
    } catch {
      setRewardsList([]);
    } finally {
      setLoadingRewards(false);
    }
  };

  const handleMarkDistributed = async (rewardId: number) => {
    try {
      await api.post('/admin', {
        action: 'mark_quiz_reward_distributed',
        rewardId,
      });
      setRewardsList((prev) =>
        prev.map((r) => (r.id === rewardId ? { ...r, claimStatus: 'distributed' } : r))
      );
      onRefresh();
    } catch {
      setErrorMsg('Could not update distribution status.');
    }
  };

  const wordCount = sermonText.trim()
    ? sermonText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const TYPE_INFO_MAP: Record<string, { label: string; diff: string }> = {
    MULTIPLE_CHOICE: { label: 'Balloon Pop', diff: 'Easy' },
    TREE_OF_LIFE: { label: 'Tree of Wisdom', diff: 'Medium' },
    FILL_IN_BLANKS: { label: 'Fill the Blanks', diff: 'Medium-Easy' },
    SHORT_ANSWER: { label: 'In Your Own Words', diff: 'Medium' },
    SCRIPTURE_ORDERING: { label: 'Verse Builder', diff: 'Medium-Hard' },
    TRUE_FALSE_EXPLAIN: { label: 'Defend Your Faith', diff: 'Hard' },
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>Quiz for Christ</Text>
      <Text style={[styles.sub, { marginBottom: 14 }]}>
        Create, preview, and manage weekly sermon quizzes
      </Text>

      {statusMsg ? (
        <View
          style={{
            backgroundColor: '#f0fdf4',
            borderWidth: 1,
            borderColor: '#bbf7d0',
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>
            {statusMsg}
          </Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View
          style={{
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13 }}>
            {errorMsg}
          </Text>
        </View>
      ) : null}

      {/* Section 1: Create New Quiz Week */}
      <View style={styles.card}>
        <View style={[styles.rowBetween, { marginBottom: 8 }]}>
          <Text style={styles.h2}>Create Quiz Week</Text>
          <View
            style={{
              backgroundColor: isPastSermon ? '#ecfdf5' : '#e0f2fe',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: isPastSermon ? '#047857' : '#0369a1',
              }}
            >
              {isPastSermon ? 'Catch-Up Archive Mode' : 'Live Week Mode'}
            </Text>
          </View>
        </View>

        {events.length > 0 && (
          <>
            <Text style={styles.fieldLabel}>Link Sunday Sermon Event</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, marginBottom: 8 }}
            >
              {events.slice(0, 12).map((ev) => {
                const active = selectedEventId === ev.id;
                const dStr = ev.eventDate ? String(ev.eventDate).slice(0, 10) : '';
                return (
                  <TouchableOpacity
                    key={ev.id}
                    onPress={() => {
                      setSelectedEventId(ev.id);
                      if (dStr) setSermonDate(dStr);
                    }}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text
                      style={[styles.pillTxt, active && styles.pillTxtActive]}
                      numberOfLines={1}
                    >
                      {dStr} • {String(ev.title || '').slice(0, 22)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        <Text style={styles.fieldLabel}>Sunday Sermon Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={sermonDate}
          onChangeText={(val) => {
            setSermonDate(val);
            const matched = events.find(
              (ev) => String(ev.eventDate || '').slice(0, 10) === val
            );
            setSelectedEventId(matched ? matched.id : null);
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.fieldLabel}>YouTube Sermon Video URL (Optional)</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            placeholder="https://www.youtube.com/watch?v=..."
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleFetchTranscript}
            disabled={fetchingTranscript}
            style={{
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
              {fetchingTranscript ? 'Fetching...' : 'Fetch CC'}
            </Text>
          </TouchableOpacity>
        </View>
        {transcriptMeta ? (
          <Text style={{ fontSize: 11.5, color: '#16a34a', fontWeight: '700', marginTop: 4 }}>
            Loaded {transcriptMeta.wordCount.toLocaleString()} words ({transcriptMeta.language})
          </Text>
        ) : null}

        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <Text style={[styles.fieldLabel, { marginTop: 0 }]}>
            Sermon Notes / Transcript
          </Text>
          {wordCount > 0 ? (
            <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
              {wordCount.toLocaleString()} words
            </Text>
          ) : null}
        </View>
        <TextInput
          style={[styles.input, { minHeight: 105, textAlignVertical: 'top' }]}
          multiline
          value={sermonText}
          onChangeText={setSermonText}
          placeholder="Optional if YouTube CC or Event Slides exist — or paste sermon notes here..."
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: P, marginTop: 14 }]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <Text style={styles.btnSolidText}>
            {generating ? 'AI is generating 7-day quiz...' : 'Generate 7-Day Quiz'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section 1B: Inline Preview & Edit Generated Questions */}
      {generatedQuestions.length > 0 && (
        <View style={[styles.card, { borderWidth: 1.5, borderColor: P }]}>
          <Text style={styles.h2}>Preview & Edit Quiz</Text>

          <Text style={styles.fieldLabel}>Quiz Title</Text>
          <TextInput
            style={styles.input}
            value={generatedTitle}
            onChangeText={setGeneratedTitle}
          />

          <Text style={styles.fieldLabel}>Announcement Caption</Text>
          <TextInput
            style={[styles.input, { minHeight: 75, textAlignVertical: 'top' }]}
            multiline
            value={generatedCaption}
            onChangeText={setGeneratedCaption}
          />

          {generatedQuestions.map((q, idx) => {
            const meta = TYPE_INFO_MAP[q.questionType] || {
              label: q.questionType,
              diff: 'Medium',
            };
            return (
              <View
                key={idx}
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 12,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                  <View
                    style={{
                      backgroundColor: P,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                      Day {q.dayNumber}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: '#0284c7',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {meta.label}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>{meta.diff}</Text>
                </View>

                <Text style={styles.fieldLabel}>Question</Text>
                <TextInput
                  style={[styles.input, { minHeight: 52 }]}
                  multiline
                  value={q.questionText}
                  onChangeText={(v) => updateQuestionField(idx, 'questionText', v)}
                />

                <Text style={styles.fieldLabel}>Correct Answer</Text>
                <TextInput
                  style={styles.input}
                  value={q.correctAnswer}
                  onChangeText={(v) => updateQuestionField(idx, 'correctAnswer', v)}
                />

                {Array.isArray(q.options) && (
                  <>
                    <Text style={styles.fieldLabel}>Options (one per line)</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 78, textAlignVertical: 'top' }]}
                      multiline
                      value={q.options.join('\n')}
                      onChangeText={(v) =>
                        updateQuestionField(
                          idx,
                          'options',
                          v.split('\n').filter((line) => line.trim().length > 0)
                        )
                      }
                    />
                  </>
                )}

                <Text style={styles.fieldLabel}>Hint</Text>
                <TextInput
                  style={styles.input}
                  value={q.hint || ''}
                  onChangeText={(v) => updateQuestionField(idx, 'hint', v)}
                />
              </View>
            );
          })}

          {isPastSermon && (
            <TouchableOpacity
              onPress={() => setNotifyArchiveMembers((v) => !v)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#f0f9ff',
                borderWidth: 1,
                borderColor: '#bae6fd',
                padding: 12,
                borderRadius: 10,
                marginTop: 14,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  borderWidth: 1.5,
                  borderColor: '#0284c7',
                  backgroundColor: notifyArchiveMembers ? '#0284c7' : '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {notifyArchiveMembers ? (
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                ) : null}
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: '#0c4a6e', fontWeight: '600' }}>
                Send in-app bell notification so active members know this catch-up quiz is available (Zero SMS)
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            {!isPastSermon && (
              <TouchableOpacity
                style={[
                  styles.btnSolid,
                  { flex: 1, backgroundColor: '#475569' },
                ]}
                disabled={savingQuiz || publishingQuiz}
                onPress={() => handleSaveOrPublish('save_quiz')}
              >
                <Text style={styles.btnSolidText} numberOfLines={1}>
                  {savingQuiz ? 'Saving...' : 'Save Draft'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btnSolid,
                {
                  flex: 1.3,
                  backgroundColor: isPastSermon ? '#059669' : P,
                },
              ]}
              disabled={savingQuiz || publishingQuiz}
              onPress={() => handleSaveOrPublish('publish_quiz')}
            >
              <Text style={styles.btnSolidText} numberOfLines={1}>
                {publishingQuiz
                  ? 'Saving...'
                  : isPastSermon
                  ? 'Save to Catch-Up Archive'
                  : 'Publish Live Quiz Week'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Section 2: Announce Weekly Rewards */}
      <View style={styles.card}>
        <Text style={styles.h2}>Announce Weekly Rewards</Text>
        <Text style={[styles.sub, { marginBottom: 10 }]}>
          Announce or update prizes for the active quiz and sync to the feed
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, marginBottom: 8 }}
        >
          {[
            { k: 'PERFECT', l: 'Perfect (7/7)' },
            { k: 'EXCELLENT', l: 'Excellent (6/7)' },
            { k: 'GOOD', l: 'Good (4-5/7)' },
            { k: 'PARTICIPANT', l: 'Participant' },
          ].map((t) => (
            <TouchableOpacity
              key={t.k}
              onPress={() => setRewardTier(t.k)}
              style={[styles.pill, rewardTier === t.k && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, rewardTier === t.k && styles.pillTxtActive]}>
                {t.l}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>Reward Title</Text>
        <TextInput
          style={styles.input}
          value={rewardTitle}
          onChangeText={setRewardTitle}
          placeholder="e.g. HGF Statement T-Shirt"
          placeholderTextColor="#94a3b8"
        />
        <Text style={styles.fieldLabel}>Prize Description (Optional)</Text>
        <TextInput
          style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
          multiline
          value={rewardDescription}
          onChangeText={setRewardDescription}
          placeholder="Instructions on how to claim on Sunday..."
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.fieldLabel}>Prize Image (Optional)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <TouchableOpacity
            onPress={handlePickRewardImage}
            disabled={uploadingRewardImg}
            style={{
              backgroundColor: '#f1f5f9',
              borderWidth: 1,
              borderColor: '#cbd5e1',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 9,
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1e293b' }}>
              {uploadingRewardImg ? 'Uploading...' : 'Choose Image'}
            </Text>
          </TouchableOpacity>

          {rewardImageUrl ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image
                source={{
                  uri: rewardImageUrl.startsWith('http')
                    ? rewardImageUrl
                    : `https://connect.houseofgrace.ph/uploads/${rewardImageUrl.replace(
                        /^\/?uploads\//,
                        ''
                      )}`,
                }}
                style={{ width: 46, height: 46, borderRadius: 8 }}
              />
              <TouchableOpacity onPress={() => setRewardImageUrl('')}>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: '#d97706', marginTop: 14 }]}
          onPress={handleAnnounceReward}
          disabled={announcingReward || uploadingRewardImg}
        >
          <Text style={styles.btnSolidText}>
            {announcingReward ? 'Saving...' : 'Announce Reward & Post'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section 3: Manage Quizzes */}
      <View style={styles.card}>
        <View style={[styles.rowBetween, { marginBottom: 6 }]}>
          <Text style={styles.h2}>Manage Quizzes</Text>
          <TouchableOpacity
            onPress={handleBackfill}
            disabled={backfilling}
            style={{
              backgroundColor: '#ea580c',
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 11.5, fontWeight: '700' }}>
              {backfilling ? 'Syncing...' : 'Backfill Posts'}
            </Text>
          </TouchableOpacity>
        </View>

        {quizzes.map((q) => (
          <View
            key={q.id}
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#e2e8f0',
              marginTop: 10,
            }}
          >
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontWeight: '700', color: '#1a202c', fontSize: 14.5 }}>
                  {q.title}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {new Date(q.sermonDate).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      q.status === 'published'
                        ? '#16a34a'
                        : q.status === 'draft'
                        ? '#d97706'
                        : '#64748b',
                  },
                ]}
              >
                <Text style={[styles.badgeTxt, { color: '#fff' }]}>{q.status}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => openParticipantsModal(q)}
                style={{
                  flex: 1,
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}
                >
                  Analytics ({q._count?.submissions || 0})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openRewardsModal(q)}
                style={{
                  flex: 1,
                  backgroundColor: '#e2e8f0',
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: '#1e293b', fontSize: 12, fontWeight: '700' }}
                >
                  Rewards ({q._count?.rewards || 0})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* ── Participant Analytics & Drip Nudge Modal ── */}
      <Modal
        visible={analyticsModalQuiz !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnalyticsModalQuiz(null)}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.6)',
            justifyContent: 'center',
            padding: 16,
          }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              maxHeight: '88%',
              padding: 16,
            }}
          >
            <View style={[styles.rowBetween, { marginBottom: 10 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
                  numberOfLines={1}
                >
                  {analyticsModalQuiz?.title || 'Participants & Analytics'}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>
                  7-Day Funnel & In-App Streak Reminders
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAnalyticsModalQuiz(null)}
                style={{
                  backgroundColor: '#f1f5f9',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: '800', color: '#334155' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingAnalytics ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={P} />
              </View>
            ) : analyticsData ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[
                    {
                      l: 'Players',
                      v: analyticsData.summary?.totalParticipants ?? 0,
                    },
                    {
                      l: '7/7 Done',
                      v: `${analyticsData.summary?.completedCount ?? 0} (${
                        analyticsData.summary?.completionRate ?? 0
                      }%)`,
                    },
                    {
                      l: 'Perfect',
                      v: analyticsData.summary?.perfectScoreCount ?? 0,
                    },
                    {
                      l: 'Avg Score',
                      v: `${analyticsData.summary?.averageScore ?? 0}/7`,
                    },
                  ].map((kpi, idx) => (
                    <View
                      key={idx}
                      style={{
                        flex: 1,
                        backgroundColor: '#f8fafc',
                        borderRadius: 10,
                        padding: 8,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}
                        numberOfLines={1}
                      >
                        {kpi.v}
                      </Text>
                      <Text
                        style={{ fontSize: 10, color: '#64748b', fontWeight: '700' }}
                        numberOfLines={1}
                      >
                        {kpi.l}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 7-Day Drop-off & Accuracy Funnel */}
                <View
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: '#334155',
                      marginBottom: 8,
                    }}
                  >
                    7-Day Accuracy & Participation Funnel
                  </Text>
                  {(analyticsData.summary?.dayDropoff || []).map((d: any) => (
                    <View
                      key={d.dayNumber}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 5,
                      }}
                    >
                      <Text
                        style={{
                          width: 42,
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: '#475569',
                        }}
                      >
                        Day {d.dayNumber}
                      </Text>
                      <View
                        style={{
                          flex: 1,
                          height: 7,
                          backgroundColor: '#e2e8f0',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${d.accuracyRate || 0}%`,
                            height: '100%',
                            backgroundColor: P,
                          }}
                        />
                      </View>
                      <Text
                        style={{
                          width: 84,
                          fontSize: 11,
                          color: '#475569',
                          textAlign: 'right',
                        }}
                      >
                        {d.participants}p • {d.accuracyRate}%
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Nudge All In-Progress CTA */}
                <TouchableOpacity
                  disabled={nudgingId !== null}
                  onPress={() => handleNudge()}
                  style={{
                    backgroundColor: '#0284c7',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '800' }}>
                    {nudgingId === 'all'
                      ? 'Sending Reminders...'
                      : 'Nudge All In-Progress (Bell Only)'}
                  </Text>
                </TouchableOpacity>

                {/* Filter Pills + Search */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginBottom: 8 }}
                >
                  {[
                    { k: 'all' as const, l: 'All' },
                    { k: 'in_progress' as const, l: 'In Progress' },
                    { k: 'completed' as const, l: 'Completed 7/7' },
                    { k: 'perfect' as const, l: 'Perfect 7/7' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.k}
                      onPress={() => setParticipantFilter(f.k)}
                      style={[styles.pill, participantFilter === f.k && styles.pillActive]}
                    >
                      <Text
                        style={[
                          styles.pillTxt,
                          participantFilter === f.k && styles.pillTxtActive,
                        ]}
                      >
                        {f.l}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={[styles.input, { marginBottom: 10 }]}
                  value={participantSearch}
                  onChangeText={setParticipantSearch}
                  placeholder="Search member name..."
                  placeholderTextColor="#94a3b8"
                />

                {(analyticsData.participants || [])
                  .filter((p: any) => {
                    if (
                      participantSearch &&
                      !String(p.name || '')
                        .toLowerCase()
                        .includes(participantSearch.toLowerCase())
                    ) {
                      return false;
                    }
                    if (participantFilter === 'in_progress') return !p.isCompleted;
                    if (participantFilter === 'completed') return p.isCompleted;
                    if (participantFilter === 'perfect') return p.totalScore >= 7;
                    return true;
                  })
                  .map((p: any) => (
                    <View
                      key={p.memberId}
                      style={{
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 12,
                        padding: 10,
                        marginBottom: 8,
                      }}
                    >
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#0f172a' }}>
                            {p.name}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: '#64748b' }}>
                            Score: {p.totalScore}/7 • {p.daysCompleted}/7 days
                          </Text>
                        </View>
                        {!p.isCompleted && (
                          <TouchableOpacity
                            disabled={nudgingId !== null}
                            onPress={() => handleNudge(p.memberId)}
                            style={{
                              backgroundColor: '#e0f2fe',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                          >
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0369a1' }}>
                              {nudgingId === p.memberId ? 'Sent' : 'Nudge'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* 7-Day Dot Timeline */}
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        {(p.dayProgress || []).map((dp: any) => (
                          <View
                            key={dp.dayNumber}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: !dp.completed
                                ? '#f1f5f9'
                                : dp.isCorrect
                                ? '#dcfce7'
                                : '#fee2e2',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10.5,
                                fontWeight: '800',
                                color: !dp.completed
                                  ? '#94a3b8'
                                  : dp.isCorrect
                                  ? '#166534'
                                  : '#b91c1c',
                              }}
                            >
                              {dp.dayNumber}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
              </ScrollView>
            ) : (
              <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 20 }}>
                No participant data available yet.
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Rewards Claims & Distribution Modal ── */}
      <Modal
        visible={rewardsModalQuiz !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRewardsModalQuiz(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.6)',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              maxHeight: '82%',
              padding: 16,
            }}
          >
            <View style={[styles.rowBetween, { marginBottom: 12 }]}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 }}>
                Rewards & Claims
              </Text>
              <TouchableOpacity
                onPress={() => setRewardsModalQuiz(null)}
                style={{
                  backgroundColor: '#f1f5f9',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontWeight: '800', color: '#334155' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingRewards ? (
              <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                <ActivityIndicator color={P} />
              </View>
            ) : rewardsList.length === 0 ? (
              <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 24 }}>
                No members have qualified or submitted claims for this quiz yet.
              </Text>
            ) : (
              <ScrollView>
                {rewardsList.map((r) => {
                  const cd = r.claimDetails || {};
                  const sizeStr = cd.size || cd.tShirtSize || '';
                  const phoneStr = cd.phone || r.member?.phone || '';
                  return (
                    <View
                      key={r.id}
                      style={{
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>
                          {r.member?.firstName} {r.member?.lastName}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                          {r.rewardTier} • Score: {r.totalScore}/7 • {r.claimStatus}
                        </Text>
                        {sizeStr || phoneStr ? (
                          <Text
                            style={{
                              fontSize: 12,
                              color: '#0284c7',
                              fontWeight: '700',
                              marginTop: 2,
                            }}
                          >
                            {sizeStr ? `Size: ${sizeStr} ` : ''}
                            {phoneStr ? `• ${phoneStr}` : ''}
                          </Text>
                        ) : null}
                      </View>
                      {r.claimStatus !== 'distributed' ? (
                        <TouchableOpacity
                          onPress={() => handleMarkDistributed(r.id)}
                          style={{
                            backgroundColor: '#16a34a',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                            Mark Distributed
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={{
                            backgroundColor: '#dcfce7',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{ color: '#166534', fontSize: 11.5, fontWeight: '700' }}>
                            Distributed
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pagePad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  h2: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  statBigNum: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  upperSmall: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.4 },
  areaTxt: { fontSize: 12, color: '#64748b' },
  bold: { fontWeight: '700', color: '#0f172a' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  pillActive: { backgroundColor: P, borderColor: P },
  pillTxt: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  pillTxtActive: { color: '#ffffff' },
  btnSolid: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSolidText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  btnOutlineText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
});
