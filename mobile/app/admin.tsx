import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import client from '@/api/client';
import TopHeader from '@/components/ui/TopHeader';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';
import { useAuth } from '@/context/AuthContext';
import {
  LifeGroupView,
  TestimoniesView,
  MinistriesView,
  SendSmsView,
  SmsLogsView,
  StewardShopAdminView,
  ChurchSettingsView,
  UsersRolesView,
  BirthdaysAdminView,
  MultimediaAdminView,
  QuizAdminView,
} from '@/components/admin/AdminSubPages';

const PRIMARY = '#4EB1CB';
const SIDEBAR_BG = '#0f172a';
const HGF_LOGO = require('../assets/images/HGF-icon-v1.0.png');

const PRIMARY_SPEAKERS = [
  { label: 'Ptr. Jun', value: 'Ptr. Jun Baltazar' },
  { label: 'Ptr. Manny', value: 'Ptr. Manny Asilom' },
  { label: 'Bro. Bonvie', value: 'Bro. Bonvie' },
  { label: 'Bro. Dodz', value: 'Bro. Dodz' },
];

const EVENT_TYPE_OPTIONS = [
  { key: 'sunday_service', label: '⛪ Sunday Service' },
  { key: 'prayer_meeting', label: '🙏 Prayer Meeting' },
  { key: 'bible_study', label: '📖 Bible Study' },
  { key: 'special_event', label: '✨ Special Event' },
  { key: 'grace_night', label: '🌙 Grace Night' },
  { key: 'other', label: '📌 Other' },
];

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'moderator'] },
  { page: 'members', label: 'Members', icon: '👥', roles: ['admin', 'moderator', 'usher'] },
  { page: 'lifegroup', label: 'Life Group', icon: '🌱', roles: ['admin', 'moderator'] },
  { page: 'review', label: 'Review Pending', icon: '⏳', roles: ['admin', 'moderator', 'usher'], badge: true },
  { page: 'events', label: 'Events', icon: '📅', roles: ['admin', 'moderator'] },
  { page: 'testimonies', label: 'Testimonies', icon: '🙌', roles: ['admin', 'moderator'] },
  { page: 'ministries', label: 'Ministries', icon: '⛪', roles: ['admin', 'moderator'] },
  { page: 'send-sms', label: 'Send SMS', icon: '📤', roles: ['admin', 'moderator'] },
  { page: 'sms', label: 'SMS & Logs', icon: '💬', roles: ['admin', 'moderator'] },
  { page: 'stewardshop', label: 'StewardShop', icon: '🛒', roles: ['admin', 'moderator'] },
  { page: 'quiz-admin', label: 'Quiz Admin', icon: '🧠', roles: ['admin', 'moderator'] },
  { page: 'church-settings', label: 'Church Settings', icon: '⛪', roles: ['admin'] },
  { page: 'users', label: 'Users & Roles', icon: '🔑', roles: ['admin'] },
  { page: 'birthdays', label: 'Birthdays', icon: '🎂', roles: ['admin', 'moderator'] },
  { page: 'multimedia', label: 'Multimedia Control', icon: '🎛️', roles: ['admin', 'moderator'] },
];

