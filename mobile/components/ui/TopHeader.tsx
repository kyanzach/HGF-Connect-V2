import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import NotificationModal from './NotificationModal';
import {
  registerForPushNotificationsAsync,
  syncAndAlertNewNotifications,
} from '@/services/notificationService';

export default function TopHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const topPad =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0, 32)
      : Math.max(insets.top, 44);

  useEffect(() => {
    registerForPushNotificationsAsync();
    if (!user) return;
    syncAndAlertNewNotifications().then((count) => setUnreadCount(count));
    const timer = setInterval(() => {
      syncAndAlertNewNotifications().then((count) => setUnreadCount(count));
    }, 15000);
    return () => clearInterval(timer);
  }, [user]);

  return (
    <>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/images/hgf_logo.png')}
              style={styles.logoImg}
            />
          </View>
          <View>
            <Text style={styles.brandTitle}>HGF Connect</Text>
            <Text style={styles.brandSubtitle}>House of Grace Fellowship</Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          {user ? (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => setNotifOpen(true)}
                activeOpacity={0.8}
              >
                <FontAwesome name="bell-o" size={18} color="#ffffff" />
                {unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => router.push('/(tabs)/profile' as any)}
                activeOpacity={0.85}
              >
                {user.profilePicture ? (
                  <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {(user.firstName?.[0] || 'M').toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.signInPill}
              onPress={() => router.push('/login' as any)}
              activeOpacity={0.85}
            >
              <FontAwesome name="sign-in" size={14} color="#0f2d3d" />
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.signInPillText}>
                Sign In
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <NotificationModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0f2d3d',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(78, 177, 203, 0.25)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#4EB1CB',
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0f2d3d',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4EB1CB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  avatarImg: {
    width: 36,
    height: 36,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  signInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  signInPillText: {
    color: '#0f2d3d',
    fontSize: 13,
    fontWeight: '800',
  },
});
