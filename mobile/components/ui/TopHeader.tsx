import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  Modal,
  ScrollView,
  Linking,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, usePathname, useGlobalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import NotificationModal from './NotificationModal';
import { TopNavigationProgress } from './SkeletonPulse';
import {
  registerForPushNotificationsAsync,
  syncAndAlertNewNotifications,
} from '@/services/notificationService';

const PRIMARY = '#4EB1CB';
const DARK_NAV = '#3A95AD';
const APP_VERSION = '2.85.1';

const NAV_LINKS = [
  { href: '/(tabs)', label: 'Home', icon: '🏠' },
  { href: '/church?tab=directory', label: 'Member Directory', icon: '👥' },
  { href: '/(tabs)/events', label: 'Events', icon: '📅' },
  { href: '/(tabs)/stewardshop', label: 'StewardShop', icon: '🤝' },
  { href: '/church?tab=resources', label: 'Resources', icon: '📖' },
];

export default function TopHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ menu?: string; notif?: string }>();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const topPad =
    Platform.OS === 'android'
      ? Math.max(insets.top, StatusBar.currentHeight || 0, 32)
      : Math.max(insets.top, 44);

  useEffect(() => {
    setDropOpen(globalParams?.menu === '1');
    setNotifOpen(globalParams?.notif === '1');
    setNavOpen(false);
  }, [pathname, globalParams?.menu, globalParams?.notif]);

  useEffect(() => {
    registerForPushNotificationsAsync();
    if (!user) return;
    const syncNow = () => {
      syncAndAlertNewNotifications().then((count) => setUnreadCount(count));
    };
    syncNow();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncNow();
      }
    }, 4000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncNow();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [user, pathname]);

  const firstName = (user?.firstName || user?.fullName || 'Guest').trim().split(/\s+/)[0];
  const fullName = user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Guest';
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'M';
  const avatarUrl = user?.profilePicture
    ? user.profilePicture.startsWith('http')
      ? user.profilePicture
      : `https://connect.houseofgrace.ph/uploads/profile_pictures/${user.profilePicture.replace(/^\/uploads\/(avatars|profile_pictures)\//, '')}`
    : null;
  const role = user?.role || '';
  const isAdmin = ['admin', 'moderator'].includes(role);
  const canAttend = ['admin', 'moderator', 'usher'].includes(role);

  const go = (route: string) => {
    setDropOpen(false);
    setNavOpen(false);
    router.push(route as any);
  };

  return (
    <>
      <View style={[styles.headerWrap, { paddingTop: topPad }]}>
        <TopNavigationProgress />
        {/* Top bar — exact 56px height matching UnifiedHeader.tsx */}
        <View style={styles.topBar}>
          {/* Brand: [Circular Logo] HGF Connect [BETA v2.78.0] */}
          <TouchableOpacity
            style={styles.brandLink}
            onPress={() => go('/(tabs)')}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../assets/images/HGF-icon-v1.0.png')}
              style={styles.logoImg}
            />
            <Text numberOfLines={1} style={styles.brandTitle}>
              HGF Connect
            </Text>
            <View style={styles.versionBadge}>
              <Text numberOfLines={1} style={styles.versionBadgeText}>
                BETA v{APP_VERSION}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Right controls */}
          <View style={styles.rightControls}>
            {user ? (
              <>
                {/* Notification Bell */}
                <TouchableOpacity
                  style={styles.bellBtn}
                  onPress={() => {
                    setDropOpen(false);
                    setNavOpen(false);
                    setNotifOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="bell" size={16} color="#ffffff" />
                  {unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                {/* User Avatar Pill: [Avatar] Ryan ▾ */}
                <TouchableOpacity
                  style={styles.userPillBtn}
                  onPress={() => {
                    setNavOpen(false);
                    setDropOpen((o) => !o);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.userAvatarWrap}>
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.userAvatarImg}
                      />
                    ) : (
                      <Text style={styles.userAvatarInitials}>{initials}</Text>
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.userNameText}>
                    {firstName}
                  </Text>
                  <Text style={styles.userArrowText}>▾</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.guestLoginPill}
                onPress={() => go('/login')}
                activeOpacity={0.85}
              >
                <Text numberOfLines={1} style={styles.guestLoginText}>
                  Login
                </Text>
              </TouchableOpacity>
            )}

            {/* Hamburger ☰ button */}
            <TouchableOpacity
              style={styles.hamburgerBtn}
              onPress={() => {
                setDropOpen(false);
                setNavOpen((o) => !o);
              }}
              activeOpacity={0.85}
            >
              <FontAwesome name={navOpen ? 'times' : 'bars'} size={17} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide-down Hamburger Nav Menu (exact DARK_NAV #3A95AD) */}
        {navOpen ? (
          <View style={styles.slideNavMenu}>
            {NAV_LINKS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.slideNavItem}
                onPress={() => go(item.href)}
                activeOpacity={0.8}
              >
                <Text style={styles.slideNavIcon}>{item.icon}</Text>
                <Text style={styles.slideNavLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {!user ? (
              <>
                <TouchableOpacity
                  style={styles.slideNavItem}
                  onPress={() => go('/login')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.slideNavIcon}>🔑</Text>
                  <Text style={[styles.slideNavLabel, { fontWeight: '700' }]}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.slideNavItem, { borderBottomWidth: 0 }]}
                  onPress={() => go('/register')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.slideNavIcon}>✨</Text>
                  <Text style={styles.slideNavLabel}>Register</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Floating White User Dropdown Card — 1:1 replica of screenshot #2 */}
      <Modal
        visible={dropOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropOverlay}
          activeOpacity={1}
          onPress={() => setDropOpen(false)}
        >
          <View
            style={[styles.dropCard, { top: topPad + 54 }]}
            onStartShouldSetResponder={() => true}
          >
            <ScrollView
              style={{ maxHeight: 680 }}
              showsVerticalScrollIndicator={false}
            >
              {/* User header — clickable → full profile */}
              <TouchableOpacity
                style={styles.dropUserHeader}
                onPress={() => go('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <View style={styles.dropUserAvatar}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.dropUserAvatarImg}
                    />
                  ) : (
                    <Text style={styles.dropUserInitials}>{initials}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={styles.dropUserFullName}>
                    {fullName}
                  </Text>
                  <Text style={styles.dropViewProfileLink}>View Profile →</Text>
                </View>
              </TouchableOpacity>

              <DropMenuItem label="🏠 Community Feed" onPress={() => go('/(tabs)')} />
              <DropMenuItem
                label="🧠 Quiz for Christ"
                onPress={() => go('/church?tab=quiz')}
              />
              <DropMenuItem label="👤 My Profile" onPress={() => go('/(tabs)/profile')} />

              <View style={styles.hr} />

              <DropMenuItem
                label="📝 My Grace Blog"
                onPress={() => go('/church?tab=journal')}
              />
              <DropMenuItem
                label="🙏 My Prayer Request"
                onPress={() => go('/(tabs)/prayer?mine=true')}
              />
              <DropMenuItem
                label="✍️ Share Testimony"
                onPress={() => go('/create-post?tab=testimony')}
              />
              <DropMenuItem
                label="🤝 My Listings"
                onPress={() => go('/church?tab=my-listings')}
              />
              <DropMenuItem
                label="🫰 My Shared Links"
                onPress={() => go('/church?tab=my-shares')}
              />

              <View style={styles.hr} />

              <DropMenuItem
                label="⚙️ Settings"
                onPress={() => go('/(tabs)/profile?edit=true')}
              />

              {canAttend ? (
                <>
                  <View style={styles.hr} />
                  <DropMenuItem
                    label="✅ Attendance App"
                    onPress={() => {
                      setDropOpen(false);
                      Linking.openURL('https://connect.houseofgrace.ph/api/auth/sso/attendance');
                    }}
                  />
                </>
              ) : null}

              {isAdmin ? (
                <>
                  <View style={styles.hr} />
                  <Text style={styles.managementHeader}>MANAGEMENT</Text>
                  <DropMenuItem
                    label="📅 Add Event"
                    danger
                    onPress={() => go('/admin?page=events&add=true')}
                  />
                  <DropMenuItem
                    label="🎛️ Admin Dashboard"
                    onPress={() => go('/admin')}
                  />
                  <DropMenuItem
                    label="🧠 Quiz Admin"
                    onPress={() => go('/admin?page=quiz-admin')}
                  />
                </>
              ) : null}

              <View style={styles.hr} />

              <DropMenuItem
                label="🚪 Logout"
                danger
                onPress={async () => {
                  setDropOpen(false);
                  await logout();
                }}
              />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <NotificationModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}

function DropMenuItem({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.dropItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.dropItemText, danger && { color: '#ef4444' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: PRIMARY,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  topBar: {
    height: 52,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  logoImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  brandTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: '#ffffff',
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
  },
  versionBadgeText: {
    fontSize: 8.5,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.9)',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  bellBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  userPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    borderRadius: 8,
  },
  userAvatarWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  userAvatarImg: {
    width: 24,
    height: 24,
  },
  userAvatarInitials: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  userNameText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12.5,
    maxWidth: 64,
  },
  userArrowText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
  },
  guestLoginPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  guestLoginText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 14,
  },
  hamburgerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideNavMenu: {
    backgroundColor: DARK_NAV,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  slideNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.09)',
  },
  slideNavIcon: {
    fontSize: 16,
  },
  slideNavLabel: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '500',
  },
  dropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  dropCard: {
    position: 'absolute',
    right: 12,
    width: 225,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    overflow: 'hidden',
  },
  dropUserHeader: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropUserAvatarImg: {
    width: 36,
    height: 36,
  },
  dropUserInitials: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  dropUserFullName: {
    fontWeight: '700',
    fontSize: 14,
    color: '#111111',
  },
  dropViewProfileLink: {
    fontSize: 11.5,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 1,
  },
  dropItem: {
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  dropItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  hr: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  managementHeader: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
