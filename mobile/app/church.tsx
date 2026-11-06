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
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import client from '@/api/client';
import TopHeader from '@/components/ui/TopHeader';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useAuth } from '@/context/AuthContext';

const PRIMARY = '#4EB1CB';
const HGF_LOGO = require('../assets/images/HGF-icon-v1.0.png');

// ── Directory Helpers (exact replica of app/(public)/directory/page.tsx) ────
interface DirectoryMember {
  id: number;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  coverPhoto: string | null;
  type: string;
  ageGroup: string;
  joinDate: string | null;
  birthdate: string | null;
  baptismDate: string | null;
  invitedBy: string | null;
  familyMembers: string | null;
  phone: boolean | string | null;
  address: boolean | string | null;
  favoriteVerse: string | null;
  ministries: { id?: number; ministry?: { name: string }; name?: string }[];
}

function getMinistryNames(m: DirectoryMember): string[] {
  if (!Array.isArray(m.ministries)) return [];
  return m.ministries
    .map((x: any) => (typeof x === 'string' ? x : x?.ministry?.name || x?.name || ''))
    .filter(Boolean);
}

function completenessScore(m: DirectoryMember): number {
  let s = 0;
  if (m.profilePicture) s += 5;
  if (m.coverPhoto) s += 5;
  if (m.birthdate) s += 1;
  if (m.baptismDate) s += 1;
  if (m.invitedBy) s += 1;
  if (m.familyMembers) s += 1;
  if (m.phone) s += 1;
  if (m.address) s += 1;
  if (m.favoriteVerse) s += 1;
  if (m.ageGroup) s += 1;
  if (m.joinDate) s += 1;
  if (getMinistryNames(m).length > 0) s += 1;
  return s;
}

const AGE_META: Record<string, { label: string; bg: string; color: string }> = {
  Adult: { label: '👤 Adult', bg: 'rgba(78,177,203,0.1)', color: PRIMARY },
  Youth: { label: '🌱 Youth', bg: 'rgba(78,177,203,0.1)', color: PRIMARY },
  Kids: { label: '🧒 Kids', bg: 'rgba(78,177,203,0.1)', color: PRIMARY },
};

// ── Resources Helpers (exact replica of app/(public)/resources/ResourcesClient.tsx) ──
interface SlideItem {
  image: string;
  video?: string | null;
  videoType?: string | null;
  page: number;
}

interface EventResource {
  id: number;
  title: string;
  description: string | null;
  eventDate: string;
  coverPhoto: string | null;
  presentationFile: string | null;
  presentationOriginalName: string | null;
  presentationSlides: any;
  speaker: string | null;
  commentary: string | null;
}

function normalizeSlides(rawSlides: any): SlideItem[] {
  if (!rawSlides) return [];
  const arr = Array.isArray(rawSlides) ? rawSlides : [];
  return arr.map((s: any, idx: number) => {
    if (typeof s === 'string') {
      const img = s.startsWith('http')
        ? s
        : `https://connect.houseofgrace.ph${s.startsWith('/') ? s : `/uploads/presentations/slides/${s}`}`;
      return { image: img, video: null, page: idx + 1 };
    }
    const rawImg = s.image || s.url || '';
    const img = rawImg.startsWith('http')
      ? rawImg
      : `https://connect.houseofgrace.ph${rawImg.startsWith('/') ? rawImg : `/uploads/presentations/slides/${rawImg}`}`;
    return {
      image: img,
      video: s.video || null,
      videoType: s.videoType || 'video/mp4',
      page: s.page ?? idx + 1,
    };
  });
}

// ── Grace Blog Helpers (exact replica of app/(app)/journal/page.tsx) ────────
const MOOD_EMOJIS: Record<string, string> = {
  grateful: '🙏',
  peaceful: '☮️',
  hopeful: '🌅',
  struggling: '😔',
  joyful: '😊',
  anxious: '😟',
  reflective: '🤔',
};

const VISIBILITY_LABELS: Record<
  string,
  { label: string; bg: string; color: string; icon: string }
> = {
  PRIVATE: { label: 'Private', bg: '#f1f5f9', color: '#475569', icon: '🔒' },
  MEMBERS_ONLY: { label: 'Members Only', bg: '#e0f2fe', color: '#0369a1', icon: '👥' },
  PUBLIC: { label: 'Public (SEO)', bg: '#e0fdf4', color: '#047857', icon: '🌐' },
};

// ── AI Suggestion Chips (exact replica of app/(app)/ai/page.tsx) ────────────
const SUGGESTION_CHIPS = [
  { emoji: '🙏', text: 'What are the prayer schedules?' },
  { emoji: '📖', text: 'Tell me about cell groups' },
  { emoji: '🎵', text: 'When is praise and worship?' },
  { emoji: '📅', text: 'What events are coming up?' },
  { emoji: '💒', text: 'Sunday service times?' },
  { emoji: '🌱', text: 'How do I join a cell group?' },
  { emoji: '🤝', text: 'How do I volunteer?' },
  { emoji: '📍', text: 'Where is the church located?' },
  { emoji: '💬', text: 'I need prayer support' },
  { emoji: '📢', text: 'Latest church announcements' },
  { emoji: '✝️', text: 'Give me an encouraging verse' },
  { emoji: '🎤', text: 'Tell me about the worship team' },
];

const CHIP_ROWS = [
  SUGGESTION_CHIPS.slice(0, 4),
  SUGGESTION_CHIPS.slice(4, 8),
  SUGGESTION_CHIPS.slice(8, 12),
];

