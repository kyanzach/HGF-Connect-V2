import React, { useState } from 'react';
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
} from 'react-native';
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
    await api.post('/api/mobile/admin', {
      action: 'update_lifegroup',
      id: regId,
      assignedLeaderId: leaderId,
    });
    onRefresh();
  };

  const deleteReg = async (regId: number) => {
    await api.post('/api/mobile/admin', { action: 'delete_lifegroup', id: regId });
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
    await api.post('/api/mobile/admin', {
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
              {t.translatedContent || 'No translation available.'}
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
    await api.post('/api/mobile/admin', {
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
    await api.post('/api/mobile/admin', {
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
export function SendSmsView({ data }: { data: any }) {
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
      await api.post('/api/sms/send', { memberIds: selected, message });
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

export function SmsLogsView({ data }: { data: any }) {
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
    await api.post('/api/mobile/admin', {
      action: 'moderate_listing',
      sellerId,
      isVerified: !current,
    });
    onRefresh();
  };

  const togglePrivate = async (listingId: number, current: boolean) => {
    await api.post('/api/mobile/admin', {
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
    await api.post('/api/mobile/admin', { action: 'save_church_settings', settings });
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
    await api.post('/api/mobile/admin', { action: 'update_member', memberId, role });
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
export function BirthdaysAdminView({ data }: { data: any }) {
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
      await api.post('/api/admin/birthdays/demo', { type, memberId });
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
    await api.post('/api/mobile/admin', { action: 'toggle_sop_task', taskId });
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

// ── 10. QUIZ FOR CHRIST ADMIN (/quiz/admin) ────────────────────────
export function QuizAdminView({ data, onRefresh }: { data: any; onRefresh: () => void }) {
  const quizzes: any[] = data?.quizzes || [];
  const events: any[] = data?.events || [];
  const [sermonDate, setSermonDate] = useState(
    events[0]?.eventDate ? String(events[0].eventDate).slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [sermonText, setSermonText] = useState('');
  const [rewardTier, setRewardTier] = useState('PERFECT');
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setStatusMsg(null);
    try {
      const res = await api.post<any>('/api/quiz/generate', {
        sermonText,
        sermonDate,
        eventId: events[0]?.id || null,
        youtubeUrl: youtubeUrl || null,
      });
      setStatusMsg(`✅ Generated 7-day quiz: "${res?.title || 'Weekly Quiz'}"`);
      onRefresh();
    } catch (e: any) {
      setStatusMsg(`⚠️ ${e?.message || 'Provide sermon notes or YouTube CC to generate.'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleAnnounceReward = async () => {
    if (!rewardTitle.trim()) return;
    try {
      await api.post('/api/quiz/rewards/announce', {
        rewardTier,
        title: rewardTitle,
        description: rewardDescription,
      });
      setStatusMsg('🎁 Reward announced & posted to the community feed!');
      setRewardTitle('');
      setRewardDescription('');
      onRefresh();
    } catch (e: any) {
      setStatusMsg(`⚠️ ${e?.message || 'Failed to announce reward'}`);
    }
  };

  return (
    <View style={styles.pagePad}>
      <Text style={styles.h1}>🧠 Quiz for Christ</Text>
      <Text style={[styles.sub, { marginBottom: 16 }]}>Create and manage weekly sermon-based quizzes</Text>

      {statusMsg ? (
        <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <Text style={{ color: '#166534', fontWeight: '700', fontSize: 13 }}>{statusMsg}</Text>
        </View>
      ) : null}

      {/* Section 1: Create New Quiz Week */}
      <View style={styles.card}>
        <Text style={styles.h2}>✨ Create New Quiz Week</Text>
        <Text style={styles.fieldLabel}>📅 Sunday Sermon Date (Required)</Text>
        <TextInput style={styles.input} value={sermonDate} onChangeText={setSermonDate} placeholder="YYYY-MM-DD" />

        <Text style={styles.fieldLabel}>📺 YouTube Sermon Video URL (Optional)</Text>
        <TextInput
          style={styles.input}
          value={youtubeUrl}
          onChangeText={setYoutubeUrl}
          placeholder="https://www.youtube.com/watch?v=..."
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.fieldLabel}>Sermon Notes / Transcript</Text>
        <TextInput
          style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
          multiline
          value={sermonText}
          onChangeText={setSermonText}
          placeholder="Paste sermon notes or transcript here..."
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: P, marginTop: 14 }]}
          onPress={handleGenerate}
          disabled={generating}
        >
          <Text style={styles.btnSolidText}>
            {generating ? '🤖 AI is generating quiz...' : '🤖 Generate Quiz'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section 2: Announce Weekly Rewards */}
      <View style={styles.card}>
        <Text style={styles.h2}>🎁 Announce Weekly Rewards</Text>
        <Text style={[styles.sub, { marginBottom: 10 }]}>
          Announce prizes for the current active quiz to motivate the church!
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 8 }}>
          {[
            { k: 'PERFECT', l: '🏆 Perfect (7/7)' },
            { k: 'EXCELLENT', l: '🌟 Excellent (6/7)' },
            { k: 'GOOD', l: '👏 Good (4-5/7)' },
            { k: 'PARTICIPANT', l: '🙏 Participant' },
          ].map((t) => (
            <TouchableOpacity
              key={t.k}
              onPress={() => setRewardTier(t.k)}
              style={[styles.pill, rewardTier === t.k && styles.pillActive]}
            >
              <Text style={[styles.pillTxt, rewardTier === t.k && styles.pillTxtActive]}>{t.l}</Text>
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
          placeholder="Describe the reward or instructions on how to claim..."
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity
          style={[styles.btnSolid, { backgroundColor: '#f59e0b', marginTop: 14 }]}
          onPress={handleAnnounceReward}
        >
          <Text style={styles.btnSolidText}>📢 Announce Reward & Post</Text>
        </TouchableOpacity>
      </View>

      {/* Section 3: Manage Quizzes */}
      <View style={styles.card}>
        <Text style={styles.h2}>📊 Manage Quizzes</Text>
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
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a202c', fontSize: 15 }}>{q.title}</Text>
                <Text style={{ color: '#a0aec0', fontSize: 12 }}>
                  {new Date(q.sermonDate).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      q.status === 'published' ? '#48BB78' : q.status === 'draft' ? '#ecc94b' : '#a0aec0',
                  },
                ]}
              >
                <Text style={[styles.badgeTxt, { color: '#fff' }]}>{q.status}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  👥 Participants & Analytics ({q._count?.submissions || 0})
                </Text>
              </View>
              <View style={{ backgroundColor: '#edf2f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                <Text style={{ color: '#2d3748', fontSize: 12, fontWeight: '600' }}>
                  🏆 Rewards ({q._count?.rewards || 0})
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
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
