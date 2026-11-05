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
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import client from '@/api/client';

interface EventItem {
  id: number;
  title: string;
  description: string;
  eventDate: string | null;
  location: string;
  eventType: string;
  status: string;
  speaker?: string | null;
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
  const [tab, setTab] = useState<'upcoming' | 'birthdays' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [past, setPast] = useState<EventItem[]>([]);
  const [celebrants, setCelebrants] = useState<CelebrantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
            <View style={styles.center}>
              <FontAwesome name="calendar-o" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No events scheduled</Text>
              <Text style={styles.emptySub}>
                Upcoming church gatherings and services will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.eventCard}>
              <View style={styles.eventDateBox}>
                <FontAwesome name="calendar" size={16} color="#0e7490" />
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
                    : 'Scheduled'}
                </Text>
                <Text style={styles.eventLoc}>{item.location}</Text>
                {item.description ? (
                  <Text numberOfLines={2} style={styles.eventDesc}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
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
    height: 36,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
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
  center: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
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
    color: '#cbd5e1',
    marginTop: 3,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0e7490',
  },
  celebrantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  celebrantDate: {
    fontSize: 12,
    color: '#64748b',
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dayBadgeText: {
    fontSize: 11,
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
  eventDateBox: {
    width: 42,
    height: 42,
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
    fontWeight: '700',
    color: '#0e7490',
    marginTop: 2,
  },
  eventLoc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  eventDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
    lineHeight: 17,
  },
});
