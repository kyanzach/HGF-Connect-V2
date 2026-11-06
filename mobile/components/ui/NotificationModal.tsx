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
    if (n.type?.startsWith('quiz_')) {
      router.push('/church?tab=quiz' as any);
    } else if (n.type?.startsWith('marketplace_')) {
      router.push('/(tabs)/stewardshop');
    } else {
      router.push('/(tabs)');
    }
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
