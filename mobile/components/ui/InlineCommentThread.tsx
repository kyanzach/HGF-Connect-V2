import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
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

interface InlineCommentThreadProps {
  postId: number;
  postAuthorId: number;
  isOpen: boolean;
  highlightCommentId?: number | null;
  onCommentCountChange?: (delta: number) => void;
}

function timeAgoShort(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
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

export default function InlineCommentThread({
  postId,
  postAuthorId,
  isOpen,
  highlightCommentId,
  onCommentCountChange,
}: InlineCommentThreadProps) {
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id ? Number(user.id) : null;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  const [comments, setComments] = useState<ThreadedCommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainText, setMainText] = useState('');
  const [submittingMain, setSubmittingMain] = useState(false);

  // Inline Reply state: opens right under the parent comment thread being replied to
  const [replyTo, setReplyTo] = useState<{ parentId: number; authorName: string } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const replyInputRef = useRef<TextInput>(null);

  // Delete confirmation modal
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadComments = useCallback(async () => {
    setLoading(true);
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
    } catch {
      // Keep existing comments if offline
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
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

  const handleSubmitMainComment = async () => {
    if (!mainText.trim() || submittingMain) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmittingMain(true);
    try {
      const mentionedMemberIds = resolveMentions(mainText, authorMap);
      const { data } = await client.post(`/posts/${postId}/comments`, {
        content: mainText.trim(),
        parentId: null,
        mentionedMemberIds,
      });
      const payload = data?.data || data;
      const created = payload?.comment || {
        id: payload?.commentId || Date.now(),
        postId,
        content: mainText.trim(),
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
      setMainText('');
      onCommentCountChange?.(1);
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
      await client.post(`/posts/${postId}/comments`, { action: 'like', commentId });
    } catch {
      // Revert or refresh silently
    }
  };

  const handleTogglePin = async (commentId: number, currentlyPinned: boolean) => {
    if (!user) return;
    const nextPin = !currentlyPinned;
    setComments((prev) =>
      prev
        .map((c) => ({
          ...c,
          isPinned: c.id === commentId ? nextPin : nextPin ? false : c.isPinned,
        }))
        .sort(
          (a, b) =>
            (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
    );
    try {
      await client.post(`/posts/${postId}/comments`, {
        action: currentlyPinned ? 'unpin' : 'pin',
        commentId,
      });
    } catch {
      loadComments();
    }
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    const targetId = commentToDelete;
    setDeleting(true);
    try {
      await client.post(`/posts/${postId}/comments`, {
        action: 'delete',
        commentId: targetId,
      });
      const isTop = comments.some((c) => c.id === targetId);
      if (isTop) {
        const targetObj = comments.find((c) => c.id === targetId);
        const removedCount = 1 + (targetObj?.replies?.length || 0);
        setComments((prev) => prev.filter((c) => c.id !== targetId));
        onCommentCountChange?.(-removedCount);
      } else {
        setComments((prev) =>
          prev.map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== targetId),
          }))
        );
        onCommentCountChange?.(-1);
      }
    } finally {
      setDeleting(false);
      setCommentToDelete(null);
    }
  };

  const renderFormattedContent = (text: string) => {
    const names = Object.keys(authorMap).sort((a, b) => b.length - a.length);
    if (names.length === 0) {
      return <Text style={styles.commentBodyText}>{text}</Text>;
    }
    const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`@(${escaped.join('|')})`, 'g');
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) {
        parts.push(
          <Text key={`t-${key++}`} style={styles.commentBodyText}>
            {text.slice(last, m.index)}
          </Text>
        );
      }
      const matchedName = m[1];
      const targetMemberId = authorMap[matchedName];
      parts.push(
        <Text
          key={`m-${key++}`}
          style={styles.mentionText}
          onPress={() => {
            if (targetMemberId) {
              router.push(`/church?tab=member&id=${targetMemberId}` as any);
            }
          }}
        >
          @{matchedName}
        </Text>
      );
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      parts.push(
        <Text key={`t-${key++}`} style={styles.commentBodyText}>
          {text.slice(last)}
        </Text>
      );
    }
    return <Text style={styles.commentBodyText}>{parts}</Text>;
  };

  const renderBubble = (
    item: ThreadedCommentItem | ReplyItem,
    parentCommentId: number,
    isReply = false
  ) => {
    const authorName = getAuthorDisplayName(item.author);
    const avatarUrl = getAuthorAvatarUrl(item.author);
    const initials = authorName
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const isPinned = !isReply && Boolean((item as ThreadedCommentItem).isPinned);
    const isHighlighted = highlightCommentId === item.id;
    const isOwn = currentUserId !== null && Number(item.author?.id) === currentUserId;
    const isPostOwner = currentUserId !== null && Number(postAuthorId) === currentUserId;
    const canDelete = isOwn || isPostOwner || isAdmin;
    const canPin = !isReply && (isPostOwner || isAdmin);
    const avatarSize = isReply ? 26 : 32;

    return (
      <View
        key={item.id}
        style={[
          styles.bubbleRow,
          isReply && { marginBottom: 8 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.author?.id) {
              router.push(`/church?tab=member&id=${item.author.id}` as any);
            }
          }}
          style={[
            styles.avatarCircle,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
            />
          ) : (
            <Text style={[styles.avatarInitials, { fontSize: isReply ? 10 : 12 }]}>
              {initials || 'M'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          {isPinned && (
            <Text style={styles.pinnedBadgeText}>📌 Pinned comment</Text>
          )}
          <View
            style={[
              styles.bubbleBox,
              isPinned && styles.bubbleBoxPinned,
              isHighlighted && styles.bubbleBoxHighlighted,
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                if (item.author?.id) {
                  router.push(`/church?tab=member&id=${item.author.id}` as any);
                }
              }}
            >
              <Text style={styles.authorNameText}>{authorName}</Text>
            </TouchableOpacity>
            {renderFormattedContent(item.content)}
          </View>

          {/* Compact Facebook/Instagram Action Row under bubble */}
          <View style={styles.actionRow}>
            <Text style={styles.timeText}>{timeAgoShort(item.createdAt)}</Text>

            <TouchableOpacity
              onPress={() => handleToggleLike(item.id, item.isLiked)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.actionBtn}
            >
              <Text
                style={[
                  styles.actionText,
                  item.isLiked && { color: '#ef4444', fontWeight: '800' },
                ]}
              >
                {item.isLiked ? '❤️' : 'Like'}
                {item.likeCount > 0 ? ` ${item.likeCount}` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOpenReply(item.author, parentCommentId)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>

            {canPin && (
              <TouchableOpacity
                onPress={() => handleTogglePin(item.id, isPinned)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity
                onPress={() => setCommentToDelete(item.id)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={styles.actionBtn}
              >
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!isOpen) return null;

  const myAvatarUrl = getAuthorAvatarUrl({
    id: currentUserId || 0,
    profilePicture: user?.profilePicture,
  });
  const myInitials = (user?.firstName?.[0] || user?.fullName?.[0] || 'Y').toUpperCase();

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ paddingVertical: 8, gap: 10 }}>
          {[1, 2].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <SkeletonCircle size={30} />
              <View style={{ flex: 1, gap: 5 }}>
                <SkeletonBox width="75%" height={42} borderRadius={14} />
                <SkeletonBox width={90} height={10} borderRadius={5} />
              </View>
            </View>
          ))}
        </View>
      ) : comments.length === 0 ? (
        <Text style={styles.emptyText}>No comments yet. Share an encouraging word!</Text>
      ) : (
        <View style={{ marginBottom: 6 }}>
          {comments.map((comment) => {
            const isReplyingHere = replyTo?.parentId === comment.id;
            return (
              <View key={comment.id} style={{ marginBottom: 4 }}>
                {/* Top-Level Comment */}
                {renderBubble(comment, comment.id, false)}

                {/* Indented Replies Thread */}
                {(comment.replies || []).length > 0 && (
                  <View style={styles.repliesContainer}>
                    {comment.replies.map((reply) => renderBubble(reply, comment.id, true))}
                  </View>
                )}

                {/* Inline Reply Input Box — opens right inside this specific comment thread! */}
                {isReplyingHere && (
                  <View style={styles.inlineReplyBox}>
                    <View style={styles.replyingHeaderRow}>
                      <Text style={styles.replyingToLabel}>
                        ↩ Replying to {replyTo.authorName}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setReplyTo(null);
                          setReplyText('');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.cancelReplyText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.composerRow}>
                      <TextInput
                        ref={replyInputRef}
                        style={styles.replyInput}
                        placeholder={`Reply to ${replyTo.authorName}...`}
                        placeholderTextColor="#94a3b8"
                        value={replyText}
                        onChangeText={setReplyText}
                        multiline
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendCircleBtn,
                          !replyText.trim() && styles.sendCircleBtnDisabled,
                        ]}
                        disabled={!replyText.trim() || submittingReply}
                        onPress={() => handleSubmitReply(comment.id)}
                      >
                        {submittingReply ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text style={styles.sendCircleBtnText}>↑</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Main Bottom Comment Composer (inline inside the card) */}
      {user ? (
        <View style={styles.mainComposerWrap}>
          <View style={[styles.avatarCircle, { width: 30, height: 30, borderRadius: 15 }]}>
            {myAvatarUrl ? (
              <Image
                source={{ uri: myAvatarUrl }}
                style={{ width: 30, height: 30, borderRadius: 15 }}
              />
            ) : (
              <Text style={[styles.avatarInitials, { fontSize: 11 }]}>{myInitials}</Text>
            )}
          </View>
          <View style={styles.mainInputPill}>
            <TextInput
              style={styles.mainInput}
              placeholder="Write a comment..."
              placeholderTextColor="#94a3b8"
              value={mainText}
              onChangeText={setMainText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendCircleBtn,
                !mainText.trim() && styles.sendCircleBtnDisabled,
              ]}
              disabled={!mainText.trim() || submittingMain}
              onPress={handleSubmitMainComment}
            >
              {submittingMain ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendCircleBtnText}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.loginPromptBtn}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginPromptText}>Sign in to write a comment</Text>
        </TouchableOpacity>
      )}

      <ConfirmModal
        visible={Boolean(commentToDelete)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCommentToDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 12.5,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  avatarCircle: {
    backgroundColor: 'rgba(78, 177, 203, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  avatarInitials: {
    fontWeight: '800',
    color: PRIMARY,
  },
  pinnedBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: PRIMARY,
    marginBottom: 3,
  },
  bubbleBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  bubbleBoxPinned: {
    backgroundColor: 'rgba(78, 177, 203, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(78, 177, 203, 0.3)',
  },
  bubbleBoxHighlighted: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  authorNameText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  commentBodyText: {
    fontSize: 13.5,
    color: '#1e293b',
    lineHeight: 19,
  },
  mentionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: PRIMARY,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
    paddingLeft: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionBtn: {
    paddingVertical: 1,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  repliesContainer: {
    marginLeft: 34,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#e2e8f0',
    marginTop: -2,
    marginBottom: 4,
  },
  inlineReplyBox: {
    marginLeft: 34,
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(78, 177, 203, 0.35)',
  },
  replyingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  replyingToLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
  },
  cancelReplyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  replyInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mainComposerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  mainInputPill: {
    flex: 1,
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
  },
  mainInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0f172a',
    paddingVertical: 4,
    maxHeight: 80,
  },
  sendCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCircleBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  sendCircleBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  loginPromptBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  loginPromptText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: PRIMARY,
  },
});