export default function WebReplicaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string; id?: string }>();
  const activePage = params.tab || 'directory';
  const targetMemberId = params.id ? Number(params.id) : null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Public Member Profile State (app/(public)/member/[id]/ProfileClient.tsx) ──
  const [memberProfile, setMemberProfile] = useState<any>(null);
  const [memberPosts, setMemberPosts] = useState<any[]>([]);
  const [memberTab, setMemberTab] = useState<'wall' | 'about' | 'ministries'>('wall');
  const [loadingMember, setLoadingMember] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [memberHasMore, setMemberHasMore] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const [openPostMenuId, setOpenPostMenuId] = useState<number | null>(null);
  const [deletePostConfirmId, setDeletePostConfirmId] = useState<number | null>(null);
  const [reactionPickerPostId, setReactionPickerPostId] = useState<number | null>(null);
  const [reactionsModalPost, setReactionsModalPost] = useState<any | null>(null);
  const [reactionsModalTab, setReactionsModalTab] = useState<'ALL' | 'HEART' | 'PRAY' | 'HUG'>('ALL');
  const [commentModalPost, setCommentModalPost] = useState<any | null>(null);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [profilePhotoSheet, setProfilePhotoSheet] = useState<'profile' | 'cover' | null>(null);

  // ── Directory State (app/(public)/directory/page.tsx) ──
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [ministries, setMinistries] = useState<{ id: number; name: string }[]>([]);
  const [dirSearch, setDirSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [ministryFilter, setMinistryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'complete' | 'az' | 'newest'>('complete');
  const [pickerModal, setPickerModal] = useState<'type' | 'age' | 'sort' | null>(null);

  // ── Resources State (app/(public)/resources/ResourcesClient.tsx) ──
  const [resources, setResources] = useState<EventResource[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [activeSlides, setActiveSlides] = useState<Record<number, number>>({});
  const [lightboxSlide, setLightboxSlide] = useState<string | null>(null);

  // ── Grace Blog / Journal State (app/(app)/journal/page.tsx) ──
  const [journals, setJournals] = useState<any[]>([]);
  const [writingBlog, setWritingBlog] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogVerse, setBlogVerse] = useState('');
  const [blogMood, setBlogMood] = useState('grateful');
  const [blogVisibility, setBlogVisibility] = useState<'PRIVATE' | 'MEMBERS_ONLY' | 'PUBLIC'>('PRIVATE');
  const [savingBlog, setSavingBlog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ── Share Devo State (app/(app)/devo/new/page.tsx) ──
  const [devoStep, setDevoStep] = useState<'capture' | 'preview' | 'compose' | 'done'>('capture');
  const [devoPreviewUri, setDevoPreviewUri] = useState<string | null>(null);
  const [devoAiCaption, setDevoAiCaption] = useState('');
  const [devoVerseRef, setDevoVerseRef] = useState('');
  const [devoVerseText, setDevoVerseText] = useState('');
  const [devoUserCaption, setDevoUserCaption] = useState('');
  const [generatingDevoCaption, setGeneratingDevoCaption] = useState(false);
  const [submittingDevo, setSubmittingDevo] = useState(false);
  const [devoError, setDevoError] = useState('');

  // ── Quiz for Christ State (app/(app)/quiz/page.tsx) ──
  const [quizStatus, setQuizStatus] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [quizSubView, setQuizSubView] = useState<'main' | 'leaderboard'>('main');
  const [quizStudyTab, setQuizStudyTab] = useState<'video' | 'slides'>('slides');
  const [quizSlideIdx, setQuizSlideIdx] = useState(0);
  const [startingCatchup, setStartingCatchup] = useState(false);

  // ── AI Helper State (app/(app)/ai/page.tsx) ──
  const [aiMessages, setAiMessages] = useState<
    { role: 'user' | 'ai'; content: string; createdAt?: string }[]
  >([
    {
      role: 'ai',
      content:
        "Hi there! 👋 I'm your HGF Connect assistant. I can help you with church events, cell groups, ministries, schedules, and more. What would you like to know? 🙏",
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState(20);
  const [showAiHistory, setShowAiHistory] = useState(false);

  // ── StewardShop My Listings / My Shares ──
  const [myListings, setMyListings] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Fetch both /church (mobile API) and /api/members?limit=500 (public web API for full 486 members)
      const [churchRes, webMembersRes, webMinRes, shopRes] = await Promise.all([
        client.get('/church').catch(() => null),
        fetch('https://connect.houseofgrace.ph/api/members?limit=500')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('https://connect.houseofgrace.ph/api/ministries')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        activePage === 'my-listings' || activePage === 'my-shares'
          ? client.get('/stewardshop').catch(() => null)
          : Promise.resolve(null),
      ]);

      const payload = churchRes?.data?.data || churchRes?.data || {};

      if (webMembersRes?.members && Array.isArray(webMembersRes.members)) {
        setMembers(webMembersRes.members);
      } else if (Array.isArray(payload.members)) {
        setMembers(payload.members);
      } else if (Array.isArray(payload.directory)) {
        setMembers(payload.directory);
      }

      if (Array.isArray(webMinRes)) {
        setMinistries(webMinRes);
      } else if (Array.isArray(payload.ministries)) {
        setMinistries(payload.ministries);
      }

      if (Array.isArray(payload.resources)) {
        setResources(payload.resources);
      }
      if (payload.quizStatus) {
        setQuizStatus(payload.quizStatus);
      }
      if (Array.isArray(payload.leaderboard)) {
        setLeaderboard(payload.leaderboard);
      }
      if (Array.isArray(payload.journals)) {
        setJournals(payload.journals);
      }
      const shopPayload = shopRes?.data?.data || shopRes?.data;
      if (shopPayload?.listings && user) {
        setMyListings(
          shopPayload.listings.filter((l: any) => l.seller?.id === user.id)
        );
      }
    } catch {
      // Silent fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePage, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load individual member profile & wall posts when activePage === 'member'
  useEffect(() => {
    if (activePage !== 'member' || !targetMemberId) return;
    let cancelled = false;
    setLoadingMember(true);
    setMemberTab('wall');
    setMemberPage(1);
    setMemberHasMore(false);

    (async () => {
      try {
        const [mobileRes, webMemberRes, webPostsRes] = await Promise.all([
          client.get(`/church?memberId=${targetMemberId}&page=1`).catch(() => null),
          fetch(`https://connect.houseofgrace.ph/api/members/${targetMemberId}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
          fetch(`https://connect.houseofgrace.ph/api/posts?member=${targetMemberId}&page=1`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);
        if (cancelled) return;

        const mData = mobileRes?.data?.data;
        if (mData?.member) {
          setMemberProfile(mData.member);
          setMemberPosts(Array.isArray(mData.posts) ? mData.posts : []);
          setMemberPage(1);
          setMemberHasMore(Boolean(mData.hasMore));
        } else {
          const fallbackFromDir = members.find((x) => Number(x.id) === Number(targetMemberId));
          const resolvedMember = webMemberRes || fallbackFromDir || null;
          if (resolvedMember) {
            setMemberProfile({
              ...resolvedMember,
              isOwn: user ? Number(user.id) === Number(targetMemberId) : false,
              isAdmin: user ? ['admin', 'moderator'].includes(user.role || '') : false,
              ministries: Array.isArray(resolvedMember.ministries)
                ? resolvedMember.ministries.map((mm: any, idx: number) => ({
                    id: mm.id ?? idx,
                    ministry: mm.ministry || { id: idx, name: mm.name || String(mm) },
                    joinedDate: mm.joinedDate || null,
                  }))
                : [],
            });
          }
          if (webPostsRes?.posts && Array.isArray(webPostsRes.posts)) {
            setMemberPosts(webPostsRes.posts);
            setMemberHasMore((webPostsRes.page ?? 1) < (webPostsRes.totalPages ?? 1));
          } else {
            setMemberPosts([]);
          }
        }
      } catch {
        // Silent
      } finally {
        if (!cancelled) setLoadingMember(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePage, targetMemberId, members, user]);

  const loadMoreMemberPosts = async () => {
    if (loadingMorePosts || !memberHasMore || !targetMemberId) return;
    setLoadingMorePosts(true);
    try {
      const nextPage = memberPage + 1;
      const res = await client.get(`/church?memberId=${targetMemberId}&page=${nextPage}`).catch(() => null);
      const mData = res?.data?.data;
      if (mData?.posts && Array.isArray(mData.posts)) {
        setMemberPosts((prev) => [...prev, ...mData.posts]);
        setMemberPage(nextPage);
        setMemberHasMore(Boolean(mData.hasMore));
      } else {
        setMemberHasMore(false);
      }
    } catch {
      setMemberHasMore(false);
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const handleMemberPostReact = async (postId: number, reactionType: string) => {
    setReactionPickerPostId(null);
    setMemberPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const currentMyReaction =
          p.myReaction ?? p.likes?.find((l: any) => Number(l.memberId) === Number(user?.id))?.type ?? null;
        const isRemoving = currentMyReaction === reactionType;
        const nextMyReaction = isRemoving ? null : reactionType;
        const currentCount = p.likeCount ?? p._count?.likes ?? (p.likes?.length || 0);
        const nextCount = isRemoving
          ? Math.max(0, currentCount - 1)
          : currentMyReaction
            ? currentCount
            : currentCount + 1;
        return {
          ...p,
          myReaction: nextMyReaction,
          likeCount: nextCount,
          _count: { ...(p._count || {}), likes: nextCount },
        };
      })
    );
    try {
      await client.post(`/posts/${postId}/react`, { type: reactionType });
    } catch {
      // Silent
    }
  };

  const openPostComments = async (post: any) => {
    setOpenPostMenuId(null);
    setCommentModalPost(post);
    setCommentsList([]);
    setLoadingComments(true);
    try {
      const res = await client.get(`/posts/${post.id}/comments`);
      const list = res?.data?.data || res?.data?.comments || [];
      setCommentsList(Array.isArray(list) ? list : []);
    } catch {
      setCommentsList([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const submitPostComment = async () => {
    if (!commentModalPost || !commentInput.trim() || sendingComment) return;
    const text = commentInput.trim();
    setSendingComment(true);
    try {
      const res = await client.post(`/posts/${commentModalPost.id}/comments`, { content: text });
      const created = res?.data?.data || res?.data?.comment || {
        id: Date.now(),
        content: text,
        createdAt: new Date().toISOString(),
        author: {
          id: user?.id,
          firstName: user?.firstName || 'Me',
          lastName: user?.lastName || '',
          profilePicture: user?.profilePicture || null,
        },
      };
      setCommentsList((prev) => [...prev, created]);
      setCommentInput('');
      setMemberPosts((prev) =>
        prev.map((p) =>
          p.id === commentModalPost.id
            ? {
                ...p,
                commentCount: (p.commentCount ?? p._count?.comments ?? 0) + 1,
                _count: {
                  ...(p._count || {}),
                  comments: (p._count?.comments ?? p.commentCount ?? 0) + 1,
                },
              }
            : p
        )
      );
    } catch {
      // Silent
    } finally {
      setSendingComment(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DIRECTORY PAGE — 1:1 Replica of app/(public)/directory/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const renderDirectoryPage = () => {
    const filtered = [...members]
      .filter((m) => {
        const full = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
        const matchSearch = !dirSearch || full.includes(dirSearch.toLowerCase());
        const matchType = typeFilter === 'all' || m.type === typeFilter;
        const matchAge = ageFilter === 'all' || m.ageGroup === ageFilter;
        const mNames = getMinistryNames(m);
        const matchMin = ministryFilter === 'all' || mNames.includes(ministryFilter);
        return matchSearch && matchType && matchAge && matchMin;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return (b.joinDate || '').localeCompare(a.joinDate || '');
        }
        if (sortBy === 'az') {
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        }
        const diff = completenessScore(b) - completenessScore(a);
        return diff !== 0
          ? diff
          : `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });

    const typeLabel =
      typeFilter === 'all'
        ? 'All types'
        : typeFilter === 'FamilyMember'
        ? 'Family Member'
        : typeFilter === 'GrowingFriend'
        ? 'Growing Friend'
        : 'New Friend';

    const ageLabel =
      ageFilter === 'all'
        ? 'All ages'
        : ageFilter === 'Adult'
        ? '👤 Adult'
        : ageFilter === 'Youth'
        ? '🌱 Youth'
        : '🧒 Kids';

    const sortLabel =
      sortBy === 'complete' ? '⭐ Complete' : sortBy === 'az' ? 'A → Z' : 'Newest';

    return (
      <FlatList
        data={filtered}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={PRIMARY}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Hero Header: linear-gradient(135deg, #0f2d3d 0%, #4EB1CB 100%) */}
            <View style={styles.dirHero}>
              <Text style={styles.dirHeroTitle}>👥 Community</Text>
              <Text style={styles.dirHeroSub}>{filtered.length} active members</Text>
            </View>

            {/* Sticky Filter Bar */}
            <View style={styles.dirFilterBar}>
              {/* Search Box */}
              <View style={styles.dirSearchWrap}>
                <TextInput
                  style={styles.dirSearchInput}
                  placeholder="🔍 Search members…"
                  placeholderTextColor="#94a3b8"
                  value={dirSearch}
                  onChangeText={setDirSearch}
                />
                {dirSearch.length > 0 && (
                  <TouchableOpacity
                    style={styles.dirSearchClear}
                    onPress={() => setDirSearch('')}
                  >
                    <Text style={{ color: '#94a3b8', fontWeight: '700', fontSize: 13 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 3 Filter Dropdowns: All types ▾ | All ages ▾ | ⭐ Complete ▾ */}
              <View style={styles.dirSelectRow}>
                <TouchableOpacity
                  style={styles.dirSelectPill}
                  onPress={() => setPickerModal('type')}
                  activeOpacity={0.8}
                >
                  <Text numberOfLines={1} style={styles.dirSelectText}>
                    {typeLabel}
                  </Text>
                  <Text style={styles.dirSelectChevron}>⌄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dirSelectPill}
                  onPress={() => setPickerModal('age')}
                  activeOpacity={0.8}
                >
                  <Text numberOfLines={1} style={styles.dirSelectText}>
                    {ageLabel}
                  </Text>
                  <Text style={styles.dirSelectChevron}>⌄</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dirSelectPill}
                  onPress={() => setPickerModal('sort')}
                  activeOpacity={0.8}
                >
                  <Text numberOfLines={1} style={styles.dirSelectText}>
                    {sortLabel}
                  </Text>
                  <Text style={styles.dirSelectChevron}>⌄</Text>
                </TouchableOpacity>
              </View>

              {/* Horizontal Ministry Filter Pills */}
              {ministries.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dirMinistryPillsRow}
                >
                  {['all', ...ministries.map((m) => m.name)].map((min) => {
                    const active = ministryFilter === min;
                    return (
                      <TouchableOpacity
                        key={min}
                        style={[styles.dirMinPill, active && styles.dirMinPillActive]}
                        onPress={() => setMinistryFilter(min)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.dirMinPillText,
                            active && styles.dirMinPillTextActive,
                          ]}
                        >
                          {min === 'all' ? 'All' : min}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        }
        renderItem={({ item: m }) => {
          const initials = `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`.toUpperCase();
          const avatarUri = m.profilePicture
            ? m.profilePicture.startsWith('http')
              ? m.profilePicture
              : `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
            : null;
          const coverUri = m.coverPhoto
            ? m.coverPhoto.startsWith('http')
              ? m.coverPhoto
              : `https://connect.houseofgrace.ph/uploads/cover_photos/${m.coverPhoto}`
            : null;
          const ageMeta = AGE_META[m.ageGroup];
          const minNames = getMinistryNames(m);
          const joinFormatted = m.joinDate
            ? new Date(m.joinDate).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })
            : null;

          return (
            <TouchableOpacity
              style={styles.dirCardWrap}
              activeOpacity={0.85}
              onPress={() => router.push(`/church?tab=member&id=${m.id}` as any)}
            >
              <View style={styles.dirMemberCard}>
                {/* Full-bleed Cover Photo + Seamless Horizontal Linear Gradient (exact replica of Directory page.tsx) */}
                {coverUri ? (
                  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                    <Image
                      source={{ uri: coverUri }}
                      style={StyleSheet.absoluteFillObject}
                      resizeMode="cover"
                    />
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
                      <Defs>
                        <LinearGradient id={`dirGrad-${m.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.97" />
                          <Stop offset="38%" stopColor="#ffffff" stopOpacity="0.97" />
                          <Stop offset="65%" stopColor="#ffffff" stopOpacity="0.6" />
                          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                        </LinearGradient>
                      </Defs>
                      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#dirGrad-${m.id})`} />
                    </Svg>
                  </View>
                ) : null}

                {/* Foreground Content */}
                <View style={styles.dirCardContent}>
                  {/* Top Row: Avatar + Name + Age/Join Badges */}
                  <View style={styles.dirTopRow}>
                    <View
                      style={[
                        styles.dirAvatarCircle,
                        !avatarUri && {
                          backgroundColor: 'rgba(78,177,203,0.12)',
                          borderColor: 'rgba(78,177,203,0.22)',
                        },
                      ]}
                    >
                      {avatarUri ? (
                        <Image
                          source={{ uri: avatarUri }}
                          style={styles.dirAvatarImg}
                        />
                      ) : (
                        <Text style={[styles.dirAvatarInitials, { color: PRIMARY }]}>
                          {initials}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={styles.dirMemberName}>
                        {m.firstName} {m.lastName}
                      </Text>

                      <View style={styles.dirBadgesRow}>
                        {ageMeta ? (
                          <View
                            style={[
                              styles.dirBadgePill,
                              {
                                backgroundColor: ageMeta.bg,
                                borderWidth: 1,
                                borderColor: 'rgba(78,177,203,0.2)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dirBadgePillText,
                                { color: ageMeta.color },
                              ]}
                            >
                              {ageMeta.label}
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.dirBadgePill,
                              {
                                backgroundColor: 'rgba(78,177,203,0.1)',
                                borderWidth: 1,
                                borderColor: 'rgba(78,177,203,0.2)',
                              },
                            ]}
                          >
                            <Text style={[styles.dirBadgePillText, { color: PRIMARY }]}>
                              {(m.type || 'Member').replace(/([A-Z])/g, ' $1').trim()}
                            </Text>
                          </View>
                        )}
                        {joinFormatted && (
                          <View style={styles.dirJoinPill}>
                            <Text style={styles.dirJoinPillText}>
                              📅 {joinFormatted}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Ministry Pills */}
                  {minNames.length > 0 && (
                    <View style={styles.dirMinBadgesWrap}>
                      {minNames.slice(0, 4).map((mName, idx) => (
                        <View key={`${m.id}-min-${idx}`} style={styles.dirCardMinBadge}>
                          <Text style={styles.dirCardMinBadgeText}>{mName}</Text>
                        </View>
                      ))}
                      {minNames.length > 4 && (
                        <View style={styles.dirCardMinMoreBadge}>
                          <Text style={styles.dirCardMinMoreText}>
                            +{minNames.length - 4} more
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Favorite Verse */}
                  {m.favoriteVerse ? (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
                      <Text style={{ fontSize: 13, lineHeight: 19 }}>✝️</Text>
                      <Text numberOfLines={2} style={[styles.dirVerseText, { marginTop: 0, flex: 1 }]}>
                        &ldquo;{m.favoriteVerse.length > 100 ? `${m.favoriteVerse.slice(0, 100)}…` : m.favoriteVerse}&rdquo;
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : (
            <View style={{ padding: 48, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🔍</Text>
              <Text style={{ fontWeight: '700', color: '#64748b' }}>No members found</Text>
            </View>
          )
        }
      />
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1B. MEMBER PROFILE PAGE — 1:1 Replica of app/(public)/member/[id]/ProfileClient.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMemberProfilePage = () => {
    if (loadingMember && !memberProfile) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      );
    }

    const m = memberProfile || members.find((x) => Number(x.id) === Number(targetMemberId));
    if (!m) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>👤</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569', marginBottom: 14 }}>
            Member Not Found
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: PRIMARY,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 999,
            }}
            onPress={() => router.push('/church?tab=directory' as any)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>← Back to Directory</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const fullName = `${m.firstName || ''} ${m.lastName || ''}`.trim();
    const initials = `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`.toUpperCase();
    const avatarSrc = m.profilePicture
      ? m.profilePicture.startsWith('http')
        ? m.profilePicture
        : `https://connect.houseofgrace.ph/uploads/profile_pictures/${m.profilePicture}`
      : null;
    const coverSrc = m.coverPhoto
      ? m.coverPhoto.startsWith('http')
        ? m.coverPhoto
        : `https://connect.houseofgrace.ph/uploads/cover_photos/${m.coverPhoto}`
      : null;

    const calcDuration = (joinDate?: string | null) => {
      if (!joinDate) return '';
      const start = new Date(joinDate);
      const now = new Date();
      const months =
        (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (months <= 0) return 'New member';
      return `${months} month${months !== 1 ? 's' : ''}`;
    };

    const fmtDateLong = (d?: string | null) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const fmtPostTime = (d?: string | null) => {
      if (!d) return '';
      const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const dur = calcDuration(m.joinDate);
    const minList: { id: number; ministry: { id?: number; name: string }; joinedDate?: string | null }[] =
      Array.isArray(m.ministries)
        ? m.ministries.map((mm: any, idx: number) => ({
            id: mm.id ?? idx,
            ministry: mm.ministry || { id: idx, name: mm.name || String(mm) },
            joinedDate: mm.joinedDate || null,
          }))
        : [];
    const familyArr = m.familyMembers
      ? String(m.familyMembers)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const hasContactInfo =
      (m.email && m.showEmail) ||
      (m.phone && m.showPhone) ||
      (m.address && m.showAddress) ||
      m.isAdmin ||
      m.isOwn;

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f1f5f9' }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={PRIMARY}
          />
        }
      >
        {/* ── Cover Photo Banner (height: 220) ── */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => {
            if (m.isOwn) {
              setProfilePhotoSheet('cover');
            } else if (coverSrc) {
              setLightboxSlide(coverSrc);
            }
          }}
          style={{
            height: 220,
            backgroundColor: '#1b647d',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {coverSrc ? (
            <Image
              source={{ uri: coverSrc }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}

          {/* Top dark gradient overlay for back button legibility */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 70,
              backgroundColor: 'rgba(0,0,0,0.18)',
            }}
            pointerEvents="none"
          />

          {/* Top-left circular ← back button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(15,23,42,0.52)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.28)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.push('/church?tab=directory' as any)}
          >
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>←</Text>
          </TouchableOpacity>

          {m.isOwn ? (
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: PRIMARY,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => router.push('/(tabs)/profile' as any)}
            >
              <Text style={{ fontSize: 15 }}>✏️</Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>

        {/* ── White Hero Card ── */}
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: -44 }}>
            {/* Overlapping 88x88 Avatar */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (m.isOwn) {
                  setProfilePhotoSheet('avatar');
                } else if (avatarSrc) {
                  setLightboxSlide(avatarSrc);
                }
              }}
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                borderWidth: 4,
                borderColor: '#ffffff',
                backgroundColor: '#e0f7fb',
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.18,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 5,
              }}
            >
              {avatarSrc ? (
                <Image source={{ uri: avatarSrc }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ fontSize: 28, fontWeight: '900', color: PRIMARY }}>{initials}</Text>
              )}
            </TouchableOpacity>

            {/* Name + Inline Badges */}
            <View style={{ flex: 1, paddingBottom: 6, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 18,
                  fontWeight: '900',
                  color: '#0f172a',
                  marginBottom: 5,
                  letterSpacing: -0.3,
                }}
              >
                {fullName}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                {dur ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(78,177,203,0.12)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: PRIMARY }}>
                      📅 {dur} in HGF
                    </Text>
                  </View>
                ) : null}
                {minList.length > 0 ? (
                  <View
                    style={{
                      backgroundColor: '#f1f5f9',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#64748b' }}>
                      🤲 {minList.length} {minList.length === 1 ? 'Ministry' : 'Ministries'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Right Pill: ✍️ Post (own) or 👤 Member */}
            {m.isOwn ? (
              <TouchableOpacity
                style={{
                  marginBottom: 6,
                  backgroundColor: PRIMARY,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                }}
                onPress={() => router.push('/create-post' as any)}
              >
                <Text style={{ color: '#ffffff', fontSize: 12.5, fontWeight: '700' }}>✍️ Post</Text>
              </TouchableOpacity>
            ) : (
              <View
                style={{
                  marginBottom: 6,
                  backgroundColor: 'rgba(78,177,203,0.14)',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: PRIMARY, fontSize: 12.5, fontWeight: '700' }}>👤 Member</Text>
              </View>
            )}
          </View>

          {/* Favorite Verse Quote */}
          {m.favoriteVerse ? (
            <Text
              style={{
                fontSize: 13,
                color: '#64748b',
                fontStyle: 'italic',
                lineHeight: 20,
                marginTop: 10,
              }}
            >
              &ldquo;
              {m.favoriteVerse.length > 100
                ? `${m.favoriteVerse.slice(0, 100)}…`
                : m.favoriteVerse}
              &rdquo;
            </Text>
          ) : null}
        </View>

        {/* ── Sticky 3-Tab Bar: 📝 Wall | ℹ️ About | 🤲 Ministries ── */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            borderBottomWidth: 1.5,
            borderBottomColor: '#e2e8f0',
          }}
        >
          {[
            { key: 'wall' as const, icon: '📝', label: 'Wall' },
            { key: 'about' as const, icon: 'ℹ️', label: 'About' },
            { key: 'ministries' as const, icon: '🤲', label: 'Ministries' },
          ].map((tab) => {
            const isActive = memberTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 2.5,
                  borderBottomColor: isActive ? PRIMARY : 'transparent',
                }}
                onPress={() => setMemberTab(tab.key)}
              >
                <Text style={{ fontSize: 16, marginBottom: 2 }}>{tab.icon}</Text>
                <Text
                  style={{
                    fontSize: 11.5,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? PRIMARY : '#94a3b8',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── TAB 1: WALL ── */}
        {memberTab === 'wall' && (
          <View style={{ padding: 12 }}>
            {m.isOwn && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 12,
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                }}
                onPress={() => router.push('/create-post' as any)}
              >
                <Text style={{ fontSize: 18 }}>✍️</Text>
                <Text style={{ flex: 1, color: '#94a3b8', fontSize: 14 }}>
                  Share something with the community…
                </Text>
              </TouchableOpacity>
            )}

            {loadingMember ? (
              <View style={{ padding: 36, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={PRIMARY} />
              </View>
            ) : memberPosts.length === 0 ? (
              <View style={{ paddingVertical: 48, paddingHorizontal: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 10 }}>📭</Text>
                <Text style={{ color: '#94a3b8', fontSize: 14.5 }}>
                  {m.isOwn ? "You haven't posted anything yet." : 'No posts yet.'}
                </Text>
              </View>
            ) : (
              <>
                {memberPosts.map((post: any) => {
                  const pAuthor = post.author || m;
                  const pName = `${pAuthor.firstName || ''} ${pAuthor.lastName || ''}`.trim();
                  const pAvatar = pAuthor.profilePicture
                    ? pAuthor.profilePicture.startsWith('http')
                      ? pAuthor.profilePicture
                      : `https://connect.houseofgrace.ph/uploads/profile_pictures/${pAuthor.profilePicture}`
                    : avatarSrc;
                  const pImg = post.imageUrl
                    ? post.imageUrl.startsWith('http')
                      ? post.imageUrl
                      : `https://connect.houseofgrace.ph${post.imageUrl.startsWith('/') ? '' : '/'}${post.imageUrl}`
                    : null;
                  const extraPhotos: string[] = Array.isArray(post.photos)
                    ? post.photos
                        .map((ph: any) => {
                          const raw = typeof ph === 'string' ? ph : ph?.url;
                          if (!raw) return '';
                          return raw.startsWith('http')
                            ? raw
                            : `https://connect.houseofgrace.ph${raw.startsWith('/') ? '' : '/'}${raw}`;
                        })
                        .filter(Boolean)
                    : [];
                  const allPhotos = pImg
                    ? [pImg, ...extraPhotos.filter((u) => u !== pImg)]
                    : extraPhotos;

                  const likeCount = post.likeCount ?? post._count?.likes ?? (post.likes?.length || 0);
                  const commentCount = post.commentCount ?? post._count?.comments ?? 0;
                  const myReaction: string | null =
                    post.myReaction ??
                    post.likes?.find((l: any) => Number(l.memberId) === Number(user?.id))?.type ??
                    null;

                  const TYPE_LABELS: Record<string, string> = {
                    DEVO: '📖 Devotional',
                    TEXT: '',
                    VERSE_CARD: '📜 Bible Verse',
                    PHOTO: '',
                    PRAYER: '🙏 Prayer',
                    PRAISE: '🙌 Testimony',
                    PROFILE_PHOTO: '📷 Profile Photo',
                    COVER_PHOTO: '🖼️ Cover Photo',
                  };
                  const typeBadge = TYPE_LABELS[post.type] || '';

                  // Background post detection (bg:teal, bg:red, bg:mountain, bg:ocean)
                  const rawContent = String(post.content || '');
                  const bgMatch = rawContent.match(/^\[bg:(teal|red|mountain|ocean)\]\n?([\s\S]*)$/);
                  const bgKey = bgMatch ? bgMatch[1] : null;
                  const cleanContent = bgMatch ? bgMatch[2] : rawContent;
                  const BG_COLORS: Record<string, string> = {
                    teal: '#0ea5e9',
                    red: '#e11d48',
                    mountain: '#0f172a',
                    ocean: '#0369a1',
                  };

                  // Unique reaction emojis for right-aligned summary bubble
                  const reactionTypesSet = new Set<string>();
                  if (Array.isArray(post.likes)) {
                    post.likes.forEach((l: any) => {
                      if (l?.type) reactionTypesSet.add(l.type);
                    });
                  }
                  if (myReaction) reactionTypesSet.add(myReaction);
                  if (reactionTypesSet.size === 0 && likeCount > 0) reactionTypesSet.add('HEART');
                  const REACTION_EMOJI_MAP: Record<string, string> = {
                    HEART: '❤️',
                    PRAY: '🙏',
                    AMEN: '🙏',
                    CARE: '🤗',
                    LIKE: '❤️',
                  };
                  const uniqueEmojis = Array.from(reactionTypesSet)
                    .map((t) => REACTION_EMOJI_MAP[t] || '❤️')
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .slice(0, 3);

                  const isOwnPost = user && Number(pAuthor.id ?? m.id) === Number(user.id);
                  const canDeletePost = Boolean(isOwnPost || m.isAdmin || user?.role === 'admin' || user?.role === 'moderator');

                  return (
                    <View
                      key={post.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 18,
                        padding: 16,
                        marginBottom: 12,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                        position: 'relative',
                      }}
                    >
                      {/* Post Author Row */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                          activeOpacity={0.85}
                          onPress={() => {
                            if (pAuthor.id && Number(pAuthor.id) !== Number(m.id)) {
                              router.push(`/church?tab=member&id=${pAuthor.id}` as any);
                            }
                          }}
                        >
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 21,
                              backgroundColor: '#e0f7fb',
                              overflow: 'hidden',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {pAvatar ? (
                              <Image
                                source={{ uri: pAvatar }}
                                style={{ width: '100%', height: '100%' }}
                              />
                            ) : (
                              <Text style={{ fontWeight: '800', color: PRIMARY }}>{initials}</Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14.5, fontWeight: '800', color: '#0f172a', lineHeight: 19 }}>
                              {pName}
                              {post.type === 'PROFILE_PHOTO' ? (
                                <Text style={{ fontWeight: '400', color: '#64748b', fontSize: 13 }}>
                                  {' '}updated their profile picture
                                </Text>
                              ) : post.type === 'COVER_PHOTO' ? (
                                <Text style={{ fontWeight: '400', color: '#64748b', fontSize: 13 }}>
                                  {' '}updated their cover photo
                                </Text>
                              ) : null}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 11.5, color: '#94a3b8' }}>
                                {fmtPostTime(post.createdAt)}
                              </Text>
                              {typeBadge ? (
                                <View
                                  style={{
                                    backgroundColor: '#e0f7fb',
                                    paddingHorizontal: 7,
                                    paddingVertical: 1.5,
                                    borderRadius: 999,
                                  }}
                                >
                                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#2b91ab' }}>
                                    {typeBadge}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* ••• Menu Button */}
                        <TouchableOpacity
                          style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                          onPress={() =>
                            setOpenPostMenuId((prev) => (prev === post.id ? null : post.id))
                          }
                        >
                          <Text style={{ fontSize: 18, color: '#94a3b8', fontWeight: '800' }}>•••</Text>
                        </TouchableOpacity>
                      </View>

                      {/* ••• Dropdown Sheet inside PostCard */}
                      {openPostMenuId === post.id && (
                        <View
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            marginBottom: 12,
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 4,
                          }}
                        >
                          <TouchableOpacity
                            style={{ paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                            onPress={() => {
                              setOpenPostMenuId(null);
                              openPostComments(post);
                            }}
                          >
                            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#1e293b' }}>
                              💬 View Comments
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              paddingVertical: 11,
                              paddingHorizontal: 14,
                              borderBottomWidth: canDeletePost ? 1 : 0,
                              borderBottomColor: '#f1f5f9',
                            }}
                            onPress={() => {
                              setOpenPostMenuId(null);
                              Share.share({
                                message: `${cleanContent ? cleanContent + '\n\n' : ''}https://connect.houseofgrace.ph/p/${post.id}`,
                                url: `https://connect.houseofgrace.ph/p/${post.id}`,
                              }).catch(() => {});
                            }}
                          >
                            <Text style={{ fontSize: 13.5, fontWeight: '600', color: '#1e293b' }}>
                              📤 Share Post
                            </Text>
                          </TouchableOpacity>
                          {canDeletePost && (
                            <TouchableOpacity
                              style={{ paddingVertical: 11, paddingHorizontal: 14 }}
                              onPress={() => {
                                setOpenPostMenuId(null);
                                setDeletePostConfirmId(post.id);
                              }}
                            >
                              <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#ef4444' }}>
                                🗑️ Delete Post
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Background Post or Regular Post Content */}
                      {bgKey && cleanContent ? (
                        <View
                          style={{
                            backgroundColor: BG_COLORS[bgKey] || PRIMARY,
                            borderRadius: 14,
                            minHeight: 200,
                            paddingVertical: 28,
                            paddingHorizontal: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              color: '#ffffff',
                              fontSize: cleanContent.length < 90 ? 20 : 16,
                              fontWeight: '800',
                              textAlign: 'center',
                              lineHeight: cleanContent.length < 90 ? 28 : 24,
                            }}
                          >
                            {cleanContent}
                          </Text>
                        </View>
                      ) : cleanContent ? (
                        <Text
                          style={{
                            fontSize: 15,
                            color: '#1e293b',
                            lineHeight: 23,
                            marginBottom:
                              allPhotos.length > 0 || post.verseText || post.linkUrl ? 12 : 8,
                          }}
                        >
                          {cleanContent}
                        </Text>
                      ) : null}

                      {/* Multi-Photo Strip or Single Photo */}
                      {allPhotos.length === 1 ? (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setLightboxSlide(allPhotos[0])}
                          style={{
                            borderRadius: 14,
                            overflow: 'hidden',
                            marginBottom: 12,
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          <Image
                            source={{ uri: allPhotos[0] }}
                            style={{
                              width: '100%',
                              height: post.type === 'PROFILE_PHOTO' ? 300 : 260,
                            }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ) : allPhotos.length > 1 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                          style={{ marginBottom: 12 }}
                        >
                          {allPhotos.map((uri, idx) => (
                            <TouchableOpacity
                              key={`${post.id}-ph-${idx}`}
                              activeOpacity={0.9}
                              onPress={() => setLightboxSlide(uri)}
                              style={{
                                width: 240,
                                height: 240,
                                borderRadius: 14,
                                overflow: 'hidden',
                                backgroundColor: '#f8fafc',
                              }}
                            >
                              <Image
                                source={{ uri }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                              <View
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: 'rgba(15,23,42,0.65)',
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  borderRadius: 999,
                                }}
                              >
                                <Text style={{ color: '#ffffff', fontSize: 10.5, fontWeight: '700' }}>
                                  {idx + 1}/{allPhotos.length}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : null}

                      {/* Link Preview Card (post.linkUrl) */}
                      {post.linkUrl ? (
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() => Linking.openURL(post.linkUrl).catch(() => {})}
                          style={{
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            borderRadius: 12,
                            overflow: 'hidden',
                            backgroundColor: '#f8fafc',
                            marginBottom: 12,
                          }}
                        >
                          {post.linkImage ? (
                            <Image
                              source={{ uri: post.linkImage }}
                              style={{ width: '100%', height: 150 }}
                              resizeMode="cover"
                            />
                          ) : null}
                          <View style={{ padding: 12 }}>
                            <Text
                              numberOfLines={1}
                              style={{
                                fontSize: 11,
                                color: PRIMARY,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                marginBottom: 3,
                              }}
                            >
                              🔗 {(() => {
                                try {
                                  return new URL(post.linkUrl).hostname.replace('www.', '');
                                } catch {
                                  return post.linkUrl;
                                }
                              })()}
                            </Text>
                            {post.linkTitle ? (
                              <Text
                                numberOfLines={2}
                                style={{
                                  fontSize: 13.5,
                                  fontWeight: '700',
                                  color: '#0f172a',
                                  marginBottom: 3,
                                }}
                              >
                                {post.linkTitle}
                              </Text>
                            ) : null}
                            {post.linkDesc ? (
                              <Text
                                numberOfLines={2}
                                style={{ fontSize: 12, color: '#64748b', lineHeight: 17 }}
                              >
                                {post.linkDesc}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      ) : null}

                      {/* DEVO AI Caption Callout */}
                      {post.aiCaption && post.type === 'DEVO' ? (
                        <View
                          style={{
                            backgroundColor: '#f0f9ff',
                            borderLeftWidth: 3,
                            borderLeftColor: PRIMARY,
                            borderRadius: 8,
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            marginBottom: 10,
                          }}
                        >
                          <Text style={{ fontSize: 13, color: '#0c4a6e', lineHeight: 19 }}>
                            ✨ {post.aiCaption}
                          </Text>
                        </View>
                      ) : null}

                      {/* Teal Scripture Verse Card (PostCard.tsx lines 1291-1301) */}
                      {post.verseText ? (
                        <View
                          style={{
                            backgroundColor: '#2d8fa8',
                            borderRadius: 14,
                            padding: 16,
                            marginBottom: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontStyle: 'italic',
                              color: '#ffffff',
                              lineHeight: 22,
                              marginBottom: post.verseRef ? 8 : 0,
                            }}
                          >
                            &ldquo;{post.verseText}&rdquo;
                          </Text>
                          {post.verseRef ? (
                            <View
                              style={{
                                alignSelf: 'flex-start',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                paddingHorizontal: 10,
                                paddingVertical: 3,
                                borderRadius: 999,
                              }}
                            >
                              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ffffff' }}>
                                — {post.verseRef}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {/* Right-Aligned Overlapping Reactions Summary Bubble (v2.24.2 / v2.24.4) */}
                      {likeCount > 0 && (
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            marginBottom: 8,
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                              setReactionsModalTab('ALL');
                              setReactionsModalPost(post);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#f8fafc',
                              borderWidth: 1,
                              borderColor: '#e2e8f0',
                              borderRadius: 999,
                              paddingHorizontal: 9,
                              paddingVertical: 3.5,
                              gap: 4,
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {uniqueEmojis.map((em, idx) => (
                                <Text
                                  key={idx}
                                  style={{ fontSize: 12.5, marginLeft: idx > 0 ? -3 : 0 }}
                                >
                                  {em}
                                </Text>
                              ))}
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>
                              {likeCount}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Long-Press Floating Reaction Picker Pill (❤️ 🙏 🤗) */}
                      {reactionPickerPostId === post.id && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignSelf: 'flex-start',
                            backgroundColor: '#ffffff',
                            borderRadius: 999,
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            marginBottom: 8,
                            gap: 14,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            shadowColor: '#000',
                            shadowOpacity: 0.15,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 4 },
                            elevation: 6,
                          }}
                        >
                          {[
                            { type: 'HEART', emoji: '❤️', label: 'Love' },
                            { type: 'PRAY', emoji: '🙏', label: 'Pray' },
                            { type: 'CARE', emoji: '🤗', label: 'Care' },
                          ].map((r) => (
                            <TouchableOpacity
                              key={r.type}
                              onPress={() => handleMemberPostReact(post.id, r.type)}
                              style={{ alignItems: 'center', paddingHorizontal: 4 }}
                            >
                              <Text style={{ fontSize: 24 }}>{r.emoji}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* 3-Button Action Bar: 🤍/❤️/🙏/🤗 | 💬 {commentCount} | 📤 Share */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-around',
                          borderTopWidth: 1,
                          borderTopColor: '#f1f5f9',
                          paddingTop: 8,
                          marginTop: 2,
                        }}
                      >
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                            gap: 5,
                          }}
                          onPress={() =>
                            handleMemberPostReact(post.id, myReaction || 'HEART')
                          }
                          onLongPress={() =>
                            setReactionPickerPostId((prev) =>
                              prev === post.id ? null : post.id
                            )
                          }
                        >
                          <Text style={{ fontSize: 18 }}>
                            {myReaction ? REACTION_EMOJI_MAP[myReaction] || '❤️' : '🤍'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                            gap: 5,
                          }}
                          onPress={() => openPostComments(post)}
                        >
                          <Text style={{ fontSize: 15, color: '#64748b', fontWeight: '600' }}>
                            💬 {commentCount > 0 ? commentCount : ''}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 6,
                            gap: 5,
                          }}
                          onPress={() => {
                            Share.share({
                              message: `${cleanContent ? cleanContent + '\n\n' : ''}https://connect.houseofgrace.ph/p/${post.id}`,
                              url: `https://connect.houseofgrace.ph/p/${post.id}`,
                            }).catch(() => {});
                          }}
                        >
                          <Text style={{ fontSize: 13.5, color: '#64748b', fontWeight: '600' }}>
                            📤 Share
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Load More Posts Button (ProfileClient.tsx lines 621-634) */}
                {memberHasMore && (
                  <TouchableOpacity
                    disabled={loadingMorePosts}
                    onPress={loadMoreMemberPosts}
                    style={{
                      backgroundColor: '#ffffff',
                      borderWidth: 1.5,
                      borderColor: '#e2e8f0',
                      borderRadius: 999,
                      paddingVertical: 11,
                      paddingHorizontal: 24,
                      alignSelf: 'center',
                      marginVertical: 10,
                    }}
                  >
                    <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#475569' }}>
                      {loadingMorePosts ? 'Loading…' : 'Load more posts'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* ── TAB 2: ABOUT ── */}
        {memberTab === 'about' && (
          <View style={{ padding: 12 }}>
            {m.favoriteVerse ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 8,
                  }}
                >
                  📖 FAVORITE VERSE
                </Text>
                <View style={{ borderLeftWidth: 3, borderLeftColor: PRIMARY, paddingLeft: 12 }}>
                  <Text style={{ fontSize: 14, fontStyle: 'italic', color: '#475569', lineHeight: 22 }}>
                    &ldquo;{m.favoriteVerse}&rdquo;
                  </Text>
                </View>
              </View>
            ) : null}

            {(dur || m.joinDate) ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 12,
                  }}
                >
                  📅 CHURCH MEMBERSHIP
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(78,177,203,0.1)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: '900', color: PRIMARY }}>
                      {dur || 'New'}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        marginTop: 2,
                      }}
                    >
                      DURATION
                    </Text>
                  </View>
                  {m.joinDate ? (
                    <View style={{ flex: 2 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: '#94a3b8',
                          textTransform: 'uppercase',
                        }}
                      >
                        MEMBER SINCE
                      </Text>
                      <Text
                        style={{
                          fontSize: 14.5,
                          fontWeight: '700',
                          color: '#1e293b',
                          marginTop: 2,
                        }}
                      >
                        {fmtDateLong(m.joinDate)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {(m.gender || m.birthdate || m.baptismDate || m.invitedBy) ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 6,
                  }}
                >
                  ℹ️ PERSONAL DETAILS
                </Text>
                {m.gender ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>🚻</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>GENDER</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{m.gender}</Text>
                    </View>
                  </View>
                ) : null}
                {m.birthdate ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>🎂</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>BIRTHDAY</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{fmtDateLong(m.birthdate)}</Text>
                    </View>
                  </View>
                ) : null}
                {m.baptismDate ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>🌊</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>BAPTISM DATE</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{fmtDateLong(m.baptismDate)}</Text>
                    </View>
                  </View>
                ) : null}
                {m.invitedBy ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>👥</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>INVITED BY</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{m.invitedBy}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {hasContactInfo ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 6,
                  }}
                >
                  📋 CONTACT
                </Text>
                {(m.showEmail || m.isAdmin || m.isOwn) && m.email ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>✉️</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>EMAIL</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{m.email}</Text>
                    </View>
                  </View>
                ) : null}
                {(m.showPhone || m.isAdmin || m.isOwn) && m.phone && typeof m.phone === 'string' ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>📞</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>PHONE</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{m.phone}</Text>
                    </View>
                  </View>
                ) : null}
                {(m.showAddress || m.isAdmin || m.isOwn) && m.address && typeof m.address === 'string' ? (
                  <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 16, width: 24, textAlign: 'center' }}>📍</Text>
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>ADDRESS</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 }}>{m.address}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {familyArr.length > 0 ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: 10,
                  }}
                >
                  🏠 FAMILY MEMBERS
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {familyArr.map((fName, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: '#f1f5f9',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                        {fName}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* ── TAB 3: MINISTRIES ── */}
        {memberTab === 'ministries' && (
          <View style={{ padding: 12 }}>
            {minList.length === 0 ? (
              <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 10 }}>🤲</Text>
                <Text style={{ color: '#94a3b8', fontSize: 14.5 }}>
                  Not serving in any ministry yet.
                </Text>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                {minList.map((mm, idx) => (
                  <View
                    key={mm.id || idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: idx < minList.length - 1 ? 1 : 0,
                      borderBottomColor: '#f8fafc',
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: 'rgba(78,177,203,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>🤲</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: '#1e293b' }}>
                        {mm.ministry.name}
                      </Text>
                      {mm.joinedDate ? (
                        <Text style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                          Since {fmtDateLong(mm.joinedDate)}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={{
                        backgroundColor: PRIMARY,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                        Active
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. SERMON RESOURCES PAGE — 1:1 Replica of app/(public)/resources/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const renderResourcesPage = () => {
    const filteredEvents = resources.filter((ev) => {
      const q = resourceSearch.toLowerCase();
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.speaker || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q) ||
        (ev.commentary || '').toLowerCase().includes(q)
      );
    });

    return (
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Hero Banner (#0f2d3d → #1a4a5e) */}
        <View style={styles.resHero}>
          <Text style={styles.resHeroTitle}>Sermon Resources</Text>
          <Text style={styles.resHeroSub}>
            Study slides, reflection takeaway commentaries, and sermon downloads
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          {/* Search Input */}
          <View style={styles.resSearchWrap}>
            <Text style={styles.resSearchIcon}>🔍</Text>
            <TextInput
              style={styles.resSearchInput}
              placeholder="🔍 Search resources by title, speaker, date, or keyword..."
              placeholderTextColor="#94a3b8"
              value={resourceSearch}
              onChangeText={setResourceSearch}
            />
            {resourceSearch.length > 0 && (
              <TouchableOpacity
                onPress={() => setResourceSearch('')}
                style={styles.resSearchClear}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Count Indicator */}
          <Text style={styles.resCountText}>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'Resource' : 'Resources'}{' '}
            Available
          </Text>

          {loading && filteredEvents.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : filteredEvents.length === 0 ? (
            <View style={styles.resEmptyBox}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>📖</Text>
              <Text style={styles.resEmptyTitle}>No Resources Found</Text>
              <Text style={styles.resEmptySub}>
                Try adjusting your search keywords or browse the active weekly quiz.
              </Text>
            </View>
          ) : (
            filteredEvents.map((ev) => {
              const slidesArray = normalizeSlides(ev.presentationSlides);
              const activeIdx = activeSlides[ev.id] ?? 0;
              const currentSlide = slidesArray[activeIdx];
              const formattedDate = new Date(ev.eventDate).toLocaleDateString('en-PH', {
                weekday: 'short',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              return (
                <View key={ev.id} style={styles.resCard}>
                  {/* Title & Date/Speaker */}
                  <View>
                    <Text style={styles.resCardTitle}>{ev.title}</Text>
                    <View style={styles.resMetaRow}>
                      <Text style={styles.resDateText}>📅 {formattedDate}</Text>
                      {ev.speaker ? (
                        <>
                          <Text style={styles.resDot}>•</Text>
                          <Text style={styles.resSpeakerText}>
                            👤 Speaker: {ev.speaker}
                          </Text>
                        </>
                      ) : null}
                    </View>
                  </View>

                  {/* Sermon Commentary & Spiritual Takeaways Box */}
                  {(ev.commentary || ev.description) && (
                    <View style={styles.resCommentaryBox}>
                      <Text style={styles.resCommentaryHeader}>
                        📝 SERMON COMMENTARY & SPIRITUAL TAKEAWAYS
                      </Text>
                      <ScrollView
                        style={{ maxHeight: 250 }}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                      >
                        {renderCommentaryLines(ev.commentary || ev.description || '')}
                      </ScrollView>
                    </View>
                  )}

                  {/* Sermon Slides Carousel */}
                  {slidesArray.length > 0 && currentSlide && (
                    <View>
                      <Text style={styles.resSlidesHeader}>
                        📽️ SERMON SLIDES ({slidesArray.length} SLIDES)
                      </Text>

                      <View style={styles.resSlideStage}>
                        <TouchableOpacity
                          activeOpacity={0.9}
                          style={{ width: '100%', height: '100%' }}
                          onPress={() => setLightboxSlide(currentSlide.image)}
                        >
                          <Image
                            source={{ uri: currentSlide.image }}
                            style={styles.resSlideImg}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>

                        {/* Slide X of N badge */}
                        <View style={styles.resSlideCounterBadge}>
                          <Text style={styles.resSlideCounterText}>
                            Slide {activeIdx + 1} of {slidesArray.length}
                          </Text>
                        </View>

                        {/* Left / Right Arrows */}
                        {slidesArray.length > 1 && (
                          <>
                            <TouchableOpacity
                              style={[styles.resSlideArrow, { left: 8 }]}
                              onPress={() =>
                                setActiveSlides((prev) => ({
                                  ...prev,
                                  [ev.id]:
                                    activeIdx > 0 ? activeIdx - 1 : slidesArray.length - 1,
                                }))
                              }
                            >
                              <Text style={styles.resSlideArrowText}>◀</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.resSlideArrow, { right: 8 }]}
                              onPress={() =>
                                setActiveSlides((prev) => ({
                                  ...prev,
                                  [ev.id]:
                                    activeIdx < slidesArray.length - 1 ? activeIdx + 1 : 0,
                                }))
                              }
                            >
                              <Text style={styles.resSlideArrowText}>▶</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {/* Fullscreen button */}
                        <TouchableOpacity
                          style={styles.resFullscreenBtn}
                          onPress={() => setLightboxSlide(currentSlide.image)}
                        >
                          <Text style={styles.resSlideCounterText}>🔍 Fullscreen</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Thumbnail Strip */}
                      {slidesArray.length > 1 && (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.resThumbRow}
                        >
                          {slidesArray.map((s, idx) => (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.resThumbBtn,
                                activeIdx === idx && styles.resThumbBtnActive,
                              ]}
                              onPress={() =>
                                setActiveSlides((prev) => ({ ...prev, [ev.id]: idx }))
                              }
                            >
                              <Image
                                source={{ uri: s.image }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  )}

                  {/* Download Button */}
                  {ev.presentationFile && (
                    <TouchableOpacity
                      style={styles.resDownloadBtn}
                      onPress={() =>
                        Linking.openURL(
                          `https://connect.houseofgrace.ph/api/events/${ev.id}/presentation/download`
                        )
                      }
                    >
                      <Text style={styles.resDownloadBtnText}>
                        {ev.presentationFile.toLowerCase().endsWith('.zip')
                          ? '📥 Download Presentation Package (.zip)'
                          : ev.presentationFile.toLowerCase().endsWith('.pdf')
                          ? '📥 Download Slide Deck (.pdf)'
                          : '📥 Download Slide Deck (.pptx)'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. LOVE GIFTS PAGE — 1:1 Replica of app/(public)/stewardshop/love-gifts/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const renderLoveGiftsPage = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Red-Rose Gradient Hero (#be123c → #f43f5e → #fb7185) */}
      <View style={styles.loveHero}>
        <Text style={{ fontSize: 40, marginBottom: 6 }}>❤️</Text>
        <Text style={styles.loveHeroTitle}>Share & Bless</Text>
        <Text style={styles.loveHeroSub}>
          Share marketplace listings with your community and earn a Love Gift when your share
          leads to a sale.
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        {/* What L.O.V.E. Stands For Card */}
        <View style={styles.loveMeaningCard}>
          <Text style={styles.loveCardHeading}>❤️ What L.O.V.E. Stands For</Text>
          {[
            {
              letter: 'L',
              word: 'Livelihood',
              desc: "Supporting church members' businesses and crafts",
            },
            {
              letter: 'O',
              word: 'Opportunity',
              desc: 'Giving every member a way to earn by helping others',
            },
            {
              letter: 'V',
              word: 'Value',
              desc: 'Honest pricing with exclusive member discounts',
            },
            {
              letter: 'E',
              word: 'Empowerment',
              desc: 'Building a self-sustaining community of stewards',
            },
          ].map((item) => (
            <View key={item.letter} style={styles.loveAcronymRow}>
              <View style={styles.loveLetterBadge}>
                <Text style={styles.loveLetterText}>{item.letter}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.loveAcronymBody}>
                  <Text style={styles.loveAcronymWord}>{item.word}</Text>
                  {' — '}
                  {item.desc}
                </Text>
              </View>
            </View>
          ))}

          {/* Philosophy Callout */}
          <View style={styles.lovePhilosophyBox}>
            <Text style={styles.lovePhilosophyText}>
              When a seller posts a listing, they can offer a{' '}
              <Text style={{ fontWeight: '700' }}>Love Gift</Text> — a monetary thank-you to
              whoever helps them find a buyer. Instead of paying big platforms for ads, that
              blessing goes to a fellow church member! 🙏
            </Text>
          </View>
        </View>

        {/* How It Works Card */}
        <View style={styles.loveWhiteCard}>
          <Text style={styles.loveSectionTitle}>How It Works</Text>
          {[
            {
              step: '1',
              emoji: '🔍',
              title: 'Find a listing with a Love Gift',
              desc: 'Look for the red ❤️ badge on marketplace cards showing the Love Gift amount.',
            },
            {
              step: '2',
              emoji: '🔗',
              title: 'Get your unique share link',
              desc: 'Tap "Get My Share Link" on any listing. You\'ll receive a personalized URL with your referral code.',
            },
            {
              step: '3',
              emoji: '📤',
              title: 'Share it!',
              desc: 'Send your link via Facebook, Messenger, Viber, SMS, or anywhere your friends and family are.',
            },
            {
              step: '4',
              emoji: '👤',
              title: 'Prospect submits their info',
              desc: 'When someone clicks your link and reveals the discount or contacts the seller, their inquiry is linked to your share code.',
            },
            {
              step: '5',
              emoji: '✅',
              title: 'Sale is confirmed',
              desc: 'When the seller marks the item as sold and selects the buyer who came through your link, the sale is verified!',
            },
            {
              step: '6',
              emoji: '🎁',
              title: 'Love Gift is credited!',
              desc: 'Your Love Gift earnings show up in "My Shared Links." Coordinate with the seller to receive your blessing.',
            },
          ].map((s) => (
            <View key={s.step} style={styles.loveStepRow}>
              <View style={styles.loveStepBadge}>
                <Text style={styles.loveStepBadgeText}>{s.step}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.loveStepTitle}>
                  {s.emoji} {s.title}
                </Text>
                <Text style={styles.loveStepDesc}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* FAQ Card */}
        <View style={styles.loveWhiteCard}>
          <Text style={styles.loveSectionTitle}>Frequently Asked Questions</Text>
          {[
            {
              q: 'Who can earn Love Gifts?',
              a: 'Any logged-in HGF Connect member! You just need an approved account to generate share links.',
            },
            {
              q: 'Can I share my own listing?',
              a: 'Love Gifts are designed to reward other members who help you find buyers. You cannot generate a share link for your own listing.',
            },
            {
              q: 'How do I receive the Love Gift money?',
              a: 'Once a sale is confirmed, you and the seller arrange the payout directly (cash, GCash, bank transfer, etc.). HGF Connect tracks the attribution and amounts.',
            },
            {
              q: 'What if multiple people shared the same listing?',
              a: "Each sharer gets a unique code. The Love Gift goes to the sharer whose link the actual buyer used to submit their inquiry — confirmed by the seller when marking the item as sold.",
            },
            {
              q: 'Do share links expire?',
              a: 'Referral cookies last 30 days after someone clicks your link. Your share link itself stays active as long as the listing is active.',
            },
            {
              q: 'Where do I track my shares and earnings?',
              a: 'Tap your profile menu → "My Shared Links" to see all your active links, click counts, and earned Love Gifts.',
            },
          ].map((faq, i) => (
            <View key={i} style={{ marginBottom: 14 }}>
              <Text style={styles.loveFaqQ}>{faq.q}</Text>
              <Text style={styles.loveFaqA}>{faq.a}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <TouchableOpacity
            style={styles.loveBrowseBtn}
            onPress={() => router.push('/(tabs)/stewardshop')}
            activeOpacity={0.85}
          >
            <Text style={styles.loveBrowseBtnText}>Browse Marketplace →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MY GRACE BLOG (/journal) — 1:1 Replica of app/(app)/journal/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const handleSaveBlog = async () => {
    if (!blogContent.trim()) return;
    setSavingBlog(true);
    try {
      const { data } = await client.post('/church', {
        action: 'create_journal',
        title: blogTitle.trim() || null,
        content: blogContent.trim(),
        verseRef: blogVerse.trim() || null,
        mood: blogMood,
        visibility: blogVisibility,
      });
      const payload = data?.data || data;
      if (payload?.entry) {
        setJournals((prev) => [payload.entry, ...prev]);
      } else {
        loadData();
      }
      setBlogTitle('');
      setBlogContent('');
      setBlogVerse('');
      setWritingBlog(false);
    } catch {
      // silent
    } finally {
      setSavingBlog(false);
    }
  };

  const renderJournalPage = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Header: linear-gradient(135deg, #1a7a94 0%, #4EB1CB 100%) */}
      <View style={styles.blogHero}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.blogHeroTitle}>📝 My Grace Blog</Text>
          <Text style={styles.blogHeroSub}>
            Your private reflection diary and public faith blog — sharing your personal walk of
            faith with the community.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.writeBlogPill}
          onPress={() => setWritingBlog((v) => !v)}
          activeOpacity={0.85}
        >
          <Text style={styles.writeBlogPillText}>
            {writingBlog ? '✕ Cancel' : '+ Write Blog'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 14 }}>
        {/* Inline Write Blog Composer (/journal/new replica) */}
        {writingBlog && (
          <View style={styles.blogComposerCard}>
            <Text style={styles.blogComposerHeading}>✍️ New Grace Blog Post</Text>
            <TextInput
              style={styles.blogInput}
              placeholder="Blog Title (optional)"
              placeholderTextColor="#94a3b8"
              value={blogTitle}
              onChangeText={setBlogTitle}
            />
            <TextInput
              style={styles.blogInput}
              placeholder="Scripture Reference (e.g. Psalm 23:1)"
              placeholderTextColor="#94a3b8"
              value={blogVerse}
              onChangeText={setBlogVerse}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, marginBottom: 10 }}
            >
              {Object.entries(MOOD_EMOJIS).map(([k, emoji]) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.blogMoodChip,
                    blogMood === k && styles.blogMoodChipActive,
                  ]}
                  onPress={() => setBlogMood(k)}
                >
                  <Text
                    style={[
                      styles.blogMoodChipText,
                      blogMood === k && { color: '#ffffff' },
                    ]}
                  >
                    {emoji} {k.charAt(0).toUpperCase() + k.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[styles.blogInput, { minHeight: 110, textAlignVertical: 'top' }]}
              placeholder="Write your reflection or faith blog post here..."
              placeholderTextColor="#94a3b8"
              multiline
              value={blogContent}
              onChangeText={setBlogContent}
            />
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {(['PRIVATE', 'MEMBERS_ONLY', 'PUBLIC'] as const).map((vKey) => {
                const vis = VISIBILITY_LABELS[vKey];
                const active = blogVisibility === vKey;
                return (
                  <TouchableOpacity
                    key={vKey}
                    style={[
                      styles.blogVisOption,
                      active && { borderColor: PRIMARY, backgroundColor: '#e0f7fb' },
                    ]}
                    onPress={() => setBlogVisibility(vKey)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>
                      {vis.icon} {vis.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.blogPrimaryBtn}
              onPress={handleSaveBlog}
              disabled={savingBlog}
            >
              <Text style={styles.blogPrimaryBtnText}>
                {savingBlog ? 'Saving…' : 'Publish Blog Post ✍️'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {journals.length === 0 ? (
          <View style={styles.blogEmptyWrap}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>📔</Text>
            <Text style={styles.blogEmptyTitle}>No Grace Blog posts yet</Text>
            <Text style={styles.blogEmptySub}>
              Start writing your Grace Journey or sharing your spiritual Walk of Faith on your
              blog today.
            </Text>
            <TouchableOpacity
              style={styles.blogPrimaryBtn}
              onPress={() => setWritingBlog(true)}
            >
              <Text style={styles.blogPrimaryBtnText}>Write First Blog Post ✍️</Text>
            </TouchableOpacity>
          </View>
        ) : (
          journals.map((entry) => {
            const vis =
              VISIBILITY_LABELS[entry.visibility] ?? VISIBILITY_LABELS.PRIVATE;
            const moodKey = (entry.mood || '').toLowerCase();
            return (
              <View key={entry.id} style={styles.blogEntryCard}>
                <View style={styles.blogEntryTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {entry.mood && (
                      <Text style={{ fontSize: 15 }}>
                        {MOOD_EMOJIS[moodKey] ?? '📝'}
                      </Text>
                    )}
                    <Text style={styles.blogEntryDate}>
                      {new Date(entry.createdAt).toLocaleDateString('en-PH', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {entry.verseRef && (
                      <View style={styles.blogVerseBadge}>
                        <Text style={styles.blogVerseBadgeText}>
                          📜 {entry.verseRef}
                        </Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.blogVisBadge,
                        { backgroundColor: vis.bg },
                      ]}
                    >
                      <Text style={[styles.blogVisBadgeText, { color: vis.color }]}>
                        {vis.icon} {vis.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {entry.title ? (
                  <Text style={styles.blogEntryTitle}>{entry.title}</Text>
                ) : null}

                <Text numberOfLines={3} style={styles.blogEntrySnippet}>
                  {String(entry.content || '').replace(/<[^>]*>/g, ' ')}
                </Text>

                <View style={styles.blogEntryFooter}>
                  <TouchableOpacity
                    style={styles.blogEditBtn}
                    onPress={() => {
                      setBlogTitle(entry.title || '');
                      setBlogContent(entry.content || '');
                      setBlogVerse(entry.verseRef || '');
                      setWritingBlog(true);
                    }}
                  >
                    <Text style={styles.blogEditBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.blogDeleteBtn}
                    onPress={() => setDeleteConfirmId(entry.id)}
                  >
                    <Text style={styles.blogDeleteBtnText}>🗑 Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SHARE YOUR DEVO (/devo/new) — 1:1 Replica of app/(app)/devo/new/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const handlePickDevoPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setDevoPreviewUri(res.assets[0].uri);
      setDevoStep('preview');
    }
  };

  const handleGenerateDevoCaption = async () => {
    setGeneratingDevoCaption(true);
    setDevoError('');
    try {
      const { data } = await client.post('/church', {
        action: 'generate_devo_caption',
        extractedText: devoUserCaption || null,
      });
      const payload = data?.data || data;
      setDevoAiCaption(payload?.caption || '');
      setDevoVerseText(payload?.suggestedVerse || '');
      setDevoVerseRef(payload?.verseRef || '');
      setDevoStep('compose');
    } catch {
      setDevoError('Could not generate caption. You can write your own below.');
      setDevoStep('compose');
    } finally {
      setGeneratingDevoCaption(false);
    }
  };

  const handlePostDevo = async () => {
    if (!devoUserCaption.trim() && !devoAiCaption.trim()) {
      setDevoError('Add a caption or reflection before posting.');
      return;
    }
    setSubmittingDevo(true);
    setDevoError('');
    try {
      await client.post('/church', {
        action: 'share_devo',
        content: devoUserCaption || devoAiCaption,
        aiCaption: devoAiCaption !== devoUserCaption ? devoAiCaption : null,
        verseRef: devoVerseRef || null,
        verseText: devoVerseText || null,
      });
      setDevoStep('done');
      setTimeout(() => {
        setDevoStep('capture');
        setDevoPreviewUri(null);
        setDevoUserCaption('');
        setDevoAiCaption('');
        router.push('/(tabs)');
      }, 1400);
    } catch {
      setDevoError('Failed to post. Please try again.');
    } finally {
      setSubmittingDevo(false);
    }
  };

  const renderDevoPage = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      {/* Sub-header (#4EB1CB) */}
      <View style={styles.devoSubHeader}>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 6 }}>
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.devoHeaderTitle}>Share Your Devo 📖</Text>
          <Text style={styles.devoHeaderSub}>
            Capture your devotional and share with the community
          </Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        {devoStep === 'capture' && (
          <>
            <TouchableOpacity
              style={styles.devoUploadZone}
              onPress={handlePickDevoPhoto}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 52, marginBottom: 8 }}>📷</Text>
              <Text style={styles.devoUploadTitle}>Tap to add a photo</Text>
              <Text style={styles.devoUploadSub}>of your handwritten devotional</Text>
            </TouchableOpacity>

            <Text style={styles.devoAiHint}>
              ✨ Our AI will read your devotional and generate a caption
            </Text>

            <TouchableOpacity
              style={styles.devoTextOnlyBtn}
              onPress={() => setDevoStep('compose')}
            >
              <Text style={styles.devoTextOnlyBtnText}>
                ✍️ Write text-only devotional instead
              </Text>
            </TouchableOpacity>
          </>
        )}

        {devoStep === 'preview' && devoPreviewUri && (
          <>
            <Image
              source={{ uri: devoPreviewUri }}
              style={styles.devoPreviewImg}
              resizeMode="cover"
            />
            <View style={styles.devoWhiteBox}>
              <Text style={styles.devoLabel}>
                💡 What&apos;s the key thought from your devotional? (optional)
              </Text>
              <TextInput
                style={styles.devoTextarea}
                placeholder="e.g. God's grace is sufficient..."
                placeholderTextColor="#94a3b8"
                multiline
                value={devoUserCaption}
                onChangeText={setDevoUserCaption}
              />
            </View>
            <TouchableOpacity
              style={styles.devoPrimaryBtn}
              onPress={handleGenerateDevoCaption}
              disabled={generatingDevoCaption}
            >
              <Text style={styles.devoPrimaryBtnText}>
                {generatingDevoCaption
                  ? '✨ Generating AI caption...'
                  : '✨ Generate Caption with AI'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.devoTextOnlyBtn}
              onPress={() => setDevoStep('compose')}
            >
              <Text style={styles.devoTextOnlyBtnText}>
                Skip AI — write caption manually
              </Text>
            </TouchableOpacity>
          </>
        )}

        {devoStep === 'compose' && (
          <>
            {devoPreviewUri && (
              <Image
                source={{ uri: devoPreviewUri }}
                style={[styles.devoPreviewImg, { height: 180 }]}
                resizeMode="cover"
              />
            )}
            {devoAiCaption ? (
              <View style={styles.devoAiCaptionBox}>
                <Text style={styles.devoAiCaptionTitle}>✨ AI Caption</Text>
                <Text style={styles.devoAiCaptionBody}>{devoAiCaption}</Text>
              </View>
            ) : null}

            <View style={styles.devoWhiteBox}>
              <Text style={styles.devoLabel}>Your Caption / Reflection</Text>
              <TextInput
                style={[styles.devoTextarea, { minHeight: 100 }]}
                placeholder="Write your own reflection here..."
                placeholderTextColor="#94a3b8"
                multiline
                value={devoUserCaption}
                onChangeText={setDevoUserCaption}
              />
            </View>

            {devoVerseText ? (
              <View style={styles.devoSuggestedVerseBox}>
                <Text style={styles.devoSuggestedVerseHeader}>📜 Suggested Verse</Text>
                <Text style={styles.devoSuggestedVerseBody}>
                  &ldquo;{devoVerseText}&rdquo;
                </Text>
                <View style={styles.devoSuggestedVerseRefPill}>
                  <Text style={styles.devoSuggestedVerseRefText}>— {devoVerseRef}</Text>
                </View>
              </View>
            ) : null}

            {devoError ? (
              <View style={styles.devoErrorBanner}>
                <Text style={styles.devoErrorText}>⚠️ {devoError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.devoPrimaryBtn}
              onPress={handlePostDevo}
              disabled={submittingDevo}
            >
              <Text style={styles.devoPrimaryBtnText}>
                {submittingDevo ? 'Sharing…' : '📖 Share Devotional'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {devoStep === 'done' && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🙌</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: PRIMARY, marginBottom: 6 }}>
              Devotional Shared!
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b' }}>
              Your devo is now in the community feed. Redirecting...
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. QUIZ FOR CHRIST (/quiz) — 1:1 Replica of app/(app)/quiz/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const handleStartCatchup = async () => {
    if (!quizStatus?.quiz?.id) return;
    setStartingCatchup(true);
    try {
      await client.post('/church', {
        action: 'start_catchup',
        quizId: quizStatus.quiz.id,
      });
      await loadData();
    } catch {
      // silent
    } finally {
      setStartingCatchup(false);
    }
  };

  const renderQuizPage = () => {
    const qObj = quizStatus?.quiz;
    const days = quizStatus?.days || [];
    const slidesArray = normalizeSlides(qObj?.presentationSlides);
    const currentSlide = slidesArray[quizSlideIdx];

    return (
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={PRIMARY}
          />
        }
      >
        {/* Brand Header */}
        <View style={styles.quizBrandHeader}>
          <TouchableOpacity
            style={styles.quizBrandLeft}
            onPress={() =>
              setQuizSubView((v) => (v === 'main' ? 'leaderboard' : 'main'))
            }
          >
            <View style={styles.quizBrainCircle}>
              <Text style={{ fontSize: 22 }}>🧠</Text>
            </View>
            <View>
              <Text style={styles.quizBrandTitle}>HGF Quiz for Christ Page</Text>
              <Text style={styles.quizBrandLink}>
                {quizSubView === 'main' ? 'View Leaderboard →' : '← Back to Active Quiz'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quizPastBtn}
            onPress={() =>
              setQuizSubView((v) => (v === 'main' ? 'leaderboard' : 'main'))
            }
          >
            <Text style={{ fontSize: 16 }}>📁</Text>
            <View>
              <Text style={styles.quizPastBtnTitle}>Past Quizzes</Text>
              <Text style={styles.quizPastBtnSub}>Catch Up →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {quizSubView === 'leaderboard' ? (
          <View style={styles.loveWhiteCard}>
            <Text style={styles.loveSectionTitle}>🏆 Quiz for Christ Leaderboard</Text>
            {leaderboard.map((row, idx) => (
              <View key={row.id} style={styles.quizLeaderRow}>
                <Text style={styles.quizLeaderRank}>
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quizLeaderName}>{row.name}</Text>
                  <Text style={styles.quizLeaderSub}>
                    {row.quizzesTaken} challenges completed
                  </Text>
                </View>
                <Text style={styles.quizLeaderScore}>{row.totalScore} pts</Text>
              </View>
            ))}
          </View>
        ) : (
          <>
            {/* Week Title Card */}
            <View
              style={[
                styles.quizWeekCard,
                quizStatus?.isCatchup
                  ? { backgroundColor: '#0284c7' }
                  : quizStatus?.isExpired
                  ? { backgroundColor: '#374151' }
                  : { backgroundColor: '#0f2d3d' },
              ]}
            >
              <View style={styles.quizStatusPill}>
                <Text style={styles.quizStatusPillText}>
                  {quizStatus?.isCatchup
                    ? '🎯 7-DAY CATCH-UP WINDOW'
                    : quizStatus?.isExpired
                    ? 'COMPLETED WEEK'
                    : 'ACTIVE QUIZ WEEK'}
                </Text>
              </View>
              <Text style={styles.quizWeekTitle}>
                {qObj?.title ? qObj.title.split(/ — | - /)[0] : 'The Kingdom Mind'}
              </Text>
              <Text style={styles.quizWeekDate}>
                Sermon Date:{' '}
                {qObj?.sermonDate
                  ? new Date(qObj.sermonDate).toLocaleDateString('en-PH', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Sunday, October 11, 2026'}
              </Text>
            </View>

            {/* Expired / Catch-Up Banner */}
            {quizStatus?.isExpired && !quizStatus?.isCatchup && (
              <View style={styles.quizExpiredBanner}>
                <Text style={{ fontSize: 26 }}>⏰</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quizExpiredTitle}>
                    This quiz week has ended, but you can still catch up!
                  </Text>
                  <Text style={styles.quizExpiredBody}>
                    You missed this Sunday quiz, but you can unlock a 7-day personal catch-up
                    pass to play all 7 challenges and earn points for your leaderboard score!
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.quizStartCatchupBtn}
                      onPress={handleStartCatchup}
                      disabled={startingCatchup}
                    >
                      <Text style={styles.quizStartCatchupText}>
                        {startingCatchup
                          ? '⏳ Activating Pass...'
                          : '🎯 Start 7-Day Catch-Up Pass'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quizViewPastOutlineBtn}
                      onPress={() => setQuizSubView('leaderboard')}
                    >
                      <Text style={styles.quizViewPastOutlineText}>
                        📁 View All Past Quizzes →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Sermon Study Guide */}
            {(slidesArray.length > 0 || qObj?.commentary) && (
              <View style={styles.loveWhiteCard}>
                <Text style={styles.quizSectionHeader}>📖 Sermon Study Guide</Text>
                {qObj?.commentary && (
                  <View style={[styles.resCommentaryBox, { marginBottom: 14 }]}>
                    <Text style={styles.resCommentaryHeader}>
                      📝 SERMON COMMENTARY & TAKEAWAYS
                    </Text>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {renderCommentaryLines(qObj.commentary)}
                    </ScrollView>
                  </View>
                )}
                {slidesArray.length > 0 && currentSlide && (
                  <View>
                    <Text style={styles.resSlidesHeader}>
                      📽️ SERMON SLIDE DECK ({slidesArray.length} SLIDES)
                    </Text>
                    <View style={styles.resSlideStage}>
                      <Image
                        source={{ uri: currentSlide.image }}
                        style={styles.resSlideImg}
                        resizeMode="contain"
                      />
                      <View style={styles.resSlideCounterBadge}>
                        <Text style={styles.resSlideCounterText}>
                          Slide {quizSlideIdx + 1} of {slidesArray.length}
                        </Text>
                      </View>
                      {slidesArray.length > 1 && (
                        <>
                          <TouchableOpacity
                            style={[styles.resSlideArrow, { left: 8 }]}
                            onPress={() =>
                              setQuizSlideIdx((p) =>
                                p > 0 ? p - 1 : slidesArray.length - 1
                              )
                            }
                          >
                            <Text style={styles.resSlideArrowText}>◀</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.resSlideArrow, { right: 8 }]}
                            onPress={() =>
                              setQuizSlideIdx((p) =>
                                p < slidesArray.length - 1 ? p + 1 : 0
                              )
                            }
                          >
                            <Text style={styles.resSlideArrowText}>▶</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* 7 Daily Challenges */}
            <View style={styles.loveWhiteCard}>
              <Text style={styles.quizSectionHeader}>
                🎯 Daily Challenges ({quizStatus?.progress?.completed ?? 0}/7 Completed)
              </Text>
              {days.map((d: any) => (
                <TouchableOpacity
                  key={d.dayNumber}
                  style={styles.quizDayCard}
                  onPress={() => {
                    if (d.status === 'expired') handleStartCatchup();
                  }}
                >
                  <View style={styles.quizDayEmojiBox}>
                    <Text style={{ fontSize: 20 }}>{d.typeEmoji || '🧠'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quizDayTitle}>
                      Day {d.dayNumber}: {d.typeLabel}
                    </Text>
                    <Text style={styles.quizDaySub}>
                      {d.label} • {d.difficulty}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.quizDayBadge,
                      d.status === 'completed'
                        ? { backgroundColor: '#dcfce7' }
                        : d.status === 'available' || d.status === 'today'
                        ? { backgroundColor: '#e0f2fe' }
                        : { backgroundColor: '#f1f5f9' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quizDayBadgeText,
                        d.status === 'completed'
                          ? { color: '#166534' }
                          : d.status === 'available' || d.status === 'today'
                          ? { color: '#0369a1' }
                          : { color: '#64748b' },
                      ]}
                    >
                      {d.status === 'completed'
                        ? '✅ Done'
                        : d.status === 'available' || d.status === 'today'
                        ? '▶ Play'
                        : d.status === 'expired'
                        ? '⏰ Catch Up'
                        : '🔒 Locked'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. HGF AI ASSISTANT (/ai) — 1:1 Replica of app/(app)/ai/page.tsx
  // ═══════════════════════════════════════════════════════════════════════════
  const sendAiMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || aiLoading || questionsLeft <= 0) return;
    setAiInput('');
    const nowIso = new Date().toISOString();
    setAiMessages((prev) => [
      ...prev,
      { role: 'user', content: trimmed, createdAt: nowIso },
    ]);
    setQuestionsLeft((p) => Math.max(0, p - 1));
    setAiLoading(true);
    try {
      const { data } = await client.post('/church', {
        action: 'ai',
        prompt: trimmed,
      });
      const payload = data?.data || data;
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            payload?.reply ||
            'May the Lord bless you and keep you! Let me know how else I can help.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setQuestionsLeft((p) => Math.min(20, p + 1));
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: "I'm having trouble connecting. Please try again! 🙏",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const renderAiPage = () => (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header (#4EB1CB) */}
      <View style={styles.aiHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiHeaderTitle}>💡 HGF AI Assistant</Text>
          <Text style={styles.aiHeaderSub}>
            Ask me about church events, cell groups, and more
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.aiHistoryBtn}
            onPress={() => setShowAiHistory((v) => !v)}
          >
            <Text style={styles.aiHistoryBtnText}>🕒 History</Text>
          </TouchableOpacity>
          <View style={styles.aiQuotaPill}>
            <Text style={styles.aiQuotaNum}>{questionsLeft}/20</Text>
            <Text style={styles.aiQuotaLabel}>left</Text>
          </View>
        </View>
      </View>

      {/* 3-Row Suggestion Chips */}
      <View style={styles.aiChipsContainer}>
        {CHIP_ROWS.map((row, rIdx) => (
          <ScrollView
            key={rIdx}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 6,
              paddingHorizontal: 12,
              marginBottom: rIdx < 2 ? 6 : 0,
            }}
          >
            {row.map((chip, cIdx) => (
              <TouchableOpacity
                key={cIdx}
                style={styles.aiSuggestionChip}
                onPress={() => sendAiMessage(`${chip.emoji} ${chip.text}`)}
              >
                <Text style={styles.aiSuggestionChipText}>
                  {chip.emoji} {chip.text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ))}
      </View>

      {/* Message List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 24 }}
      >
        {aiMessages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.aiMsgRow,
              msg.role === 'user'
                ? { justifyContent: 'flex-end' }
                : { justifyContent: 'flex-start' },
            ]}
          >
            {msg.role === 'ai' && (
              <View style={styles.aiBotAvatar}>
                <Text style={{ fontSize: 14 }}>💡</Text>
              </View>
            )}
            <View
              style={[
                styles.aiBubble,
                msg.role === 'user' ? styles.aiBubbleUser : styles.aiBubbleBot,
              ]}
            >
              <Text
                style={[
                  styles.aiBubbleText,
                  msg.role === 'user' ? { color: '#ffffff' } : { color: '#1e293b' },
                ]}
              >
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {aiLoading && (
          <Text style={styles.aiThinkingText}>
            ⏳ Hold on, I&apos;m thinking… please wait a moment
          </Text>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.aiInputBar}>
        <TextInput
          style={styles.aiTextInput}
          placeholder="Ask about church or request prayer..."
          placeholderTextColor="#94a3b8"
          value={aiInput}
          onChangeText={setAiInput}
          onSubmitEditing={() => sendAiMessage(aiInput)}
        />
        <TouchableOpacity
          style={[
            styles.aiSendCircle,
            (!aiInput.trim() || aiLoading) && { backgroundColor: '#e2e8f0' },
          ]}
          onPress={() => sendAiMessage(aiInput)}
          disabled={!aiInput.trim() || aiLoading}
        >
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '700' }}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. MY LISTINGS & MY SHARED LINKS — 1:1 Replicas
  // ═══════════════════════════════════════════════════════════════════════════
  const renderMyListingsPage = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: PRIMARY, padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#ffffff', fontSize: 14, marginBottom: 4 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>
          📦 My Listings
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
          Manage your stewardshop listings and view prospects
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        <View style={styles.sellerQuoteBanner}>
          <Text style={styles.sellerQuoteText}>
            ✝️ &ldquo;Whoever walks in integrity walks securely.&rdquo;
          </Text>
          <Text style={styles.sellerQuoteRef}>— Proverbs 10:9</Text>
        </View>

        <View style={{ alignItems: 'flex-end', marginBottom: 14 }}>
          <TouchableOpacity
            style={styles.newListingPill}
            onPress={() => router.push('/(tabs)/stewardshop')}
          >
            <Text style={styles.newListingPillText}>+ New Listing</Text>
          </TouchableOpacity>
        </View>

        {myListings.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 44, marginBottom: 10 }}>📭</Text>
            <Text style={{ fontWeight: '600', color: '#64748b', marginBottom: 12 }}>
              No listings yet
            </Text>
            <TouchableOpacity
              style={styles.newListingPill}
              onPress={() => router.push('/(tabs)/stewardshop')}
            >
              <Text style={styles.newListingPillText}>Post Your First Listing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myListings.map((item) => (
            <View key={item.id} style={styles.loveWhiteCard}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: '#1e293b' }}>
                {item.title}
              </Text>
              <Text style={{ fontWeight: '800', fontSize: 14, color: PRIMARY, marginTop: 4 }}>
                {item.price ? `₱${Number(item.price).toLocaleString()}` : 'Free'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderMySharesPage = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
      <View style={{ backgroundColor: '#dc2626', padding: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#ffffff', fontSize: 14, marginBottom: 4 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800' }}>
          ❤️ My Shared Links
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            marginTop: 2,
            marginBottom: 12,
          }}
        >
          Track your shared listings and Love Gift earnings
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { label: 'Total Earned', val: '₱0' },
            { label: 'Pending', val: '₱0' },
            { label: 'Received', val: '₱0' },
            { label: 'Sales', val: '0' },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 10,
                padding: 8,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>
                {stat.label}
              </Text>
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                {stat.val}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <View style={styles.sharerQuoteBanner}>
          <Text style={styles.sharerQuoteText}>
            ✝️ &ldquo;Whatever you do, work at it with all your heart, as working for the
            Lord.&rdquo;
          </Text>
          <Text style={styles.sharerQuoteRef}>— Colossians 3:23</Text>
        </View>

        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 44, marginBottom: 10 }}>🔗</Text>
          <Text style={{ fontWeight: '600', color: '#64748b', marginBottom: 6 }}>
            No shares yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: '#94a3b8',
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Browse StewardShop and tap &ldquo;Get My Share Link&rdquo; on listings you&apos;d
            like to promote!
          </Text>
          <TouchableOpacity
            style={styles.loveBrowseBtn}
            onPress={() => router.push('/(tabs)/stewardshop')}
          >
            <Text style={styles.loveBrowseBtnText}>Browse StewardShop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <TopHeader />

      <View style={{ flex: 1 }}>
        {activePage === 'directory' && renderDirectoryPage()}
        {activePage === 'member' && renderMemberProfilePage()}
        {activePage === 'resources' && renderResourcesPage()}
        {activePage === 'love-gifts' && renderLoveGiftsPage()}
        {activePage === 'journal' && renderJournalPage()}
        {activePage === 'devo' && renderDevoPage()}
        {activePage === 'quiz' && renderQuizPage()}
        {activePage === 'ai' && renderAiPage()}
        {activePage === 'my-listings' && renderMyListingsPage()}
        {activePage === 'my-shares' && renderMySharesPage()}
      </View>

      {/* BottomDock — Exact 5-item bar matching mobile/app/(tabs)/_layout.tsx (Hidden when bottom sheets are open per Rule #13) */}
      {reactionsModalPost === null &&
        commentModalPost === null &&
        profilePhotoSheet === null && (
          <View
            style={[
              styles.dockBar,
              { height: 58 + Math.max(insets.bottom, 6), paddingBottom: Math.max(insets.bottom, 6) },
            ]}
          >
            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.dockEmoji}>🏠</Text>
              <Text style={styles.dockLabel}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => router.push('/(tabs)/prayer')}
            >
              <Text style={styles.dockEmoji}>🙏</Text>
              <Text style={styles.dockLabel}>Prayer Wall</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => router.push('/create-post')}
            >
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
            <TouchableOpacity
              style={styles.dockItem}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.dockEmoji}>👤</Text>
              <Text style={styles.dockLabel}>Me</Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Directory Filter Dropdown Modal */}
      <Modal
        visible={pickerModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModal(null)}
        >
          <View style={styles.pickerSheet}>
            {pickerModal === 'type' &&
              [
                { k: 'all', l: 'All types' },
                { k: 'FamilyMember', l: 'Family Member' },
                { k: 'GrowingFriend', l: 'Growing Friend' },
                { k: 'NewFriend', l: 'New Friend' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.k}
                  style={styles.pickerOption}
                  onPress={() => {
                    setTypeFilter(opt.k);
                    setPickerModal(null);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      typeFilter === opt.k && { color: PRIMARY, fontWeight: '800' },
                    ]}
                  >
                    {opt.l}
                  </Text>
                </TouchableOpacity>
              ))}
            {pickerModal === 'age' &&
              [
                { k: 'all', l: 'All ages' },
                { k: 'Adult', l: '👤 Adult' },
                { k: 'Youth', l: '🌱 Youth' },
                { k: 'Kids', l: '🧒 Kids' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.k}
                  style={styles.pickerOption}
                  onPress={() => {
                    setAgeFilter(opt.k);
                    setPickerModal(null);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      ageFilter === opt.k && { color: PRIMARY, fontWeight: '800' },
                    ]}
                  >
                    {opt.l}
                  </Text>
                </TouchableOpacity>
              ))}
            {pickerModal === 'sort' &&
              [
                { k: 'complete' as const, l: '⭐ Complete' },
                { k: 'az' as const, l: 'A → Z' },
                { k: 'newest' as const, l: 'Newest' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.k}
                  style={styles.pickerOption}
                  onPress={() => {
                    setSortBy(opt.k);
                    setPickerModal(null);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      sortBy === opt.k && { color: PRIMARY, fontWeight: '800' },
                    ]}
                  >
                    {opt.l}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Slide Lightbox Modal */}
      <Modal
        visible={Boolean(lightboxSlide)}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxSlide(null)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.92)' }]}
          activeOpacity={1}
          onPress={() => setLightboxSlide(null)}
        >
          {lightboxSlide && (
            <Image
              source={{ uri: lightboxSlide }}
              style={{ width: '96%', height: '75%' }}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

      {/* Delete Blog Post ConfirmModal */}
      <ConfirmModal
        visible={deleteConfirmId !== null}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This will permanently remove it."
        confirmText="Delete"
        destructive
        onConfirm={async () => {
          if (!deleteConfirmId) return;
          const id = deleteConfirmId;
          setDeleteConfirmId(null);
          await client.post('/church', { action: 'delete_journal', journalId: id }).catch(() => {});
          setJournals((prev) => prev.filter((j) => j.id !== id));
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Delete Wall Post ConfirmModal */}
      <ConfirmModal
        visible={deletePostConfirmId !== null}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={async () => {
          if (!deletePostConfirmId) return;
          const id = deletePostConfirmId;
          setDeletePostConfirmId(null);
          await client.post('/church', { action: 'delete_post', postId: id }).catch(() => {});
          setMemberPosts((prev) => prev.filter((p) => p.id !== id));
        }}
        onCancel={() => setDeletePostConfirmId(null)}
      />

      {/* Reactions Analytics Bottom Sheet Modal (v2.24.4 / v2.24.12) */}
      <Modal
        visible={reactionsModalPost !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReactionsModalPost(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.45)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setReactionsModalPost(null)}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '72%',
              paddingBottom: Math.max(insets.bottom, 20),
            }}
            onStartShouldSetResponder={() => true}
          >
            {/* Drag Handle + Header */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#cbd5e1',
                  marginBottom: 10,
                }}
              />
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 18,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                  People who reacted
                </Text>
                <TouchableOpacity onPress={() => setReactionsModalPost(null)}>
                  <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Tabs: All, ❤️, 🙏, 🤗 */}
            {(() => {
              const allLikes: any[] = Array.isArray(reactionsModalPost?.likes)
                ? reactionsModalPost.likes
                : [];
              const heartCount = allLikes.filter(
                (l) => !l.type || l.type === 'HEART' || l.type === 'LIKE'
              ).length;
              const prayCount = allLikes.filter(
                (l) => l.type === 'PRAY' || l.type === 'AMEN'
              ).length;
              const careCount = allLikes.filter((l) => l.type === 'CARE').length;
              const filteredLikes = allLikes.filter((l) => {
                if (reactionsModalTab === 'ALL') return true;
                if (reactionsModalTab === 'HEART')
                  return !l.type || l.type === 'HEART' || l.type === 'LIKE';
                if (reactionsModalTab === 'PRAY')
                  return l.type === 'PRAY' || l.type === 'AMEN';
                if (reactionsModalTab === 'CARE') return l.type === 'CARE';
                return true;
              });

              return (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      borderBottomWidth: 1,
                      borderBottomColor: '#e2e8f0',
                      paddingHorizontal: 16,
                      gap: 16,
                    }}
                  >
                    {[
                      { k: 'ALL' as const, label: `All ${allLikes.length || ''}`.trim() },
                      ...(heartCount > 0 ? [{ k: 'HEART' as const, label: `❤️ ${heartCount}` }] : []),
                      ...(prayCount > 0 ? [{ k: 'PRAY' as const, label: `🙏 ${prayCount}` }] : []),
                      ...(careCount > 0 ? [{ k: 'CARE' as const, label: `🤗 ${careCount}` }] : []),
                    ].map((t) => {
                      const active = reactionsModalTab === t.k;
                      return (
                        <TouchableOpacity
                          key={t.k}
                          onPress={() => setReactionsModalTab(t.k)}
                          style={{
                            paddingVertical: 10,
                            borderBottomWidth: 2.5,
                            borderBottomColor: active ? PRIMARY : 'transparent',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13.5,
                              fontWeight: active ? '800' : '600',
                              color: active ? PRIMARY : '#64748b',
                            }}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <ScrollView style={{ paddingHorizontal: 18, paddingTop: 8 }}>
                    {filteredLikes.length === 0 ? (
                      <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 13.5 }}>No reactions yet.</Text>
                      </View>
                    ) : (
                      filteredLikes.map((item: any, idx: number) => {
                        const rMem = item.member || {};
                        const rName =
                          `${rMem.firstName || ''} ${rMem.lastName || ''}`.trim() || 'Church Member';
                        const rPic = rMem.profilePicture
                          ? rMem.profilePicture.startsWith('http')
                            ? rMem.profilePicture
                            : `https://connect.houseofgrace.ph/uploads/profile_pictures/${rMem.profilePicture}`
                          : null;
                        const rInitials = `${(rMem.firstName || 'M')[0]}${(rMem.lastName || '')[0] || ''}`.toUpperCase();
                        const rEmoji =
                          item.type === 'PRAY' || item.type === 'AMEN'
                            ? '🙏'
                            : item.type === 'CARE'
                              ? '🤗'
                              : '❤️';

                        return (
                          <TouchableOpacity
                            key={item.id ?? idx}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                              paddingVertical: 10,
                              borderBottomWidth: 1,
                              borderBottomColor: '#f8fafc',
                            }}
                            onPress={() => {
                              const mid = item.memberId || rMem.id;
                              setReactionsModalPost(null);
                              if (mid) {
                                router.push(`/church?tab=member&id=${mid}` as any);
                              }
                            }}
                          >
                            <View style={{ position: 'relative' }}>
                              <View
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 20,
                                  backgroundColor: '#e0f7fb',
                                  overflow: 'hidden',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {rPic ? (
                                  <Image
                                    source={{ uri: rPic }}
                                    style={{ width: '100%', height: '100%' }}
                                  />
                                ) : (
                                  <Text style={{ fontWeight: '800', color: PRIMARY }}>
                                    {rInitials}
                                  </Text>
                                )}
                              </View>
                              <View
                                style={{
                                  position: 'absolute',
                                  bottom: -2,
                                  right: -2,
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  backgroundColor: '#ffffff',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  shadowColor: '#000',
                                  shadowOpacity: 0.15,
                                  shadowRadius: 2,
                                }}
                              >
                                <Text style={{ fontSize: 11 }}>{rEmoji}</Text>
                              </View>
                            </View>
                            <Text
                              style={{
                                fontSize: 14.5,
                                fontWeight: '700',
                                color: '#0f172a',
                                flex: 1,
                              }}
                            >
                              {rName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Interactive Comment Drawer Bottom Sheet Modal */}
      <Modal
        visible={commentModalPost !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCommentModalPost(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
              paddingBottom: Math.max(insets.bottom, 14),
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>
                💬 Comments ({commentsList.length})
              </Text>
              <TouchableOpacity onPress={() => setCommentModalPost(null)}>
                <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView style={{ paddingHorizontal: 16, paddingVertical: 10, maxHeight: 380 }}>
              {loadingComments ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={PRIMARY} />
                </View>
              ) : commentsList.length === 0 ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13.5 }}>
                    No comments yet. Be the first to encourage!
                  </Text>
                </View>
              ) : (
                commentsList.map((c: any, idx: number) => {
                  const cAuth = c.author || c.member || {};
                  const cName =
                    `${cAuth.firstName || ''} ${cAuth.lastName || ''}`.trim() || 'Member';
                  const cPic = cAuth.profilePicture
                    ? cAuth.profilePicture.startsWith('http')
                      ? cAuth.profilePicture
                      : `https://connect.houseofgrace.ph/uploads/profile_pictures/${cAuth.profilePicture}`
                    : null;
                  const cInit = `${(cAuth.firstName || 'M')[0]}${(cAuth.lastName || '')[0] || ''}`.toUpperCase();

                  return (
                    <View
                      key={c.id ?? idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (cAuth.id) {
                            setCommentModalPost(null);
                            router.push(`/church?tab=member&id=${cAuth.id}` as any);
                          }
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: '#e0f7fb',
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {cPic ? (
                            <Image
                              source={{ uri: cPic }}
                              style={{ width: '100%', height: '100%' }}
                            />
                          ) : (
                            <Text style={{ fontSize: 12, fontWeight: '800', color: PRIMARY }}>
                              {cInit}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: '#f8fafc',
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                          {cName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13.5,
                            color: '#334155',
                            marginTop: 2,
                            lineHeight: 19,
                          }}
                        >
                          {c.content}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input Row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  fontSize: 14,
                  color: '#0f172a',
                }}
                placeholder="Write a comment…"
                placeholderTextColor="#94a3b8"
                value={commentInput}
                onChangeText={setCommentInput}
              />
              <TouchableOpacity
                disabled={!commentInput.trim() || sendingComment}
                onPress={submitPostComment}
                style={{
                  backgroundColor: commentInput.trim() ? PRIMARY : '#cbd5e1',
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13.5 }}>
                  {sendingComment ? '…' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Own-Profile Photo Bottom Sheet Modal (ProfileClient.tsx lines 435-471) */}
      <Modal
        visible={profilePhotoSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setProfilePhotoSheet(null)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.45)',
            justifyContent: 'flex-end',
          }}
          activeOpacity={1}
          onPress={() => setProfilePhotoSheet(null)}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 20),
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#cbd5e1',
                alignSelf: 'center',
                marginBottom: 14,
              }}
            />
            <TouchableOpacity
              style={{
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
              onPress={() => {
                const mode = profilePhotoSheet;
                setProfilePhotoSheet(null);
                if (mode === 'avatar' && memberProfile?.profilePicture) {
                  const uri = memberProfile.profilePicture.startsWith('http')
                    ? memberProfile.profilePicture
                    : `https://connect.houseofgrace.ph/uploads/profile_pictures/${memberProfile.profilePicture}`;
                  setLightboxSlide(uri);
                } else if (mode === 'cover' && memberProfile?.coverPhoto) {
                  const uri = memberProfile.coverPhoto.startsWith('http')
                    ? memberProfile.coverPhoto
                    : `https://connect.houseofgrace.ph/uploads/cover_photos/${memberProfile.coverPhoto}`;
                  setLightboxSlide(uri);
                }
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                {profilePhotoSheet === 'avatar' ? '👁 See profile picture' : '👁 See cover photo'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 14 }}
              onPress={() => {
                setProfilePhotoSheet(null);
                router.push('/(tabs)/profile' as any);
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY }}>
                {profilePhotoSheet === 'avatar'
                  ? '📷 Choose profile picture'
                  : '📷 Choose cover photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Markdown Commentary Renderer ──
function renderCommentaryLines(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const clean = line.trim();
    if (!clean) return <View key={idx} style={{ height: 8 }} />;
    if (clean.startsWith('###')) {
      return (
        <Text
          key={idx}
          style={{
            fontSize: 15,
            fontWeight: '700',
            color: '#1e293b',
            marginTop: 10,
            marginBottom: 4,
          }}
        >
          {clean.replace(/^###\s*/, '').replace(/\*\*/g, '')}
        </Text>
      );
    }
    if (clean.startsWith('##') || clean.startsWith('#')) {
      return (
        <Text
          key={idx}
          style={{
            fontSize: 17,
            fontWeight: '800',
            color: '#0f172a',
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          {clean.replace(/^#+\s*/, '').replace(/\*\*/g, '')}
        </Text>
      );
    }
    if (clean.startsWith('* ') || clean.startsWith('- ')) {
      return (
        <Text
          key={idx}
          style={{
            fontSize: 13.5,
            color: '#475569',
            lineHeight: 20,
            marginLeft: 10,
            marginBottom: 4,
          }}
        >
          • {clean.substring(2).replace(/\*\*/g, '')}
        </Text>
      );
    }
    return (
      <Text
        key={idx}
        style={{
          fontSize: 13.5,
          color: '#475569',
          lineHeight: 20,
          marginBottom: 6,
        }}
      >
        {clean.replace(/\*\*/g, '')}
      </Text>
    );
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // ── Directory Styles (app/(public)/directory/page.tsx) ──
  dirHero: {
    backgroundColor: '#1f6e86',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dirHeroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  dirHeroSub: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.8)',
  },
  dirFilterBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  dirSearchWrap: {
    position: 'relative',
    marginBottom: 8,
    justifyContent: 'center',
  },
  dirSearchInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  dirSearchClear: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  dirSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dirSelectPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  dirSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    flexShrink: 1,
  },
  dirSelectChevron: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  dirMinistryPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingBottom: 2,
  },
  dirMinPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  dirMinPillActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  dirMinPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  dirMinPillTextActive: {
    color: '#ffffff',
  },
  dirCardWrap: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  dirMemberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 112,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  dirCoverRightWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '62%',
    overflow: 'hidden',
  },
  dirCoverImg: {
    width: '100%',
    height: '100%',
  },
  dirWatermarkWrap: {
    width: '100%',
    height: '100%',
    backgroundColor: '#d9f2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirWatermarkImg: {
    width: 150,
    height: 150,
    opacity: 0.22,
  },
  dirFadeBand1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '28%',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  dirFadeBand2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '28%',
    width: '28%',
    backgroundColor: 'rgba(255,255,255,0.68)',
  },
  dirFadeBand3: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '56%',
    width: '44%',
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  dirCardContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dirTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dirAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PRIMARY,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dirAvatarImg: {
    width: '100%',
    height: '100%',
  },
  dirAvatarInitials: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 20,
  },
  dirMemberName: {
    fontWeight: '800',
    fontSize: 15.5,
    color: '#0f172a',
    marginBottom: 4,
  },
  dirBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center',
  },
  dirBadgePill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  dirBadgePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dirJoinPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  dirJoinPillText: {
    fontSize: 11,
    color: '#64748b',
  },
  dirMinBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  dirCardMinBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  dirCardMinBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  dirCardMinMoreBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dirCardMinMoreText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  dirVerseText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
    marginTop: 10,
    lineHeight: 17,
  },

  // ── Sermon Resources Styles (app/(public)/resources) ──
  resHero: {
    backgroundColor: '#143b4d',
    paddingVertical: 42,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  resHeroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  resHeroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },
  resSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 20,
  },
  resSearchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resSearchInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0f172a',
    padding: 0,
  },
  resSearchClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 14,
  },
  resEmptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 40,
    alignItems: 'center',
  },
  resEmptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  resEmptySub: {
    fontSize: 13.5,
    color: '#64748b',
    textAlign: 'center',
  },
  resCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#edf2f7',
    marginBottom: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  resMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  resDateText: {
    fontSize: 12.5,
    color: '#64748b',
  },
  resDot: {
    fontSize: 12.5,
    color: '#64748b',
  },
  resSpeakerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: PRIMARY,
  },
  resCommentaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  resCommentaryHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  resSlidesHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  resSlideStage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  resSlideImg: {
    width: '100%',
    height: '100%',
  },
  resSlideCounterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resSlideCounterText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  resSlideArrow: {
    position: 'absolute',
    top: '42%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resSlideArrowText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resFullscreenBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resThumbRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  resThumbBtn: {
    width: 78,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#000',
  },
  resThumbBtnActive: {
    borderColor: PRIMARY,
  },
  resDownloadBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resDownloadBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Love Gifts Styles (app/(public)/stewardshop/love-gifts/page.tsx) ──
  loveHero: {
    backgroundColor: '#e11d48',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loveHeroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  loveHeroSub: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 340,
  },
  loveMeaningCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffe4e6',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  loveCardHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#be123c',
    marginBottom: 14,
  },
  loveAcronymRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  loveLetterBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loveLetterText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
  },
  loveAcronymBody: {
    fontSize: 13.5,
    color: '#64748b',
    lineHeight: 19,
  },
  loveAcronymWord: {
    fontWeight: '800',
    color: '#1e293b',
  },
  lovePhilosophyBox: {
    marginTop: 10,
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f43f5e',
  },
  lovePhilosophyText: {
    fontSize: 13,
    color: '#9f1239',
    lineHeight: 19,
  },
  loveWhiteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  loveSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  loveStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  loveStepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loveStepBadgeText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  loveStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },
  loveStepDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18.5,
  },
  loveFaqQ: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },
  loveFaqA: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
  },
  loveBrowseBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  loveBrowseBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },

  // ── Grace Blog (/journal) Styles ──
  blogHero: {
    backgroundColor: '#2d96b0',
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blogHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  blogHeroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 3,
    lineHeight: 17,
  },
  writeBlogPill: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  writeBlogPillText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  blogComposerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  blogComposerHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  blogInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  blogMoodChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
  },
  blogMoodChipActive: {
    backgroundColor: PRIMARY,
  },
  blogMoodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  blogVisOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  blogPrimaryBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
    alignItems: 'center',
  },
  blogPrimaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  blogEmptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  blogEmptyTitle: {
    fontWeight: '600',
    fontSize: 15,
    color: '#64748b',
    marginBottom: 4,
  },
  blogEmptySub: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  blogEntryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3.5,
    borderLeftColor: PRIMARY,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  blogEntryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blogEntryDate: {
    fontSize: 11.5,
    color: '#94a3b8',
  },
  blogVerseBadge: {
    backgroundColor: '#e0f7fb',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  blogVerseBadgeText: {
    fontSize: 10.5,
    color: PRIMARY,
    fontWeight: '600',
  },
  blogVisBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  blogVisBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  blogEntryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  blogEntrySnippet: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  blogEntryFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 10,
  },
  blogEditBtn: {
    backgroundColor: '#e0f7fb',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  blogEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  blogDeleteBtn: {
    backgroundColor: '#fef2f2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  blogDeleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },

  // ── Share Devo (/devo/new) Styles ──
  devoSubHeader: {
    backgroundColor: PRIMARY,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  devoHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  devoHeaderSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  devoUploadZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
  },
  devoUploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
  },
  devoUploadSub: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
  },
  devoAiHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
  },
  devoTextOnlyBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  devoTextOnlyBtnText: {
    color: '#64748b',
    fontSize: 14,
  },
  devoPreviewImg: {
    width: '100%',
    height: 260,
    borderRadius: 16,
  },
  devoWhiteBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  devoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  devoTextarea: {
    fontSize: 14.5,
    color: '#0f172a',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  devoPrimaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  devoPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  devoAiCaptionBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    borderRadius: 10,
    padding: 12,
  },
  devoAiCaptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  devoAiCaptionBody: {
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 19,
  },
  devoSuggestedVerseBox: {
    backgroundColor: '#3a9db5',
    borderRadius: 14,
    padding: 16,
  },
  devoSuggestedVerseHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  devoSuggestedVerseBody: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#ffffff',
    lineHeight: 21,
    marginBottom: 8,
  },
  devoSuggestedVerseRefPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  devoSuggestedVerseRefText: {
    color: '#ffffff',
    fontSize: 12,
  },
  devoErrorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
  },
  devoErrorText: {
    color: '#ef4444',
    fontSize: 13.5,
  },

  // ── Quiz for Christ (/quiz) Styles ──
  quizBrandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  quizBrandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  quizBrainCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizBrandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  quizBrandLink: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
  quizPastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  quizPastBtnTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  quizPastBtnSub: {
    color: '#bae6fd',
    fontSize: 11,
    fontWeight: '700',
  },
  quizWeekCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
  },
  quizStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  quizStatusPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  quizWeekTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 6,
  },
  quizWeekDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  quizExpiredBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  quizExpiredTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  quizExpiredBody: {
    fontSize: 13,
    color: '#a16207',
    lineHeight: 19,
    marginBottom: 12,
  },
  quizStartCatchupBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  quizStartCatchupText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  quizViewPastOutlineBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  quizViewPastOutlineText: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '700',
  },
  quizSectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 12,
  },
  quizDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quizDayEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  quizDaySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  quizDayBadge: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  quizDayBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  quizLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  quizLeaderRank: {
    fontSize: 18,
    width: 30,
  },
  quizLeaderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  quizLeaderSub: {
    fontSize: 11.5,
    color: '#64748b',
  },
  quizLeaderScore: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
  },

  // ── AI Helper (/ai) Styles ──
  aiHeader: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  aiHeaderSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11.5,
  },
  aiHistoryBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  aiHistoryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  aiQuotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  aiQuotaNum: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  aiQuotaLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
  },
  aiChipsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
  },
  aiSuggestionChip: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  aiSuggestionChipText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '500',
  },
  aiMsgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiBotAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  aiBubbleBot: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
  },
  aiBubbleUser: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  aiBubbleText: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  aiThinkingText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
  },
  aiInputBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiTextInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
    fontSize: 14.5,
    color: '#0f172a',
  },
  aiSendCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── My Listings & My Shares Quotes ──
  sellerQuoteBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  sellerQuoteText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#166534',
    textAlign: 'center',
  },
  sellerQuoteRef: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#15803d',
    marginTop: 2,
  },
  sharerQuoteBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  sharerQuoteText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#92400e',
    textAlign: 'center',
  },
  sharerQuoteRef: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#a16207',
    marginTop: 2,
  },
  newListingPill: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  newListingPillText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13.5,
  },

  // ── BottomDock ──
  dockBar: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#e8eff4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockEmoji: {
    fontSize: 20,
  },
  dockLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94a3b8',
    marginTop: 2,
  },
  dockFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    paddingVertical: 8,
  },
  pickerOption: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 14.5,
    color: '#334155',
    fontWeight: '500',
  },
});
