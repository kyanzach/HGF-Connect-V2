import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  ScrollView,
  AppState,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { SkeletonCircle, SkeletonBox } from '@/components/ui/SkeletonPulse';

const PRIMARY = '#4EB1CB';

export interface CommentAuthor {
  id: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  profilePicture?: string | null;
  avatar?: string | null;
}

export interface ReplyItem {
  id: number;
  postId?: number;
  parentId?: number;
  content: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  author: CommentAuthor;
}

export interface ThreadedCommentItem {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  isPinned?: boolean;
  likeCount: number;
  isLiked: boolean;
  author: CommentAuthor;
  replies: ReplyItem[];
}

export interface InlineReactionItem {
  id?: number;
  memberId?: number;
  type?: string;
  member?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    profilePicture?: string | null;
    avatar?: string | null;
  } | null;
}

interface InlineReactionsPanelProps {
  visible: boolean;
  likes: InlineReactionItem[];
  onClose: () => void;
}

export function InlineReactionsPanel({ visible, likes, onClose }: InlineReactionsPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'ALL' | 'HEART' | 'PRAY' | 'CARE'>('ALL');

  if (!visible) return null;

  const allLikes = Array.isArray(likes) ? likes : [];
  const heartCount = allLikes.filter(
    (l) => !l.type || l.type === 'HEART' || l.type === 'LIKE'
  ).length;
  const prayCount = allLikes.filter((l) => l.type === 'PRAY' || l.type === 'AMEN').length;
  const careCount = allLikes.filter((l) => l.type === 'CARE' || l.type === 'HUG').length;

  const filtered = allLikes.filter((l) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'HEART') return !l.type || l.type === 'HEART' || l.type === 'LIKE';
    if (activeTab === 'PRAY') return l.type === 'PRAY' || l.type === 'AMEN';
    if (activeTab === 'CARE') return l.type === 'CARE' || l.type === 'HUG';
    return true;
  });

  const tabs: Array<{ key: 'ALL' | 'HEART' | 'PRAY' | 'CARE'; label: string; count: number }> = [
    { key: 'ALL', label: 'All', count: allLikes.length },
    ...(heartCount > 0 ? [{ key: 'HEART' as const, label: '❤️', count: heartCount }] : []),
    ...(prayCount > 0 ? [{ key: 'PRAY' as const, label: '🙏', count: prayCount }] : []),
    ...(careCount > 0 ? [{ key: 'CARE' as const, label: '🤗', count: careCount }] : []),
  ];

  return (
    <View style={styles.reactionsInlineCard}>
      {/* Top Filter Pills + Close */}
      <View style={styles.reactionsHeaderRow}>
        <View style={styles.reactionsFilterRow}>
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.8}
                style={[
                  styles.reactionFilterPill,
                  isActive && styles.reactionFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.reactionFilterPillText,
                    isActive && styles.reactionFilterPillTextActive,
                  ]}
                >
                  {t.label} {t.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.reactionInlineCloseBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FontAwesome name="times" size={12} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Reactors Horizontal/Wrap Strip */}
      <View style={styles.reactorsChipWrap}>
        {filtered.map((item, idx) => {
          const rMem = item.member || {};
          const fullName =
            `${rMem.firstName || ''} ${rMem.lastName || ''}`.trim() || 'Church Member';
          const initials =
            `${(rMem.firstName || 'M')[0]}${(rMem.lastName || '')[0] || ''}`.toUpperCase();
          const rawPic = rMem.avatar || rMem.profilePicture;
          const avatarUri = rawPic
            ? rawPic.startsWith('http')
              ? rawPic
              : rawPic.startsWith('/uploads/')
              ? `https://connect.houseofgrace.ph${rawPic}`
              : `https://connect.houseofgrace.ph/uploads/profile_pictures/${rawPic}`
            : null;
          const badgeEmoji =
            item.type === 'PRAY' || item.type === 'AMEN'
              ? '🙏'
              : item.type === 'CARE' || item.type === 'HUG'
              ? '🤗'
              : '❤️';
          const targetId = item.memberId || rMem.id;

          return (
            <TouchableOpacity
              key={`${targetId || idx}-${idx}`}
              style={styles.reactorChip}
              activeOpacity={0.8}
              onPress={() => {
                if (targetId) {
                  router.push(`/church?tab=member&id=${targetId}` as any);
                }
              }}
            >
              <View style={styles.reactorAvatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.reactorAvatarImg} />
                ) : (
                  <View style={styles.reactorAvatarFallback}>
                    <Text style={styles.reactorAvatarInitials}>{initials}</Text>
                  </View>
                )}
                <View style={styles.reactorMiniBadge}>
                  <Text style={{ fontSize: 9 }}>{badgeEmoji}</Text>
                </View>
              </View>
              <Text style={styles.reactorChipName} numberOfLines={1}>
                {fullName}
              </Text>
              <FontAwesome name="angle-right" size={12} color="#94a3b8" />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface InlineCommentPreviewProps {
  visible: boolean;
  comments?: any[];
  totalCount: number;
  onExpand: () => void;
}

export function InlineCommentPreview({
  visible,
  comments,
  totalCount,
  onExpand,
}: InlineCommentPreviewProps) {
  const router = useRouter();
  if (!visible || !Array.isArray(comments) || comments.length === 0) return null;

  const shownRootAndReplies = comments.reduce(
    (sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0),
    0
  );
  const hasMoreToView = totalCount > shownRootAndReplies;

  return (
    <View style={styles.threadContainer}>
      {hasMoreToView && (
        <TouchableOpacity
          onPress={onExpand}
          activeOpacity={0.75}
          style={{ marginBottom: 8, paddingLeft: 2 }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#64748b' }}>
            View all {totalCount} comments
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.commentsList}>
        {comments.map((c: any) => {
          const author: CommentAuthor = c.author || { id: 0, name: 'Member' };
          const avatarUri = getAuthorAvatarUrl(author);
          const authorName = getAuthorDisplayName(author);
          const initials = (authorName[0] || 'M').toUpperCase();
          const replies = Array.isArray(c.replies) ? c.replies : [];
          const hasBranch = replies.length > 0;

          return (
            <View key={c.id} style={styles.commentGroup}>
              {c.isPinned && (
                <View style={styles.pinnedBadgeRow}>
                  <FontAwesome name="thumb-tack" size={11} color="#0284c7" />
                  <Text style={styles.pinnedBadgeText}>Pinned comment</Text>
                </View>
              )}

              <View style={styles.commentRow}>
                <View style={styles.avatarColumn}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (author.id) router.push(`/church?tab=member&id=${author.id}` as any);
                    }}
                  >
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarFallback}>
                        <Text style={styles.commentAvatarInitials}>{initials}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  {hasBranch && <View style={styles.threadVerticalSpine} />}
                </View>

                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={onExpand}
                    style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
                  >
                    <View
                      style={[
                        styles.commentBubble,
                        c.isPinned && styles.commentBubblePinned,
                      ]}
                    >
                      <Text
                        style={styles.commentAuthorName}
                        onPress={() => {
                          if (author.id) router.push(`/church?tab=member&id=${author.id}` as any);
                        }}
                      >
                        {authorName}
                      </Text>
                      <Text style={styles.commentBodyText}>{c.content}</Text>

                      {(c.likeCount || 0) > 0 && (
                        <View style={styles.floatingCommentLikePill}>
                          <Text style={{ fontSize: 10 }}>❤️</Text>
                          {c.likeCount > 1 && (
                            <Text style={styles.floatingCommentLikeCount}>{c.likeCount}</Text>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.commentMetaRow}>
                    <Text style={styles.commentTimeText}>{timeAgoShort(c.createdAt)}</Text>
                    <TouchableOpacity onPress={onExpand} style={styles.metaActionBtn}>
                      <Text style={styles.metaActionText}>Like</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onExpand} style={styles.metaActionBtn}>
                      <Text style={styles.metaActionText}>Reply</Text>
                    </TouchableOpacity>
                  </View>

                  {replies.length > 0 && (
                    <View style={styles.repliesListWrap}>
                      {replies.map((r: any) => {
                        const rAuthor: CommentAuthor = r.author || { id: 0, name: 'Member' };
                        const rAvatar = getAuthorAvatarUrl(rAuthor);
                        const rName = getAuthorDisplayName(rAuthor);
                        const rInit = (rName[0] || 'M').toUpperCase();
                        return (
                          <View key={r.id} style={styles.replyItemRow}>
                            <View style={styles.curvedBranchElbow} />
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                if (rAuthor.id) {
                                  router.push(`/church?tab=member&id=${rAuthor.id}` as any);
                                }
                              }}
                            >
                              {rAvatar ? (
                                <Image source={{ uri: rAvatar }} style={styles.replyAvatar} />
                              ) : (
                                <View style={styles.replyAvatarFallback}>
                                  <Text style={styles.replyAvatarInitials}>{rInit}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                              <TouchableOpacity
                                activeOpacity={0.88}
                                onPress={onExpand}
                                style={{ alignSelf: 'flex-start', maxWidth: '100%' }}
                              >
                                <View style={[styles.replyBubble, { paddingHorizontal: 11, paddingVertical: 7 }]}>
                                  <Text style={styles.commentAuthorName}>{rName}</Text>
                                  <Text style={styles.commentBodyText}>{r.content}</Text>
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface InlineCommentThreadProps {
  postId: number;
  postAuthorId: number;
  isOpen: boolean;
  highlightCommentId?: number | null;
  initialComments?: any[];
  onCommentCountChange?: (delta: number) => void;
  onSyncComments?: (totalCount: number, latest: ThreadedCommentItem[]) => void;
}

function timeAgoShort(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function getAuthorDisplayName(a: CommentAuthor): string {
  if (a.firstName || a.lastName) {
    return `${a.firstName || ''} ${a.lastName || ''}`.trim();
  }
  return a.name || 'Member';
}

function getAuthorAvatarUrl(a: CommentAuthor): string | null {
  const raw = a.avatar || a.profilePicture;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('/uploads/')) return `https://connect.houseofgrace.ph${raw}`;
  return `https://connect.houseofgrace.ph/uploads/profile_pictures/${raw}`;
}

function buildAuthorMap(authors: CommentAuthor[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of authors) {
    const full = getAuthorDisplayName(a);
    if (full) map[full] = a.id;
    const first = a.firstName || full.split(' ')[0];
    if (first && first !== full) map[first] = a.id;
    if (a.firstName && a.lastName) {
      const firstWordOfLast = a.lastName.split(' ')[0];
      if (firstWordOfLast) map[`${a.firstName} ${firstWordOfLast}`] = a.id;
    }
  }
  return map;
}

function resolveMentions(text: string, authorMap: Record<string, number>): number[] {
  const names = Object.keys(authorMap).sort((a, b) => b.length - a.length);
  if (!names.length) return [];
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`@(${escaped.join('|')})`, 'g');
  const ids = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const id = authorMap[m[1]];
    if (id) ids.add(id);
  }
  return Array.from(ids);
}

const QUICK_ENCOURAGEMENTS = [
  'Amen! 🙏',
  'Praise God! 🙌',
  'Praying for you ❤️',
  'God bless! ✨',
];

export default function InlineCommentThread({
  postId,
  postAuthorId,
  isOpen,
  highlightCommentId,
  initialComments,
  onCommentCountChange,
  onSyncComments,
}: InlineCommentThreadProps) {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  const [comments, setComments] = useState<ThreadedCommentItem[]>(() =>
    Array.isArray(initialComments) ? (initialComments as ThreadedCommentItem[]) : []
  );
  const [loading, setLoading] = useState(false);
  const [mainText, setMainText] = useState('');
  const [submittingMain, setSubmittingMain] = useState(false);
  const mainInputRef = useRef<any>(null);
  const onSyncRef = useRef(onSyncComments);
  onSyncRef.current = onSyncComments;

  // Inline Reply state: opens right under the parent comment thread being replied to
  const [replyTo, setReplyTo] = useState<{ parentId: number; authorName: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef<any>(null);

  // Delete confirmation modal
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadComments = useCallback(
    async (silent = false) => {
      if (!silent && comments.length === 0) {
        setLoading(true);
      }
      try {
        const { data } = await client.get(`/posts/${postId}/comments`);
        const payload = data?.data || data;
        const list: ThreadedCommentItem[] = (payload?.comments || []).map((c: any) => ({
          id: c.id,
          postId: c.postId || postId,
          content: c.content || '',
          createdAt: c.createdAt,
          isPinned: Boolean(c.isPinned),
          likeCount: c.likeCount ?? 0,
          isLiked: Boolean(c.isLiked),
          author: c.author || { id: 0, name: 'Member' },
          replies: (c.replies || []).map((r: any) => ({
            id: r.id,
            postId: r.postId || postId,
            parentId: c.id,
            content: r.content || '',
            createdAt: r.createdAt,
            likeCount: r.likeCount ?? 0,
            isLiked: Boolean(r.isLiked),
            author: r.author || { id: 0, name: 'Member' },
          })),
        }));
        setComments(list);
        const total = list.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);
        const pinned = list.filter((c) => c.isPinned);
        const unpinned = list.filter((c) => !c.isPinned).slice(-2);
        const preview = [...pinned, ...unpinned].slice(0, 2);
        onSyncRef.current?.(total, preview);
      } catch {
        // Keep existing comments if offline
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    if (!isOpen) return;
    loadComments(comments.length > 0);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadComments(true);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [isOpen, loadComments]);

  const allAuthors = useMemo(() => {
    const entries: Array<[number, CommentAuthor]> = [];
    for (const c of comments) {
      if (c.author?.id) entries.push([c.author.id, c.author]);
      for (const r of c.replies || []) {
        if (r.author?.id) entries.push([r.author.id, r.author]);
      }
    }
    return Array.from(new Map(entries).values());
  }, [comments]);

  const authorMap = useMemo(() => buildAuthorMap(allAuthors), [allAuthors]);

  const handleOpenReply = (author: CommentAuthor, parentCommentId: number) => {
    if (!user) {
      router.push('/login');
      return;
    }
    const name = getAuthorDisplayName(author);
    setReplyTo({ parentId: parentCommentId, authorName: name });
    setReplyText(`@${name} `);
    setTimeout(() => {
      replyInputRef.current?.focus();
    }, 100);
  };

  const handleSubmitMainComment = async (customText?: string) => {
    const textToSend = (customText ?? mainText).trim();
    if (!textToSend || submittingMain) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmittingMain(true);
    try {
      const mentionedMemberIds = resolveMentions(textToSend, authorMap);
      const { data } = await client.post(`/posts/${postId}/comments`, {
        content: textToSend,
        parentId: null,
        mentionedMemberIds,
      });
      const payload = data?.data || data;
      const created = payload?.comment || {
        id: payload?.commentId || Date.now(),
        postId,
        content: textToSend,
        createdAt: new Date().toISOString(),
        isPinned: false,
        likeCount: 0,
        isLiked: false,
        author: {
          id: Number(user.id),
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.fullName || 'You',
          profilePicture: user.profilePicture,
        },
        replies: [],
      };
      setComments((prev) => [
        ...prev,
        {
          ...created,
          isPinned: false,
          likeCount: 0,
          isLiked: false,
          replies: [],
        },
      ]);
      if (!customText) setMainText('');
      onCommentCountChange?.(1);
      loadComments(true);
    } finally {
      setSubmittingMain(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    if (!replyText.trim() || submittingReply) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmittingReply(true);
    try {
      const mentionedMemberIds = resolveMentions(replyText, authorMap);
      const { data } = await client.post(`/posts/${postId}/comments`, {
        content: replyText.trim(),
        parentId,
        mentionedMemberIds,
      });
      const payload = data?.data || data;
      const created = payload?.comment || {
        id: payload?.commentId || Date.now(),
        postId,
        parentId,
        content: replyText.trim(),
        createdAt: new Date().toISOString(),
        likeCount: 0,
        isLiked: false,
        author: {
          id: Number(user.id),
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.fullName || 'You',
          profilePicture: user.profilePicture,
        },
      };
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: [
                  ...(c.replies || []),
                  {
                    ...created,
                    likeCount: 0,
                    isLiked: false,
                  },
                ],
              }
            : c
        )
      );
      setReplyText('');
      setReplyTo(null);
      onCommentCountChange?.(1);
      loadComments(true);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleToggleLike = async (commentId: number, currentlyLiked: boolean) => {
    if (!user) {
      router.push('/login');
      return;
    }
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            isLiked: !currentlyLiked,
            likeCount: Math.max(0, c.likeCount + (currentlyLiked ? -1 : 1)),
          };
        }
        return {
          ...c,
          replies: (c.replies || []).map((r) =>
            r.id === commentId
              ? {
                  ...r,
                  isLiked: !currentlyLiked,
                  likeCount: Math.max(0, r.likeCount + (currentlyLiked ? -1 : 1)),
                }
              : r
          ),
        };
      })
    );

    try {
      await client.post(`/posts/${postId}/comments`, {
        action: 'like',
        commentId,
      });
    } catch {
      loadComments();
    }
  };

  const handleTogglePin = async (commentId: number, currentlyPinned: boolean) => {
    if (!user) return;
    const nextPinned = !currentlyPinned;
    setComments((prev) =>
      prev.map((c) => ({
        ...c,
        isPinned: c.id === commentId ? nextPinned : false,
      }))
    );
    try {
      await client.post(`/posts/${postId}/comments`, {
        action: nextPinned ? 'pin' : 'unpin',
        commentId,
      });
    } catch {
      loadComments();
    }
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    setDeleting(true);
    const targetId = commentToDelete;
    try {
      await client.post(`/posts/${postId}/comments`, {
        action: 'delete',
        commentId: targetId,
      });
      let removedCount = 1;
      setComments((prev) => {
        const parentTarget = prev.find((c) => c.id === targetId);
        if (parentTarget) {
          removedCount = 1 + (parentTarget.replies?.length || 0);
          return prev.filter((c) => c.id !== targetId);
        }
        return prev.map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => r.id !== targetId),
        }));
      });
      onCommentCountChange?.(-removedCount);
      loadComments(true);
    } finally {
      setDeleting(false);
      setCommentToDelete(null);
    }
  };

  const renderRichContent = (text: string) => {
    const names = Object.keys(authorMap).sort((a, b) => b.length - a.length);
    if (!names.length) {
      return <Text style={styles.commentBodyText}>{text}</Text>;
    }
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');
    const parts = text.split(regex);
    return (
      <Text style={styles.commentBodyText}>
        {parts.map((part, idx) => {
          if (part.startsWith('@')) {
            const nameKey = part.slice(1);
            const targetId = authorMap[nameKey];
            if (targetId) {
              return (
                <Text
                  key={idx}
                  style={styles.mentionText}
                  onPress={() => router.push(`/church?tab=member&id=${targetId}` as any)}
                >
                  {part}
                </Text>
              );
            }
          }
          return <Text key={idx}>{part}</Text>;
        })}
      </Text>
    );
  };

  if (!isOpen) return null;

  const sortedComments = [...comments].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const canPinOnPost =
    currentUserId !== null && (currentUserId === Number(postAuthorId) || isAdmin);

  const myAvatarUrl = user?.profilePicture
    ? user.profilePicture.startsWith('http')
      ? user.profilePicture
      : user.profilePicture.startsWith('/uploads/')
      ? `https://connect.houseofgrace.ph${user.profilePicture}`
      : `https://connect.houseofgrace.ph/uploads/profile_pictures/${user.profilePicture}`
    : null;
  const myInitials = (user?.firstName?.[0] || 'M').toUpperCase();

  return (
    <View style={styles.threadContainer}>
      {/* Skeleton Shimmer while loading */}
      {loading && comments.length === 0 ? (
        <View style={{ gap: 10, paddingVertical: 6 }}>
          {[1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <SkeletonCircle size={32} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width="72%" height={44} radius={16} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.commentsList}>
          {sortedComments.map((c) => {
            const authorName = getAuthorDisplayName(c.author);
            const avatarUrl = getAuthorAvatarUrl(c.author);
            const initials = (authorName[0] || 'M').toUpperCase();
            const canDeleteComment =
              currentUserId !== null &&
              (currentUserId === Number(c.author?.id) ||
                currentUserId === Number(postAuthorId) ||
                isAdmin);
            const isHighlighted = highlightCommentId && Number(highlightCommentId) === c.id;
            const isReplyingHere = replyTo?.parentId === c.id;
            const hasRepliesOrReplyBox =
              (c.replies && c.replies.length > 0) || isReplyingHere;

            return (
              <View key={c.id} style={styles.commentGroup}>
                {/* Pinned Indicator */}
                {c.isPinned && (
                  <View style={styles.pinnedBadgeRow}>
                    <FontAwesome name="thumb-tack" size={11} color="#0284c7" />
                    <Text style={styles.pinnedBadgeText}>Pinned comment</Text>
                  </View>
                )}

                {/* Parent Comment Row */}
                <View style={styles.commentRow}>
                  {/* Left Column: Avatar + Vertical Thread Spine if replies exist */}
                  <View style={styles.avatarColumn}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        if (c.author?.id) {
                          router.push(`/church?tab=member&id=${c.author.id}` as any);
                        }
                      }}
                    >
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.commentAvatar} />
                      ) : (
                        <View style={styles.commentAvatarFallback}>
                          <Text style={styles.commentAvatarInitials}>{initials}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    {hasRepliesOrReplyBox && <View style={styles.threadVerticalSpine} />}
                  </View>

                  {/* Right Column: Bubble + Meta + Nested Replies + Inline Reply Composer */}
                  <View style={{ flex: 1 }}>
                    <View style={{ alignSelf: 'flex-start', maxWidth: '100%', position: 'relative' }}>
                      <View
                        style={[
                          styles.commentBubble,
                          c.isPinned && styles.commentBubblePinned,
                          isHighlighted ? styles.commentBubbleHighlight : null,
                        ]}
                      >
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            if (c.author?.id) {
                              router.push(`/church?tab=member&id=${c.author.id}` as any);
                            }
                          }}
                        >
                          <Text style={styles.commentAuthorName}>{authorName}</Text>
                        </TouchableOpacity>
                        {renderRichContent(c.content)}
                      </View>

                      {/* Floating Corner Reaction Pill (Facebook/Instagram style) */}
                      {c.likeCount > 0 && (
                        <TouchableOpacity
                          onPress={() => handleToggleLike(c.id, c.isLiked)}
                          style={styles.floatingCommentLikePill}
                          activeOpacity={0.8}
                        >
                          <Text style={{ fontSize: 10 }}>❤️</Text>
                          {c.likeCount > 1 && (
                            <Text style={styles.floatingCommentLikeCount}>{c.likeCount}</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Comment Action Row: 2h · Like · Reply · Pin · Delete */}
                    <View style={styles.commentMetaRow}>
                      <Text style={styles.commentTimeText}>{timeAgoShort(c.createdAt)}</Text>

                      <TouchableOpacity
                        onPress={() => handleToggleLike(c.id, c.isLiked)}
                        style={styles.metaActionBtn}
                      >
                        <Text
                          style={[
                            styles.metaActionText,
                            c.isLiked && { color: '#e11d48', fontWeight: '800' },
                          ]}
                        >
                          Like
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleOpenReply(c.author, c.id)}
                        style={styles.metaActionBtn}
                      >
                        <Text
                          style={[
                            styles.metaActionText,
                            isReplyingHere && { color: PRIMARY, fontWeight: '800' },
                          ]}
                        >
                          Reply
                        </Text>
                      </TouchableOpacity>

                      {canPinOnPost && (
                        <TouchableOpacity
                          onPress={() => handleTogglePin(c.id, Boolean(c.isPinned))}
                          style={styles.metaActionBtn}
                        >
                          <Text
                            style={[
                              styles.metaActionText,
                              c.isPinned && { color: PRIMARY, fontWeight: '800' },
                            ]}
                          >
                            {c.isPinned ? 'Unpin' : 'Pin'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {canDeleteComment && (
                        <TouchableOpacity
                          onPress={() => setCommentToDelete(c.id)}
                          style={styles.metaActionBtn}
                        >
                          <Text style={[styles.metaActionText, { color: '#94a3b8' }]}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Nested Replies with Curved Thread Connector (╰──) */}
                    {c.replies && c.replies.length > 0 && (
                      <View style={styles.repliesListWrap}>
                        {c.replies.map((r) => {
                          const rName = getAuthorDisplayName(r.author);
                          const rAvatar = getAuthorAvatarUrl(r.author);
                          const rInit = (rName[0] || 'M').toUpperCase();
                          const canDeleteReply =
                            currentUserId !== null &&
                            (currentUserId === Number(r.author?.id) ||
                              currentUserId === Number(postAuthorId) ||
                              isAdmin);

                          return (
                            <View key={r.id} style={styles.replyItemRow}>
                              {/* Curved L-Connector from Parent Spine */}
                              <View style={styles.curvedBranchElbow} />

                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                  if (r.author?.id) {
                                    router.push(`/church?tab=member&id=${r.author.id}` as any);
                                  }
                                }}
                              >
                                {rAvatar ? (
                                  <Image source={{ uri: rAvatar }} style={styles.replyAvatar} />
                                ) : (
                                  <View style={styles.replyAvatarFallback}>
                                    <Text style={styles.replyAvatarInitials}>{rInit}</Text>
                                  </View>
                                )}
                              </TouchableOpacity>

                              <View style={{ flex: 1 }}>
                                <View style={{ alignSelf: 'flex-start', maxWidth: '100%', position: 'relative' }}>
                                  <View style={styles.replyBubble}>
                                    <TouchableOpacity
                                      activeOpacity={0.8}
                                      onPress={() => {
                                        if (r.author?.id) {
                                          router.push(`/church?tab=member&id=${r.author.id}` as any);
                                        }
                                      }}
                                    >
                                      <Text style={styles.replyAuthorName}>{rName}</Text>
                                    </TouchableOpacity>
                                    {renderRichContent(r.content)}
                                  </View>

                                  {r.likeCount > 0 && (
                                    <TouchableOpacity
                                      onPress={() => handleToggleLike(r.id, r.isLiked)}
                                      style={styles.floatingCommentLikePill}
                                      activeOpacity={0.8}
                                    >
                                      <Text style={{ fontSize: 9.5 }}>❤️</Text>
                                      {r.likeCount > 1 && (
                                        <Text style={styles.floatingCommentLikeCount}>{r.likeCount}</Text>
                                      )}
                                    </TouchableOpacity>
                                  )}
                                </View>

                                <View style={styles.commentMetaRow}>
                                  <Text style={styles.commentTimeText}>
                                    {timeAgoShort(r.createdAt)}
                                  </Text>

                                  <TouchableOpacity
                                    onPress={() => handleToggleLike(r.id, r.isLiked)}
                                    style={styles.metaActionBtn}
                                  >
                                    <Text
                                      style={[
                                        styles.metaActionText,
                                        r.isLiked && { color: '#e11d48', fontWeight: '800' },
                                      ]}
                                    >
                                      Like
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => handleOpenReply(r.author, c.id)}
                                    style={styles.metaActionBtn}
                                  >
                                    <Text style={styles.metaActionText}>Reply</Text>
                                  </TouchableOpacity>

                                  {canDeleteReply && (
                                    <TouchableOpacity
                                      onPress={() => setCommentToDelete(r.id)}
                                      style={styles.metaActionBtn}
                                    >
                                      <Text style={[styles.metaActionText, { color: '#94a3b8' }]}>
                                        Delete
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* INLINE REPLY COMPOSER right under this exact thread with Curved Elbow (╰──) */}
                    {isReplyingHere && (
                      <View style={styles.inlineReplyBoxWrap}>
                        <View style={styles.curvedBranchElbowReply} />
                        {myAvatarUrl ? (
                          <Image source={{ uri: myAvatarUrl }} style={styles.replyAvatar} />
                        ) : (
                          <View style={styles.replyAvatarFallback}>
                            <Text style={styles.replyAvatarInitials}>{myInitials}</Text>
                          </View>
                        )}
                        <View style={styles.inlineReplyPill}>
                          <TextInput
                            ref={replyInputRef}
                            style={styles.inlineReplyInput}
                            placeholder={`Reply to ${replyTo.authorName}...`}
                            placeholderTextColor="#94a3b8"
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            maxLength={600}
                          />
                          <TouchableOpacity
                            onPress={() => {
                              setReplyTo(null);
                              setReplyText('');
                            }}
                            style={styles.inlineReplyCancelIcon}
                            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          >
                            <FontAwesome name="times-circle" size={15} color="#94a3b8" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.inlineReplySendBtn,
                              (!replyText.trim() || submittingReply) && { opacity: 0.4 },
                            ]}
                            onPress={() => handleSubmitReply(c.id)}
                            disabled={!replyText.trim() || submittingReply}
                          >
                            {submittingReply ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <FontAwesome name="paper-plane" size={11} color="#ffffff" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 1-Tap Quick Encouragement Chips (shown when thread is open for instant modern interaction) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickChipsRow}
      >
        {QUICK_ENCOURAGEMENTS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={styles.quickChipPill}
            activeOpacity={0.75}
            onPress={() => handleSubmitMainComment(chip)}
          >
            <Text style={styles.quickChipText}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Main Inline Comment Input Pill at Bottom of Card */}
      <View style={styles.mainComposerRow}>
        {myAvatarUrl ? (
          <Image source={{ uri: myAvatarUrl }} style={styles.composerAvatar} />
        ) : (
          <View style={styles.composerAvatarFallback}>
            <Text style={styles.composerAvatarInitials}>{myInitials}</Text>
          </View>
        )}

        <View style={styles.mainInputPill}>
          <TextInput
            ref={mainInputRef}
            style={styles.mainTextInput}
            placeholder="Write a comment..."
            placeholderTextColor="#94a3b8"
            value={mainText}
            onChangeText={setMainText}
            multiline
            maxLength={800}
          />
          <TouchableOpacity
            style={[
              styles.mainSendBtn,
              (!mainText.trim() || submittingMain) && {
                backgroundColor: '#e2e8f0',
              },
            ]}
            onPress={() => handleSubmitMainComment()}
            disabled={!mainText.trim() || submittingMain}
          >
            {submittingMain ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <FontAwesome
                name="paper-plane"
                size={12}
                color={mainText.trim() ? '#ffffff' : '#94a3b8'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Comment ConfirmModal */}
      <ConfirmModal
        visible={commentToDelete !== null}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment?"
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setCommentToDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Inline Reactions Panel (Replaces Bottom-Up Slider) ── */
  reactionsInlineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  reactionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reactionsFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  reactionFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reactionFilterPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  reactionFilterPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  reactionFilterPillTextActive: {
    color: '#ffffff',
  },
  reactionInlineCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactorsChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reactorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reactorAvatarWrap: {
    width: 24,
    height: 24,
    position: 'relative',
  },
  reactorAvatarImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  reactorAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(78,177,203,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactorAvatarInitials: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY,
  },
  reactorMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  reactorChipName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: 140,
  },

  /* ── Modern Threaded Comments ── */
  threadContainer: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  commentsList: {
    gap: 12,
    marginBottom: 8,
  },
  commentGroup: {
    width: '100%',
  },
  pinnedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 42,
    marginBottom: 3,
  },
  pinnedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatarColumn: {
    alignItems: 'center',
    width: 34,
  },
  threadVerticalSpine: {
    flex: 1,
    width: 2,
    backgroundColor: '#e2e8f0',
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 1,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2e8f0',
  },
  commentAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(78,177,203,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarInitials: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },
  commentBubble: {
    backgroundColor: '#F0F2F5',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  commentBubblePinned: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  commentBubbleHighlight: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  commentAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 1,
  },
  commentBodyText: {
    fontSize: 13.5,
    color: '#1e293b',
    lineHeight: 19,
  },
  mentionText: {
    color: '#0284c7',
    fontWeight: '700',
  },
  floatingCommentLikePill: {
    position: 'absolute',
    bottom: -7,
    right: -6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  floatingCommentLikeCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    paddingLeft: 10,
  },
  commentTimeText: {
    fontSize: 11.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metaActionBtn: {
    paddingVertical: 1,
  },
  metaActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  repliesListWrap: {
    marginTop: 8,
    gap: 8,
  },
  replyItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    position: 'relative',
  },
  curvedBranchElbow: {
    width: 14,
    height: 16,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 10,
    marginLeft: -25,
    marginRight: 3,
    marginTop: -4,
  },
  curvedBranchElbowReply: {
    width: 14,
    height: 18,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#cbd5e1',
    borderBottomLeftRadius: 10,
    marginLeft: -25,
    marginRight: 3,
    marginTop: -6,
  },
  replyAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e2e8f0',
  },
  replyAvatarFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(78,177,203,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyAvatarInitials: {
    fontSize: 10.5,
    fontWeight: '800',
    color: PRIMARY,
  },
  replyBubble: {
    backgroundColor: '#F0F2F5',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  replyAuthorName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 1,
  },
  inlineReplyBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 8,
  },
  inlineReplyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PRIMARY,
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 4,
    gap: 6,
  },
  inlineReplyInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    maxHeight: 80,
    paddingVertical: 3,
  },
  inlineReplyCancelIcon: {
    paddingHorizontal: 2,
  },
  inlineReplySendBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  quickChipPill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  mainComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  composerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(78,177,203,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarInitials: {
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY,
  },
  mainInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
    borderRadius: 22,
    paddingLeft: 14,
    paddingRight: 5,
    paddingVertical: 4,
    gap: 6,
  },
  mainTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    maxHeight: 90,
    paddingVertical: 4,
  },
  mainSendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
