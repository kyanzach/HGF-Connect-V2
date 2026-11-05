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
import ConfirmModal from '@/components/ui/ConfirmModal';

interface FeedPost {
  id: number;
  type: string;
  content: string;
  verseRef?: string | null;
  verseText?: string | null;
  images: string[];
  createdAt: string;
  author: {
    id: number;
    name: string;
    username?: string | null;
    role: string;
    avatar?: string | null;
  };
  likeCount: number;
  commentCount: number;
  myReaction?: string | null;
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

const DAILY_VERSES = [
  {
    text: 'Trust in the Lord with all your heart and lean not on your own understanding.',
    reference: 'Proverbs 3:5',
  },
  {
    text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you.',
    reference: 'Joshua 1:9',
  },
  {
    text: 'Cast all your anxiety on him because he cares for you.',
    reference: '1 Peter 5:7',
  },
];

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<number[]>([]);
  const [stats, setStats] = useState({ memberCount: 472, upcomingCount: 0, ministryCount: 12 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Composer Modal
  const [composeOpen, setComposeOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [verseRef, setVerseRef] = useState('');
  const [posting, setPosting] = useState(false);

  // Comments Modal
  const [activePost, setActivePost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // UGC Safety Menu (Apple Guideline 1.2)
  const [moderationPost, setModerationPost] = useState<FeedPost | null>(null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ visible: false, type: 'info', title: '', message: '' });

  const showAlert = (type: AlertType, title: string, message: string) => {
    setAlertModal({ visible: true, type, title, message });
  };

  const loadFeed = useCallback(async () => {
    try {
      const [feedRes, eventsRes] = await Promise.all([
        client.get('/feed?limit=25'),
        client.get('/events').catch(() => null),
      ]);
      if (feedRes.data?.success) {
        setPosts(feedRes.data.data?.posts || []);
      }
      if (eventsRes?.data?.success && eventsRes.data.data?.stats) {
        setStats(eventsRes.data.data.stats);
      }
    } catch {
      // ignore offline error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleReact = async (post: FeedPost, reactionType: string) => {
    if (!user) {
      router.push('/login' as any);
      return;
    }
    try {
      const res = await client.post(`/posts/${post.id}/react`, { type: reactionType });
      if (res.data?.success) {
        const { myReaction, likeCount } = res.data.data;
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, myReaction, likeCount } : p))
        );
      }
    } catch {
      showAlert('error', 'Action Failed', 'Unable to update reaction right now.');
    }
  };

  const openComments = async (post: FeedPost) => {
    setActivePost(post);
    setComments([]);
    setLoadingComments(true);
    try {
      const res = await client.get(`/posts/${post.id}/comments`);
      if (res.data?.success) {
        setComments(res.data.data?.comments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!user) {
      setActivePost(null);
      router.push('/login' as any);
      return;
    }
    if (!activePost || !commentText.trim()) return;

    setSendingComment(true);
    try {
      const res = await client.post(`/posts/${activePost.id}/comments`, {
        content: commentText.trim(),
      });
      if (res.data?.success) {
        setCommentText('');
        const refreshed = await client.get(`/posts/${activePost.id}/comments`);
        if (refreshed.data?.success) {
          const list = refreshed.data.data?.comments || [];
          setComments(list);
          setPosts((prev) =>
            prev.map((p) => (p.id === activePost.id ? { ...p, commentCount: list.length } : p))
          );
        }
      }
    } catch {
      showAlert('error', 'Comment Failed', 'Could not post your comment.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleCreatePost = async () => {
    if (!user) {
      setComposeOpen(false);
      router.push('/login' as any);
      return;
    }
    if (!postContent.trim()) {
      showAlert('warning', 'Empty Post', 'Please write a message or reflection to share.');
      return;
    }

    setPosting(true);
    try {
      const res = await client.post('/feed', {
        content: postContent.trim(),
        verseRef: verseRef.trim() || null,
      });
      if (res.data?.success) {
        setPostContent('');
        setVerseRef('');
        setComposeOpen(false);
        loadFeed();
        showAlert('success', 'Post Published', 'Your post is now live on the HGF Connect feed.');
      }
    } catch (err: any) {
      showAlert(
        'error',
        'Post Failed',
        err.response?.data?.message || 'Could not publish your post.'
      );
    } finally {
      setPosting(false);
    }
  };

  const handleReportPost = async (reason: string) => {
    if (!moderationPost) return;
    const target = moderationPost;
    setModerationPost(null);
    try {
      const res = await client.post('/moderation', {
        action: 'report',
        targetType: 'post',
        targetId: target.id,
        reason,
      });
      showAlert(
        'success',
        'Content Reported',
        res.data?.message ||
          'Thank you. Our moderation team reviews all flagged content within 24 hours.'
      );
    } catch {
      showAlert('success', 'Content Reported', 'Thank you. Our team will review this post.');
    }
  };

  const handleBlockAuthor = async () => {
    if (!moderationPost) return;
    const authorId = moderationPost.author.id;
    const authorName = moderationPost.author.name;
    setConfirmBlockOpen(false);
    setModerationPost(null);
    setBlockedAuthorIds((prev) => [...prev, authorId]);
    try {
      await client.post('/moderation', {
        action: 'block',
        targetType: 'member',
        targetId: authorId,
        reason: 'Blocked by user in feed',
      });
    } catch {
      // ignore
    }
    showAlert(
      'info',
      'User Blocked',
      `${authorName} has been blocked and their posts are now hidden from your feed.`
    );
  };

  const formatPostContent = (post: FeedPost) => {
    if (post.type === 'BIRTHDAY_DAILY' || post.type === 'BIRTHDAY_MONTHLY') {
      try {
        const parsed = JSON.parse(post.content);
        if (parsed.message) return parsed.message;
        if (parsed.month && Array.isArray(parsed.celebrants)) {
          return `Celebrating ${parsed.celebrants.length} church family birthdays in ${parsed.month}!`;
        }
      } catch {
        // fallback to plain text
      }
    }
    return post.content;
  };

  const formatTimeAgo = (iso: string) => {
    try {
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const visiblePosts = posts.filter((p) => !blockedAuthorIds.includes(p.author.id));
  const verse = DAILY_VERSES[new Date().getDate() % DAILY_VERSES.length];

  const renderHeader = () => (
    <View>
      {/* Hero Banner */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>HGF Connect Community</Text>
        <Text style={styles.heroSub}>
          Grow in faith, fellowship, and prayer with House of Grace.
        </Text>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/church?tab=directory' as any)}
          >
            <Text style={styles.statNum}>{stats.memberCount}+</Text>
            <Text style={styles.statLabel}>Members</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/(tabs)/events' as any)}
          >
            <Text style={styles.statNum}>{stats.upcomingCount}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push('/church?tab=ministries' as any)}
          >
            <Text style={styles.statNum}>{stats.ministryCount}</Text>
            <Text style={styles.statLabel}>Ministries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Church Hub Action Bar */}
      <View style={styles.quickHubRow}>
        {[
          { label: 'Directory', icon: 'users', route: '/church?tab=directory' },
          { label: 'Ministries', icon: 'sitemap', route: '/church?tab=ministries' },
          { label: 'Quiz Hub', icon: 'trophy', route: '/church?tab=quiz' },
          { label: 'Grace AI', icon: 'comments-o', route: '/church?tab=ai' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.quickHubPill}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.85}
          >
            <View style={styles.quickHubIconWrap}>
              <FontAwesome name={item.icon as any} size={14} color="#0e7490" />
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.quickHubText}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Daily Verse Card */}
      <View style={styles.verseCard}>
        <View style={styles.verseHeader}>
          <FontAwesome name="book" size={13} color="#0e7490" />
          <Text style={styles.verseBadgeText}>Daily Scripture</Text>
        </View>
        <Text style={styles.verseQuote}>&ldquo;{verse.text}&rdquo;</Text>
        <Text style={styles.verseRefText}>&mdash; {verse.reference}</Text>
      </View>

      {/* Share / Compose Bar */}
      <TouchableOpacity
        style={styles.composeBar}
        onPress={() => {
          if (!user) {
            router.push('/login' as any);
          } else {
            setComposeOpen(true);
          }
        }}
        activeOpacity={0.85}
      >
        <View style={styles.composeAvatar}>
          <FontAwesome name="pencil" size={15} color="#0e7490" />
        </View>
        <Text numberOfLines={1} style={styles.composePrompt}>
          {user
            ? `Share a testimony, verse, or update, ${user.firstName}...`
            : 'Sign in to share a testimony or prayer with the church...'}
        </Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Community Feed</Text>
        <Text style={styles.sectionSub}>Latest church posts &amp; reflections</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#4EB1CB" />
          <Text style={styles.loaderText}>Loading HGF Connect feed...</Text>
        </View>
      ) : (
        <FlatList
          data={visiblePosts}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFeed();
              }}
              tintColor="#4EB1CB"
            />
          }
          renderItem={({ item: post }) => {
            const text = formatPostContent(post);
            return (
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.authorAvatar}>
                    {post.author.avatar ? (
                      <Image source={{ uri: post.author.avatar }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarInitials}>
                        {(post.author.name?.[0] || 'M').toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{post.author.name}</Text>
                      {post.author.role === 'admin' || post.author.role === 'moderator' ? (
                        <View style={styles.rolePill}>
                          <Text style={styles.rolePillText}>{post.author.role}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.postTime}>{formatTimeAgo(post.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => setModerationPost(post)}
                  >
                    <FontAwesome name="ellipsis-h" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>

                {text ? <Text style={styles.postBody}>{text}</Text> : null}

                {post.verseRef ? (
                  <View style={styles.postVerseBox}>
                    {post.verseText ? (
                      <Text style={styles.postVerseBody}>&ldquo;{post.verseText}&rdquo;</Text>
                    ) : null}
                    <Text style={styles.postVerseRef}>{post.verseRef}</Text>
                  </View>
                ) : null}

                {post.images && post.images.length > 0 ? (
                  <Image
                    source={{ uri: post.images[0] }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.postFooter}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      post.myReaction === 'HEART' && styles.actionBtnActive,
                    ]}
                    onPress={() => handleReact(post, 'HEART')}
                  >
                    <FontAwesome
                      name={post.myReaction ? 'heart' : 'heart-o'}
                      size={14}
                      color={post.myReaction ? '#0e7490' : '#64748b'}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.actionBtnText,
                        post.myReaction ? styles.actionBtnTextActive : null,
                      ]}
                    >
                      Love {post.likeCount > 0 ? `(${post.likeCount})` : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      post.myReaction === 'AMEN' && styles.actionBtnActive,
                    ]}
                    onPress={() => handleReact(post, 'AMEN')}
                  >
                    <FontAwesome
                      name="check-circle-o"
                      size={14}
                      color={post.myReaction === 'AMEN' ? '#0e7490' : '#64748b'}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.actionBtnText,
                        post.myReaction === 'AMEN' ? styles.actionBtnTextActive : null,
                      ]}
                    >
                      Amen
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openComments(post)}
                  >
                    <FontAwesome name="comment-o" size={14} color="#64748b" />
                    <Text numberOfLines={1} style={styles.actionBtnText}>
                      Comments {post.commentCount > 0 ? `(${post.commentCount})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Compose Post Modal */}
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
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity onPress={() => setComposeOpen(false)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.composeInput}
              placeholder="Share an encouragement, testimony, or update..."
              placeholderTextColor="#94a3b8"
              multiline
              value={postContent}
              onChangeText={setPostContent}
            />
            <TextInput
              style={styles.verseInput}
              placeholder="Optional Bible Verse Reference (e.g. Psalm 23:1)"
              placeholderTextColor="#94a3b8"
              value={verseRef}
              onChangeText={setVerseRef}
            />
            <TouchableOpacity
              style={[styles.publishBtn, posting && { opacity: 0.7 }]}
              onPress={handleCreatePost}
              disabled={posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text numberOfLines={1} adjustsFontSizeToFit style={styles.publishBtnText}>
                  Publish to Feed
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Sheet Modal */}
      <Modal
        visible={activePost !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePost(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setActivePost(null)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#4EB1CB" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                ListEmptyComponent={
                  <Text style={styles.emptyComments}>
                    No comments yet. Be the first to encourage!
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentAuthor}>{item.author.name}</Text>
                    <Text style={styles.commentBody}>{item.content}</Text>
                  </View>
                )}
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#94a3b8"
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={styles.sendCommentBtn}
                onPress={handleSendComment}
                disabled={sendingComment}
              >
                <FontAwesome name="paper-plane" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* UGC Report / Block Action Sheet (Apple Guideline 1.2) */}
      <Modal
        visible={moderationPost !== null && !confirmBlockOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModerationPost(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Community Safety</Text>
              <TouchableOpacity onPress={() => setModerationPost(null)}>
                <FontAwesome name="times" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.safetySub}>
              Report objectionable content or block this member from your feed.
            </Text>

            <TouchableOpacity
              style={styles.safetyOption}
              onPress={() => handleReportPost('Inappropriate or offensive content')}
            >
              <FontAwesome name="flag-o" size={16} color="#0f172a" />
              <Text style={styles.safetyOptionText}>Report as Inappropriate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.safetyOption}
              onPress={() => handleReportPost('Spam or misleading post')}
            >
              <FontAwesome name="exclamation-circle" size={16} color="#0f172a" />
              <Text style={styles.safetyOptionText}>Report as Spam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.safetyOption, { borderBottomWidth: 0 }]}
              onPress={() => setConfirmBlockOpen(true)}
            >
              <FontAwesome name="ban" size={16} color="#dc2626" />
              <Text style={[styles.safetyOptionText, { color: '#dc2626' }]}>
                Block {moderationPost?.author.name}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={confirmBlockOpen}
        title="Block Member?"
        message={`Posts and comments from ${moderationPost?.author.name || 'this user'} will be immediately hidden from your feed.`}
        confirmText="Block User"
        destructive
        onCancel={() => setConfirmBlockOpen(false)}
        onConfirm={handleBlockAuthor}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  quickHubRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickHubPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickHubIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickHubText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  listContent: {
    padding: 14,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0f2d3d',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSub: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4EB1CB',
  },
  statLabel: {
    fontSize: 11,
    color: '#e2e8f0',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  verseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4EB1CB',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  verseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
    textTransform: 'uppercase',
  },
  verseQuote: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#1e293b',
    lineHeight: 19,
  },
  verseRefText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 6,
  },
  composeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  composeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composePrompt: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0e7490',
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  rolePill: {
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0e7490',
    textTransform: 'capitalize',
  },
  postTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  moreBtn: {
    padding: 6,
  },
  postBody: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 10,
  },
  postVerseBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4EB1CB',
    marginBottom: 10,
  },
  postVerseBody: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#334155',
    marginBottom: 4,
  },
  postVerseRef: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0e7490',
  },
  postImage: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  actionBtnActive: {
    backgroundColor: '#e0f7fb',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  actionBtnTextActive: {
    color: '#0e7490',
    fontWeight: '700',
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
  composeInput: {
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  verseInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 14,
  },
  publishBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyComments: {
    textAlign: 'center',
    color: '#94a3b8',
    paddingVertical: 24,
    fontSize: 13,
  },
  commentItem: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  commentBody: {
    fontSize: 13,
    color: '#334155',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 21,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0f172a',
  },
  sendCommentBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetySub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  safetyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  safetyOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
});
