import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TopHeader from '@/components/ui/TopHeader';
import { useAuth } from '@/context/AuthContext';

const PRIMARY = '#4EB1CB';

const DOCK_ITEMS = [
  { routeName: 'index', icon: '🏠', label: 'Home' },
  { routeName: 'prayer', icon: '🙏', label: 'Prayer Wall' },
  { routeName: 'create-post', icon: '✍️', label: 'Write', isFab: true },
  { routeName: 'stewardshop', icon: '🤝', label: 'StewardShop' },
  { routeName: 'profile', icon: '👤', label: 'Me' },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <TopHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={({ state, navigation }) => {
          const currentRoute = state.routes[state.index]?.name || 'index';

          // Hide BottomDock when not logged in and on public home screen (matching web app)
          if (!user && currentRoute === 'index') {
            return null;
          }

          return (
            <View
              style={[
                styles.dockWrap,
                {
                  height: 64 + bottomInset,
                  paddingBottom: bottomInset,
                },
              ]}
            >
              {DOCK_ITEMS.map((item) => {
                if (item.isFab) {
                  return (
                    <TouchableOpacity
                      key={item.routeName}
                      style={styles.fabSlot}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (!user) {
                          router.push('/login' as any);
                        } else {
                          router.push('/create-post' as any);
                        }
                      }}
                    >
                      <View style={styles.fabCircle}>
                        <Text style={styles.fabIcon}>{item.icon}</Text>
                      </View>
                      <Text style={styles.fabLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                }

                const active = currentRoute === item.routeName;
                return (
                  <TouchableOpacity
                    key={item.routeName}
                    style={styles.dockItem}
                    activeOpacity={0.8}
                    onPress={() => {
                      navigation.navigate(item.routeName as never);
                    }}
                  >
                    <Text
                      style={[
                        styles.dockIcon,
                        active && { transform: [{ scale: 1.08 }] },
                      ]}
                    >
                      {item.icon}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.dockLabel,
                        {
                          color: active ? PRIMARY : '#94a3b8',
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? <View style={styles.activeDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="prayer" options={{ title: 'Prayer Wall' }} />
        <Tabs.Screen name="events" options={{ title: 'Events', href: null }} />
        <Tabs.Screen name="stewardshop" options={{ title: 'StewardShop' }} />
        <Tabs.Screen name="profile" options={{ title: 'Me' }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrap: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    position: 'relative',
    gap: 2,
  },
  dockIcon: {
    fontSize: 22,
    lineHeight: 25,
  },
  dockLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
    position: 'absolute',
    bottom: 4,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    position: 'relative',
  },
  fabCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -18,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: PRIMARY,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: {
    fontSize: 22,
  },
  fabLabel: {
    fontSize: 10,
    color: PRIMARY,
    fontWeight: '600',
    position: 'absolute',
    bottom: 6,
  },
});
