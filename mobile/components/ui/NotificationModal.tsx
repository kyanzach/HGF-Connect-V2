import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import client from '@/api/client';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  body?: string;
  link?: string | null;
  is_read: boolean;
  isRead?: boolean;
  created_at: string;
  createdAt?: string;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

function typeIcon(type: string) {
  if (type === 'marketplace_sale') return '💰';
  if (type === 'marketplace_prospect') return '🎉';
  if (type === 'new_post') return '📝';
  if (type === 'new_comment') return '💬';
  if (type === 'comment_reply') return '↩️';
  if (type === 'mention') return '🏷️';
  if (type === 'new_marketplace') return '🛍️';
  if (type === 'quiz_announcement') return '🧠';
  if (type === 'quiz_daily') return '🧠';
  if (type === 'quiz_result') return '🎯';
  if (type === 'quiz_reward') return '🎁';
  return '🔔';
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationModal({
  visible,
  onClose,
  onUnreadChange,
}: NotificationModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const topPad =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0, 32)
      : Math.max(insets.top, 44);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await client.get('/notifications?limit=25');
      const payload = res.data?.data || res.data;
      if (payload) {
        const list = payload.notifications || [];
        const unread = payload.unread_count ?? payload.unreadCount ?? 0;
        setItems(list);
        setUnreadCount(unread);
        onUnreadChange?.(unread);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const handleMarkAllRead = async () => {
    try {
      await client.post('/notifications', {});
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true, isRead: true })));
      setUnreadCount(0);
      onUnreadChange?.(0);
    } catch {
      // ignore
    }
  };

  const resolveNotificationRoute = (n: NotificationItem): string => {
    const rawLink = String(n.link || '').trim();
    const titleLower = String(n.title || '').toLowerCase();
    const bodyLower = String(n.message || n.body || '').toLowerCase();

    // Parse query params from rawLink if present
    let pathname = rawLink;
    const queryMap: Record<string, string> = {};
    const qIdx = rawLink.indexOf('?');
    if (qIdx !== -1) {
      pathname = rawLink.slice(0, qIdx);
      const qStr = rawLink.slice(qIdx + 1).split('#')[0];
      qStr.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) queryMap[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }

    // 1. Feed / Post / Comment deep-links (/feed?post=123 or /?post=123)
    if (queryMap.post || pathname === '/feed') {
      const postId = queryMap.post || '';
      const isCommentNotif =
        n.type === 'new_comment' ||
        n.type === 'comment_reply' ||
        titleLower.includes('comment') ||
        titleLower.includes('replied');
      if (postId) {
        return `/(tabs)?post=${postId}${isCommentNotif ? '&openComments=1' : ''}`;
      }
      return '/(tabs)';
    }

    // 2. Prayer Wall deep-links (/prayer?highlight=45, /prayer/45, /prayer?mine=true)
    const prayerPathMatch = pathname.match(/^\/prayer\/(\d+)/);
    if (
      pathname.startsWith('/prayer') ||
      n.type === 'prayer' ||
      n.type === 'prayer_response' ||
      titleLower.includes('prayed for')
    ) {
      const highlightId =
        queryMap.highlight || queryMap.pray || (prayerPathMatch ? prayerPathMatch[1] : '');
      if (queryMap.mine === 'true') return '/(tabs)/prayer?mine=true';
      if (highlightId) return `/(tabs)/prayer?highlight=${highlightId}`;
      return '/(tabs)/prayer';
    }

    // 3. Quiz for Christ deep-links (/quiz, /quiz/hub?tab=archive&quizId=6, Day N)
    if (
      pathname.startsWith('/quiz') ||
      n.type?.startsWith('quiz_') ||
      titleLower.includes('quiz') ||
      bodyLower.includes('catch-up archive')
    ) {
      const quizId = queryMap.quizId || '';
      const dayMatch = String(n.title || '').match(/Day\s+(\d+)/i);
      const dayNum = queryMap.day || (dayMatch ? dayMatch[1] : '');
      const isArchive =
        queryMap.tab === 'archive' ||
        queryMap.tab === 'past' ||
        queryMap.tab === 'catchup' ||
        pathname.includes('/quiz/hub') ||
        titleLower.includes('catch-up');
      const paramsList: string[] = ['page=quiz'];
      if (isArchive) paramsList.push('tab=archive');
      else if (queryMap.tab === 'leaderboard') paramsList.push('tab=leaderboard');
      if (quizId) paramsList.push(`quizId=${quizId}`);
      if (dayNum && !isArchive) paramsList.push(`day=${dayNum}`);
      return `/church?${paramsList.join('&')}`;
    }

    // 4. StewardShop deep-links (/stewardshop/my-listings/21/prospects, /stewardshop/my-shares, /stewardshop/21)
    const prospectsMatch = pathname.match(/^\/stewardshop\/my-listings\/(\d+)\/prospects/);
    if (prospectsMatch) {
      return `/church?page=my-listings&prospectsFor=${prospectsMatch[1]}`;
    }
    if (pathname.startsWith('/stewardshop/my-listings')) {
      return '/church?page=my-listings';
    }
    if (pathname.startsWith('/stewardshop/my-shares')) {
      return '/church?page=my-shares';
    }
    if (pathname.startsWith('/stewardshop/love-gifts')) {
      return '/church?page=love-gifts';
    }
    const listingIdMatch = pathname.match(/^\/stewardshop\/(\d+)/);
    if (listingIdMatch || queryMap.id) {
      const lId = listingIdMatch ? listingIdMatch[1] : queryMap.id;
      return `/(tabs)/stewardshop?id=${lId}`;
    }
    if (pathname.startsWith('/stewardshop') || n.type?.startsWith('marketplace_')) {
      return '/(tabs)/stewardshop';
    }

    // 5. Events deep-links (/event/66, /events)
    const eventMatch = pathname.match(/^\/events?\/(\d+)/);
    if (eventMatch || queryMap.eventId) {
      const evId = eventMatch ? eventMatch[1] : queryMap.eventId;
      return `/(tabs)/events?eventId=${evId}`;
    }
    if (pathname.startsWith('/event')) {
      return '/(tabs)/events';
    }

    // 6. Member profile (/member/12)
    const memberMatch = pathname.match(/^\/member\/(\d+)/);
    if (memberMatch) {
      return `/member/${memberMatch[1]}`;
    }

    // 7. Resources / Journal / Directory / Admin
    if (pathname.startsWith('/resources')) return '/church?page=resources';
    if (pathname.startsWith('/journal')) return '/church?page=journal';
    if (pathname.startsWith('/directory')) return '/church?page=directory';
    if (pathname.startsWith('/admin')) return '/admin';

    return '/(tabs)';
  };

  const handlePressItem = (n: NotificationItem) => {
    const isRead = n.is_read ?? n.isRead ?? false;
    if (!isRead) {
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true, isRead: true } : x))
      );
      const nextCount = Math.max(0, unreadCount - 1);
      setUnreadCount(nextCount);
      onUnreadChange?.(nextCount);
      client.post('/notifications', { id: n.id }).catch(() => {});
    }
    onClose();
    const targetRoute = resolveNotificationRoute(n);
    router.push(targetRoute as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.dropdownPanel, { top: topPad + 54 }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header — 1:1 replica of components/NotificationBell.tsx */}
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 ? (
              <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.75}>
                <Text style={styles.markAllReadBtn}>Mark all read</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 460 }}
              renderItem={({ item }) => {
                const isRead = item.is_read ?? item.isRead ?? false;
                const bodyText = item.message || item.body || '';
                const dateStr = item.created_at || item.createdAt || '';
                return (
                  <TouchableOpacity
                    style={[
                      styles.notifRow,
                      { backgroundColor: isRead ? '#ffffff' : '#eff6ff' },
                    ]}
                    onPress={() => handlePressItem(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.notifEmoji}>{typeIcon(item.type)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifTitle}>{item.title}</Text>
                      <Text style={styles.notifBody}>{bodyText}</Text>
                      {dateStr ? (
                        <Text style={styles.notifTime}>{timeAgo(dateStr)}</Text>
                      ) : null}
                    </View>
                    {!isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {items.length > 0 && (
            <TouchableOpacity
              style={styles.footerLink}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.footerLinkText}>View All Notifications →</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  dropdownPanel: {
    position: 'absolute',
    right: 8,
    width: 320,
    maxWidth: '94%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111111',
  },
  markAllReadBtn: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  loadingWrap: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  emptyWrap: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  notifRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notifEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  notifTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#111111',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginTop: 6,
  },
  footerLink: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    alignItems: 'center',
  },
  footerLinkText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
});
