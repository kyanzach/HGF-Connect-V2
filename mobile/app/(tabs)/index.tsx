import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import AlertPromptModal, { AlertType } from '@/components/ui/AlertPromptModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { SkeletonFeedLoading } from '@/components/ui/SkeletonPulse';
import InlineCommentThread from '@/components/ui/InlineCommentThread';

const MOUNTAIN_BG = require('../../assets/images/mountain.png');
const OCEAN_BG = require('../../assets/images/ocean.png');

interface FeedPost {
  id: number;
  type: string;
  title?: string | null;
  content: string;
  imageUrl?: string | null;
  aiCaption?: string | null;
  verseRef?: string | null;
  verseText?: string | null;
  eventId?: number | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDesc?: string | null;
  linkImage?: string | null;
  visibility?: string;
  images: string[];
  createdAt: string;
  author: {
    id: number;
    firstName?: string;
    lastName?: string;
    name: string;
    username?: string | null;
    role: string;
    avatar?: string | null;
    profilePicture?: string | null;
  };
  likeCount: number;
  commentCount: number;
  myReaction?: string | null;
  reactionCounts?: Record<string, number>;
  likes?: Array<{
    memberId: number;
    type: string;
    member?: {
      id: number;
      firstName?: string;
      lastName?: string;
      avatar?: string | null;
      profilePicture?: string | null;
    } | null;
  }>;
}

interface CommentItem {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    role: string;
    avatar?: string | null;
  };
}

interface CarouselData {
  upcomingEvent?: {
    id: number;
    title: string;
    eventDate: string;
    startTime?: string | null;
    location?: string | null;
    coverPhoto?: string | null;
  } | null;
  prayerSpotlight?: {
    id: number;
    request: string;
    prayCount: number;
    member: { firstName: string; lastName: string };
  } | null;
  quizProgress?: {
    sermonTitle?: string;
    title?: string;
    sermonDate?: string;
    completedCount?: number;
    completed?: number;
    totalChallenges?: number;
    total?: number;
    isExpired?: boolean;
    isCatchup?: boolean;
  } | null;
}

const DAILY_VERSES = [
  { text: 'Give thanks to the Lord, for he is good;', ref: 'Psalm 107:1' },
  { text: 'For where two or three gather in my name, there am I with them.', ref: 'Matthew 18:20' },
  { text: 'I can do all this through him who gives me strength.', ref: 'Philippians 4:13' },
  { text: 'The Lord is my shepherd, I lack nothing.', ref: 'Psalm 23:1' },
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged.', ref: 'Joshua 1:9' },
  { text: 'And we know that in all things God works for the good of those who love him.', ref: 'Romans 8:28' },
];

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  TEXT: { label: 'Reflection', color: '#6c757d', icon: '✍️' },
  DEVO: { label: 'Devotional', color: '#4EB1CB', icon: '📖' },
  VERSE_CARD: { label: 'Bible Verse', color: '#0284c7', icon: '📜' },
  PRAYER: { label: 'Prayer', color: '#E67E22', icon: '🙏' },
  PRAISE: { label: 'Testimony', color: '#27AE60', icon: '🙌' },
  EVENT: { label: 'Event', color: '#E74C3C', icon: '📅' },
  QUIZ_ANNOUNCEMENT: { label: 'Quiz Week', color: '#4EB1CB', icon: '🧠' },
  QUIZ_DAILY: { label: 'Daily Challenge', color: '#4EB1CB', icon: '🧠' },
  QUIZ_REWARD: { label: 'Quiz Reward', color: '#f59e0b', icon: '🎁' },
  BIRTHDAY_MONTHLY: { label: 'Monthly Celebrants', color: '#f59e0b', icon: '🎂' },
  BIRTHDAY_DAILY: { label: 'Happy Birthday', color: '#f59e0b', icon: '🎉' },
};

const MONTHS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const REACTIONS = [
  { type: 'HEART', emoji: '❤️', label: 'Love' },
  { type: 'PRAY', emoji: '🙏', label: 'Pray' },
  { type: 'HUG', emoji: '🤗', label: 'Care' },
];

const QUICK_ACTIONS = [
  { href: '/create-post', icon: '✍️', label: 'Write', bg: '#e0f2fe' },
  { href: '/(tabs)/events', icon: '📅', label: 'Events', bg: '#fef3c7' },
  { href: '/create-post?tab=prayer', icon: '🙏', label: 'Ask for Prayer', bg: '#faf5ff' },
  { href: '/(tabs)/stewardshop', icon: '🤝', label: 'StewardShop', bg: '#f0f9ff' },
  { href: '/church?tab=directory', icon: '👥', label: 'Directory', bg: '#fce7f3' },
  { href: '/church?tab=journal', icon: '📝', label: 'Grace Blog', bg: '#e6fffa' },
  { href: '/church?tab=devo', icon: '📖', label: 'Devo', bg: '#e0fdf4' },
  { href: '/church?tab=ai', icon: '💡', label: 'AI Helper', bg: '#fff7ed' },
];

const PUBLIC_FEATURES = [
  { icon: '📅', title: 'Events', desc: 'RSVP & get reminders', href: '/(tabs)/events', bg: '#fff5f5' },
  { icon: '🙏', title: 'Ask for Prayer', desc: 'Pray for one another', href: '/(tabs)/prayer', bg: '#f5f3ff' },
  { icon: '🤝', title: 'StewardShop', desc: 'Livelihood & L.O.V.E.', href: '/(tabs)/stewardshop', bg: '#fffbeb' },
  { icon: '👥', title: 'Directory', desc: 'Find church members', href: '/church?tab=directory', bg: '#f0fdf4' },
  { icon: '📝', title: 'Grace Blog', desc: 'Reflections & insights', href: '/church?tab=journal', bg: '#f0f9ff' },
  { icon: '📖', title: 'Share Devo', desc: 'Write a devotional', href: '/church?tab=devo', bg: '#f0f9ff' },
  { icon: '💡', title: 'AI Helper', desc: 'Biblical encouragement', href: '/church?tab=ai', bg: '#fdf4ff' },
];

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
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

