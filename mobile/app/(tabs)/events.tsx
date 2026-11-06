import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface EventItem {
  id: number;
  title: string;
  description: string;
  commentary?: string | null;
  eventDate: string | null;
  location: string;
  eventType: string;
  status: string;
  speaker?: string | null;
  attendeeCount?: number;
  isCheckedIn?: boolean;
}

interface CelebrantItem {
  id: number;
  name: string;
  birthDay: number;
  birthMonth: number;
  avatar?: string | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<'upcoming' | 'birthdays' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [past, setPast] = useState<EventItem[]>([]);
  const [celebrants, setCelebrants] = useState<CelebrantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const loadData = useCallback(async () => {
    try {
      const res = await client.get('/events');
      if (res.data?.success) {
        setUpcoming(res.data.data?.upcomingEvents || []);
        setPast(res.data.data?.pastEvents || []);
        setCelebrants(res.data.data?.celebrants || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRsvp = async (item: EventItem) => {
    if (!user) {
      router.push('/login' as any);
      return;
    }
    try {
      const res = await client.post('/events', { eventId: item.id });
      if (res.data?.success) {
        setAlertModal({
          visible: true,
          type: 'success',
          title: 'RSVP Confirmed',
          message: res.data.message || 'Your attendance is recorded!',
        });
        loadData();
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Check-In Failed',
        message: err.response?.data?.message || 'Could not record RSVP.',
      });
    }
  };

  const currentMonthName = MONTHS[new Date().getMonth()];

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabPill, tab === 'upcoming' && styles.tabPillActive]}
          onPress={() => setTab('upcoming')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabText, tab === 'upcoming' && styles.tabTextActive]}
          >
            Upcoming ({upcoming.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, tab === 'birthdays' && styles.tabPillActive]}
          onPress={() => setTab('birthdays')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabText, tab === 'birthdays' && styles.tabTextActive]}
          >
            Birthdays ({celebrants.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabPill, tab === 'past' && styles.tabPillActive]}
          onPress={() => setTab('past')}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.tabText, tab === 'past' && styles.tabTextActive]}
          >
            Past Services
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4EB1CB" />
        </View>
      ) : tab === 'birthdays' ? (
        <FlatList
          data={celebrants}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListHeaderComponent={
            <View style={styles.bannerCard}>
              <Text style={styles.bannerTitle}>{currentMonthName} Celebrants</Text>
              <Text style={styles.bannerSub}>
                Celebrating our active &amp; approved church family members!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.celebrantCard}>
              <View style={styles.avatar}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {(item.name?.[0] || 'M').toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.celebrantName}>{item.name}</Text>
                <Text style={styles.celebrantDate}>
                  {currentMonthName} {item.birthDay}
                </Text>
              </View>
              <View style={styles.dayBadge}>
                <FontAwesome name="birthday-cake" size={13} color="#0e7490" />
                <Text style={styles.dayBadgeText}>Day {item.birthDay}</Text>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={tab === 'upcoming' ? upcoming : past}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <FontAwesome name="calendar-o" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {tab === 'upcoming'
                  ? 'No scheduled upcoming events'
                  : 'No past events found'}
              </Text>
              <Text style={styles.emptySub}>
                Join us every Sunday for Worship Service at House of Grace Fellowship!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
              onPress={() => setSelectedEvent(item)}
              activeOpacity={0.9}
            >
              <View style={styles.eventIconBox}>
                <FontAwesome name="calendar" size={18} color="#0e7490" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMeta}>
                  {item.eventDate
                    ? new Date(item.eventDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Date TBA'}{' '}
                  &bull; {item.location}
                </Text>
                {item.speaker ? (
                  <Text style={styles.speakerText}>Speaker: {item.speaker}</Text>
                ) : null}
                {item.description ? (
                  <Text numberOfLines={2} style={styles.eventDesc}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.eventFooterRow}>
                  <TouchableOpacity
                    style={[
                      styles.rsvpBtn,
                      item.isCheckedIn && { backgroundColor: '#dcfce7' },
                    ]}
                    onPress={() => handleRsvp(item)}
                  >
                    <FontAwesome
                      name={item.isCheckedIn ? 'check-circle' : 'calendar-check-o'}
                      size={13}
                      color={item.isCheckedIn ? '#15803d' : '#0e7490'}
                    />
                    <Text
                      style={[
                        styles.rsvpBtnText,
                        item.isCheckedIn && { color: '#15803d' },
                      ]}
                    >
                      {item.isCheckedIn ? 'Checked In' : 'RSVP / Check In'}
                    </Text>
                  </TouchableOpacity>

                  {item.commentary ? (
                    <View style={styles.notesPill}>
                      <FontAwesome name="file-text-o" size={11} color="#475569" />
                      <Text style={styles.notesPillText}>Sermon Notes</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Event Details & Sermon Commentary Modal */}
      <Modal
        visible={selectedEvent !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text numberOfLines={2} style={styles.modalTitle}>
                {selectedEvent?.title}
              </Text>
              <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedEvent ? (
              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.eventMeta}>
                  {selectedEvent.eventDate
                    ? new Date(selectedEvent.eventDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : ''}{' '}
                  &bull; {selectedEvent.location}
                </Text>
                {selectedEvent.speaker ? (
                  <Text style={[styles.speakerText, { marginTop: 6 }]}>
                    Speaker: {selectedEvent.speaker}
                  </Text>
                ) : null}
                {selectedEvent.description ? (
                  <Text style={[styles.eventDesc, { marginTop: 10 }]}>
                    {selectedEvent.description}
                  </Text>
                ) : null}
                {selectedEvent.commentary ? (
                  <View style={styles.commentaryBox}>
                    <Text style={styles.commentaryTitle}>Sermon Reflection &amp; Notes</Text>
                    <Text style={styles.commentaryBody}>{selectedEvent.commentary}</Text>
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: '#0f2d3d',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCard: {
    backgroundColor: '#0f2d3d',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  celebrantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 42,
    height: 42,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0e7490',
  },
  celebrantName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  celebrantDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0e7490',
  },
  eventCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  eventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  eventMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  speakerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0e7490',
    marginTop: 4,
  },
  eventDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  eventFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  rsvpBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0e7490',
  },
  notesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  notesPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  commentaryBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 14,
  },
  commentaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0e7490',
    marginBottom: 6,
  },
  commentaryBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
});
