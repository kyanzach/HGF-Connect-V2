import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import client from '@/api/client';
import { triggerLocalNotification } from '@/services/notificationService';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function NotificationModal({
  visible,
  onClose,
  onUnreadChange,
}: NotificationModalProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await client.get('/notifications?limit=25');
      if (res.data?.success) {
        setItems(res.data.data?.notifications || []);
        onUnreadChange?.(res.data.data?.unread_count || 0);
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
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      onUnreadChange?.(0);
    } catch {
      // ignore
    }
  };

  const handleTestPushBanner = async () => {
    await triggerLocalNotification(
      'HGF Connect Live Push',
      'God bless you! Native push notifications are active on your device.'
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>Church &amp; community updates</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionPill} onPress={handleTestPushBanner}>
                <FontAwesome name="bell" size={12} color="#0e7490" />
                <Text numberOfLines={1} style={styles.actionPillText}>Test Push</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionPill} onPress={handleMarkAllRead}>
                <Text numberOfLines={1} style={styles.actionPillText}>Mark Read</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <FontAwesome name="times" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#4EB1CB" />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <FontAwesome name="bell-slash-o" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>New posts, comments, and event alerts appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={[styles.notifCard, !item.is_read && styles.notifUnread]}>
                  <View style={styles.notifIcon}>
                    <FontAwesome name="bell" size={14} color="#4EB1CB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifBody}>{item.message}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 360,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f2d3d',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f7fb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0e7490',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    padding: 40,
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
  notifCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  notifUnread: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0f7fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
});
