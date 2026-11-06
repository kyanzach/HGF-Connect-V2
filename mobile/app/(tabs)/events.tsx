import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface EventItem {
  id: number;
  title: string;
  description?: string | null;
  eventType: string;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  coverPhoto?: string | null;
  status: string;
  rsvpCount: number;
  myRsvp?: string | null;
}

const EVENT_TYPE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  sunday_service: { label: '⛪ Sunday Service', color: '#4eb1cb', bg: '#e8f7fb' },
  prayer_meeting: { label: '🙏 Prayer Meeting', color: '#7c3aed', bg: '#f3e8ff' },
  bible_study: { label: '📖 Bible Study', color: '#059669', bg: '#ecfdf5' },
  special_event: { label: '✨ Special Event', color: '#d97706', bg: '#fffbeb' },
  grace_night: { label: '🌙 Grace Night', color: '#2563eb', bg: '#eff6ff' },
  other: { label: '📌 Other', color: '#64748b', bg: '#f1f5f9' },
};

const TYPE_FILTERS = [
  { key: 'all', label: 'All Types' },
  { key: 'sunday_service', label: '⛪ Sunday Service' },
  { key: 'prayer_meeting', label: '🙏 Prayer Meeting' },
  { key: 'bible_study', label: '📖 Bible Study' },
  { key: 'special_event', label: '✨ Special Event' },
  { key: 'grace_night', label: '🌙 Grace Night' },
];

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await client.get('/events');
      const payload = data?.data || data;
      const upList = (payload?.upcomingEvents || []).map((e: any) => ({
        ...e,
        rsvpCount: e.rsvpCount ?? e.attendeeCount ?? 0,
        myRsvp: e.isCheckedIn ? 'going' : null,
      }));
      const pastList = (payload?.pastEvents || []).map((e: any) => ({
        ...e,
        rsvpCount: e.rsvpCount ?? e.attendeeCount ?? 0,
        myRsvp: e.isCheckedIn ? 'going' : null,
      }));
      setEvents([...upList, ...pastList]);
    } catch {
      // Keep cached
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRsvp = async (event: EventItem) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const nextStatus = event.myRsvp === 'going' ? 'not_going' : 'going';
    setEvents((prev) =>
      prev.map((e) =>
        e.id === event.id
          ? {
              ...e,
              myRsvp: nextStatus,
              rsvpCount: Math.max(0, e.rsvpCount + (nextStatus === 'going' ? 1 : -1)),
            }
          : e
      )
    );

    try {
      await client.post(`/events/${event.id}/rsvp`, { status: nextStatus });
    } catch {
      fetchEvents();
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter((e) => e.eventDate.slice(0, 10) >= todayStr);
  const pastEvents = events.filter((e) => e.eventDate.slice(0, 10) < todayStr);

  const filteredPast = pastEvents.filter((ev) => {
    if (typeFilter !== 'all' && ev.eventType !== typeFilter) return false;
    if (
      search.trim() &&
      !ev.title.toLowerCase().includes(search.toLowerCase()) &&
      !(ev.location || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const displayList = tab === 'upcoming' ? upcomingEvents : filteredPast;

  const renderHeader = () => (
    <View>
      {/* Hero Banner (app/(public)/events/EventsClient.tsx) */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroTitle}>Events</Text>
        <Text style={styles.heroSubtitle}>Join us for worship, fellowship, and growth</Text>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'upcoming' && styles.tabBtnActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text style={[styles.tabBtnText, tab === 'upcoming' && styles.tabBtnTextActive]}>
            📅 Upcoming Events
          </Text>
          <View
            style={[
              styles.tabCountBadge,
              tab === 'upcoming' ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.tabCountText,
                tab === 'upcoming' ? { color: '#4eb1cb' } : { color: '#64748b' },
              ]}
            >
              {upcomingEvents.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'past' && styles.tabBtnActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabBtnText, tab === 'past' && styles.tabBtnTextActive]}>
            📁 Past Events
          </Text>
          <View
            style={[
              styles.tabCountBadge,
              tab === 'past' ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.tabCountText,
                tab === 'past' ? { color: '#4eb1cb' } : { color: '#64748b' },
              ]}
            >
              {pastEvents.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {tab === 'past' && (
        <View style={styles.pastFiltersWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search past events..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingTop: 8 }}
          >
            {TYPE_FILTERS.map((tf) => {
              const active = typeFilter === tf.key;
              return (
                <TouchableOpacity
                  key={tf.key}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setTypeFilter(tf.key)}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {tf.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderEventCard = ({ item }: { item: EventItem }) => {
    const badge = EVENT_TYPE_BADGES[item.eventType] ?? EVENT_TYPE_BADGES.other;
    const d = new Date(item.eventDate);
    const isGoing = item.myRsvp === 'going';

    return (
      <View style={styles.card}>
        {item.coverPhoto ? (
          <Image source={{ uri: item.coverPhoto }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: badge.bg }]}>
            <Text style={{ fontSize: 38 }}>{badge.label.split(' ')[0]}</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>

          <Text style={styles.metaLine}>
            📅{' '}
            {d.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          {item.startTime ? <Text style={styles.metaLine}>🕐 {item.startTime}</Text> : null}
          {item.location ? <Text style={styles.metaLine}>📍 {item.location}</Text> : null}

          <View style={styles.footerRow}>
            <Text style={styles.rsvpCountText}>👥 {item.rsvpCount} attending</Text>
            {tab === 'upcoming' && (
              <TouchableOpacity
                style={[styles.rsvpBtn, isGoing && styles.rsvpBtnActive]}
                onPress={() => handleRsvp(item)}
              >
                <Text style={[styles.rsvpBtnText, isGoing && { color: '#ffffff' }]}>
                  {isGoing ? '✓ Going' : 'RSVP Going'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && events.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4EB1CB" />
          </View>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEventCard}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchEvents();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 44, marginBottom: 10 }}>📅</Text>
              <Text style={styles.emptyTitle}>
                {tab === 'upcoming' ? 'No Upcoming Events' : 'No Past Events Found'}
              </Text>
              <Text style={styles.emptySub}>Check back soon for new events!</Text>
            </View>
          }
        />
      )}

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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  listContent: { paddingBottom: 32 },

  heroBanner: {
    backgroundColor: '#1a4a5e',
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#ffffff', marginBottom: 6 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    marginBottom: 14,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#4eb1cb',
  },
  tabBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  tabCountBadge: {
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  tabCountBadgeActive: {
    backgroundColor: '#ffffff',
  },
  tabCountBadgeInactive: {
    backgroundColor: '#e2e8f0',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '800',
  },

  pastFiltersWrap: {
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13.5,
    color: '#0f172a',
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  typeChipActive: {
    backgroundColor: '#4eb1cb',
    borderColor: '#4eb1cb',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  coverImg: { width: '100%', height: 150 },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: 16 },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  metaLine: { fontSize: 12.5, color: '#64748b', marginBottom: 4 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 8,
  },
  rsvpCountText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  rsvpBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#4eb1cb',
  },
  rsvpBtnActive: {
    backgroundColor: '#4eb1cb',
  },
  rsvpBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4eb1cb',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#94a3b8' },
});
