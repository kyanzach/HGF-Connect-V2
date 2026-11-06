import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';

interface DirectoryMember {
  id: number;
  name: string;
  username: string | null;
  role: string;
  type: string;
  favoriteVerse: string | null;
  avatar: string | null;
  ministries: string[];
}

interface MinistryItem {
  id: number;
  name: string;
  description: string;
  memberCount: number;
}

interface LeaderboardEntry {
  id: number;
  name: string;
  avatar: string | null;
  totalScore: number;
  quizzesTaken: number;
}

interface JournalItem {
  id: number;
  title: string;
  content: string;
  verseRef: string | null;
  mood: string;
  createdAt: string;
}

export default function ChurchHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<
    'directory' | 'ministries' | 'quiz' | 'journal' | 'ai'
  >((params.tab as any) || 'directory');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState<DirectoryMember[]>([]);
  const [ministries, setMinistries] = useState<MinistryItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [journals, setJournals] = useState<JournalItem[]>([]);

  const [journalTitle, setJournalTitle] = useState('');
  const [journalVerse, setJournalVerse] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [shareToFeed, setShareToFeed] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Grace and peace! I am Grace AI, your House of Grace Fellowship assistant. Ask me for a Bible verse, daily encouragement, or prayer reflection.',
    },
  ]);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const topPad =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0, 32)
      : Math.max(insets.top, 44);

  const loadHub = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await client.get(`/church?q=${encodeURIComponent(q)}`);
      if (res.data?.success) {
        setDirectory(res.data.data?.directory || []);
        setMinistries(res.data.data?.ministries || []);
        setLeaderboard(res.data.data?.leaderboard || []);
        setJournals(res.data.data?.journals || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  const handleSaveJournal = async () => {
    if (!user) {
      router.push('/login' as any);
      return;
    }
    if (!journalContent.trim()) {
      setAlertModal({
        visible: true,
        type: 'warning',
        title: 'Reflection Required',
        message: 'Please write your devotional or SOAP reflection before saving.',
      });
      return;
    }
    setSavingJournal(true);
    try {
      const res = await client.post('/church', {
        action: 'create_journal',
        title: journalTitle.trim() || 'Daily Devotional',
        verseRef: journalVerse.trim() || null,
        content: journalContent.trim(),
        shareToFeed,
      });
      if (res.data?.success) {
        setJournalTitle('');
        setJournalVerse('');
        setJournalContent('');
        setShareToFeed(false);
        loadHub(search);
        setAlertModal({
          visible: true,
          type: 'success',
          title: 'Devotional Saved',
          message: res.data.message || 'Saved to your Spiritual Journal.',
        });
      }
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: err.response?.data?.message || 'Unable to save journal entry.',
      });
    } finally {
      setSavingJournal(false);
    }
  };

  const sendAiMessage = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    const question = aiPrompt.trim();
    setAiPrompt('');
    setAiMessages((prev) => [...prev, { sender: 'user', text: question }]);
    setAiLoading(true);
    try {
      const res = await client.post('/church', { prompt: question });
      const reply =
        res.data?.data?.reply ||
        'May the Lord bless you and keep you! (Numbers 6:24)';
      setAiMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Remember Proverbs 3:5-6 — Trust in the Lord with all your heart and lean not on your own understanding.',
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)' as any);
            }
          }}
        >
          <FontAwesome name="arrow-left" size={16} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>HGF Church Hub</Text>
          <Text style={styles.headerSub}>
            Directory, Ministries, Quiz, Journal &amp; Grace AI
          </Text>
        </View>
      </View>

      <View style={styles.tabsBar}>
        {[
          { key: 'directory', label: 'Directory', icon: 'users' },
          { key: 'ministries', label: 'Ministries', icon: 'sitemap' },
          { key: 'quiz', label: 'Quiz', icon: 'trophy' },
          { key: 'journal', label: 'Journal', icon: 'book' },
          { key: 'ai', label: 'Grace AI', icon: 'comments-o' },
        ].map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, active && styles.tabPillActive]}
              onPress={() => setActiveTab(t.key as any)}
              activeOpacity={0.85}
            >
              <FontAwesome
                name={t.icon as any}
                size={12}
                color={active ? '#ffffff' : '#475569'}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.tabPillText, active && styles.tabPillTextActive]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'directory' ? (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBox}>
            <FontAwesome name="search" size={14} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search church members..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={(txt) => {
                setSearch(txt);
                loadHub(txt);
              }}
            />
          </View>
        </View>
      ) : null}

      {loading && activeTab !== 'ai' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4EB1CB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {activeTab === 'directory' &&
            directory.map((m) => (
              <View key={m.id} style={styles.memberCard}>
                {m.avatar ? (
                  <Image source={{ uri: m.avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{m.name[0]?.toUpperCase() || 'M'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    {m.role !== 'user' ? (
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{m.role}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.memberMeta}>
                    {m.ministries.length > 0
                      ? m.ministries.join(' • ')
                      : 'House of Grace Member'}
                  </Text>
                  {m.favoriteVerse ? (
                    <Text numberOfLines={2} style={styles.verseSnippet}>
                      &ldquo;{m.favoriteVerse}&rdquo;
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}

          {activeTab === 'ministries' &&
            ministries.map((min) => (
              <View key={min.id} style={styles.ministryCard}>
                <View style={styles.ministryIcon}>
                  <FontAwesome name="heart" size={16} color="#0e7490" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName}>{min.name}</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{min.memberCount} members</Text>
                    </View>
                  </View>
                  <Text style={styles.ministryDesc}>{min.description}</Text>
                </View>
              </View>
            ))}

          {activeTab === 'quiz' && (
            <>
              <View style={styles.quizBanner}>
                <Text style={styles.quizBannerTitle}>Quiz for Christ Leaderboard</Text>
                <Text style={styles.quizBannerSub}>
                  Weekly sermon reflection rankings across active &amp; approved members.
                </Text>
              </View>
              {leaderboard.map((entry, idx) => (
                <View key={entry.id} style={styles.memberCard}>
                  <View
                    style={[
                      styles.rankCircle,
                      idx === 0 && { backgroundColor: '#f59e0b' },
                      idx === 1 && { backgroundColor: '#64748b' },
                      idx === 2 && { backgroundColor: '#b45309' },
                    ]}
                  >
                    <Text style={styles.rankText}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{entry.name}</Text>
                    <Text style={styles.memberMeta}>
                      {entry.quizzesTaken} sermon quizzes completed
                    </Text>
                  </View>
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{entry.totalScore} pts</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {activeTab === 'journal' && (
            <View>
              <View style={styles.journalComposer}>
                <Text style={styles.journalCardTitle}>New SOAP Devotional</Text>
                <TextInput
                  style={styles.journalInput}
                  placeholder="Title (e.g. Walking by Faith)"
                  placeholderTextColor="#94a3b8"
                  value={journalTitle}
                  onChangeText={setJournalTitle}
                />
                <TextInput
                  style={styles.journalInput}
                  placeholder="Scripture Reference (e.g. Proverbs 3:5-6)"
                  placeholderTextColor="#94a3b8"
                  value={journalVerse}
                  onChangeText={setJournalVerse}
                />
                <TextInput
                  style={[styles.journalInput, { height: 90, textAlignVertical: 'top' }]}
                  placeholder="Write your Scripture observation, application, and prayer..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={journalContent}
                  onChangeText={setJournalContent}
                />

                <TouchableOpacity
                  style={styles.shareToggleRow}
                  onPress={() => setShareToFeed((v) => !v)}
                >
                  <View style={[styles.checkbox, shareToFeed && styles.checkboxActive]}>
                    {shareToFeed ? (
                      <FontAwesome name="check" size={11} color="#ffffff" />
                    ) : null}
                  </View>
                  <Text style={styles.shareToggleText}>
                    Also share this devotional to the Community Feed
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveJournalBtn, savingJournal && { opacity: 0.7 }]}
                  onPress={handleSaveJournal}
                  disabled={savingJournal}
                >
                  <Text numberOfLines={1} style={styles.saveJournalBtnText}>
                    {savingJournal ? 'Saving...' : 'Save Devotional'}
                  </Text>
                </TouchableOpacity>
              </View>

              {journals.map((j) => (
                <View key={j.id} style={styles.ministryCard}>
                  <View style={styles.ministryIcon}>
                    <FontAwesome name="book" size={16} color="#0e7490" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{j.title}</Text>
                    {j.verseRef ? (
                      <Text style={[styles.memberMeta, { color: '#0e7490', fontWeight: '700' }]}>
                        {j.verseRef}
                      </Text>
                    ) : null}
                    <Text style={styles.ministryDesc}>{j.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'ai' && (
            <View style={styles.aiContainer}>
              {aiMessages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.chatBubble,
                    msg.sender === 'user' ? styles.chatUser : styles.chatAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatText,
                      msg.sender === 'user' ? { color: '#ffffff' } : { color: '#0f172a' },
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
              {aiLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#4EB1CB"
                  style={{ marginVertical: 10 }}
                />
              ) : null}

              <View style={styles.aiInputRow}>
                <TextInput
                  style={styles.aiInput}
                  placeholder="Ask Grace AI for a verse or prayer..."
                  placeholderTextColor="#94a3b8"
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                />
                <TouchableOpacity
                  style={styles.aiSendBtn}
                  onPress={sendAiMessage}
                  disabled={aiLoading}
                >
                  <FontAwesome name="send" size={15} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
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
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0f2d3d',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 12,
    color: '#4EB1CB',
    fontWeight: '600',
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  tabPillActive: {
    backgroundColor: '#0e7490',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabPillTextActive: {
    color: '#ffffff',
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0e7490',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  roleTag: {
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0e7490',
    textTransform: 'capitalize',
  },
  memberMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  verseSnippet: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#334155',
    marginTop: 4,
  },
  ministryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  ministryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  ministryDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  quizBanner: {
    backgroundColor: '#0f2d3d',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  quizBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  quizBannerSub: {
    fontSize: 12,
    color: '#bae6fd',
    marginTop: 4,
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0e7490',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  scoreBadge: {
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0e7490',
  },
  journalComposer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  journalCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  journalInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  shareToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4EB1CB',
    borderColor: '#4EB1CB',
  },
  shareToggleText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  saveJournalBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveJournalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  aiContainer: {
    gap: 10,
  },
  chatBubble: {
    padding: 14,
    borderRadius: 16,
    maxWidth: '88%',
  },
  chatAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#0e7490',
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  aiInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0f172a',
  },
  aiSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
