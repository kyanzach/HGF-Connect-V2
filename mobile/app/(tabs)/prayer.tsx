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
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface PrayerItem {
  id: number;
  request: string;
  isAnswered: boolean;
  prayerCount: number;
  createdAt: string;
  author: {
    id: number;
    name: string;
    avatar?: string | null;
  };
  responses: {
    id: number;
    message: string;
    authorName: string;
  }[];
}

export default function PrayerScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [filter, setFilter] = useState<'active' | 'answered' | 'mine'>('active');
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [noteTarget, setNoteTarget] = useState<PrayerItem | null>(null);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertModal({ visible: true, type, title, message });
  };

  const loadPrayers = useCallback(async () => {
    try {
      const res = await client.get(`/prayer?filter=${filter}`);
      if (res.data?.success) {
        setPrayers(res.data.data?.prayers || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadPrayers();
  }, [loadPrayers]);

  const handlePray = async (item: PrayerItem) => {
    if (!user) {
      router.push('/login' as any);
      return;
    }
    try {
      const res = await client.post('/prayer', {
        action: 'pray',
        prayerId: item.id,
      });
      if (res.data?.success) {
        const nextCount = res.data.data?.prayerCount ?? item.prayerCount + 1;
        setPrayers((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, prayerCount: nextCount } : p))
        );
      }
    } catch {
      showAlert('error', 'Action Failed', 'Unable to record prayer right now.');
    }
  };

  const handleSendNote = async () => {
    if (!noteTarget || !noteText.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await client.post('/prayer', {
        action: 'pray',
        prayerId: noteTarget.id,
        message: noteText.trim(),
      });
      if (res.data?.success) {
        setNoteText('');
        setNoteTarget(null);
        loadPrayers();
        showAlert('success', 'Prayer Note Sent', 'Your encouragement has been shared.');
      }
    } catch {
      showAlert('error', 'Action Failed', 'Unable to post prayer note right now.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleMarkAnswered = async (item: PrayerItem) => {
    try {
      const res = await client.post('/prayer', {
        action: 'mark_answered',
        prayerId: item.id,
      });
      if (res.data?.success) {
        loadPrayers();
        showAlert('success', 'Praise God!', 'Marked as an Answered Prayer.');
      }
    } catch {
      showAlert('error', 'Action Failed', 'Unable to update prayer status.');
    }
  };

  const handleSubmitPrayer = async () => {
    if (!user) {
      setComposeOpen(false);
      router.push('/login' as any);
      return;
    }
    if (!requestText.trim()) {
      showAlert('warning', 'Missing Request', 'Please enter your prayer request.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await client.post('/prayer', {
        action: 'create',
        request: requestText.trim(),
      });
      if (res.data?.success) {
        setRequestText('');
        setComposeOpen(false);
        loadPrayers();
        showAlert('success', 'Prayer Shared', 'Your church family can now pray with you.');
      }
    } catch {
      showAlert('error', 'Submission Failed', 'Could not post your prayer request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportPrayer = async (item: PrayerItem) => {
    try {
      await client.post('/moderation', {
        action: 'report',
        targetType: 'prayer',
        targetId: item.id,
        reason: 'Reported from Prayer Wall',
      });
    } catch {
      // ignore
    }
    showAlert(
      'success',
      'Prayer Reported',
      'Thank you. Our moderation team reviews all flagged items within 24 hours.'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.filterRow}>
          {(['active', 'answered', 'mine'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
              onPress={() => setFilter(tab)}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.filterText, filter === tab && styles.filterTextActive]}
              >
                {tab === 'active'
                  ? 'Active'
                  : tab === 'answered'
                  ? 'Answered'
                  : 'My Prayers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.newPrayerBtn}
          onPress={() => {
            if (!user) {
              router.push('/login' as any);
            } else {
              setComposeOpen(true);
            }
          }}
        >
          <FontAwesome name="plus" size={12} color="#ffffff" />
          <Text numberOfLines={1} style={styles.newPrayerBtnText}>
            Ask Prayer
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4EB1CB" />
        </View>
      ) : (
        <FlatList
          data={prayers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPrayers();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <FontAwesome name="heart-o" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No prayer requests found</Text>
              <Text style={styles.emptySub}>Share a prayer request so the church can pray with you.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  {item.author.avatar ? (
                    <Image source={{ uri: item.author.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarInitial}>
                      {(item.author.name?.[0] || 'M').toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{item.author.name}</Text>
                  <Text style={styles.dateText}>
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                {item.isAnswered ? (
                  <View style={styles.answeredBadge}>
                    <Text style={styles.answeredBadgeText}>Praise / Answered</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={{ padding: 6 }}
                  onPress={() => handleReportPrayer(item)}
                >
                  <FontAwesome name="flag-o" size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.requestBody}>{item.request}</Text>

              {item.responses && item.responses.length > 0 ? (
                <View style={styles.responsesBox}>
                  {item.responses.slice(0, 2).map((r) => (
                    <Text key={r.id} style={styles.responseLine}>
                      <Text style={{ fontWeight: '700' }}>{r.authorName}: </Text>
                      {r.message}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.prayBtn}
                  onPress={() => handlePray(item)}
                  activeOpacity={0.85}
                >
                  <FontAwesome name="heart" size={13} color="#ffffff" />
                  <Text numberOfLines={1} adjustsFontSizeToFit style={styles.prayBtnText}>
                    I Prayed ({item.prayerCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.noteBtn}
                  onPress={() => {
                    if (!user) {
                      router.push('/login' as any);
                    } else {
                      setNoteTarget(item);
                    }
                  }}
                >
                  <FontAwesome name="comment-o" size={13} color="#0e7490" />
                  <Text numberOfLines={1} style={styles.noteBtnText}>
                    Encourage
                  </Text>
                </TouchableOpacity>

                {user && item.author.id === user.id && !item.isAnswered ? (
                  <TouchableOpacity
                    style={styles.markAnsweredBtn}
                    onPress={() => handleMarkAnswered(item)}
                  >
                    <FontAwesome name="check" size={12} color="#15803d" />
                    <Text numberOfLines={1} style={styles.markAnsweredText}>
                      Answered
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={composeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ask for Prayer</Text>
              <TouchableOpacity onPress={() => setComposeOpen(false)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="How can your House of Grace family pray for you today?"
              placeholderTextColor="#94a3b8"
              multiline
              value={requestText}
              onChangeText={setRequestText}
            />
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmitPrayer}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.submitBtnText}>
                  Share Prayer Request
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={noteTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteTarget(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pray &amp; Encourage</Text>
              <TouchableOpacity onPress={() => setNoteTarget(null)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={`Write a short prayer or encouragement for ${noteTarget?.author.name || 'this member'}...`}
              placeholderTextColor="#94a3b8"
              multiline
              value={noteText}
              onChangeText={setNoteText}
            />
            <TouchableOpacity
              style={[styles.submitBtn, submittingNote && { opacity: 0.7 }]}
              onPress={handleSendNote}
              disabled={submittingNote}
            >
              {submittingNote ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text numberOfLines={1} style={styles.submitBtnText}>
                  Send Prayer Note
                </Text>
              )}
            </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  filterPillActive: {
    backgroundColor: '#0f2d3d',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  newPrayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4EB1CB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  newPrayerBtnText: {
    fontSize: 12,
    fontWeight: '800',
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 38,
    height: 38,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0e7490',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  answeredBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  answeredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  requestBody: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 12,
  },
  responsesBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 4,
  },
  responseLine: {
    fontSize: 12,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  noteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e0f7fb',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  noteBtnText: {
    color: '#0e7490',
    fontSize: 12,
    fontWeight: '800',
  },
  markAnsweredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dcfce7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  markAnsweredText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '800',
  },
  prayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4EB1CB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  prayBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  input: {
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