export default function FeedScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{
    menu?: string;
    slide?: string;
    post?: string;
    openComments?: string;
  }>();
  const { user } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [carousel, setCarousel] = useState<CarouselData>({});
  const [slideIdx, setSlideIdx] = useState(0);
  const [highlightedPostId, setHighlightedPostId] = useState<number | null>(null);
  const [translatedPostIds, setTranslatedPostIds] = useState<Record<number, boolean>>({});
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    index: number;
  } | null>(null);

  useEffect(() => {
    if (searchParams?.menu === '1' || searchParams?.slide === '1') {
      setSlideIdx(1);
    }
  }, [searchParams?.menu, searchParams?.slide]);

  useEffect(() => {
    if (searchParams?.post) {
      const targetId = Number(searchParams.post);
      if (targetId > 0) setHighlightedPostId(targetId);
    }
  }, [searchParams?.post]);

  const [blockedAuthorIds, setBlockedAuthorIds] = useState<number[]>([]);
  const [stats, setStats] = useState({ memberCount: 472, upcomingCount: 0, ministryCount: 12 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reaction Picker Post ID & Who-Reacted Analytics Modal
  const [reactionPickerPostId, setReactionPickerPostId] = useState<number | null>(null);
  const [reactionsModalPost, setReactionsModalPost] = useState<FeedPost | null>(null);
  const [reactionsModalTab, setReactionsModalTab] = useState<string>('ALL');

  // Inline Expandable Comments Map (postId -> boolean)
  const [expandedCommentPostIds, setExpandedCommentPostIds] = useState<Record<number, boolean>>({});
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Post ••• Menu & Moderation + Owner Edit/Delete
  const [moderationPost, setModerationPost] = useState<FeedPost | null>(null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [confirmDeletePostOpen, setConfirmDeletePostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editPostText, setEditPostText] = useState('');
  const [savingPostEdit, setSavingPostEdit] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  // Match web HeroCarousel daily verse index (new Date().getDay())
  const dailyVerse = DAILY_VERSES[new Date().getDay() % DAILY_VERSES.length];

  const fetchFeed = useCallback(async () => {
    try {
      const postQuery = searchParams?.post ? `&post=${encodeURIComponent(searchParams.post)}` : '';
      const { data } = await client.get(`/feed?limit=25${postQuery}`);
      const payload = data?.data || data;
      if (payload?.posts) {
        setPosts(payload.posts);
        if (searchParams?.post && searchParams?.openComments === '1') {
          const targetId = Number(searchParams.post);
          const found = payload.posts.find((p: FeedPost) => p.id === targetId);
          if (found) {
            setTimeout(() => {
              openComments(found);
            }, 250);
          }
        }
      }
      if (payload?.stats) {
        setStats(payload.stats);
      }
      if (payload?.carousel) {
        setCarousel(payload.carousel);
        setSlideIdx((prev) =>
          searchParams?.menu === '1' || searchParams?.slide === '1' ? 1 : prev
        );
      }
    } catch {
      // Keep cached feed if offline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchParams?.post, searchParams?.openComments]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed, user?.id]);

  // Build slides identically to components/feed/HeroCarousel.tsx
  const slides: Array<'welcome' | 'quiz' | 'event' | 'prayer'> = ['welcome'];
  if (carousel?.quizProgress) slides.push('quiz');
  if (carousel?.upcomingEvent) slides.push('event');
  if (carousel?.prayerSpotlight) slides.push('prayer');

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % slides.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleReact = async (post: FeedPost, reactionType = 'HEART') => {
    setReactionPickerPostId(null);
    if (!user) {
      router.push('/login');
      return;
    }

    const prevReaction = post.myReaction;
    const isRemoving = prevReaction === reactionType;
    const nextReaction = isRemoving ? null : reactionType;
    const delta = isRemoving ? -1 : prevReaction ? 0 : 1;
    const myMemberId = Number(user.id);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== post.id) return p;
        const existingLikes = Array.isArray(p.likes) ? p.likes : [];
        const filteredLikes = existingLikes.filter((l) => Number(l.memberId) !== myMemberId);
        const updatedLikes = nextReaction
          ? [
              ...filteredLikes,
              {
                memberId: myMemberId,
                type: nextReaction,
                member: {
                  id: myMemberId,
                  firstName: user.firstName || user.fullName?.split(' ')[0] || 'You',
                  lastName: user.lastName || user.fullName?.split(' ').slice(1).join(' ') || '',
                  avatar: getAvatarUrl(user.profilePicture),
                  profilePicture: user.profilePicture,
                },
              },
            ]
          : filteredLikes;
        return {
          ...p,
          myReaction: nextReaction,
          likeCount: Math.max(0, p.likeCount + delta),
          likes: updatedLikes,
        };
      })
    );

    try {
      await client.post(`/posts/${post.id}/react`, { type: reactionType });
    } catch {
      fetchFeed();
    }
  };

  const openComments = (post: FeedPost) => {
    setExpandedCommentPostIds((prev) => ({
      ...prev,
      [post.id]: !prev[post.id],
    }));
  };

  const handleSendComment = async () => {
    if (!activePost || !commentText.trim()) return;
    if (!user) {
      setActivePost(null);
      router.push('/login');
      return;
    }

    setSendingComment(true);
    try {
      const { data } = await client.post(`/posts/${activePost.id}/comments`, {
        content: commentText.trim(),
      });
      const payload = data?.data || data;
      if (payload?.comment) {
        setComments((prev) => [...prev, payload.comment]);
        setPosts((prev) =>
          prev.map((p) => (p.id === activePost.id ? { ...p, commentCount: p.commentCount + 1 } : p))
        );
      }
      setCommentText('');
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Comment Failed',
        message: err?.response?.data?.error || 'Unable to post comment.',
      });
    } finally {
      setSendingComment(false);
    }
  };

  const handleSharePost = async (post: FeedPost) => {
    try {
      const shareUrl = `https://connect.houseofgrace.ph/p/${post.id}`;
      await Share.share({
        message: `${post.author.name} on HGF Connect\n${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleReportPost = async (reason: string) => {
    if (!moderationPost) return;
    const target = moderationPost;
    setModerationPost(null);
    try {
      await client.post('/moderation/report', {
        targetType: 'POST',
        targetId: target.id,
        reason,
      });
    } catch {
      // Proceed with confirmation
    }
    setAlertModal({
      visible: true,
      type: 'success',
      title: 'Report Submitted',
      message: 'Our ministry moderators will review this content within 24 hours.',
    });
  };

  const handleConfirmBlockUser = async () => {
    if (!moderationPost) return;
    const target = moderationPost;
    setConfirmBlockOpen(false);
    setModerationPost(null);
    setBlockedAuthorIds((prev) => [...prev, target.author.id]);
    try {
      await client.post('/moderation/block', { blockedUserId: target.author.id });
    } catch {
      // Filtered locally
    }
  };

  const handleSaveEditPost = async () => {
    if (!editingPost || !editPostText.trim()) return;
    setSavingPostEdit(true);
    try {
      await client.post('/feed', {
        action: 'edit_post',
        postId: editingPost.id,
        content: editPostText.trim(),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === editingPost.id ? { ...p, content: editPostText.trim() } : p))
      );
      setEditingPost(null);
      setEditPostText('');
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: err?.response?.data?.error || 'Unable to update post.',
      });
    } finally {
      setSavingPostEdit(false);
    }
  };

  const handleConfirmDeletePost = async () => {
    if (!moderationPost) return;
    const target = moderationPost;
    setConfirmDeletePostOpen(false);
    setModerationPost(null);
    try {
      await client.post('/feed', { action: 'delete_post', postId: target.id });
      setPosts((prev) => prev.filter((p) => p.id !== target.id));
    } catch (err: any) {
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Delete Failed',
        message: err?.response?.data?.error || 'Unable to delete post.',
      });
    }
  };

  const rawVisiblePosts = posts.filter((p) => !blockedAuthorIds.includes(p.author.id));
  const visiblePosts = highlightedPostId
    ? [
        ...rawVisiblePosts.filter((p) => p.id === highlightedPostId),
        ...rawVisiblePosts.filter((p) => p.id !== highlightedPostId),
      ]
    : rawVisiblePosts;

  // Render Logged-In Header (HeroCarousel + 8-Icon Quick Action Bar + "Community Feed" Header)
  const renderLoggedInHeader = () => {
    const activeSlide = slides[slideIdx % slides.length] || 'welcome';
    const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Member';
    const qp = carousel?.quizProgress;
    const quizTitle = (qp?.title || qp?.sermonTitle || 'The Kingdom Mind').split(' — ')[0];
    const quizCompleted = qp?.completed ?? qp?.completedCount ?? 0;
    const quizTotal = qp?.total ?? qp?.totalChallenges ?? 7;
    const quizDateStr = qp?.sermonDate
      ? new Date(qp.sermonDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : 'October 11, 2026';

    return (
      <View>
        {/* HeroCarousel (components/feed/HeroCarousel.tsx) */}
        <View style={styles.heroCarousel}>
          <View style={styles.heroDecorCircleTop} />
          <View style={styles.heroDecorCircleBottom} />

          {activeSlide === 'welcome' && (
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text style={styles.heroWelcomeSub}>Welcome back,</Text>
              <Text style={styles.heroWelcomeName}>{firstName} 🙌</Text>
              <Text style={styles.heroWelcomeVerse}>
                “Give thanks to the Lord, for he is good;”{'\n'}
                <Text style={{ opacity: 0.7 }}>— Psalm 107:1</Text>
              </Text>
              <View style={styles.heroBtnRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryPill}
                  onPress={() => router.push('/church?tab=devo' as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroPrimaryPillText} numberOfLines={1}>
                    📖 Share Devo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.heroSecondaryPill}
                  onPress={() => router.push('/(tabs)/prayer')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroSecondaryPillText} numberOfLines={1}>
                    🙏 Pray
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeSlide === 'quiz' && (
            <View style={{ position: 'relative', zIndex: 1 }}>
              <View style={styles.quizSlideBadgeRow}>
                <Text style={{ fontSize: 22 }}>🧠</Text>
                <Text style={styles.quizSlideBadgeText} numberOfLines={1}>
                  🎯 MISSED SUNDAY QUIZ CATCH-UP
                </Text>
              </View>
              <Text style={styles.quizSlideTitle} numberOfLines={1}>
                {quizTitle}
              </Text>
              <Text style={styles.quizSlideMeta}>📅 {quizDateStr}</Text>
              <Text style={styles.quizSlideProgress}>
                📊 Progress: {quizCompleted}/{quizTotal} challenges complete
              </Text>
              <TouchableOpacity
                style={styles.quizCatchupBtn}
                onPress={() => router.push('/church?page=quiz' as any)}
                activeOpacity={0.88}
              >
                <Text style={styles.quizCatchupBtnText}>Catch Up Now →</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeSlide === 'event' && carousel.upcomingEvent && (
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text style={styles.slideTag}>📅 UPCOMING EVENT</Text>
              <Text style={styles.quizSlideTitle} numberOfLines={2}>
                {carousel.upcomingEvent.title}
              </Text>
              <Text style={styles.quizSlideMeta}>
                📆{' '}
                {new Date(carousel.upcomingEvent.eventDate).toLocaleDateString('en-PH', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
                {carousel.upcomingEvent.location ? `  ·  📍 ${carousel.upcomingEvent.location}` : ''}
              </Text>
              <View style={[styles.heroBtnRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={styles.heroPrimaryPill}
                  onPress={() =>
                    router.push(
                      `/(tabs)/events?eventId=${carousel.upcomingEvent?.id || ''}` as any
                    )
                  }
                >
                  <Text style={styles.heroPrimaryPillText}>View Event →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeSlide === 'prayer' && carousel.prayerSpotlight && (
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text style={styles.slideTag}>🙏 PRAYER WALL SPOTLIGHT</Text>
              <Text style={styles.heroWelcomeVerse} numberOfLines={2}>
                “{carousel.prayerSpotlight.request}”
              </Text>
              <Text style={styles.quizSlideMeta}>
                — {carousel.prayerSpotlight.member.firstName} {carousel.prayerSpotlight.member.lastName} · 🙏{' '}
                {carousel.prayerSpotlight.prayCount} praying
              </Text>
              <View style={styles.heroBtnRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryPill}
                  onPress={() =>
                    router.push(
                      `/(tabs)/prayer?highlight=${carousel.prayerSpotlight?.id || ''}` as any
                    )
                  }
                >
                  <Text style={styles.heroPrimaryPillText}>🙏 Join in Prayer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Carousel Dots */}
          {slides.length > 1 && (
            <View style={styles.carouselDotsRow}>
              {slides.map((_, i) => {
                const isActive = i === slideIdx % slides.length;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSlideIdx(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    style={[
                      styles.carouselDot,
                      isActive ? styles.carouselDotActive : styles.carouselDotInactive,
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Quick-Action 8-Icon Bar (app/(app)/feed/FeedClient.tsx) */}
        <View style={styles.quickActionCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionScroll}
          >
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickActionItem}
                onPress={() => router.push(item.href as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionIconBox, { backgroundColor: item.bg }]}>
                  <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                </View>
                <Text style={styles.quickActionLabel} numberOfLines={1}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Highlighted Deep-Linked Post Banner */}
        {highlightedPostId && (
          <View
            style={{
              marginHorizontal: 14,
              marginTop: 10,
              backgroundColor: '#f0f9ff',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: '#bae6fd',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0369a1' }}>
              📌 Viewing linked post #{highlightedPostId}
            </Text>
            <TouchableOpacity onPress={() => setHighlightedPostId(null)}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284c7' }}>
                Clear Highlight ✕
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feed Section Header */}
        <View style={styles.feedSectionHeader}>
          <Text style={styles.feedSectionTitle}>Community Feed</Text>
          <TouchableOpacity
            style={styles.feedPostPill}
            onPress={() => router.push('/create-post')}
            activeOpacity={0.8}
          >
            <Text style={styles.feedPostPillText}>✍️ Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Guest Public Landing Header (app/page.tsx)
  const renderGuestHeader = () => (
    <View>
      <View style={styles.guestHeroBanner}>
        <View style={styles.heroDecorCircleTop} />
        <Text style={styles.guestHeroTitle}>HGF Connect</Text>
        <Text style={styles.guestHeroSubtitle}>House of Grace Fellowship Community App</Text>
        <View style={styles.guestHeroBtnRow}>
          <TouchableOpacity
            style={styles.guestLoginBtn}
            onPress={() => router.push('/login')}
            activeOpacity={0.88}
          >
            <Text style={styles.guestLoginBtnText} numberOfLines={1}>
              🔑 Login
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestJoinBtn}
            onPress={() => router.push('/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.guestJoinBtnText} numberOfLines={1}>
              Join Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={[styles.statCol, styles.statBorderRight]}>
          <Text style={styles.statValue}>{stats.memberCount}+</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={[styles.statCol, styles.statBorderRight]}>
          <Text style={styles.statValue}>{stats.upcomingCount}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.ministryCount}</Text>
          <Text style={styles.statLabel}>Ministries</Text>
        </View>
      </View>

      <View style={styles.guestVerseCard}>
        <Text style={styles.guestVerseHeader}>📖 DAILY VERSE</Text>
        <Text style={styles.guestVerseQuote}>“{dailyVerse.text}”</Text>
        <Text style={styles.guestVerseRef}>— {dailyVerse.ref}</Text>
      </View>

      <View style={styles.guestSectionWrap}>
        <Text style={styles.feedSectionTitle}>What's in the App</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
        >
          {PUBLIC_FEATURES.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.publicFeatureCard}
              onPress={() => router.push(item.href as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.publicFeatureIcon, { backgroundColor: item.bg }]}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              </View>
              <Text style={styles.publicFeatureTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.publicFeatureDesc} numberOfLines={1}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.feedSectionHeader}>
        <Text style={styles.feedSectionTitle}>🏠 Community Feed</Text>
      </View>
    </View>
  );

  // Render Individual PostCard (1:1 replica of components/feed/PostCard.tsx)
  const renderPost = ({ item }: { item: FeedPost }) => {
    const typeInfo = TYPE_LABELS[item.type] ?? TYPE_LABELS.TEXT;
    const isQuizPost =
      item.type === 'QUIZ_ANNOUNCEMENT' ||
      item.type === 'QUIZ_DAILY' ||
      item.type === 'QUIZ_REWARD';
    const isChurchPost =
      item.type === 'BIRTHDAY_DAILY' ||
      item.type === 'BIRTHDAY_MONTHLY' ||
      item.type === 'EVENT';

    const displayAuthorName = isQuizPost
      ? 'HGF Quiz For Christ'
      : isChurchPost
      ? 'House of Grace Fellowship'
      : item.author.name;

    const authorInitials = `${item.author.firstName?.[0] || item.author.name?.[0] || 'M'}${
      item.author.lastName?.[0] || ''
    }`.toUpperCase();
    const authorAvatarUrl = getAvatarUrl(item.author.profilePicture || item.author.avatar);

    // Parse BIRTHDAY_DAILY JSON payload if present
    let bdayDaily: {
      memberId?: number;
      name?: string;
      profilePicture?: string | null;
      message?: string;
      verseRef?: string;
      verseText?: string;
      birthMonth?: number | null;
      birthDay?: number | null;
    } | null = null;
    if (item.type === 'BIRTHDAY_DAILY') {
      try {
        bdayDaily = JSON.parse(item.content);
      } catch {
        bdayDaily = null;
      }
    }

    // Parse BIRTHDAY_MONTHLY JSON payload if present
    let bdayMonthly: {
      month?: string;
      celebrants?: Array<{
        id: number;
        name: string;
        day: number;
        profilePicture?: string | null;
      }>;
    } | null = null;
    if (item.type === 'BIRTHDAY_MONTHLY') {
      try {
        bdayMonthly = JSON.parse(item.content);
      } catch {
        bdayMonthly = null;
      }
    }

    const myEmoji = REACTIONS.find((r) => r.type === item.myReaction)?.emoji;
    const isBgPost = Boolean(item.imageUrl && item.imageUrl.startsWith('bg:'));
    const isHighlighted = highlightedPostId === item.id;
    const showEnglishTranslation = Boolean(translatedPostIds[item.id] && item.aiCaption);

    const prayerMatch = item.content?.match(/\[prayer:(\d+)\]/);
    const linkedPrayerId = prayerMatch ? Number(prayerMatch[1]) : null;
    const eventMatch = item.content?.match(/\[event:(\d+)\]/);
    const linkedEventId = eventMatch ? Number(eventMatch[1]) : item.eventId || null;

    const cleanDisplayContent = (
      showEnglishTranslation && item.aiCaption ? item.aiCaption : item.content || ''
    )
      .replace(/\[prayer:\d+\]/g, '')
      .replace(/\[event:\d+\]/g, '')
      .trim();

    return (
      <View
        style={[
          styles.postCard,
          isHighlighted && {
            borderWidth: 2,
            borderColor: '#4EB1CB',
            backgroundColor: '#f0f9ff',
          },
        ]}
      >
        {/* Author Header */}
        <View style={styles.postHeaderRow}>
          <TouchableOpacity
            style={styles.postAuthorAvatar}
            activeOpacity={0.85}
            onPress={() => {
              if (!isQuizPost && !isChurchPost) {
                router.push(`/church?tab=member&id=${item.author.id}` as any);
              }
            }}
          >
            {isQuizPost ? (
              <Text style={{ fontSize: 20 }}>🧠</Text>
            ) : isChurchPost ? (
              <Text style={{ fontSize: 18 }}>⛪</Text>
            ) : authorAvatarUrl ? (
              <Image source={{ uri: authorAvatarUrl }} style={styles.postAuthorAvatarImg} />
            ) : (
              <Text style={styles.postAuthorAvatarInitials}>{authorInitials}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.85}
            disabled={isQuizPost || isChurchPost}
            onPress={() => {
              if (!isQuizPost && !isChurchPost) {
                router.push(`/church?tab=member&id=${item.author.id}` as any);
              }
            }}
          >
            <Text style={styles.postAuthorName} numberOfLines={1}>
              {displayAuthorName}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.postMetaRowText}
            >
              <Text style={styles.postTimeText}>{timeAgo(item.createdAt)}</Text>
              <Text style={styles.postDotText}> · </Text>
              <Text style={[styles.postTypeBadgeText, { color: typeInfo.color }]}>
                {typeInfo.icon} {typeInfo.label}
              </Text>
              {item.type === 'BIRTHDAY_DAILY' &&
                bdayDaily?.birthMonth &&
                bdayDaily?.birthDay && (
                  <>
                    <Text style={styles.postDotText}> · </Text>
                    <Text style={styles.postBirthdayDateText}>
                      🎂 {MONTHS[bdayDaily.birthMonth]} {bdayDaily.birthDay}
                    </Text>
                  </>
                )}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.postDotsBtn}
            onPress={() => setModerationPost(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.postDotsText}>•••</Text>
          </TouchableOpacity>
        </View>

        {/* Post Title (if non-EVENT & non-BIRTHDAY_DAILY) */}
        {item.title && item.type !== 'EVENT' && item.type !== 'BIRTHDAY_DAILY' ? (
          <Text style={styles.postTitleText}>{item.title}</Text>
        ) : null}

        {/* Post Body Content */}
        {item.type === 'BIRTHDAY_DAILY' && bdayDaily ? (
          <View style={styles.bdayDailyCard}>
            {/* Celebrant Circular Avatar with Gold Border & 🎉 Badge */}
            <View style={styles.bdayAvatarOuter}>
              <View style={styles.bdayAvatarInner}>
                {getAvatarUrl(bdayDaily.profilePicture) ? (
                  <Image
                    source={{ uri: getAvatarUrl(bdayDaily.profilePicture)! }}
                    style={styles.bdayAvatarImg}
                  />
                ) : (
                  <Text style={styles.bdayAvatarInitials}>
                    {(bdayDaily.name || 'M')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.bdayConfettiBadge}>
                <Text style={{ fontSize: 14 }}>🎉</Text>
              </View>
            </View>

            <Text style={styles.bdayCelebrantName}>{bdayDaily.name}</Text>

            <Text style={styles.bdayBlessingMessage}>{bdayDaily.message}</Text>

            {bdayDaily.verseText ? (
              <View style={styles.bdayVerseCard}>
                <Text style={styles.bdayQuoteMark}>❝</Text>
                <Text style={styles.bdayVerseText}>{bdayDaily.verseText}</Text>
                <Text style={styles.bdayVerseRef}>— {bdayDaily.verseRef}</Text>
              </View>
            ) : null}
          </View>
        ) : item.type === 'BIRTHDAY_MONTHLY' && bdayMonthly ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.postBodyText}>
              🎉 Let's celebrate all our {bdayMonthly.month} Birthday Celebrants! Drop a 🎂 or
              prayer in the comments to bless them this month!
            </Text>
            {item.verseText ? (
              <View style={styles.standardVerseBox}>
                <Text style={styles.standardVerseText}>“{item.verseText}”</Text>
                {item.verseRef ? (
                  <Text style={styles.standardVerseRef}>— {item.verseRef}</Text>
                ) : null}
              </View>
            ) : null}
            {Array.isArray(bdayMonthly.celebrants) && bdayMonthly.celebrants.length > 0 && (
              <View style={styles.bdayMonthlyListCard}>
                <Text style={styles.bdayMonthlyListTitle}>
                  🎂 {bdayMonthly.month} Celebrants ({bdayMonthly.celebrants.length}):
                </Text>
                <View style={styles.bdayMonthlyGrid}>
                  {bdayMonthly.celebrants.map((c) => (
                    <View key={c.id} style={styles.bdayMonthlyChip}>
                      <View style={styles.bdayMonthlyDayCircle}>
                        <Text style={styles.bdayMonthlyDayText}>{c.day}</Text>
                      </View>
                      <Text style={styles.bdayMonthlyChipName} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : item.type === 'EVENT' ? (
          <TouchableOpacity
            style={styles.eventPostCard}
            activeOpacity={0.9}
            onPress={() =>
              router.push(
                linkedEventId
                  ? (`/(tabs)/events?eventId=${linkedEventId}` as any)
                  : '/(tabs)/events'
              )
            }
          >
            {item.images && item.images.length > 0 && (
              <Image
                source={{ uri: item.images[0] }}
                style={{
                  width: '100%',
                  height: 170,
                  borderRadius: 10,
                  marginBottom: 10,
                  backgroundColor: '#e2e8f0',
                }}
                resizeMode="cover"
              />
            )}
            <Text style={styles.eventPostTitle}>
              {item.title || cleanDisplayContent.split('\n')[0]}
            </Text>
            {cleanDisplayContent
              .split('\n')
              .slice(1)
              .filter(Boolean)
              .map((line, i) => (
                <Text key={i} style={styles.eventPostLine}>
                  {line}
                </Text>
              ))}
            <View style={styles.eventViewBtn}>
              <Text style={styles.eventViewBtnText}>VIEW EVENT →</Text>
            </View>
          </TouchableOpacity>
        ) : isBgPost ? (
          item.imageUrl === 'bg:mountain' || item.imageUrl === 'bg:ocean' ? (
            <ImageBackground
              source={item.imageUrl === 'bg:mountain' ? MOUNTAIN_BG : OCEAN_BG}
              style={styles.bgPostCard}
              imageStyle={{ borderRadius: 14 }}
            >
              <View style={styles.bgPostOverlay}>
                <Text style={styles.bgPostText}>{cleanDisplayContent}</Text>
              </View>
            </ImageBackground>
          ) : (
            <View
              style={[
                styles.bgPostCard,
                {
                  backgroundColor: item.imageUrl === 'bg:red' ? '#ef4444' : '#0891b2',
                },
              ]}
            >
              <Text style={styles.bgPostText}>{cleanDisplayContent}</Text>
            </View>
          )
        ) : (
          <View>
            <Text style={styles.postBodyText}>{cleanDisplayContent}</Text>
            {/* AI Translation Toggle for PRAISE / Testimony posts */}
            {item.aiCaption ? (
              <TouchableOpacity
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#f0f9ff',
                  borderWidth: 1,
                  borderColor: '#bae6fd',
                  borderRadius: 99,
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  marginBottom: 10,
                }}
                onPress={() =>
                  setTranslatedPostIds((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }))
                }
              >
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#0284c7' }}>
                  {showEnglishTranslation
                    ? '🌐 Show Original Bisaya/Taglish'
                    : '🌐 View English Translation'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Standard Verse Card (for non-birthday posts) */}
        {item.verseText &&
        item.type !== 'BIRTHDAY_DAILY' &&
        item.type !== 'BIRTHDAY_MONTHLY' ? (
          <View style={styles.standardVerseBox}>
            <Text style={styles.standardVerseText}>“{item.verseText}”</Text>
            {item.verseRef ? (
              <Text style={styles.standardVerseRef}>— {item.verseRef}</Text>
            ) : null}
          </View>
        ) : null}

        {/* Link Preview Card (OpenGraph) */}
        {item.linkUrl ? (
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              backgroundColor: '#f8fafc',
              marginBottom: 12,
            }}
            activeOpacity={0.88}
            onPress={() => Linking.openURL(item.linkUrl!).catch(() => {})}
          >
            {item.linkImage ? (
              <Image
                source={{ uri: item.linkImage }}
                style={{ width: '100%', height: 150, backgroundColor: '#e2e8f0' }}
                resizeMode="cover"
              />
            ) : null}
            <View style={{ padding: 12 }}>
              <Text
                style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 2 }}
                numberOfLines={1}
              >
                🔗 {item.linkUrl.replace(/^https?:\/\//i, '').split('/')[0]}
              </Text>
              {item.linkTitle ? (
                <Text
                  style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a', marginBottom: 3 }}
                  numberOfLines={2}
                >
                  {item.linkTitle}
                </Text>
              ) : null}
              {item.linkDesc ? (
                <Text style={{ fontSize: 12, color: '#475569' }} numberOfLines={2}>
                  {item.linkDesc}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Photos Grid (Single or Multi-Photo + Lightbox) */}
        {item.images && item.images.length > 0 && !isBgPost && item.type !== 'EVENT' ? (
          <View style={{ marginBottom: 12 }}>
            {item.images.length === 1 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setLightboxState({ images: item.images, index: 0 })}
              >
                <Image
                  source={{ uri: item.images[0] }}
                  style={styles.postPhotoSingle}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {item.images.slice(0, 4).map((imgUrl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.9}
                    onPress={() => setLightboxState({ images: item.images, index: idx })}
                    style={{
                      width: '48.5%',
                      height: 155,
                      borderRadius: 10,
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <Image
                      source={{ uri: imgUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    {idx === 3 && item.images.length > 4 && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(15,23,42,0.6)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>
                          +{item.images.length - 4}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Prayer Post CTA Button */}
        {item.type === 'PRAYER' && (
          <TouchableOpacity
            style={{
              backgroundColor: '#fff7ed',
              borderWidth: 1,
              borderColor: '#fed7aa',
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onPress={() =>
              router.push(
                linkedPrayerId
                  ? (`/(tabs)/prayer?pray=${linkedPrayerId}` as any)
                  : '/(tabs)/prayer'
              )
            }
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ea580c' }}>
              🙏 Pray Now on Prayer Wall →
            </Text>
          </TouchableOpacity>
        )}

        {/* Quiz CTA Button */}
        {(item.type === 'QUIZ_ANNOUNCEMENT' || item.type === 'QUIZ_DAILY') && (
          <TouchableOpacity
            style={styles.quizPostCtaBtn}
            onPress={() => router.push('/church?page=quiz' as any)}
            activeOpacity={0.88}
          >
            <Text style={styles.quizPostCtaText}>
              {item.type === 'QUIZ_ANNOUNCEMENT'
                ? "🧠 Start This Week's Quiz →"
                : "🎮 Play Today's Challenge →"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Reactions Summary Row (1:1 with components/feed/PostCard.tsx) */}
        {item.likeCount > 0 && (() => {
          const rawTypes = Array.from(
            new Set((item.likes || []).map((r) => r.type || 'HEART'))
          );
          const distinctTypes = rawTypes.length > 0 ? rawTypes : ['HEART'];
          const emojiMap: Record<string, string> = {
            HEART: '❤️',
            PRAY: '🙏',
            HUG: '🤗',
            CARE: '🤗',
          };
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setReactionsModalPost(item);
                setReactionsModalTab('ALL');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 6,
                paddingVertical: 6,
                paddingHorizontal: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {distinctTypes.map((t, i) => (
                  <View
                    key={t}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: i > 0 ? -5 : 0,
                      zIndex: 3 - i,
                      borderWidth: 1,
                      borderColor: '#f1f5f9',
                      shadowColor: '#000',
                      shadowOpacity: 0.12,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <Text style={{ fontSize: 11 }}>{emojiMap[t] || '❤️'}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 12.5, color: '#64748b', fontWeight: '600' }}>
                {item.likeCount}
              </Text>
            </TouchableOpacity>
          );
        })()}

        {/* Reaction Picker Popover */}
        {reactionPickerPostId === item.id && (
          <View style={styles.reactionPopover}>
            {REACTIONS.map((r) => (
              <TouchableOpacity
                key={r.type}
                style={[
                  styles.reactionOptionBtn,
                  item.myReaction === r.type && styles.reactionOptionBtnActive,
                ]}
                onPress={() => handleReact(item, r.type)}
              >
                <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom Action Bar (components/feed/PostCard.tsx) */}
        <View style={styles.postActionBar}>
          <TouchableOpacity
            style={[
              styles.postActionBtn,
              item.myReaction ? styles.postActionBtnActive : null,
            ]}
            onPress={() => handleReact(item, item.myReaction || 'HEART')}
            onLongPress={() =>
              setReactionPickerPostId((prev) => (prev === item.id ? null : item.id))
            }
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 18 }}>{myEmoji || '🤍'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.postActionBtn,
              expandedCommentPostIds[item.id] ? styles.postActionBtnActive : null,
            ]}
            onPress={() => openComments(item)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            <Text
              style={[
                styles.postActionText,
                expandedCommentPostIds[item.id] ? { color: '#4EB1CB', fontWeight: '700' } : null,
              ]}
            >
              {item.commentCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postActionBtn, { marginLeft: 'auto' }]}
            onPress={() => handleSharePost(item)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 15 }}>📤</Text>
            <Text style={styles.postActionText}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Facebook/Instagram Threaded Comments */}
        <InlineCommentThread
          postId={item.id}
          postAuthorId={item.author.id}
          isOpen={Boolean(expandedCommentPostIds[item.id])}
          onCommentCountChange={(delta) => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === item.id
                  ? { ...p, commentCount: Math.max(0, p.commentCount + delta) }
                  : p
              )
            );
          }}
        />
      </View>
    );
  };

  // Guest Landing Footer (app/page.tsx)
  const renderFooter = () => {
    if (user) return <View style={{ height: 24 }} />;
    return (
      <View>
        <View style={styles.joinCtaCard}>
          <Text style={{ fontSize: 30, marginBottom: 8 }}>🙌</Text>
          <Text style={styles.joinCtaTitle}>Join HGF Connect</Text>
          <Text style={styles.joinCtaSub}>
            Be part of our online church family — share devotions, pray together, and stay connected.
          </Text>
          <View style={styles.joinCtaBtnRow}>
            <TouchableOpacity
              style={styles.joinCtaPrimaryBtn}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.joinCtaPrimaryText}>Create Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.joinCtaOutlineBtn}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.joinCtaOutlineText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.darkFooter}>
          <Text style={styles.darkFooterBrand}>⛪ House of Grace Fellowship</Text>
          <Text style={styles.darkFooterSub}>Panacan, Davao City, Philippines</Text>
          <Text style={styles.darkFooterCopy}>
            © {new Date().getFullYear()} House of Grace Fellowship · All rights reserved
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonFeedLoading />
        </ScrollView>
      ) : (
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPost}
          ListHeaderComponent={user ? renderLoggedInHeader() : renderGuestHeader()}
          ListFooterComponent={renderFooter()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchFeed();
              }}
              tintColor="#4EB1CB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>🌱</Text>
              <Text style={styles.emptyTitle}>Nothing here yet!</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share a reflection, verse, or praise report with the community.
              </Text>
            </View>
          }
        />
      )}

      {/* Who-Reacted Analytics Modal (1:1 with components/feed/PostCard.tsx) */}
      <Modal
        visible={Boolean(reactionsModalPost)}
        transparent
        animationType="slide"
        onRequestClose={() => setReactionsModalPost(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setReactionsModalPost(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalSheet, { maxHeight: '75%' }]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Reactions</Text>
              <TouchableOpacity
                onPress={() => setReactionsModalPost(null)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs: All | ❤️ | 🙏 | 🤗 */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9',
              }}
            >
              {(['ALL', 'HEART', 'PRAY', 'HUG'] as const).map((tab) => {
                const postReactions = reactionsModalPost?.likes || [];
                const count =
                  tab === 'ALL'
                    ? postReactions.length
                    : postReactions.filter(
                        (r) =>
                          r.type === tab || (tab === 'HUG' && r.type === 'CARE')
                      ).length;
                if (count === 0 && tab !== 'ALL') return null;
                const isActive = reactionsModalTab === tab;
                const emojiMap: Record<string, string> = {
                  ALL: 'All',
                  HEART: '❤️',
                  PRAY: '🙏',
                  HUG: '🤗',
                };
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setReactionsModalTab(tab)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isActive ? 'rgba(78,177,203,0.14)' : 'transparent',
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isActive ? '#4EB1CB' : '#64748b',
                      }}
                    >
                      {emojiMap[tab]} {count}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Reactors List */}
            <ScrollView style={{ marginTop: 6 }} showsVerticalScrollIndicator={false}>
              {(reactionsModalPost?.likes || [])
                .filter(
                  (r) =>
                    reactionsModalTab === 'ALL' ||
                    r.type === reactionsModalTab ||
                    (reactionsModalTab === 'HUG' && r.type === 'CARE')
                )
                .map((r, idx) => {
                  const first = r.member?.firstName || '';
                  const last = r.member?.lastName || '';
                  const fullName = `${first} ${last}`.trim() || 'Church Member';
                  const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || 'M';
                  const avatarUri = getAvatarUrl(r.member?.avatar || r.member?.profilePicture);
                  const badgeEmoji =
                    r.type === 'PRAY' ? '🙏' : r.type === 'HUG' || r.type === 'CARE' ? '🤗' : '❤️';
                  return (
                    <TouchableOpacity
                      key={`${r.memberId}-${idx}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f8fafc',
                      }}
                      onPress={() => {
                        setReactionsModalPost(null);
                        if (r.memberId) {
                          router.push(`/church?tab=member&id=${r.memberId}` as any);
                        }
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: 'rgba(78,177,203,0.18)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                          }}
                        >
                          {avatarUri ? (
                            <Image
                              source={{ uri: avatarUri }}
                              style={{ width: 38, height: 38, borderRadius: 19 }}
                            />
                          ) : (
                            <Text style={{ color: '#4EB1CB', fontSize: 13, fontWeight: '800' }}>
                              {initials}
                            </Text>
                          )}
                          <View
                            style={{
                              position: 'absolute',
                              bottom: -2,
                              right: -2,
                              width: 17,
                              height: 17,
                              borderRadius: 9,
                              backgroundColor: '#ffffff',
                              alignItems: 'center',
                              justifyContent: 'center',
                              shadowColor: '#000',
                              shadowOpacity: 0.15,
                              shadowRadius: 2,
                              elevation: 2,
                            }}
                          >
                            <Text style={{ fontSize: 10 }}>{badgeEmoji}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>
                          {fullName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Post ••• Action Sheet */}
      <Modal
        visible={Boolean(moderationPost)}
        transparent
        animationType="fade"
        onRequestClose={() => setModerationPost(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModerationPost(null)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Post Options</Text>

            {user &&
              moderationPost &&
              (Number(user.id) === Number(moderationPost.author.id) ||
                user.role === 'admin' ||
                user.role === 'moderator') && (
                <>
                  <TouchableOpacity
                    style={styles.sheetOptionRow}
                    onPress={() => {
                      const target = moderationPost;
                      setModerationPost(null);
                      if (target) {
                        setEditingPost(target);
                        setEditPostText(target.content);
                      }
                    }}
                  >
                    <Text style={styles.sheetOptionText}>✏️ Edit Post</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sheetOptionRow}
                    onPress={() => setConfirmDeletePostOpen(true)}
                  >
                    <Text style={[styles.sheetOptionText, { color: '#ef4444' }]}>
                      🗑️ Delete Post
                    </Text>
                  </TouchableOpacity>
                </>
              )}

            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => {
                const target = moderationPost;
                setModerationPost(null);
                if (target) handleSharePost(target);
              }}
            >
              <Text style={styles.sheetOptionText}>🔗 Copy Link / Share Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => handleReportPost('Inappropriate or offensive content')}
            >
              <Text style={styles.sheetOptionText}>🚩 Report Post</Text>
            </TouchableOpacity>
            {(!user || Number(user.id) !== Number(moderationPost?.author.id)) && (
              <TouchableOpacity
                style={[styles.sheetOptionRow, { borderBottomWidth: 0 }]}
                onPress={() => setConfirmBlockOpen(true)}
              >
                <Text style={[styles.sheetOptionText, { color: '#ef4444' }]}>
                  🚫 Block {moderationPost?.author.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={Boolean(editingPost)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingPost(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeaderRow, { marginBottom: 12 }]}>
              <Text style={styles.modalTitle}>✏️ Edit Post</Text>
              <TouchableOpacity onPress={() => setEditingPost(null)}>
                <Text style={{ fontSize: 18, color: '#64748b', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 12,
                padding: 12,
                minHeight: 110,
                textAlignVertical: 'top',
                fontSize: 14,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                marginBottom: 14,
              }}
              multiline
              value={editPostText}
              onChangeText={setEditPostText}
              placeholder="Update your post..."
            />
            <TouchableOpacity
              style={{
                backgroundColor: '#4EB1CB',
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
              }}
              onPress={handleSaveEditPost}
              disabled={savingPostEdit}
            >
              {savingPostEdit ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen Photo Lightbox Modal */}
      <Modal
        visible={Boolean(lightboxState)}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxState(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.92)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 52,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.2)',
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setLightboxState(null)}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>✕</Text>
          </TouchableOpacity>
          {lightboxState && (
            <>
              <Image
                source={{ uri: lightboxState.images[lightboxState.index] }}
                style={{ width: '94%', height: '72%' }}
                resizeMode="contain"
              />
              {lightboxState.images.length > 1 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 20,
                    marginTop: 18,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 99,
                    }}
                    onPress={() =>
                      setLightboxState((prev) =>
                        prev
                          ? {
                              ...prev,
                              index:
                                (prev.index - 1 + prev.images.length) % prev.images.length,
                            }
                          : null
                      )
                    }
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>← Prev</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {lightboxState.index + 1} / {lightboxState.images.length}
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 99,
                    }}
                    onPress={() =>
                      setLightboxState((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index + 1) % prev.images.length,
                            }
                          : null
                      )
                    }
                  >
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Next →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmDeletePostOpen}
        title="Delete Post?"
        message="Are you sure you want to permanently delete this post?"
        confirmText="Delete Post"
        destructive
        onConfirm={handleConfirmDeletePost}
        onCancel={() => setConfirmDeletePostOpen(false)}
      />

      <ConfirmModal
        visible={confirmBlockOpen}
        title="Block Member?"
        message={`Posts from ${moderationPost?.author.name || 'this user'} will be hidden from your feed immediately.`}
        confirmText="Block User"
        destructive
        onConfirm={handleConfirmBlockUser}
        onCancel={() => setConfirmBlockOpen(false)}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 28 },

  // HeroCarousel (components/feed/HeroCarousel.tsx)
  heroCarousel: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 20,
    backgroundColor: '#2b8da6',
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDecorCircleTop: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroDecorCircleBottom: {
    position: 'absolute',
    bottom: -20,
    right: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroWelcomeSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  heroWelcomeName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroWelcomeVerse: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 18,
    marginBottom: 14,
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroPrimaryPill: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  heroPrimaryPillText: {
    color: '#4EB1CB',
    fontWeight: '700',
    fontSize: 13,
  },
  heroSecondaryPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 99,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  heroSecondaryPillText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  quizSlideBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  quizSlideBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.4,
  },
  quizSlideTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  quizSlideMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  quizSlideProgress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 14,
  },
  quizCatchupBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
  },
  quizCatchupBtnText: {
    color: '#1a7a94',
    fontWeight: '800',
    fontSize: 13.5,
  },
  slideTag: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  carouselDot: {
    height: 8,
    borderRadius: 99,
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: '#ffffff',
  },
  carouselDotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },

  // Quick-Action 8-Icon Bar (FeedClient.tsx)
  quickActionCard: {
    backgroundColor: '#ffffff',
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  quickActionScroll: {
    gap: 6,
    paddingHorizontal: 4,
  },
  quickActionItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  quickActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // Community Feed Header
  feedSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  feedPostPill: {
    backgroundColor: '#e0f7fb',
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  feedPostPillText: {
    color: '#4EB1CB',
    fontSize: 13,
    fontWeight: '700',
  },

  // PostCard (components/feed/PostCard.tsx)
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  postAuthorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  postAuthorAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postAuthorAvatarInitials: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  postAuthorName: {
    fontWeight: '700',
    fontSize: 14.5,
    color: '#1a1a2e',
  },
  postMetaRowText: {
    marginTop: 2,
    fontSize: 11.5,
  },
  postTimeText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  postDotText: {
    fontSize: 11,
    color: '#d1d5db',
  },
  postTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postBirthdayDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  postDotsBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  postDotsText: {
    fontSize: 16,
    color: '#9ca3af',
    letterSpacing: 1,
  },
  postTitleText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#1a1a2e',
    marginBottom: 6,
  },
  postBodyText: {
    fontSize: 14.5,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },

  // BIRTHDAY_DAILY Card (PostCard.tsx)
  bdayDailyCard: {
    backgroundColor: '#fef9c3',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  bdayAvatarOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    padding: 4,
    borderWidth: 2,
    borderColor: '#f59e0b',
    marginBottom: 12,
    position: 'relative',
  },
  bdayAvatarInner: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bdayAvatarImg: {
    width: '100%',
    height: '100%',
  },
  bdayAvatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  bdayConfettiBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#f59e0b',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  bdayCelebrantName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#78350f',
    marginBottom: 10,
    textAlign: 'center',
  },
  bdayBlessingMessage: {
    fontSize: 14.5,
    lineHeight: 23,
    color: '#451a03',
    textAlign: 'center',
    marginBottom: 16,
  },
  bdayVerseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    width: '100%',
  },
  bdayQuoteMark: {
    color: '#f59e0b',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 2,
  },
  bdayVerseText: {
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#92400e',
    lineHeight: 20,
    marginBottom: 6,
  },
  bdayVerseRef: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    textAlign: 'right',
  },

  // BIRTHDAY_MONTHLY Card
  bdayMonthlyListCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  bdayMonthlyListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 8,
  },
  bdayMonthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bdayMonthlyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
    width: '48%',
  },
  bdayMonthlyDayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bdayMonthlyDayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  bdayMonthlyChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },

  // EVENT Card
  eventPostCard: {
    backgroundColor: '#1e3a5f',
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  eventPostTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  eventPostLine: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginBottom: 4,
  },
  eventViewBtn: {
    marginTop: 10,
    backgroundColor: '#4EB1CB',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 99,
  },
  eventViewBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },

  // Colored Background Post
  bgPostCard: {
    minHeight: 220,
    borderRadius: 14,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgPostOverlay: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 12,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPostText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },

  // Standard Verse Box
  standardVerseBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4EB1CB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  standardVerseText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#1a5276',
    marginBottom: 4,
  },
  standardVerseRef: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4EB1CB',
  },
  postPhotoSingle: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  quizPostCtaBtn: {
    backgroundColor: '#4EB1CB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  quizPostCtaText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },

  // Reactions Summary & Action Bar
  reactionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reactionSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reactionSummaryCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  reactionSummaryComments: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reactionPopover: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  reactionOptionBtn: {
    padding: 6,
    borderRadius: 99,
  },
  reactionOptionBtnActive: {
    backgroundColor: '#f0f9ff',
  },
  postActionBar: {
    borderTopWidth: 1,
    borderTopColor: '#f0f4f8',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 99,
  },
  postActionBtnActive: {
    backgroundColor: '#f0f9ff',
  },
  postActionText: {
    fontSize: 13,
    color: '#6b7280',
  },

  // Guest Landing Styles (app/page.tsx)
  guestHeroBanner: {
    backgroundColor: '#2b8da6',
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  guestHeroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  guestHeroSubtitle: {
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 20,
    textAlign: 'center',
  },
  guestHeroBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  guestLoginBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 99,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  guestLoginBtnText: {
    color: '#1a7a94',
    fontWeight: '800',
    fontSize: 14,
  },
  guestJoinBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 99,
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  guestJoinBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
  },
  statCol: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#f0f4f8',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4EB1CB',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  guestVerseCard: {
    marginHorizontal: 14,
    marginTop: 16,
    backgroundColor: '#2b8da6',
    borderRadius: 16,
    padding: 18,
  },
  guestVerseHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginBottom: 6,
  },
  guestVerseQuote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#ffffff',
    lineHeight: 22,
    marginBottom: 8,
  },
  guestVerseRef: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  guestSectionWrap: {
    paddingHorizontal: 14,
    marginTop: 18,
  },
  publicFeatureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    width: 115,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f4f8',
  },
  publicFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  publicFeatureTitle: {
    fontWeight: '800',
    fontSize: 12,
    color: '#1e293b',
  },
  publicFeatureDesc: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  joinCtaCard: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
  },
  joinCtaTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0c4a6e',
    marginBottom: 6,
  },
  joinCtaSub: {
    fontSize: 13,
    color: '#0369a1',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  joinCtaBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  joinCtaPrimaryBtn: {
    backgroundColor: '#4EB1CB',
    borderRadius: 99,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  joinCtaPrimaryText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  joinCtaOutlineBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#4EB1CB',
    borderRadius: 99,
    paddingVertical: 11,
    paddingHorizontal: 22,
  },
  joinCtaOutlineText: {
    color: '#4EB1CB',
    fontWeight: '700',
    fontSize: 13,
  },
  darkFooter: {
    backgroundColor: '#1e293b',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  darkFooterBrand: {
    fontWeight: '800',
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 4,
  },
  darkFooterSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  darkFooterCopy: {
    fontSize: 11,
    color: '#475569',
  },

  // Empty & Modals
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 14,
    padding: 36,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  commentRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  commentDate: { fontSize: 11, color: '#94a3b8' },
  commentBody: { fontSize: 13, color: '#334155', lineHeight: 18 },
  noCommentsText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 13,
    paddingVertical: 20,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendCommentBtn: {
    backgroundColor: '#4EB1CB',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
});