export default function AdminReplicaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const params = useLocalSearchParams<{ page?: string; add?: string }>();

  const [activePage, setActivePage] = useState<string>(params.page || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>({});
  const [pendingCount, setPendingCount] = useState(0);

  // Members sub-state
  const [memSearch, setMemSearch] = useState('');
  const [memStatus, setMemStatus] = useState('');
  const [memType, setMemType] = useState('');
  const [memAge, setMemAge] = useState('');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [memForm, setMemForm] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    type: string;
    ageGroup: string;
    status: string;
    ministryIds: number[];
  }>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    type: 'GrowingFriend',
    ageGroup: 'Adult',
    status: 'active',
    ministryIds: [],
  });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'member' | 'event'; id: number; name: string } | null>(null);

  // Review sub-state
  const [reviewTab, setReviewTab] = useState<'registrations' | 'ministries' | 'history'>('registrations');

  // Events sub-state
  const [evTab, setEvTab] = useState<'upcoming' | 'past'>('upcoming');
  const [addEventOpen, setAddEventOpen] = useState(params.add === 'true');
  const [editEvent, setEditEvent] = useState<any>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [evForm, setEvForm] = useState({
    title: '',
    description: '',
    eventDate: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '11:30',
    location: "Bro's Cafe, 2nd Floor, Gen. Luna St., Davao City",
    eventType: 'sunday_service',
    speaker: '',
    coverPhoto: '',
  });
  const [analyticsEvent, setAnalyticsEvent] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    if (params.page) setActivePage(params.page);
    if (params.add === 'true') setAddEventOpen(true);
  }, [params.page, params.add]);

  const fetchPageData = useCallback(
    async (pageToLoad: string) => {
      try {
        const res = await client.get(`/admin?page=${pageToLoad}`);
        const payload = res.data?.data || res.data || {};
        setData(payload);
        if (typeof payload.pendingCount === 'number') {
          setPendingCount(payload.pendingCount);
        } else if (payload.stats?.pendingMembers !== undefined) {
          setPendingCount(payload.stats.pendingMembers);
        }
      } catch {
        // Fallback if needed
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    fetchPageData(activePage);
  }, [activePage, fetchPageData]);

  const navigatePage = (nextPage: string) => {
    setSidebarOpen(false);
    setActivePage(nextPage);
  };

  // ── 1. DASHBOARD VIEW (app/admin/page.tsx + DashboardChartsClient.tsx) ──────
  const renderDashboardView = () => {
    const stats = data.stats || {};
    const totalMembers = stats.totalMembers ?? 486;
    const newThisMonth = stats.newThisMonth ?? 0;
    const pendingMembers = stats.pendingMembers ?? pendingCount ?? 0;
    const activeCellGroups = stats.activeCellGroups ?? 12;
    const attendanceTrends: { label: string; count: number }[] = data.attendanceTrends || [
      { label: 'W1', count: 145 },
      { label: 'W2', count: 162 },
      { label: 'W3', count: 158 },
      { label: 'W4', count: 174 },
      { label: 'W5', count: 181 },
      { label: 'W6', count: 190 },
    ];
    const ageDist = data.ageDistribution || { Adult: 310, Youth: 112, Kids: 64 };
    const upcomingEvents: any[] = data.upcomingEvents || [];
    const birthdayCelebrants: any[] = data.birthdayCelebrants || [];
    const baptismCelebrants: any[] = data.baptismCelebrants || [];

    const maxAtt = Math.max(...attendanceTrends.map((d) => d.count), 50);
    const totalAge = Math.max((ageDist.Adult || 0) + (ageDist.Youth || 0) + (ageDist.Kids || 0), 1);

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 58, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPageData(activePage);
            }}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Header Row */}
        <View style={styles.dashHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dashTitle}>Dashboard</Text>
            <Text style={styles.dashSub}>
              Welcome back, {user?.firstName || 'Admin'}! Here&apos;s what&apos;s happening at HGF.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setActivePage('members');
                setAddMemberOpen(true);
              }}
            >
              <Text style={styles.primaryBtnText}>+ Add Member</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigatePage('events')}
            >
              <Text style={styles.outlineBtnText}>📅 Events</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 KPI Cards (2x2 Grid) */}
        <View style={styles.kpiGrid}>
          {[
            {
              title: 'Total Active Members',
              value: totalMembers,
              sub: 'Family & Growing Friends',
              icon: '👥',
              color: PRIMARY,
              bg: '#e8f7fb',
              target: 'members',
            },
            {
              title: 'New This Month',
              value: newThisMonth,
              sub: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
              icon: '✨',
              color: '#10b981',
              bg: '#d1fae5',
              target: 'members',
            },
            {
              title: 'Pending Review',
              value: pendingMembers,
              sub: pendingMembers > 0 ? 'Needs approval →' : 'All caught up!',
              icon: '⏳',
              color: '#f59e0b',
              bg: '#fef3c7',
              target: 'review',
            },
            {
              title: 'Active Ministries',
              value: activeCellGroups,
              sub: 'Serving teams',
              icon: '🙌',
              color: '#0284c7',
              bg: '#e0f2fe',
              target: 'ministries',
            },
          ].map((kpi) => (
            <TouchableOpacity
              key={kpi.title}
              style={styles.kpiCard}
              activeOpacity={0.85}
              onPress={() => navigatePage(kpi.target)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kpiLabel}>{kpi.title}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                  <Text
                    style={[
                      styles.kpiSub,
                      kpi.title === 'Pending Review' && pendingMembers > 0 && { color: '#f59e0b', fontWeight: '700' },
                    ]}
                  >
                    {kpi.sub}
                  </Text>
                </View>
                <View style={[styles.kpiIconBox, { backgroundColor: kpi.bg }]}>
                  <Text style={{ fontSize: 18 }}>{kpi.icon}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions Row */}
        <View style={styles.quickGrid}>
          {[
            { label: 'Review Registrations', icon: '⏳', color: '#f59e0b', page: 'review', badge: pendingMembers },
            { label: 'Attendance App', icon: '📟', color: '#10b981', page: 'kiosk' },
            { label: 'Send SMS', icon: '💬', color: '#0284c7', page: 'send-sms' },
            { label: 'Manage Events', icon: '📅', color: PRIMARY, page: 'events' },
          ].map((qa) => (
            <TouchableOpacity
              key={qa.label}
              style={styles.quickCard}
              activeOpacity={0.85}
              onPress={() => {
                if (qa.page === 'kiosk') {
                  router.push('/attendance-kiosk' as any);
                } else {
                  navigatePage(qa.page);
                }
              }}
            >
              <Text style={{ fontSize: 18 }}>{qa.icon}</Text>
              <Text numberOfLines={1} style={styles.quickCardLabel}>
                {qa.label}
              </Text>
              {qa.badge && qa.badge > 0 ? (
                <View style={styles.quickBadge}>
                  <Text style={styles.quickBadgeText}>{qa.badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>

        {/* Charts Section (DashboardChartsClient.tsx replica) */}
        <View style={styles.whiteCard}>
          <Text style={styles.sectionTitle}>📈 Attendance Trends (Last 6 Weeks)</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: 145,
              paddingTop: 18,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#f1f5f9',
              marginTop: 8,
            }}
          >
            {attendanceTrends.map((d, idx) => {
              const barH = Math.max(12, Math.round((d.count / maxAtt) * 95));
              return (
                <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#0f172a', marginBottom: 4 }}>
                    {d.count}
                  </Text>
                  <View
                    style={{
                      width: 24,
                      height: barH,
                      borderRadius: 6,
                      backgroundColor: PRIMARY,
                    }}
                  />
                  <Text style={{ fontSize: 10.5, color: '#64748b', marginTop: 6 }}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Age Distribution Card */}
        <View style={styles.whiteCard}>
          <Text style={styles.sectionTitle}>👥 Age Group Distribution</Text>
          {[
            { label: '👤 Adults', count: ageDist.Adult || 0, color: PRIMARY },
            { label: '🌱 Youth', count: ageDist.Youth || 0, color: '#10b981' },
            { label: '🧒 Kids', count: ageDist.Kids || 0, color: '#f59e0b' },
          ].map((row) => {
            const pct = Math.round((row.count / totalAge) * 100);
            return (
              <View key={row.label} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#334155' }}>{row.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                    {row.count} ({pct}%)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: row.color,
                      borderRadius: 999,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Upcoming Events Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>📅 Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigatePage('events')}>
              <Text style={styles.cardLink}>View all →</Text>
            </TouchableOpacity>
          </View>
          {upcomingEvents.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>No upcoming events scheduled</Text>
            </View>
          ) : (
            upcomingEvents.map((ev: any) => {
              const d = new Date(ev.eventDate);
              return (
                <View key={ev.id} style={styles.eventRow}>
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventMonthText}>
                      {d.toLocaleString('en-US', { month: 'short' })}
                    </Text>
                    <Text style={styles.eventDayText}>{d.getDate()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={styles.eventTitleText}>
                      {ev.title}
                    </Text>
                    <Text style={styles.eventSubText}>
                      {(ev.eventType || ev.type || 'Event').replace(/_/g, ' ')} ·{' '}
                      {ev._count?.attendance ?? ev._count?.attendances ?? 0} attending
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Birthday Celebrants Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>
              🎂 {new Date().toLocaleString('en-US', { month: 'long' })} Birthdays
            </Text>
            <View style={[styles.countBadge, { backgroundColor: '#fef3c7' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#92400e' }}>
                {birthdayCelebrants.length}
              </Text>
            </View>
          </View>
          {birthdayCelebrants.slice(0, 8).map((m: any) => (
            <TouchableOpacity
              key={m.id}
              style={styles.celebrantRow}
              onPress={() => router.push(`/church?tab=member&id=${m.id}` as any)}
            >
              <View style={styles.celebrantAvatar}>
                <Text style={styles.celebrantInitials}>
                  {m.firstName?.[0]}
                  {m.lastName?.[0]}
                </Text>
              </View>
              <Text style={styles.celebrantName}>
                {m.firstName} {m.lastName}
              </Text>
              <Text style={styles.celebrantDate}>
                {m.birthdate
                  ? new Date(m.birthdate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Baptism Anniversaries Card */}
        <View style={styles.whiteCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>
              💧 {new Date().toLocaleString('en-US', { month: 'long' })} Baptisms
            </Text>
            <View style={[styles.countBadge, { backgroundColor: '#dbeafe' }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e40af' }}>
                {baptismCelebrants.length}
              </Text>
            </View>
          </View>
          {baptismCelebrants.length === 0 ? (
            <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
              No baptism anniversaries this month
            </Text>
          ) : (
            baptismCelebrants.slice(0, 8).map((m: any) => (
              <View key={m.id} style={styles.celebrantRow}>
                <View style={[styles.celebrantAvatar, { backgroundColor: '#3b82f6' }]}>
                  <Text style={styles.celebrantInitials}>
                    {m.firstName?.[0]}
                    {m.lastName?.[0]}
                  </Text>
                </View>
                <Text style={styles.celebrantName}>
                  {m.firstName} {m.lastName}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  // ── 2. MEMBERS VIEW (app/admin/members/AdminMembersClient.tsx) ─────────────
  const renderMembersView = () => {
    const allMembers: any[] = data.members || [];
    const allMinistries: any[] = data.ministries || [];
    const filtered = allMembers.filter((m) => {
      const q = memSearch.toLowerCase();
      if (
        q &&
        !`${m.firstName || ''} ${m.lastName || ''} ${m.email || ''} ${m.phone || ''}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      if (memStatus && m.status !== memStatus) return false;
      if (memType && m.type !== memType) return false;
      if (memAge && m.ageGroup !== memAge) return false;
      return true;
    });

    const saveMember = async () => {
      try {
        if (editMember) {
          await client.post('/admin', {
            action: 'update_member',
            memberId: editMember.id,
            ...memForm,
          });
        } else {
          await client.post('/admin', {
            action: 'create_member',
            ...memForm,
          });
        }
        setAddMemberOpen(false);
        setEditMember(null);
        fetchPageData('members');
      } catch (err: any) {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Save Failed',
          message: err?.response?.data?.error || 'Could not save member.',
        });
      }
    };

    const handleResetPassword = async (memberId: number, name: string) => {
      try {
        const res = await client.post('/admin', {
          action: 'reset_password',
          memberId,
        });
        setAlertModal({
          visible: true,
          type: 'success',
          title: 'Password Reset',
          message:
            res.data?.message ||
            `Temporary password for ${name} has been generated and sent via SMS.`,
        });
      } catch (err: any) {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Reset Failed',
          message: err?.response?.data?.error || 'Unable to reset password.',
        });
      }
    };

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 58, paddingBottom: 110 }}
      >
        <View style={styles.dashHeaderRow}>
          <View>
            <Text style={styles.dashTitle}>👥 Members ({filtered.length})</Text>
            <Text style={styles.dashSub}>Manage church directory, roles, and statuses</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setEditMember(null);
              setMemForm({
                firstName: '',
                lastName: '',
                phone: '',
                email: '',
                type: 'GrowingFriend',
                ageGroup: 'Adult',
                status: 'active',
                ministryIds: [],
              });
              setAddMemberOpen(true);
            }}
          >
            <Text style={styles.primaryBtnText}>+ Add Member</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Pills */}
        <View style={styles.whiteCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search by name, phone, or email..."
            placeholderTextColor="#94a3b8"
            value={memSearch}
            onChangeText={setMemSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {[
              { k: '', l: 'All Status' },
              { k: 'active', l: '✅ Active' },
              { k: 'pending', l: '⏳ Pending' },
              { k: 'inactive', l: '💤 Inactive' },
            ].map((st) => (
              <TouchableOpacity
                key={st.k}
                style={[styles.filterChip, memStatus === st.k && styles.filterChipActive]}
                onPress={() => setMemStatus(st.k)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    memStatus === st.k && styles.filterChipTextActive,
                  ]}
                >
                  {st.l}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Member List */}
        {filtered.slice(0, 80).map((m) => (
          <View key={m.id} style={styles.memberRowCard}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
              onPress={() => router.push(`/church?tab=member&id=${m.id}` as any)}
            >
              <View style={styles.celebrantAvatar}>
                {m.profilePicture ? (
                  <Image
                    source={{
                      uri: m.profilePicture.startsWith('http')
                        ? m.profilePicture
                        : `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`,
                    }}
                    style={{ width: '100%', height: '100%', borderRadius: 20 }}
                  />
                ) : (
                  <Text style={styles.celebrantInitials}>
                    {m.firstName?.[0]}
                    {m.lastName?.[0]}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a' }}>
                  {m.firstName} {m.lastName}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {m.type || 'Member'} · {m.ageGroup || 'Adult'} · {m.status || 'active'}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={styles.smallEditBtn}
                onPress={() => {
                  setEditMember(m);
                  const existingMinIds = Array.isArray(m.ministries)
                    ? m.ministries
                        .map((x: any) => Number(x.ministryId || x.ministry?.id || x.id))
                        .filter(Boolean)
                    : [];
                  setMemForm({
                    firstName: m.firstName || '',
                    lastName: m.lastName || '',
                    phone: m.phone || '',
                    email: m.email || '',
                    type: m.type || 'GrowingFriend',
                    ageGroup: m.ageGroup || 'Adult',
                    status: m.status || 'active',
                    ministryIds: existingMinIds,
                  });
                  setAddMemberOpen(true);
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallEditBtn, { backgroundColor: '#fef2f2' }]}
                onPress={() =>
                  setDeleteTarget({
                    type: 'member',
                    id: m.id,
                    name: `${m.firstName} ${m.lastName}`,
                  })
                }
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>Archive</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add/Edit Member Modal */}
        <Modal visible={addMemberOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <ScrollView
              style={{ maxHeight: '88%', width: '100%' }}
              contentContainerStyle={styles.modalCard}
            >
              <Text style={styles.modalTitle}>
                {editMember ? '✏️ Edit Member' : '➕ Add New Member'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="First Name"
                value={memForm.firstName}
                onChangeText={(t) => setMemForm((p) => ({ ...p, firstName: t }))}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Last Name"
                value={memForm.lastName}
                onChangeText={(t) => setMemForm((p) => ({ ...p, lastName: t }))}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Phone (09...)"
                value={memForm.phone}
                onChangeText={(t) => setMemForm((p) => ({ ...p, phone: t }))}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                value={memForm.email}
                onChangeText={(t) => setMemForm((p) => ({ ...p, email: t }))}
              />

              {/* Type Selector */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Member Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['FamilyMember', 'GrowingFriend', 'NewFriend'].map((tp) => (
                  <TouchableOpacity
                    key={tp}
                    style={[
                      styles.filterChip,
                      memForm.type === tp && styles.filterChipActive,
                    ]}
                    onPress={() => setMemForm((p) => ({ ...p, type: tp }))}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        memForm.type === tp && styles.filterChipTextActive,
                      ]}
                    >
                      {tp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age Group Selector */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Age Group
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                {['Adult', 'Youth', 'Kids'].map((ag) => (
                  <TouchableOpacity
                    key={ag}
                    style={[
                      styles.filterChip,
                      memForm.ageGroup === ag && styles.filterChipActive,
                    ]}
                    onPress={() => setMemForm((p) => ({ ...p, ageGroup: ag }))}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        memForm.ageGroup === ag && styles.filterChipTextActive,
                      ]}
                    >
                      {ag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Ministries Assignment */}
              {allMinistries.length > 0 && (
                <>
                  <Text
                    style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}
                  >
                    Ministries ({memForm.ministryIds.length} selected)
                  </Text>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}
                  >
                    {allMinistries.map((min: any) => {
                      const selected = memForm.ministryIds.includes(min.id);
                      return (
                        <TouchableOpacity
                          key={min.id}
                          style={[styles.filterChip, selected && styles.filterChipActive]}
                          onPress={() =>
                            setMemForm((p) => ({
                              ...p,
                              ministryIds: selected
                                ? p.ministryIds.filter((id) => id !== min.id)
                                : [...p.ministryIds, min.id],
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              selected && styles.filterChipTextActive,
                            ]}
                          >
                            {min.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {editMember && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#fef3c7',
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                  onPress={() =>
                    handleResetPassword(
                      editMember.id,
                      `${editMember.firstName} ${editMember.lastName}`
                    )
                  }
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#92400e' }}>
                    🔑 Reset Password & Send via SMS
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.outlineBtn, { flex: 1, alignItems: 'center' }]}
                  onPress={() => {
                    setAddMemberOpen(false);
                    setEditMember(null);
                  }}
                >
                  <Text style={styles.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, alignItems: 'center' }]}
                  onPress={saveMember}
                >
                  <Text style={styles.primaryBtnText}>Save Member</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  // ── 3. REVIEW PENDING VIEW (app/admin/review/AdminReviewClient.tsx) ────────
  const renderReviewView = () => {
    const pendingList: any[] = data.pending || data.pendingMembers || [];
    const ministryRequests: any[] = data.ministryRequests || [];
    const reviewHistory: any[] = data.reviewHistory || [];

    const handleDecision = async (
      memberId: number,
      decision: 'approve' | 'reject' | 'revert' | 'cancel'
    ) => {
      try {
        const actionMap = {
          approve: 'approve_member',
          reject: 'reject_member',
          revert: 'revert_member',
          cancel: 'cancel_member',
        };
        await client.post('/admin', {
          action: actionMap[decision],
          memberId,
        });
        fetchPageData('review');
      } catch {
        // Silent
      }
    };

    const handleMinistryRequestDecision = async (
      memberMinistryId: number,
      decision: 'approve' | 'reject'
    ) => {
      try {
        await client.post('/admin', {
          action: decision === 'approve' ? 'approve_ministry_req' : 'reject_ministry_req',
          id: memberMinistryId,
          memberMinistryId,
        });
        fetchPageData('review');
      } catch {
        // Silent
      }
    };

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 58, paddingBottom: 110 }}
      >
        <Text style={styles.dashTitle}>
          ⏳ Review Pending ({pendingList.length + ministryRequests.length})
        </Text>
        <Text style={[styles.dashSub, { marginBottom: 14 }]}>
          Approve or reject registrations and ministry join requests
        </Text>

        {/* 3 Review Sub-Tabs */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
          {[
            { key: 'registrations', label: `📝 Registrations (${pendingList.length})` },
            { key: 'ministries', label: `⛪ Ministries (${ministryRequests.length})` },
            { key: 'history', label: `📜 History (${reviewHistory.length})` },
          ].map((tb) => (
            <TouchableOpacity
              key={tb.key}
              style={[
                styles.filterChip,
                reviewTab === tb.key && styles.filterChipActive,
              ]}
              onPress={() => setReviewTab(tb.key as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  reviewTab === tb.key && styles.filterChipTextActive,
                ]}
              >
                {tb.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {reviewTab === 'registrations' && (
          <>
            {pendingList.length === 0 ? (
              <View style={[styles.whiteCard, { alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ fontSize: 40, marginBottom: 8 }}>🎉</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                  All Caught Up!
                </Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  There are no pending registrations waiting for review.
                </Text>
              </View>
            ) : (
              pendingList.map((m) => (
                <View key={m.id} style={styles.whiteCard}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                    {m.firstName} {m.lastName}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                    📞 {m.phone || 'No phone'} · ✉️ {m.email || 'No email'}
                  </Text>
                  {m.invitedBy ? (
                    <Text style={{ fontSize: 12, color: '#0284c7', marginTop: 4 }}>
                      🤝 Invited by: {m.invitedBy}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: '#10b981', flex: 1, alignItems: 'center' },
                      ]}
                      onPress={() => handleDecision(m.id, 'approve')}
                    >
                      <Text style={styles.primaryBtnText}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: '#ef4444', flex: 1, alignItems: 'center' },
                      ]}
                      onPress={() => handleDecision(m.id, 'reject')}
                    >
                      <Text style={styles.primaryBtnText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {reviewTab === 'ministries' && (
          <>
            {ministryRequests.length === 0 ? (
              <View style={[styles.whiteCard, { alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>⛪</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                  No Pending Ministry Requests
                </Text>
              </View>
            ) : (
              ministryRequests.map((req: any) => (
                <View key={req.id} style={styles.whiteCard}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                    {req.member?.firstName} {req.member?.lastName}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#0284c7', fontWeight: '700', marginTop: 2 }}>
                    Wants to join: {req.ministry?.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: '#10b981', flex: 1, alignItems: 'center' },
                      ]}
                      onPress={() => handleMinistryRequestDecision(req.id, 'approve')}
                    >
                      <Text style={styles.primaryBtnText}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: '#ef4444', flex: 1, alignItems: 'center' },
                      ]}
                      onPress={() => handleMinistryRequestDecision(req.id, 'reject')}
                    >
                      <Text style={styles.primaryBtnText}>✕ Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {reviewTab === 'history' && (
          <>
            {reviewHistory.map((h: any) => (
              <View key={h.id} style={styles.whiteCard}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>
                      {h.firstName} {h.lastName}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                      Status: {h.status} · 📞 {h.phone || 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.smallEditBtn}
                    onPress={() => handleDecision(h.id, 'revert')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>
                      ↩️ Revert to Pending
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  // ── 4. EVENTS ADMIN VIEW (app/admin/events/AdminEventsClient.tsx) ──────────
  const renderEventsView = () => {
    const eventsList: any[] = data.events || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    const shownEvents = eventsList.filter((e) =>
      evTab === 'upcoming'
        ? String(e.eventDate).slice(0, 10) >= todayStr
        : String(e.eventDate).slice(0, 10) < todayStr
    );

    const handlePickEventCover = async () => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setUploadingCover(true);
      try {
        const fd = new FormData();
        fd.append('photos', {
          uri: asset.uri,
          name: asset.fileName || `event_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as any);
        const res = await client.post('/posts/upload?folder=events', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const uploadedPath = res.data?.paths?.[0] || res.data?.filenames?.[0] || '';
        const filenameOnly = uploadedPath.split('/').pop() || uploadedPath;
        if (filenameOnly) {
          setEvForm((p) => ({ ...p, coverPhoto: filenameOnly }));
        }
      } catch {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Upload Failed',
          message: 'Could not upload event cover photo.',
        });
      } finally {
        setUploadingCover(false);
      }
    };

    const openEventAnalytics = async (ev: any) => {
      setAnalyticsEvent(ev);
      setAnalyticsData(null);
      setLoadingAnalytics(true);
      try {
        const res = await client.get(`/admin?page=event-analytics&eventId=${ev.id}`);
        setAnalyticsData(res.data?.data || res.data);
      } catch {
        // Silent
      } finally {
        setLoadingAnalytics(false);
      }
    };

    const saveEvent = async () => {
      if (!evForm.title.trim()) {
        setAlertModal({
          visible: true,
          type: 'warning',
          title: 'Title Required',
          message: 'Please enter an event title.',
        });
        return;
      }
      try {
        await client.post('/admin', {
          action: editEvent ? 'update_event' : 'create_event',
          eventId: editEvent?.id,
          id: editEvent?.id,
          ...evForm,
        });
        setAddEventOpen(false);
        setEditEvent(null);
        fetchPageData('events');
      } catch (err: any) {
        setAlertModal({
          visible: true,
          type: 'error',
          title: 'Save Failed',
          message: err?.response?.data?.error || 'Could not save event.',
        });
      }
    };

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 58, paddingBottom: 110 }}
      >
        <View style={styles.dashHeaderRow}>
          <View>
            <Text style={styles.dashTitle}>📅 Events Management</Text>
            <Text style={styles.dashSub}>Create services, events, and sermon resources</Text>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setEditEvent(null);
              setEvForm({
                title: '',
                description: '',
                eventDate: new Date().toISOString().slice(0, 10),
                startTime: '09:00',
                endTime: '11:30',
                location: "Bro's Cafe, 2nd Floor, Gen. Luna St., Davao City",
                eventType: 'sunday_service',
                speaker: '',
                coverPhoto: '',
              });
              setAddEventOpen(true);
            }}
          >
            <Text style={styles.primaryBtnText}>+ Add Event</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {(['upcoming', 'past'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, evTab === t && styles.filterChipActive]}
              onPress={() => setEvTab(t)}
            >
              <Text style={[styles.filterChipText, evTab === t && styles.filterChipTextActive]}>
                {t === 'upcoming' ? '📅 Upcoming Events' : '🗂️ Past Events'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {shownEvents.map((ev) => {
          const attCount = ev._count?.attendance ?? ev._count?.attendances ?? 0;
          return (
            <View key={ev.id} style={styles.whiteCard}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>{ev.title}</Text>
              <Text style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                📅{' '}
                {new Date(ev.eventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                · 👥 {attCount} attending
                {ev.speaker ? ` · 🎙️ ${ev.speaker}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.smallEditBtn, { backgroundColor: '#f0f9ff' }]}
                  onPress={() => openEventAnalytics(ev)}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>
                    📊 Attendance ({attCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.smallEditBtn}
                  onPress={() => {
                    setEditEvent(ev);
                    setEvForm({
                      title: ev.title || '',
                      description: ev.description || '',
                      eventDate: ev.eventDate ? String(ev.eventDate).slice(0, 10) : '',
                      startTime: '09:00',
                      endTime: '11:30',
                      location: ev.location || '',
                      eventType: ev.eventType || ev.type || 'sunday_service',
                      speaker: ev.speaker || '',
                      coverPhoto: ev.coverPhoto || '',
                    });
                    setAddEventOpen(true);
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY }}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallEditBtn, { backgroundColor: '#fef2f2' }]}
                  onPress={() => setDeleteTarget({ type: 'event', id: ev.id, name: ev.title })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>
                    🗑️ Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Add/Edit Event Modal */}
        <Modal visible={addEventOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <ScrollView
              style={{ maxHeight: '90%', width: '100%' }}
              contentContainerStyle={styles.modalCard}
            >
              <Text style={styles.modalTitle}>
                {editEvent ? '✏️ Edit Event' : '📅 Add New Event'}
              </Text>

              {/* Event Type Pills */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Event Type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.filterChip,
                      evForm.eventType === opt.key && styles.filterChipActive,
                    ]}
                    onPress={() => setEvForm((p) => ({ ...p, eventType: opt.key }))}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        evForm.eventType === opt.key && styles.filterChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.modalInput}
                placeholder="Event Title"
                value={evForm.title}
                onChangeText={(t) => setEvForm((p) => ({ ...p, title: t }))}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.modalInput, { flex: 1.2 }]}
                  placeholder="Date (YYYY-MM-DD)"
                  value={evForm.eventDate}
                  onChangeText={(t) => setEvForm((p) => ({ ...p, eventDate: t }))}
                />
                <TextInput
                  style={[styles.modalInput, { flex: 0.9 }]}
                  placeholder="Start (09:00)"
                  value={evForm.startTime}
                  onChangeText={(t) => setEvForm((p) => ({ ...p, startTime: t }))}
                />
                <TextInput
                  style={[styles.modalInput, { flex: 0.9 }]}
                  placeholder="End (11:30)"
                  value={evForm.endTime}
                  onChangeText={(t) => setEvForm((p) => ({ ...p, endTime: t }))}
                />
              </View>

              {/* Speaker + 1-Tap Primary Speaker Pills */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                Speaker (Tap quick-select or type below)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {PRIMARY_SPEAKERS.map((sp) => (
                  <TouchableOpacity
                    key={sp.value}
                    style={[
                      styles.filterChip,
                      evForm.speaker === sp.value && styles.filterChipActive,
                    ]}
                    onPress={() => setEvForm((p) => ({ ...p, speaker: sp.value }))}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        evForm.speaker === sp.value && styles.filterChipTextActive,
                      ]}
                    >
                      🎙️ {sp.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.modalInput}
                placeholder="Speaker Name (optional)"
                value={evForm.speaker}
                onChangeText={(t) => setEvForm((p) => ({ ...p, speaker: t }))}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Location"
                value={evForm.location}
                onChangeText={(t) => setEvForm((p) => ({ ...p, location: t }))}
              />

              {/* Cover Photo Upload */}
              <View style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: PRIMARY,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: '#f0f9ff',
                  }}
                  onPress={handlePickEventCover}
                  disabled={uploadingCover}
                >
                  {uploadingCover ? (
                    <ActivityIndicator color={PRIMARY} size="small" />
                  ) : (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284c7' }}>
                      🖼️ {evForm.coverPhoto ? 'Change Cover Photo' : 'Upload Cover Photo'}
                    </Text>
                  )}
                </TouchableOpacity>
                {evForm.coverPhoto ? (
                  <Image
                    source={{
                      uri: evForm.coverPhoto.startsWith('http')
                        ? evForm.coverPhoto
                        : `https://connect.houseofgrace.ph/uploads/events/${evForm.coverPhoto}`,
                    }}
                    style={{
                      width: '100%',
                      height: 120,
                      borderRadius: 10,
                      marginTop: 8,
                      backgroundColor: '#0f172a',
                    }}
                    resizeMode="contain"
                  />
                ) : null}
              </View>

              <TextInput
                style={[styles.modalInput, { minHeight: 68 }]}
                placeholder="Description"
                multiline
                value={evForm.description}
                onChangeText={(t) => setEvForm((p) => ({ ...p, description: t }))}
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.outlineBtn, { flex: 1, alignItems: 'center' }]}
                  onPress={() => {
                    setAddEventOpen(false);
                    setEditEvent(null);
                  }}
                >
                  <Text style={styles.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { flex: 1, alignItems: 'center' }]}
                  onPress={saveEvent}
                >
                  <Text style={styles.primaryBtnText}>Save Event</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Event Attendance Analytics Modal */}
        <Modal
          visible={Boolean(analyticsEvent)}
          transparent
          animationType="fade"
          onRequestClose={() => setAnalyticsEvent(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxHeight: '85%' }]}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={styles.modalTitle} numberOfLines={1}>
                  📊 {analyticsEvent?.title}
                </Text>
                <TouchableOpacity onPress={() => setAnalyticsEvent(null)}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#64748b' }}>✕</Text>
                </TouchableOpacity>
              </View>

              {loadingAnalytics ? (
                <ActivityIndicator color={PRIMARY} style={{ marginVertical: 30 }} />
              ) : analyticsData ? (
                <ScrollView>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#f0f9ff',
                        padding: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0284c7' }}>
                        {analyticsData.totalAttended ?? analyticsData.attendees?.length ?? 0}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700' }}>
                        Checked In
                      </Text>
                    </View>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#ecfdf5',
                        padding: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#059669' }}>
                        {analyticsData.firstTimersCount ?? 0}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700' }}>
                        First Timers
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '800',
                      color: '#0f172a',
                      marginBottom: 8,
                    }}
                  >
                    ✅ Attendees ({(analyticsData.attendees || []).length})
                  </Text>
                  {(analyticsData.attendees || []).map((att: any, idx: number) => {
                    const m = att.member || att;
                    return (
                      <View
                        key={m.id || idx}
                        style={{
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: '#f1f5f9',
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1e293b' }}>
                          {m.firstName} {m.lastName}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          {m.ageGroup || 'Adult'}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 20 }}>
                  No attendance records found.
                </Text>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Global Web TopHeader */}
      <TopHeader />

      {/* Main Content Area with Floating ☰ Menu Button (1:1 replica of AdminSidebar.tsx) */}
      <View style={{ flex: 1, position: 'relative' }}>
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          activeOpacity={0.85}
          onPress={() => setSidebarOpen(true)}
        >
          <Text style={styles.floatingMenuText}>☰ Menu</Text>
          {pendingCount > 0 && (
            <View style={styles.floatingBadge}>
              <Text style={styles.floatingBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {activePage === 'dashboard' && renderDashboardView()}
            {activePage === 'members' && renderMembersView()}
            {activePage === 'review' && renderReviewView()}
            {activePage === 'events' && renderEventsView()}
            {activePage === 'lifegroup' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <LifeGroupView
                  data={data}
                  onRefresh={() => fetchPageData('lifegroup')}
                  onNavigate={navigatePage}
                />
              </ScrollView>
            )}
            {activePage === 'testimonies' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <TestimoniesView data={data} onRefresh={() => fetchPageData('testimonies')} />
              </ScrollView>
            )}
            {activePage === 'ministries' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <MinistriesView data={data} onRefresh={() => fetchPageData('ministries')} />
              </ScrollView>
            )}
            {activePage === 'send-sms' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <SendSmsView data={data} onRefresh={() => fetchPageData('send-sms')} />
              </ScrollView>
            )}
            {activePage === 'sms' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <SmsLogsView data={data} onRefresh={() => fetchPageData('sms')} />
              </ScrollView>
            )}
            {activePage === 'stewardshop' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <StewardShopAdminView
                  data={data}
                  onRefresh={() => fetchPageData('stewardshop')}
                />
              </ScrollView>
            )}
            {activePage === 'church-settings' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <ChurchSettingsView
                  data={data}
                  onRefresh={() => fetchPageData('church-settings')}
                />
              </ScrollView>
            )}
            {activePage === 'users' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <UsersRolesView data={data} onRefresh={() => fetchPageData('users')} />
              </ScrollView>
            )}
            {activePage === 'birthdays' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <BirthdaysAdminView data={data} onRefresh={() => fetchPageData('birthdays')} />
              </ScrollView>
            )}
            {activePage === 'multimedia' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <MultimediaAdminView
                  data={data}
                  onRefresh={() => fetchPageData('multimedia')}
                />
              </ScrollView>
            )}
            {activePage === 'quiz-admin' && (
              <ScrollView contentContainerStyle={{ paddingTop: 48, paddingBottom: 110 }}>
                <QuizAdminView data={data} onRefresh={() => fetchPageData('quiz-admin')} />
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* BottomDock */}
      <View
        style={[
          styles.dockBar,
          { height: 58 + Math.max(insets.bottom, 6), paddingBottom: Math.max(insets.bottom, 6) },
        ]}
      >
        <TouchableOpacity style={styles.dockItem} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.dockEmoji}>🏠</Text>
          <Text style={styles.dockLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockItem} onPress={() => router.push('/(tabs)/prayer')}>
          <Text style={styles.dockEmoji}>🙏</Text>
          <Text style={styles.dockLabel}>Prayer Wall</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockItem} onPress={() => router.push('/create-post')}>
          <View style={styles.dockFab}>
            <Text style={{ fontSize: 22 }}>✍️</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dockItem}
          onPress={() => router.push('/(tabs)/stewardshop')}
        >
          <Text style={styles.dockEmoji}>🤝</Text>
          <Text style={styles.dockLabel}>StewardShop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockItem} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.dockEmoji}>👤</Text>
          <Text style={styles.dockLabel}>Me</Text>
        </TouchableOpacity>
      </View>

      {/* ── AdminSidebar Slide-Over Drawer (1:1 replica of components/layout/AdminSidebar.tsx) ── */}
      <Modal
        visible={sidebarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSidebarOpen(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={[styles.sidebarDrawer, { paddingTop: Math.max(insets.top, 20) }]}>
            {/* Brand Logo Header */}
            <View style={styles.sidebarBrandRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.sidebarLogoCircle}>
                  <Image source={HGF_LOGO} style={{ width: 32, height: 32 }} resizeMode="contain" />
                </View>
                <View>
                  <Text style={styles.sidebarBrandTitle}>House of Grace</Text>
                  <Text style={styles.sidebarBrandSub}>Connect System</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSidebarOpen(false)} style={{ padding: 6 }}>
                <Text style={{ color: '#94a3b8', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Navigation Items */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 10, paddingVertical: 12 }}>
              <Text style={styles.sidebarSectionLabel}>NAVIGATION</Text>
              {NAV_ITEMS.map((item) => {
                const isActive = activePage === item.page;
                return (
                  <TouchableOpacity
                    key={item.page}
                    style={[
                      styles.sidebarNavItem,
                      isActive && styles.sidebarNavItemActive,
                    ]}
                    onPress={() => navigatePage(item.page)}
                  >
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text
                      style={[
                        styles.sidebarNavText,
                        isActive && styles.sidebarNavTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge && pendingCount > 0 ? (
                      <View style={styles.sidebarBadge}>
                        <Text style={styles.sidebarBadgeText}>{pendingCount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              <View style={styles.sidebarDivider} />

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  setSidebarOpen(false);
                  router.push('/attendance-kiosk' as any);
                }}
              >
                <Text style={{ fontSize: 16 }}>📟</Text>
                <Text style={styles.sidebarNavText}>Attendance Kiosk</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* User Info + Sign Out Footer */}
            <View style={[styles.sidebarFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sidebarUserBox}>
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={{ color: PRIMARY, fontSize: 11, textTransform: 'capitalize' }}>
                  {user?.role || 'Admin'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sidebarSignOutBtn}
                onPress={async () => {
                  setSidebarOpen(false);
                  await logout();
                  router.replace('/login');
                }}
              >
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>🚪 Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
        </View>
      </Modal>

      {/* Confirm Delete / Archive Modal */}
      <ConfirmModal
        visible={deleteTarget !== null}
        title={deleteTarget?.type === 'member' ? 'Archive Member' : 'Delete Event'}
        message={`Are you sure you want to ${
          deleteTarget?.type === 'member' ? 'archive' : 'delete'
        } "${deleteTarget?.name}"?`}
        confirmText={deleteTarget?.type === 'member' ? 'Archive' : 'Delete'}
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          const target = deleteTarget;
          setDeleteTarget(null);
          await client
            .post('/admin', {
              action: target.type === 'member' ? 'delete_member' : 'delete_event',
              memberId: target.id,
              eventId: target.id,
            })
            .catch(() => {});
          fetchPageData(activePage);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      <AlertPromptModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  floatingMenuBtn: {
    position: 'absolute',
    top: 12,
    left: 14,
    zIndex: 40,
    backgroundColor: SIDEBAR_BG,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  floatingMenuText: { color: '#ffffff', fontSize: 13.5, fontWeight: '700' },
  floatingBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  floatingBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
  dashHeaderRow: { marginBottom: 16 },
  dashTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  dashSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  primaryBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  outlineBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  outlineBtnText: { color: '#1e293b', fontSize: 13, fontWeight: '600' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  kpiLabel: { fontSize: 11.5, fontWeight: '600', color: '#64748b' },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginVertical: 4 },
  kpiSub: { fontSize: 11, color: '#94a3b8' },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickCardLabel: { flex: 1, fontSize: 12.5, fontWeight: '600', color: '#1e293b' },
  quickBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  quickBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  whiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardLink: { fontSize: 12.5, fontWeight: '600', color: PRIMARY },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  eventDateBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e8f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMonthText: { fontSize: 10, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase' },
  eventDayText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  eventTitleText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  eventSubText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  celebrantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  celebrantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  celebrantInitials: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  celebrantName: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#0f172a' },
  celebrantDate: { fontSize: 12, color: '#94a3b8' },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13.5,
    backgroundColor: '#f8fafc',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#ffffff' },
  memberRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  smallEditBtn: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarDrawer: {
    width: 265,
    backgroundColor: SIDEBAR_BG,
    height: '100%',
  },
  sidebarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sidebarLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBrandTitle: { color: '#ffffff', fontSize: 13.5, fontWeight: '700' },
  sidebarBrandSub: { color: PRIMARY, fontSize: 11, fontWeight: '600' },
  sidebarSectionLabel: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  sidebarNavItemActive: {
    backgroundColor: PRIMARY,
    borderLeftColor: '#7dd3fc',
  },
  sidebarNavText: { flex: 1, color: '#94a3b8', fontSize: 13.5, fontWeight: '500' },
  sidebarNavTextActive: { color: '#ffffff', fontWeight: '700' },
  sidebarBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  sidebarBadgeText: { color: '#ffffff', fontSize: 10.5, fontWeight: '700' },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  sidebarFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  sidebarUserBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  sidebarSignOutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  dockBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dockEmoji: { fontSize: 19 },
  dockLabel: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 2 },
  dockFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
