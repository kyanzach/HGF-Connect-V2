import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  AppState,
} from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import client, { API_BASE } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { SkeletonPrayerLoading } from '@/components/ui/SkeletonPulse';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';
import VoicePrayerPlayer from '@/components/ui/VoicePrayerPlayer';

const PRIMARY = '#4EB1CB';
const ACCENT_DARK = '#0284c7';
const MAX_PRAYER_NOTE_LEN = 500;
const MAX_VOICE_SECONDS = 60;

interface PrayerResponseItem {
  id: number;
  message?: string | null;
  prayer?: string | null;
  audioUrl?: string | null;
  createdAt: string;
  authorId?: number;
  authorName?: string;
  authorAvatar?: string | null;
  author?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
  member?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
}

interface PrayerPhotoItem {
  id?: number;
  photoPath: string;
  sortOrder?: number;
}

interface PrayerItem {
  id: number;
  request: string;
  isAnswered: boolean;
  answeredNote?: string | null;
  prayCount: number;
  prayerCount?: number;
  hasPrayed?: boolean;
  responseCount?: number;
  responses?: PrayerResponseItem[];
  photos?: PrayerPhotoItem[];
  createdAt: string;
  author?: {
    id: number;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string | null;
    profilePicture?: string | null;
  };
  member?: {
    id: number;
    firstName: string;
    lastName: string;
    profilePicture?: string | null;
  };
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'just now';
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

function getPhotoUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `https://connect.houseofgrace.ph${path}`;
  return `https://connect.houseofgrace.ph/uploads/posts/${path}`;
}

