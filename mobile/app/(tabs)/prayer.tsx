import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface PrayerResponseItem {
  id: number;
  prayer?: string | null;
  createdAt: string;
  member: { id: number; firstName: string; lastName: string };
}

interface PrayerItem {
  id: number;
  request: string;
  isAnswered: boolean;
  answeredNote?: string | null;
  prayCount: number;
  hasPrayed?: boolean;
  responseCount?: number;
  responses?: PrayerResponseItem[];
  createdAt: string;
  author?: {
    id: number;
    name: string;
    avatar?: string | null;
  };
  member?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getAvatarUrl(pic?: string | null): string | null {
  if (!pic) return null;
  if (pic.startsWith('http')) return pic;
  if (pic.startsWith('/uploads/')) return `https://connect.houseofgrace.ph${pic}`;
  return `https://connect.houseofgrace.ph/uploads/profile_pictures/${pic}`;
}

export default function PrayerWallScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState<'active' | 'answered'>('active');
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pray Commit Modal (matches web prayModal)
  const [prayModal, setPrayModal] = useState<PrayerItem | null>(null);
  const [prayNote, setPrayNote] = useState('');
  const [praying, setPraying] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const fetchPrayers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/prayer?filter=${tab}`);
      const payload = data?.data || data;
      if (payload?.prayers) {
        setPrayers(
          payload.prayers.map((p: any) => ({
            ...p,
            prayCount: p.prayCount ?? p.prayerCount ?? 0,
          }))
        );
      }
    } catch {
      // Keep cached
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchPrayers();
  }, [fetchPrayers]);

  const handlePrayCommit = async () => {
    if (!prayModal) return;
    if (!user) {
      setPrayModal(null);
      router.push('/login');
      return;
    }

    setPraying(true);
    try {
      await client.post('/prayer', {
        action: 'pray',
        prayerId: prayModal.id,
        message: prayNote.trim() || undefined,
      });
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayModal.id
            ? {
                ...p,
                prayCount: p.prayCount + (p.hasPrayed ? 0 : 1),
                hasPrayed: true,
              }
            : p
        )
      );
      setPrayModal(null);
      setPrayNote('');
    } catch {
      fetchPrayers();
      setPrayModal(null);
    } finally {
      setPraying(false);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Hero Header (app/(app)/prayer/page.tsx) */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroEmoji}>🙏</Text>
        <Text style={styles.heroTitle}>Prayer Wall</Text>
        <Text style={styles.heroSubtitle}>Stand together in prayer for one another</Text>
        <TouchableOpacity
          style={styles.submitHeroBtn}
          onPress={() => {
            if (!user) {
              router.push('/login');
            } else {
              router.push('/create-post?tab=prayer' as any);
            }
          }}
          activeOpacity={0.88}
        >
          <Text style={styles.submitHeroBtnText}>+ Submit Prayer Request</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs: 🔴 Active | ✅ Answered */}
      <View style={styles.tabsBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'active' && styles.tabItemActive]}
          onPress={() => setTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextActive]}>
            🔴 Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'answered' && styles.tabItemActive]}
          onPress={() => setTab('answered')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'answered' && styles.tabTextActive]}>
            ✅ Answered
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrayerCard = ({ item }: { item: PrayerItem }) => {
    const authorName =
      item.author?.name ||
      (item.member ? `${item.member.firstName} ${item.member.lastName}` : 'Church Member');
    const initials = authorName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const avatarUrl = getAvatarUrl(item.author?.avatar || item.member?.profilePicture);
    const respCount = item.responseCount ?? item.responses?.length ?? 0;

    return (
      <View style={styles.prayerCard}>
        {item.isAnswered && (
          <View style={styles.answeredBadge}>
            <Text style={styles.answeredBadgeText}>
              ✅ Praise Report — Prayer Answered!
            </Text>
          </View>
        )}

        {/* Author Row */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.authorAvatarImg} />
            ) : (
              <Text style={styles.authorInitials}>{initials}</Text>
            )}
          </View>
          <View>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>

        <Text style={styles.requestText}>{item.request}</Text>

        {item.answeredNote ? (
          <View style={styles.answeredNoteBox}>
            <Text style={styles.answeredNoteText}>🙌 {item.answeredNote}</Text>
          </View>
        ) : null}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.prayBtn}
            onPress={() => {
              if (!user) {
                router.push('/login');
              } else {
                setPrayModal(item);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.prayBtnText}>🙏 Pray · {item.prayCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ marginLeft: 'auto' }}
            onPress={() => setPrayModal(item)}
          >
            <Text style={styles.responsesLinkText}>💬 {respCount} responses →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && prayers.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#a855f7" />
          </View>
        </View>
      ) : (
        <FlatList
          data={prayers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPrayerCard}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPrayers();
              }}
              tintColor="#a855f7"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🙏</Text>
              <Text style={styles.emptyTitle}>
                {tab === 'answered' ? 'No answered prayers yet' : 'No active prayer requests'}
              </Text>
              <Text style={styles.emptySub}>Submit yours above!</Text>
            </View>
          }
        />
      )}

      {/* Pray Commit Modal (app/(app)/prayer/page.tsx) */}
      <Modal
        visible={Boolean(prayModal)}
        transparent
        animationType="slide"
        onRequestClose={() => setPrayModal(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              🙏 Pray for{' '}
              {prayModal?.member?.firstName ||
                prayModal?.author?.name?.split(' ')[0] ||
                'Member'}
            </Text>
            <View style={styles.modalQuoteBox}>
              <Text style={styles.modalQuoteText} numberOfLines={4}>
                “{prayModal?.request}”
              </Text>
            </View>
            <TextInput
              style={styles.modalTextarea}
              placeholder="Write a short prayer or encouragement (optional)…"
              placeholderTextColor="#9ca3af"
              multiline
              value={prayNote}
              onChangeText={setPrayNote}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPrayModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCommitBtn}
                onPress={handlePrayCommit}
                disabled={praying}
              >
                <Text style={styles.modalCommitText}>
                  {praying ? 'Committing…' : '🙏 Commit to Pray'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  listContent: { paddingBottom: 32 },

  // Hero Header (app/(app)/prayer/page.tsx)
  heroBanner: {
    backgroundColor: '#8b5cf6',
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 32, marginBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 16,
    textAlign: 'center',
  },
  submitHeroBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  submitHeroBtnText: {
    color: '#7c3aed',
    fontWeight: '700',
    fontSize: 13.5,
  },

  // Tabs Bar
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#a855f7',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#a855f7',
  },

  // Prayer Card
  prayerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  answeredBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  answeredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#a855f7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  authorAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorInitials: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  authorName: {
    fontWeight: '700',
    fontSize: 13.5,
    color: '#111827',
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  requestText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  answeredNoteBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  answeredNoteText: {
    fontSize: 12.5,
    color: '#15803d',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayBtn: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    borderRadius: 99,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  prayBtnText: {
    color: '#7c3aed',
    fontSize: 13,
    fontWeight: '700',
  },
  responsesLinkText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },

  // Empty & Modal
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#9ca3af' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 6,
  },
  modalQuoteBox: {
    backgroundColor: '#f5f3ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  modalQuoteText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
  modalTextarea: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  modalCommitBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 99,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
  },
  modalCommitText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