export default function PrayerWallScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    mine?: string;
    highlight?: string;
    pray?: string;
  }>();

  const rawMine = Array.isArray(params.mine) ? params.mine[0] : params.mine;
  const rawHighlight = Array.isArray(params.highlight) ? params.highlight[0] : params.highlight;
  const rawPray = Array.isArray(params.pray) ? params.pray[0] : params.pray;

  const [mineOnly, setMineOnly] = useState(rawMine === 'true');
  const pathname = usePathname();
  const isFocused = pathname.includes('prayer');
  const [tab, setTab] = useState<'active' | 'answered'>('active');
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const prayerListRef = useRef<FlatList<PrayerItem>>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  // Inline Owner Edit & Delete State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<PrayerItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pray Commit Modal (matches web PrayCommitModal)
  const [prayModal, setPrayModal] = useState<PrayerItem | null>(null);
  const [prayNote, setPrayNote] = useState('');
  const [praying, setPraying] = useState(false);
  const [prayModalError, setPrayModalError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Inline Expandable Prayer Responses State
  const [expandedPrayerIds, setExpandedPrayerIds] = useState<Record<number, boolean>>({});
  const [inlineResponsesMap, setInlineResponsesMap] = useState<Record<number, PrayerResponseItem[]>>({});
  const [inlineLoadingMap, setInlineLoadingMap] = useState<Record<number, boolean>>({});
  const [inlineNoteMap, setInlineNoteMap] = useState<Record<number, string>>({});
  const [inlineSubmittingMap, setInlineSubmittingMap] = useState<Record<number, boolean>>({});

  // Prayer Detail Modal ("🙏 Who's Praying" — app/(app)/prayer/[id]/page.tsx)
  const [detailItem, setDetailItem] = useState<PrayerItem | null>(null);
  const [detailResponses, setDetailResponses] = useState<PrayerResponseItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const hasAutoOpenedPray = useRef<string | null>(null);

  useEffect(() => {
    setMineOnly(rawMine === 'true');
  }, [rawMine]);

  const expandedPrayerIdsRef = useRef<Record<number, boolean>>({});
  expandedPrayerIdsRef.current = expandedPrayerIds;

  const fetchPrayers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const endpoint = `/prayer?filter=${tab}${mineOnly ? '&mine=true' : ''}`;
        const { data } = await client.get(endpoint);
        const payload = data?.data || data;
        const list = payload?.prayers || payload?.requests || [];
        setPrayers(
          list.map((p: any) => ({
            ...p,
            prayCount: p.prayCount ?? p.prayerCount ?? 0,
            responseCount: p.responseCount ?? p._count?.responses ?? p.responses?.length ?? 0,
          }))
        );

        // Also silently refresh any currently expanded inline prayer threads
        if (silent) {
          const openIds = Object.keys(expandedPrayerIdsRef.current)
            .filter((k) => expandedPrayerIdsRef.current[Number(k)])
            .map(Number);
          for (const pid of openIds) {
            client
              .get(`/prayer?id=${pid}`)
              .then(({ data: d }) => {
                const pl = d?.data || d;
                const respList = pl?.prayer?.responses || pl?.responses;
                if (Array.isArray(respList)) {
                  setInlineResponsesMap((prev) => ({ ...prev, [pid]: respList }));
                }
              })
              .catch(() => {});
          }
        }
      } catch {
        // Keep cached
      } finally {
        if (!silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, mineOnly]
  );

  useEffect(() => {
    fetchPrayers(false);
  }, [fetchPrayers]);

  useEffect(() => {
    if (!isFocused) return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        fetchPrayers(true);
      }
    }, 4500);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        fetchPrayers(true);
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [isFocused, fetchPrayers]);

  // Deep-link: ?highlight=ID
  useEffect(() => {
    if (rawHighlight) {
      const hId = Number(rawHighlight);
      if (!isNaN(hId)) {
        setHighlightedId(hId);
        const timer = setTimeout(() => setHighlightedId(null), 6000);
        return () => clearTimeout(timer);
      }
    }
  }, [rawHighlight]);

  // Deep-link: ?pray=ID
  useEffect(() => {
    if (rawPray && hasAutoOpenedPray.current !== rawPray && !loading) {
      const pId = Number(rawPray);
      if (!isNaN(pId)) {
        hasAutoOpenedPray.current = rawPray;
        const found = prayers.find((p) => Number(p.id) === pId);
        if (found) {
          setPrayModal(found);
        } else {
          client
            .get(`/prayer?id=${pId}`)
            .then((res) => {
              const p = res.data?.data?.prayer || res.data?.prayer;
              if (p) {
                setPrayModal({
                  ...p,
                  prayCount: p.prayCount ?? p.prayerCount ?? 0,
                });
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [rawPray, prayers, loading]);

  const openPrayerDetail = async (item: PrayerItem) => {
    const isCurrentlyOpen = Boolean(expandedPrayerIds[item.id]);
    setExpandedPrayerIds((prev) => ({ ...prev, [item.id]: !isCurrentlyOpen }));
    if (isCurrentlyOpen) return;

    if (item.responses && item.responses.length > 0) {
      setInlineResponsesMap((prev) => ({ ...prev, [item.id]: item.responses || [] }));
    }
    setInlineLoadingMap((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data } = await client.get(`/prayer?id=${item.id}`);
      const payload = data?.data || data;
      const fullPrayer = payload?.prayer;
      const list = fullPrayer?.responses || payload?.responses || item.responses || [];
      setInlineResponsesMap((prev) => ({ ...prev, [item.id]: list }));
    } catch {
      // fallback
    } finally {
      setInlineLoadingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const stopVoiceRecording = useCallback(async () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    try {
      await audioRecorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (audioRecorder.uri) {
        setRecordedUri(audioRecorder.uri);
      }
    } catch {
      // ignore stop errors
    } finally {
      setIsRecording(false);
    }
  }, [audioRecorder]);

  const startVoiceRecording = useCallback(async () => {
    setPrayModalError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setPrayModalError(
          'Microphone permission is required to record a voice prayer. Enable it in Settings.'
        );
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setRecordedUri(null);
      setRecSeconds(0);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      recTimerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s >= MAX_VOICE_SECONDS - 1) {
            stopVoiceRecording();
            return MAX_VOICE_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setIsRecording(false);
      setPrayModalError('Could not start voice recording. Please try again.');
    }
  }, [audioRecorder, stopVoiceRecording]);

  const closePrayModal = useCallback(() => {
    if (praying) return;
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (isRecording) {
      audioRecorder.stop().catch(() => {});
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      setIsRecording(false);
    }
    setPrayModalError(null);
    setRecordedUri(null);
    setRecSeconds(0);
    setPrayModal(null);
  }, [praying, isRecording, audioRecorder]);

  useEffect(() => {
    return () => {
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
        recTimerRef.current = null;
      }
    };
  }, []);

  const handleInlinePrayerReply = async (item: PrayerItem) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const text = (inlineNoteMap[item.id] || '').trim().slice(0, MAX_PRAYER_NOTE_LEN);
    setInlineSubmittingMap((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { data } = await client.post('/prayer', {
        action: 'pray',
        prayerId: item.id,
        message: text || undefined,
      });
      const serverResp = data?.data?.response;
      const optimisticResp: PrayerResponseItem = serverResp || {
        id: Date.now(),
        message: text || '🙏 Prayed',
        createdAt: new Date().toISOString(),
        authorId: Number(user.id),
        authorName: user.fullName || `${user.firstName || 'You'} ${user.lastName || ''}`.trim(),
        authorAvatar: getAvatarUrl(user.profilePicture),
        author: {
          id: Number(user.id),
          firstName: user.firstName || user.fullName?.split(' ')[0] || 'You',
          lastName: user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
          profilePicture: user.profilePicture,
        },
      };
      setInlineResponsesMap((prev) => ({
        ...prev,
        [item.id]: [optimisticResp, ...(prev[item.id] || item.responses || [])],
      }));
      setInlineNoteMap((prev) => ({ ...prev, [item.id]: '' }));
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                prayCount: p.prayCount + 1,
                responseCount: (p.responseCount ?? 0) + 1,
                hasPrayed: true,
              }
            : p
        )
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not send prayer response. Please try again.';
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Prayer Response Failed',
        message: msg,
      });
    } finally {
      setInlineSubmittingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handlePrayCommit = async () => {
    if (!prayModal) return;
    if (!user) {
      closePrayModal();
      router.push('/login');
      return;
    }
    if (isRecording) {
      setPrayModalError('Please stop your voice recording before submitting.');
      return;
    }

    setPraying(true);
    setPrayModalError(null);
    try {
      let uploadedAudioUrl: string | undefined;

      if (recordedUri) {
        const token = await SecureStore.getItemAsync('hgf_token');
        const ext = recordedUri.split('.').pop()?.toLowerCase() || 'm4a';
        const mimeType =
          ext === 'webm'
            ? 'audio/webm'
            : ext === 'ogg'
              ? 'audio/ogg'
              : ext === 'wav'
                ? 'audio/wav'
                : 'audio/mp4';
        const formData = new FormData();
        formData.append('audio', {
          uri: recordedUri,
          name: `prayer_${Date.now()}.${ext}`,
          type: mimeType,
        } as any);

        const uploadUrl = `${API_BASE.replace(/\/api\/mobile\/?$/, '')}/api/prayer/upload-audio`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData?.url) {
          setPrayModalError(uploadData?.error || 'Could not upload voice prayer. Please try again.');
          return;
        }
        uploadedAudioUrl = uploadData.url;
      }

      const { data } = await client.post('/prayer', {
        action: 'pray',
        prayerId: prayModal.id,
        message: prayNote.trim().slice(0, MAX_PRAYER_NOTE_LEN) || undefined,
        audioUrl: uploadedAudioUrl,
      });

      const createdResp = data?.data?.response;
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayModal.id
            ? {
                ...p,
                prayCount: p.prayCount + 1,
                responseCount: (p.responseCount ?? 0) + 1,
                hasPrayed: true,
              }
            : p
        )
      );
      if (createdResp && expandedPrayerIds[prayModal.id]) {
        setInlineResponsesMap((prev) => ({
          ...prev,
          [prayModal.id]: [createdResp, ...(prev[prayModal.id] || [])],
        }));
      }
      if (detailItem && detailItem.id === prayModal.id) {
        if (createdResp) {
          setDetailResponses((prev) => [createdResp, ...prev]);
        }
      }
      setPrayNote('');
      setRecordedUri(null);
      setRecSeconds(0);
      setPrayModalError(null);
      setPrayModal(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Could not submit your prayer. Please check your connection and try again.';
      setPrayModalError(msg);
    } finally {
      setPraying(false);
    }
  };

  const handleToggleAnswered = async (item: PrayerItem) => {
    try {
      await client.post('/prayer', {
        action: 'toggle_answered',
        prayerId: item.id,
        isAnswered: !item.isAnswered,
      });
      setPrayers((prev) => prev.filter((r) => r.id !== item.id));
    } catch {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Could not update prayer status. Please try again.',
      });
    }
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingText.trim()) return;
    setSavingId(id);
    try {
      await client.post('/prayer', {
        action: 'edit',
        prayerId: id,
        request: editingText.trim(),
      });
      setPrayers((prev) =>
        prev.map((r) => (r.id === id ? { ...r, request: editingText.trim() } : r))
      );
      setEditingId(null);
    } catch {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save changes. Please try again.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    setDeleting(true);
    try {
      await client.post('/prayer', {
        action: 'delete',
        prayerId: requestToDelete.id,
      });
      setPrayers((prev) => prev.filter((r) => r.id !== requestToDelete.id));
      setRequestToDelete(null);
    } catch {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not delete prayer request.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const renderHeader = () => (
    <View>
      {/* Hero Header (1:1 with app/(app)/prayer/page.tsx) */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroEmoji}>🙏</Text>
        <Text style={styles.heroTitle}>
          {mineOnly ? 'My Prayer Requests' : 'Prayer Wall'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {mineOnly
            ? 'Manage your personal active and answered prayer requests'
            : 'Stand together in prayer for one another'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
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

          {user && (
            <TouchableOpacity
              style={[
                styles.submitHeroBtn,
                {
                  backgroundColor: mineOnly ? '#ffffff' : 'rgba(255,255,255,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.45)',
                },
              ]}
              onPress={() => setMineOnly((v) => !v)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.submitHeroBtnText,
                  { color: mineOnly ? ACCENT_DARK : '#ffffff' },
                ]}
              >
                {mineOnly ? '← All Prayers' : '👤 My Prayers'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
    const authorId = item.author?.id ?? item.member?.id ?? 0;
    const isMine =
      user !== null &&
      (Number(authorId) === Number(user.id) ||
        user.role === 'admin' ||
        user.role === 'moderator');
    const isEditing = editingId === item.id;
    const isHighlighted = highlightedId === Number(item.id);

    const authorName =
      item.author?.name ||
      (item.author?.firstName
        ? `${item.author.firstName} ${item.author.lastName || ''}`.trim()
        : item.member
        ? `${item.member.firstName} ${item.member.lastName}`
        : 'Church Member');
    const initials = authorName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const avatarUrl = getAvatarUrl(
      item.author?.avatar || item.author?.profilePicture || item.member?.profilePicture
    );
    const respCount = item.responseCount ?? item.responses?.length ?? 0;
    const photos = Array.isArray(item.photos) ? item.photos : [];

    return (
      <View
        style={[
          styles.prayerCard,
          isHighlighted && {
            borderWidth: 2,
            borderColor: PRIMARY,
            backgroundColor: '#f0f9ff',
          },
        ]}
      >
        {item.isAnswered && (
          <View style={styles.answeredBadge}>
            <Text style={styles.answeredBadgeText}>
              ✅ Praise Report — Prayer Answered!
            </Text>
          </View>
        )}

        {/* Author Row */}
        <TouchableOpacity
          style={styles.authorRow}
          activeOpacity={0.8}
          onPress={() => {
            if (authorId) router.push(`/member/${authorId}` as any);
          }}
        >
          <View style={styles.authorAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.authorAvatarImg} />
            ) : (
              <Text style={styles.authorInitials}>{initials}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        {/* Request Text or Inline Editor */}
        {isEditing ? (
          <View style={{ marginBottom: 12 }}>
            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              multiline
              style={[styles.modalTextarea, { marginBottom: 8, borderColor: PRIMARY }]}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleSaveEdit(item.id)}
                disabled={savingId === item.id}
                style={{
                  backgroundColor: PRIMARY,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                  {savingId === item.id ? 'Saving...' : '💾 Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditingId(null)}
                disabled={savingId === item.id}
                style={{
                  backgroundColor: '#f1f5f9',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.requestText}>{item.request}</Text>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 12,
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {photos.map((ph, idx) => {
              const uri = getPhotoUrl(ph.photoPath);
              if (!uri) return null;
              return (
                <TouchableOpacity
                  key={ph.id || idx}
                  activeOpacity={0.9}
                  onPress={() => setLightboxUri(uri)}
                  style={{
                    width: photos.length === 1 ? '100%' : '48%',
                    height: photos.length === 1 ? 190 : 130,
                    borderRadius: 10,
                    overflow: 'hidden',
                    backgroundColor: '#f1f5f9',
                  }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {item.answeredNote ? (
          <View style={styles.answeredNoteBox}>
            <Text style={styles.answeredNoteText}>🙌 {item.answeredNote}</Text>
          </View>
        ) : null}

        {/* Action Row (1:1 with app/(app)/prayer/page.tsx) */}
        <View style={[styles.actionRow, { flexWrap: 'wrap' }]}>
          {isMine ? (
            <>
              <TouchableOpacity
                onPress={() => handleToggleAnswered(item)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderRadius: 99,
                  backgroundColor: item.isAnswered ? '#f1f5f9' : '#f0fdf4',
                  borderWidth: 1,
                  borderColor: item.isAnswered ? '#cbd5e1' : '#bbf7d0',
                }}
              >
                <Text
                  style={{
                    fontSize: 12.5,
                    fontWeight: '700',
                    color: item.isAnswered ? '#475569' : '#16a34a',
                  }}
                >
                  {item.isAnswered ? '🔴 Active' : '🎉 Mark Answered'}
                </Text>
              </TouchableOpacity>

              {!isEditing && (
                <TouchableOpacity
                  onPress={() => {
                    setEditingId(item.id);
                    setEditingText(item.request);
                  }}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 13,
                    borderRadius: 99,
                    backgroundColor: '#fef8e7',
                    borderWidth: 1,
                    borderColor: '#fde68a',
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#d97706' }}>
                    ✏️ Edit
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setRequestToDelete(item)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderRadius: 99,
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#dc2626' }}>
                  🗑️ Delete
                </Text>
              </TouchableOpacity>
            </>
          ) : (
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
              <Text style={styles.prayBtnText}>
                🙏 Pray {item.prayCount > 0 ? `· ${item.prayCount}` : ''}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={{ marginLeft: 'auto' }}
            onPress={() => openPrayerDetail(item)}
          >
            <Text style={styles.responsesLinkText}>
              💬 {respCount} {respCount === 1 ? 'response' : 'responses'}{' '}
              {expandedPrayerIds[item.id] ? '▴' : '▾'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline Expandable Prayer Responses & Encouragement Thread */}
        {expandedPrayerIds[item.id] && (
          <View
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
            }}
          >
            {inlineLoadingMap[item.id] && !(inlineResponsesMap[item.id]?.length) ? (
              <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 10 }} />
            ) : (inlineResponsesMap[item.id] || item.responses || []).length === 0 ? (
              <Text
                style={{
                  fontSize: 12.5,
                  color: '#94a3b8',
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
              >
                No prayer notes yet. Commit to pray and leave an encouraging word!
              </Text>
            ) : (
              <View style={{ gap: 8, marginBottom: 10 }}>
                {(inlineResponsesMap[item.id] || item.responses || []).map((r) => {
                  const rAuthor = r.author || r.member;
                  const rAuthorId = rAuthor?.id || r.authorId;
                  const rName =
                    (rAuthor
                      ? `${rAuthor.firstName || ''} ${rAuthor.lastName || ''}`.trim()
                      : '') ||
                    r.authorName ||
                    'Church Member';
                  const nameParts = rName.split(' ').filter(Boolean);
                  const rInitials =
                    `${nameParts[0]?.[0] || ''}${nameParts[1]?.[0] || ''}`.toUpperCase() || 'P';
                  const rAvatar =
                    getAvatarUrl(rAuthor?.profilePicture) || getAvatarUrl(r.authorAvatar);
                  const rawNote = (r.message || r.prayer || '').trim();
                  const hasCustomNote = Boolean(rawNote && rawNote !== '🙏 Prayed');
                  return (
                    <View
                      key={r.id}
                      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (rAuthorId) {
                            router.push(`/church?tab=member&id=${rAuthorId}` as any);
                          }
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: 'rgba(78,177,203,0.16)',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          marginTop: 2,
                        }}
                      >
                        {rAvatar ? (
                          <Image
                            source={{ uri: rAvatar }}
                            style={{ width: 30, height: 30, borderRadius: 15 }}
                          />
                        ) : (
                          <Text style={{ fontSize: 11, fontWeight: '800', color: PRIMARY }}>
                            {rInitials}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: '#f1f5f9',
                          borderRadius: 14,
                          borderTopLeftRadius: 4,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 2,
                          }}
                        >
                          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#0f172a' }}>
                            {rName}
                          </Text>
                          <Text style={{ fontSize: 10.5, color: '#94a3b8' }}>
                            {timeAgo(r.createdAt)}
                          </Text>
                        </View>
                        {hasCustomNote ? (
                          <Text style={{ fontSize: 13, color: '#1e293b', lineHeight: 18 }}>
                            {rawNote}
                          </Text>
                        ) : !r.audioUrl ? (
                          <Text
                            style={{
                              fontSize: 12,
                              fontStyle: 'italic',
                              color: '#64748b',
                            }}
                          >
                            Committed to pray
                          </Text>
                        ) : null}
                        {r.audioUrl ? <VoicePrayerPlayer uri={r.audioUrl} compact /> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Inline Prayer / Encouragement Input Box */}
            {user ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  paddingLeft: 12,
                  paddingRight: 5,
                  paddingVertical: 4,
                  gap: 6,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: '#0f172a',
                    paddingVertical: 4,
                    maxHeight: 75,
                  }}
                  placeholder="Write a prayer or encouragement..."
                  placeholderTextColor="#94a3b8"
                  value={inlineNoteMap[item.id] || ''}
                  onChangeText={(v) =>
                    setInlineNoteMap((prev) => ({ ...prev, [item.id]: v }))
                  }
                  multiline
                />
                <TouchableOpacity
                  onPress={() => handleInlinePrayerReply(item)}
                  disabled={Boolean(inlineSubmittingMap[item.id])}
                  style={{
                    backgroundColor: PRIMARY,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {inlineSubmittingMap[item.id] ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>
                      🙏 Pray
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && prayers.length === 0 ? (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {renderHeader()}
          <SkeletonPrayerLoading />
        </ScrollView>
      ) : (
        <FlatList
          ref={prayerListRef}
          data={prayers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPrayerCard}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                Keyboard.dismiss();
                setExpandedPrayerIds({});
                setRefreshing(true);
                await fetchPrayers();
                requestAnimationFrame(() => {
                  prayerListRef.current?.scrollToOffset({ offset: 0, animated: false });
                });
              }}
              tintColor={PRIMARY}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🙏</Text>
              <Text style={styles.emptyTitle}>
                {mineOnly
                  ? tab === 'active'
                    ? 'You have no active prayer requests.'
                    : 'You have no answered prayer requests yet.'
                  : tab === 'answered'
                  ? 'No answered prayers yet'
                  : 'No active prayer requests'}
              </Text>
              <Text style={styles.emptySub}>Submit yours above!</Text>
            </View>
          }
        />
      )}

      {/* ── Pray Commit Modal (components/prayer/PrayCommitModal.tsx) ── */}
      <Modal
        visible={Boolean(prayModal)}
        transparent
        animationType="fade"
        onRequestClose={closePrayModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>
                Lift Up{' '}
                {prayModal?.member?.firstName ||
                  prayModal?.author?.firstName ||
                  prayModal?.author?.name?.split(' ')[0] ||
                  'Member'}{' '}
                in Prayer
              </Text>
              <Text style={styles.modalSub}>
                Even a silent prayer counts.
              </Text>

              {/* Full Prayer Request (scrollable, never truncated) */}
              <ScrollView
                style={styles.modalQuoteBox}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <Text style={styles.modalQuoteText}>
                  &ldquo;{prayModal?.request}&rdquo;
                </Text>
              </ScrollView>

              {prayModalError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{prayModalError}</Text>
                </View>
              ) : null}

              <View style={styles.modalLabelRow}>
                <Text style={styles.modalLabel}>Word of encouragement (optional)</Text>
                <Text style={styles.modalCounter}>
                  {prayNote.length}/{MAX_PRAYER_NOTE_LEN}
                </Text>
              </View>
              <TextInput
                style={styles.modalTextarea}
                placeholder="Praying for you, may God give you peace..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={MAX_PRAYER_NOTE_LEN}
                value={prayNote}
                onChangeText={setPrayNote}
              />

              {/* Voice Prayer Recorder */}
              <Text style={[styles.modalLabel, { marginBottom: 6 }]}>
                Voice prayer (optional, max 60s)
              </Text>
              {!recordedUri ? (
                <TouchableOpacity
                  style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]}
                  onPress={isRecording ? stopVoiceRecording : startVoiceRecording}
                  activeOpacity={0.8}
                >
                  <FontAwesome
                    name={isRecording ? 'stop-circle' : 'microphone'}
                    size={15}
                    color={isRecording ? '#dc2626' : '#334155'}
                  />
                  <Text
                    style={[
                      styles.voiceBtnText,
                      isRecording && { color: '#dc2626' },
                    ]}
                    numberOfLines={1}
                  >
                    {isRecording
                      ? `Stop (${recSeconds}s / ${MAX_VOICE_SECONDS}s)`
                      : 'Tap to Record'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.voicePreviewRow}>
                  <View style={{ flex: 1 }}>
                    <VoicePrayerPlayer uri={recordedUri} compact />
                  </View>
                  <TouchableOpacity
                    style={styles.voiceRemoveBtn}
                    onPress={() => {
                      setRecordedUri(null);
                      setRecSeconds(0);
                    }}
                  >
                    <Text style={styles.voiceRemoveText} numberOfLines={1}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.modalBtnRow, { marginTop: 14 }]}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closePrayModal}
                  disabled={praying}
                >
                  <Text style={styles.modalCancelText} numberOfLines={1}>
                    Later
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalCommitBtn,
                    (praying || isRecording) && { opacity: 0.6 },
                  ]}
                  onPress={handlePrayCommit}
                  disabled={praying || isRecording}
                >
                  <Text style={styles.modalCommitText} numberOfLines={1}>
                    {praying ? 'Submitting...' : 'I Prayed'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Prayer Detail Modal ("🙏 Who's Praying" — app/(app)/prayer/[id]/page.tsx) ── */}
      <Modal
        visible={detailItem !== null}
        animationType="fade"
        onRequestClose={() => setDetailItem(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View
            style={{
              backgroundColor: PRIMARY,
              paddingTop: Platform.OS === 'ios' ? 52 : 36,
              paddingBottom: 16,
              paddingHorizontal: 16,
            }}
          >
            <TouchableOpacity onPress={() => setDetailItem(null)}>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5, fontWeight: '600' }}>
                ← Prayer Wall
              </Text>
            </TouchableOpacity>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 6 }}>
              Prayer Request
            </Text>
          </View>

          {detailItem && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
              <View style={[styles.prayerCard, { marginHorizontal: 0, marginBottom: 16 }]}>
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatar}>
                    {getAvatarUrl(
                      detailItem.author?.avatar ||
                        detailItem.author?.profilePicture ||
                        detailItem.member?.profilePicture
                    ) ? (
                      <Image
                        source={{
                          uri: getAvatarUrl(
                            detailItem.author?.avatar ||
                              detailItem.author?.profilePicture ||
                              detailItem.member?.profilePicture
                          )!,
                        }}
                        style={styles.authorAvatarImg}
                      />
                    ) : (
                      <Text style={styles.authorInitials}>🙏</Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.authorName}>
                      {detailItem.author?.name ||
                        `${detailItem.author?.firstName || detailItem.member?.firstName || ''} ${
                          detailItem.author?.lastName || detailItem.member?.lastName || ''
                        }`.trim() ||
                        'Church Member'}
                    </Text>
                    <Text style={styles.timeText}>{timeAgo(detailItem.createdAt)}</Text>
                  </View>
                </View>

                <Text style={[styles.requestText, { fontSize: 15, lineHeight: 24 }]}>
                  {detailItem.request}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.prayBtn, { backgroundColor: PRIMARY, borderColor: PRIMARY }]}
                    onPress={() => {
                      if (!user) {
                        setDetailItem(null);
                        router.push('/login');
                      } else {
                        setPrayModal(detailItem);
                      }
                    }}
                  >
                    <Text style={[styles.prayBtnText, { color: '#ffffff' }]}>
                      🙏 Pray for{' '}
                      {detailItem.author?.firstName ||
                        detailItem.member?.firstName ||
                        detailItem.author?.name?.split(' ')[0] ||
                        'Member'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT_DARK }}>
                    {detailItem.prayCount || 0} praying
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 15, fontWeight: '800', color: '#334155', marginBottom: 12 }}>
                🙏 Who&apos;s Praying ({detailResponses.length})
              </Text>

              {detailLoading ? (
                <ActivityIndicator size="large" color={PRIMARY} style={{ marginVertical: 24 }} />
              ) : detailResponses.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>
                    Be the first to pray for this request!
                  </Text>
                </View>
              ) : (
                detailResponses.map((resp) => {
                  const rAuthor = resp.author || resp.member;
                  const rName =
                    (rAuthor
                      ? `${rAuthor.firstName || ''} ${rAuthor.lastName || ''}`.trim()
                      : '') ||
                    resp.authorName ||
                    'Church Member';
                  const rAvatar =
                    getAvatarUrl(rAuthor?.profilePicture) || getAvatarUrl(resp.authorAvatar);
                  const rawMsg = (resp.message || resp.prayer || '').trim();
                  const hasCustomMsg = Boolean(rawMsg && rawMsg !== '🙏 Prayed');
                  return (
                    <View
                      key={resp.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.authorAvatar, { width: 28, height: 28, borderRadius: 14 }]}>
                          {rAvatar ? (
                            <Image
                              source={{ uri: rAvatar }}
                              style={{ width: 28, height: 28, borderRadius: 14 }}
                            />
                          ) : (
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                              {(rName[0] || 'P').toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <Text style={{ fontWeight: '700', fontSize: 13.5, color: '#1e293b' }}>
                          {rName}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                          {timeAgo(resp.createdAt)}
                        </Text>
                      </View>
                      {hasCustomMsg ? (
                        <Text
                          style={{
                            fontSize: 13.5,
                            color: '#475569',
                            lineHeight: 20,
                            marginTop: 8,
                            paddingLeft: 36,
                          }}
                        >
                          {rawMsg}
                        </Text>
                      ) : !resp.audioUrl ? (
                        <Text
                          style={{
                            fontSize: 12.5,
                            color: ACCENT_DARK,
                            fontStyle: 'italic',
                            marginTop: 6,
                            paddingLeft: 36,
                          }}
                        >
                          Committed to pray
                        </Text>
                      ) : null}
                      {resp.audioUrl ? (
                        <View style={{ paddingLeft: 36, marginTop: 4 }}>
                          <VoicePrayerPlayer uri={resp.audioUrl} />
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Lightbox Modal */}
      <Modal
        visible={lightboxUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxUri(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setLightboxUri(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.92)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={{ width: '94%', height: '75%' }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={requestToDelete !== null}
        title="Delete Prayer Request"
        message="Are you sure you want to permanently delete this prayer request? This action cannot be undone."
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        onCancel={() => setRequestToDelete(null)}
        onConfirm={handleDeleteConfirm}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  listContent: { paddingBottom: 32 },

  heroBanner: {
    backgroundColor: PRIMARY,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 32, marginBottom: 6 },
  heroTitle: { fontSize: 21, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 14,
    textAlign: 'center',
  },
  submitHeroBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 9,
    paddingHorizontal: 20,
  },
  submitHeroBtnText: {
    color: ACCENT_DARK,
    fontWeight: '700',
    fontSize: 13,
  },

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
    borderBottomColor: PRIMARY,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  tabTextActive: {
    color: ACCENT_DARK,
  },

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
    backgroundColor: PRIMARY,
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
    gap: 8,
  },
  prayBtn: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 99,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  prayBtnText: {
    color: ACCENT_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  responsesLinkText: {
    fontSize: 12,
    color: ACCENT_DARK,
    fontWeight: '600',
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4, textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#9ca3af' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalQuoteBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    padding: 12,
    maxHeight: 180,
    marginBottom: 12,
  },
  modalQuoteText: {
    fontSize: 13.5,
    color: '#1e293b',
    lineHeight: 20,
  },
  modalErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  modalErrorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b91c1c',
    lineHeight: 17,
  },
  modalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  modalCounter: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalTextarea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    minHeight: 74,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
  },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  voiceBtnRecording: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  voiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  voicePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceRemoveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  voiceRemoveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
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
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  modalCommitText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
});
